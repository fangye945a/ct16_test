/*
 * Copyright (c) 2026 Hunan OpenValley Digital Industry Development Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { toast } from 'sonner';
import { Activity, Cable, CheckCircle2, CloudCog, DatabaseZap, Edit3, Gauge, Loader2, Plus, RefreshCw, Send, Server, Settings2, ShieldCheck, Trash2, Unplug } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CHART_COLORS } from '@/lib/chart-colors';
import {
  DeleteNorthboundPlatform,
  GetNorthboundPlatforms,
  GetNorthboundPlugins,
  GetNorthboundTelemetry,
  SaveNorthboundPlatform,
  SetNorthboundPlatformEnabled,
  SetNorthboundPluginEnabled,
  TestNorthboundPlatform,
  type INorthboundPlatform,
  type INorthboundPlatformDraft,
  type INorthboundProtocolPlugin,
  type INorthboundTelemetryPoint,
  type NorthboundProtocol,
} from '@/services/northboundPrototype';

const PROTOCOL_LABELS: Record<NorthboundProtocol, string> = {
  mqtt: 'MQTT',
  http: 'HTTP',
  opcua: 'OPC UA',
};

const PROTOCOL_FIELDS: Record<NorthboundProtocol, Array<{ key: string; label: string; placeholder: string }>> = {
  mqtt: [
    { key: 'publishTopic', label: '上报主题', placeholder: 'factory/ct16/telemetry' },
    { key: 'clientId', label: '客户端 ID', placeholder: 'CT16-MASTER-01' },
    { key: 'qos', label: 'QoS 等级', placeholder: '1' },
  ],
  http: [
    { key: 'method', label: '请求方法', placeholder: 'POST' },
    { key: 'authHeader', label: '认证 Header', placeholder: 'X-API-Key' },
    { key: 'batchSize', label: '批量条数', placeholder: '50' },
  ],
  opcua: [
    { key: 'namespace', label: '命名空间', placeholder: 'urn:ct16:devices' },
    { key: 'securityPolicy', label: '安全策略', placeholder: 'Basic256Sha256' },
    { key: 'mode', label: '安全模式', placeholder: 'SignAndEncrypt' },
  ],
};

function GetEmptyDraft(): INorthboundPlatformDraft {
  return {
    name: '',
    protocol: 'mqtt',
    endpoint: 'mqtts://',
    username: '',
    secret: '',
    reportInterval: 5,
    enabled: true,
    config: { publishTopic: '', clientId: '', qos: '1' },
  };
}

function GetProtocolEndpoint(protocol: NorthboundProtocol): string {
  if (protocol === 'mqtt') {
    return 'mqtts://';
  }
  if (protocol === 'http') {
    return 'https://';
  }
  return 'opc.tcp://';
}

function MaskSecret(secret: string): string {
  return secret ? '********' : '未配置';
}

function FormatTelemetryTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
}

function PlatformDialog({
  open,
  platform,
  plugins,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  platform: INorthboundPlatform | null;
  plugins: INorthboundProtocolPlugin[];
  saving: boolean;
  onClose: () => void;
  onSave: (draft: INorthboundPlatformDraft) => void;
}) {
  const [draft, setDraft] = useState<INorthboundPlatformDraft>(GetEmptyDraft);

  useEffect(() => {
    setDraft(
      platform
        ? {
            name: platform.name,
            protocol: platform.protocol,
            endpoint: platform.endpoint,
            username: platform.username,
            secret: platform.secret,
            reportInterval: platform.reportInterval,
            enabled: platform.enabled,
            config: { ...platform.config },
          }
        : GetEmptyDraft(),
    );
  }, [open, platform]);

  const handleSave = () => {
    if (!draft.name.trim()) {
      toast.error('请输入平台名称');
      return;
    }
    const endpointRules: Record<NorthboundProtocol, RegExp> = {
      mqtt: /^mqtts?:\/\/.+/i,
      http: /^https?:\/\/.+/i,
      opcua: /^opc\.tcp:\/\/.+/i,
    };
    if (!endpointRules[draft.protocol].test(draft.endpoint.trim())) {
      toast.error(`${PROTOCOL_LABELS[draft.protocol]} 服务地址格式不正确`);
      return;
    }
    if (draft.reportInterval < 1 || draft.reportInterval > 3600) {
      toast.error('上报周期应在 1 至 3600 秒之间');
      return;
    }
    const missingField = PROTOCOL_FIELDS[draft.protocol].find((field) => !draft.config[field.key]?.trim());
    if (missingField) {
      toast.error(`请填写${missingField.label}`);
      return;
    }
    onSave({ ...draft, name: draft.name.trim(), endpoint: draft.endpoint.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudCog className="size-5 text-primary" />
            {platform ? '编辑平台连接' : '新增平台连接'}
          </DialogTitle>
          <DialogDescription>选择协议插件并配置北向服务地址、认证方式和数据上报参数。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>平台名称</Label>
            <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="例如：生产数据中心" />
          </div>
          <div className="space-y-2">
            <Label>协议插件</Label>
            <Select
              value={draft.protocol}
              onValueChange={(value) => {
                const protocol = value as NorthboundProtocol;
                setDraft({ ...draft, protocol, endpoint: GetProtocolEndpoint(protocol), config: {} });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {plugins
                  .filter((plugin) => plugin.enabled)
                  .map((plugin) => (
                    <SelectItem key={plugin.id} value={plugin.id}>
                      {plugin.name} · v{plugin.version}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>服务地址</Label>
            <Input value={draft.endpoint} onChange={(event) => setDraft({ ...draft, endpoint: event.target.value })} className="font-mono text-sm" />
          </div>
          <div className="space-y-2">
            <Label>用户名</Label>
            <Input value={draft.username} onChange={(event) => setDraft({ ...draft, username: event.target.value })} placeholder="可选" />
          </div>
          <div className="space-y-2">
            <Label>密码 / Token</Label>
            <Input type="password" value={draft.secret} onChange={(event) => setDraft({ ...draft, secret: event.target.value })} placeholder="可选" />
          </div>
          <div className="space-y-2">
            <Label>上报周期（秒）</Label>
            <Input type="number" min={1} max={3600} value={draft.reportInterval} onChange={(event) => setDraft({ ...draft, reportInterval: Number(event.target.value) })} />
          </div>
          <div className="flex items-end">
            <div className="flex h-10 w-full items-center justify-between rounded-md border border-border px-3">
              <Label htmlFor="platform-enabled">保存后启用</Label>
              <Switch id="platform-enabled" checked={draft.enabled} onCheckedChange={(enabled) => setDraft({ ...draft, enabled })} />
            </div>
          </div>
        </div>
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Settings2 className="size-4 text-primary" />
            {PROTOCOL_LABELS[draft.protocol]} 插件参数
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {PROTOCOL_FIELDS[draft.protocol].map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Input
                  value={draft.config[field.key] || ''}
                  onChange={(event) => setDraft({ ...draft, config: { ...draft.config, [field.key]: event.target.value } })}
                  placeholder={field.placeholder}
                />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            {platform ? '保存修改' : '创建连接'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ platform }: { platform: INorthboundPlatform }) {
  if (!platform.enabled) {
    return <Badge variant="secondary">已停用</Badge>;
  }
  if (platform.status === 'connected') {
    return (
      <Badge className="bg-success/10 text-success">
        <CheckCircle2 className="mr-1 size-3" />
        已连接
      </Badge>
    );
  }
  return (
    <Badge className="bg-destructive/10 text-destructive">
      <Unplug className="mr-1 size-3" />
      未连接
    </Badge>
  );
}

export default function NorthboundPlatformPage() {
  const [platforms, setPlatforms] = useState<INorthboundPlatform[]>([]);
  const [plugins, setPlugins] = useState<INorthboundProtocolPlugin[]>([]);
  const [telemetry, setTelemetry] = useState<INorthboundTelemetryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<INorthboundPlatform | null>(null);
  const [deleting, setDeleting] = useState<INorthboundPlatform | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');

  const LoadData = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      }
      const [nextPlatforms, nextPlugins] = await Promise.all([GetNorthboundPlatforms(), GetNorthboundPlugins()]);
      setPlatforms(nextPlatforms);
      setPlugins(nextPlugins);
      setTelemetry(await GetNorthboundTelemetry(nextPlatforms));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '北向平台数据加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void LoadData();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => void LoadData(), 20_000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredTelemetry = useMemo(
    () => telemetry.filter((point) => (platformFilter === 'all' || point.platformId === platformFilter) && (deviceFilter === 'all' || point.deviceName === deviceFilter)),
    [deviceFilter, platformFilter, telemetry],
  );
  const deviceNames = [...new Set(telemetry.map((point) => point.deviceName))];
  const successCount = filteredTelemetry.filter((point) => point.success).length;
  const successRate = filteredTelemetry.length > 0 ? Math.round((successCount / filteredTelemetry.length) * 1000) / 10 : 0;
  const connectedCount = platforms.filter((platform) => platform.enabled && platform.status === 'connected').length;

  const chartOption = useMemo(() => {
    const grouped = new Map<string, INorthboundTelemetryPoint[]>();
    filteredTelemetry.forEach((point) => grouped.set(point.deviceName, [...(grouped.get(point.deviceName) || []), point]));
    const timeValues = [...new Set(filteredTelemetry.map((point) => point.timestamp))].sort();
    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 0, textStyle: { color: 'var(--muted-foreground)' } },
      grid: { left: 45, right: 20, top: 42, bottom: 36 },
      xAxis: {
        type: 'category',
        data: timeValues.map((value) => new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })),
        axisLabel: { color: 'var(--muted-foreground)' },
      },
      yAxis: { type: 'value', axisLabel: { color: 'var(--muted-foreground)' }, splitLine: { lineStyle: { color: 'var(--border)' } } },
      series: [...grouped.entries()].map(([name, points], index) => ({
        name,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: CHART_COLORS[index % CHART_COLORS.length] },
        data: timeValues.map((time) => points.find((point) => point.timestamp === time)?.value ?? null),
      })),
    };
  }, [filteredTelemetry]);

  const SavePlatform = async (draft: INorthboundPlatformDraft) => {
    try {
      setSaving(true);
      await SaveNorthboundPlatform(editing?.id || null, draft);
      await LoadData();
      setDialogOpen(false);
      setEditing(null);
      toast.success(editing ? '平台连接已更新' : '平台连接已创建');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '平台连接保存失败');
    } finally {
      setSaving(false);
    }
  };

  const TestPlatform = async (platform: INorthboundPlatform) => {
    try {
      setTestingId(platform.id);
      await TestNorthboundPlatform(platform.id);
      await LoadData();
      toast.success(`“${platform.name}”连接测试成功`);
    } catch (error) {
      await LoadData();
      toast.error(error instanceof Error ? error.message : '连接测试失败');
    } finally {
      setTestingId(null);
    }
  };

  const TogglePlatform = async (platform: INorthboundPlatform, enabled: boolean) => {
    try {
      await SetNorthboundPlatformEnabled(platform.id, enabled);
      await LoadData();
      toast.success(enabled ? '平台连接已启用' : '平台连接已停用');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '平台状态更新失败');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin text-primary" />
        正在加载北向平台配置
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">北向平台对接</h1>
          <p className="mt-1 text-sm text-muted-foreground">通过协议插件连接工业平台，并统一查看设备数据上报状态。</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-1.5 size-4" />
          新增平台
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>平台总数</span>
              <Server className="size-4 text-primary" />
            </div>
            <div className="mt-1 text-2xl font-bold">{platforms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>在线连接</span>
              <Cable className="size-4 text-success" />
            </div>
            <div className="mt-1 text-2xl font-bold text-success">{connectedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>启用插件</span>
              <DatabaseZap className="size-4 text-primary" />
            </div>
            <div className="mt-1 text-2xl font-bold">{plugins.filter((plugin) => plugin.enabled).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>上报成功率</span>
              <Gauge className="size-4 text-success" />
            </div>
            <div className="mt-1 text-2xl font-bold">{successRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="connections" className="space-y-4">
        <TabsList className="grid h-auto w-full max-w-2xl grid-cols-3 bg-muted/60 p-1">
          <TabsTrigger value="connections" className="gap-1.5 py-2.5">
            <CloudCog className="size-4" />
            平台连接
          </TabsTrigger>
          <TabsTrigger value="telemetry" className="gap-1.5 py-2.5">
            <Activity className="size-4" />
            数据展示
          </TabsTrigger>
          <TabsTrigger value="plugins" className="gap-1.5 py-2.5">
            <Settings2 className="size-4" />
            协议插件
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="mt-0">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">平台连接配置</CardTitle>
              <Button variant="outline" size="sm" onClick={() => void LoadData(true)} disabled={refreshing}>
                <RefreshCw className={`mr-1.5 size-4 ${refreshing ? 'animate-spin' : ''}`} />
                刷新
              </Button>
            </CardHeader>
            <CardContent>
              {platforms.length === 0 ? (
                <div className="py-14 text-center">
                  <CloudCog className="mx-auto size-10 text-muted-foreground/50" />
                  <div className="mt-3 font-medium">尚未配置北向平台</div>
                  <p className="mt-1 text-sm text-muted-foreground">新增平台并选择协议插件后即可开始上报。</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>平台</TableHead>
                        <TableHead>协议</TableHead>
                        <TableHead>服务地址</TableHead>
                        <TableHead>认证</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>最后连接</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {platforms.map((platform) => (
                        <TableRow key={platform.id}>
                          <TableCell>
                            <div className="font-medium">{platform.name}</div>
                            <div className="text-xs text-muted-foreground">每 {platform.reportInterval} 秒上报</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{PROTOCOL_LABELS[platform.protocol]}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[260px] truncate font-mono text-xs" title={platform.endpoint}>
                              {platform.endpoint}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">{platform.username || '匿名'}</div>
                            <div className="text-xs text-muted-foreground">{MaskSecret(platform.secret)}</div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge platform={platform} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{platform.lastConnectedAt}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="测试连接"
                                onClick={() => void TestPlatform(platform)}
                                disabled={!platform.enabled || testingId === platform.id}
                              >
                                {testingId === platform.id ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="编辑"
                                onClick={() => {
                                  setEditing(platform);
                                  setDialogOpen(true);
                                }}
                              >
                                <Edit3 className="size-4" />
                              </Button>
                              <Switch
                                checked={platform.enabled}
                                onCheckedChange={(enabled) => void TogglePlatform(platform, enabled)}
                                aria-label={`${platform.name}启用状态`}
                                className="mx-1 self-center"
                              />
                              <Button variant="ghost" size="icon" title="删除" className="text-destructive hover:text-destructive" onClick={() => setDeleting(platform)}>
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="telemetry" className="mt-0 space-y-4">
          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">上报数据趋势</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger className="sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部平台</SelectItem>
                    {platforms
                      .filter((platform) => platform.enabled)
                      .map((platform) => (
                        <SelectItem key={platform.id} value={platform.id}>
                          {platform.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                  <SelectTrigger className="sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部设备</SelectItem>
                    {deviceNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTelemetry.length === 0 ? (
                <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">当前筛选条件下没有上报数据</div>
              ) : (
                <ReactECharts option={chartOption} style={{ height: 320, width: '100%' }} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">最新上报记录</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[360px] overflow-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>时间</TableHead>
                      <TableHead>平台</TableHead>
                      <TableHead>设备</TableHead>
                      <TableHead>数据点</TableHead>
                      <TableHead>值</TableHead>
                      <TableHead>结果</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTelemetry
                      .slice()
                      .reverse()
                      .slice(0, 18)
                      .map((point, index) => (
                        <TableRow key={`${point.platformId}-${point.timestamp}-${index}`}>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{FormatTelemetryTime(point.timestamp)}</TableCell>
                          <TableCell>{point.platformName}</TableCell>
                          <TableCell>{point.deviceName}</TableCell>
                          <TableCell>{point.dataPoint}</TableCell>
                          <TableCell className="font-mono">
                            {point.value} {point.unit}
                          </TableCell>
                          <TableCell>
                            {point.success ? <span className="text-xs text-success">上报成功</span> : <span className="text-xs text-destructive">上报失败</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plugins" className="mt-0">
          <div className="grid gap-4 lg:grid-cols-3">
            {plugins.map((plugin) => {
              const references = platforms.filter((platform) => platform.protocol === plugin.id).length;
              return (
                <Card key={plugin.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                        <ShieldCheck className="size-5" />
                      </div>
                      <Switch
                        checked={plugin.enabled}
                        onCheckedChange={async (enabled) => {
                          if (!enabled && references > 0) {
                            toast.error('该插件仍被平台连接使用，无法停用');
                            return;
                          }
                          setPlugins(await SetNorthboundPluginEnabled(plugin.id, enabled));
                          toast.success(enabled ? '协议插件已启用' : '协议插件已停用');
                        }}
                      />
                    </div>
                    <CardTitle className="mt-3 flex items-center gap-2 text-base">
                      {plugin.name}
                      <Badge variant="secondary">v{plugin.version}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="min-h-10 text-sm text-muted-foreground">{plugin.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {plugin.capabilities.map((capability) => (
                        <Badge key={capability} variant="outline" className="font-normal">
                          {capability}
                        </Badge>
                      ))}
                    </div>
                    <div className="border-t border-border pt-3 text-xs text-muted-foreground">{references} 个平台正在使用</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <PlatformDialog
        open={dialogOpen}
        platform={editing}
        plugins={plugins}
        saving={saving}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSave={(draft) => void SavePlatform(draft)}
      />
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除平台连接</AlertDialogTitle>
            <AlertDialogDescription>删除“{deleting?.name}”后，该平台的连接配置将无法恢复，历史演示数据不会继续生成。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleting) return;
                await DeleteNorthboundPlatform(deleting.id);
                setDeleting(null);
                await LoadData();
                toast.success('平台连接已删除');
              }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
