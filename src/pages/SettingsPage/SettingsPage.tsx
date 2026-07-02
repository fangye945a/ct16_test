import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Globe,
  Clock,
  Shield,
  Server,
  Save,
  RotateCcw,
  Plus,
  X,
  ToggleRight,
  ToggleLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  Wifi,
  HardDrive,
  Palette,
  Key,
  Eye,
  EyeOff,
  Upload,
} from 'lucide-react';
import {
  MOCK_NETWORK_SETTINGS,
  MOCK_TIME_SETTINGS,
  MOCK_SECURITY_SETTINGS,
  MOCK_SERVICES,
  type INetworkSettings,
  type ITimeSettings,
  type ISecuritySettings,
  type IServiceItem,
} from '@/data/settings';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit-lite';

const SERVICE_STATUS_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  running: { icon: CheckCircle, color: 'text-success', label: '运行中' },
  stopped: { icon: XCircle, color: 'text-muted-foreground', label: '已停止' },
  error: { icon: AlertCircle, color: 'text-destructive', label: '异常' },
};

const PRESET_LOGOS = [
  { key: 'chip', label: '芯片' },
  { key: 'gear', label: '齿轮' },
  { key: 'shield', label: '盾牌' },
  { key: 'hexagon', label: '六边形' },
];

function LogoIcon({ type, className }: { type: string; className?: string }) {
  if (type === 'chip') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      </svg>
    );
  }
  if (type === 'gear') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
  }
  if (type === 'shield') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
}

export default function SettingsPage() {
  const [network, setNetwork] = useState<INetworkSettings>({ ...MOCK_NETWORK_SETTINGS });
  const [time, setTime] = useState<ITimeSettings>({ ...MOCK_TIME_SETTINGS });
  const [security, setSecurity] = useState<ISecuritySettings>({ ...MOCK_SECURITY_SETTINGS });
  const [services, setServices] = useState<IServiceItem[]>([...MOCK_SERVICES]);
  const [newIp, setNewIp] = useState('');
  const [showResetDialog, setShowResetDialog] = useState(false);

  const [systemName, setSystemName] = useState(() => localStorage.getItem('zaihong:systemName') || '在鸿设备管理系统');
  const [logoType, setLogoType] = useState(() => localStorage.getItem('zaihong:logoType') || 'chip');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  const saveAll = () => {
    toast.success('所有配置已保存，部分更改将在重启服务后生效。');
  };

  const resetAll = () => {
    setNetwork({ ...MOCK_NETWORK_SETTINGS });
    setTime({ ...MOCK_TIME_SETTINGS });
    setSecurity({ ...MOCK_SECURITY_SETTINGS });
    setServices([...MOCK_SERVICES]);
    setShowResetDialog(false);
    toast.success('已恢复默认配置');
  };

  const addAllowedIp = () => {
    if (!newIp.trim()) return;
    if (security.allowedIps.includes(newIp.trim())) {
      toast.info('该 IP 已在白名单中');
      return;
    }
    setSecurity((prev) => ({ ...prev, allowedIps: [...prev.allowedIps, newIp.trim()] }));
    setNewIp('');
  };

  const removeAllowedIp = (ip: string) => {
    setSecurity((prev) => ({ ...prev, allowedIps: prev.allowedIps.filter((i) => i !== ip) }));
  };

  const toggleService = (id: string) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: s.status === 'running' ? ('stopped' as const) : ('running' as const) }
          : s
      )
    );
    const svc = services.find((s) => s.id === id);
    if (svc) {
      toast.success(`${svc.name} 已${svc.status === 'running' ? '停止' : '启动'}`);
    }
  };

  const handleSaveAppearance = () => {
    localStorage.setItem('zaihong:systemName', systemName);
    localStorage.setItem('zaihong:logoType', logoType);
    window.dispatchEvent(new Event('zaihong:appearance-changed'));
    toast.success('系统外观已更新');
  };

  const handleChangePassword = () => {
    if (!currentPassword) {
      toast.error('请输入当前密码');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      toast.error('新密码至少 4 个字符');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }

    const stored = localStorage.getItem('zaihong:credentials');
    if (!stored) {
      toast.error('未找到账号信息');
      return;
    }

    try {
      const creds = JSON.parse(stored);
      if (creds.password !== currentPassword) {
        toast.error('当前密码不正确');
        return;
      }
      creds.password = newPassword;
      localStorage.setItem('zaihong:credentials', JSON.stringify(creds));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      toast.success('密码已修改成功');
    } catch {
      toast.error('密码修改失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">系统设置</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)}>
            <RotateCcw className="size-3.5 mr-1" />
            恢复默认
          </Button>
          <Button size="sm" onClick={saveAll}>
            <Save className="size-3.5 mr-1" />
            保存配置
          </Button>
        </div>
      </div>

      {/* Network Settings */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            网络设置
          </CardTitle>
          <CardDescription>配置网关设备的网络参数</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'ipAddress', label: 'IP 地址' },
              { key: 'subnetMask', label: '子网掩码' },
              { key: 'gateway', label: '默认网关' },
              { key: 'dnsPrimary', label: '首选 DNS' },
              { key: 'dnsSecondary', label: '备用 DNS' },
            ].map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs">{field.label}</Label>
                <Input
                  value={network[field.key as keyof INetworkSettings]}
                  onChange={(e) =>
                    setNetwork((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  className="h-9 text-sm"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time Settings */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            时间设置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">时区</Label>
              <Select
                value={time.timezone}
                onValueChange={(v) => setTime((prev) => ({ ...prev, timezone: v }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Shanghai">Asia/Shanghai (UTC+8)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo (UTC+9)</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (UTC-5)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (UTC+0)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">NTP 服务器</Label>
              <Input
                value={time.ntpServer}
                onChange={(e) => setTime((prev) => ({ ...prev, ntpServer: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            安全设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">管理员密码</Label>
              <Input
                type="password"
                value={security.adminPassword}
                onChange={(e) =>
                  setSecurity((prev) => ({ ...prev, adminPassword: e.target.value }))
                }
                className="h-9 text-sm"
              />
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  onClick={() =>
                    setSecurity((prev) => ({ ...prev, sshEnabled: !prev.sshEnabled }))
                  }
                >
                  {security.sshEnabled ? (
                    <ToggleRight className="size-5 text-success" />
                  ) : (
                    <ToggleLeft className="size-5 text-muted-foreground" />
                  )}
                </button>
                <span className="text-sm">启用 SSH</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  onClick={() =>
                    setSecurity((prev) => ({ ...prev, httpsOnly: !prev.httpsOnly }))
                  }
                >
                  {security.httpsOnly ? (
                    <ToggleRight className="size-5 text-success" />
                  ) : (
                    <ToggleLeft className="size-5 text-muted-foreground" />
                  )}
                </button>
                <span className="text-sm">仅 HTTPS</span>
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">IP 访问白名单</Label>
            <div className="flex items-center gap-2">
              <Input
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                placeholder="输入 IP 地址"
                className="h-9 text-sm max-w-[240px]"
                onKeyDown={(e) => e.key === 'Enter' && addAllowedIp()}
              />
              <Button variant="outline" size="sm" className="h-9" onClick={addAllowedIp}>
                <Plus className="size-3.5 mr-1" />
                添加
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {security.allowedIps.map((ip) => (
                <Badge key={ip} variant="secondary" className="gap-1 text-xs">
                  {ip}
                  <button onClick={() => removeAllowedIp(ip)}>
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Appearance */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="size-4 text-primary" />
            系统外观
          </CardTitle>
          <CardDescription>自定义系统名称和 Logo 图标</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">系统名称</Label>
            <Input
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              className="h-9 text-sm max-w-md"
              placeholder="在鸿设备管理系统"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">系统 Logo</Label>
            <div className="flex items-center gap-3 flex-wrap">
              {PRESET_LOGOS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setLogoType(item.key)}
                  className={`size-12 rounded-xl flex items-center justify-center border-2 transition-all ${
                    logoType === item.key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/40 bg-card text-muted-foreground hover:border-primary/40'
                  }`}
                  title={item.label}
                >
                  <LogoIcon type={item.key} className="size-6" />
                </button>
              ))}
              <button
                className="size-12 rounded-xl flex flex-col items-center justify-center gap-0.5 border-2 border-dashed border-border/40 bg-card text-muted-foreground hover:border-primary/40 transition-all"
                title="上传自定义图标"
                onClick={() => toast.info('上传功能开发中')}
              >
                <Upload className="size-4" />
                <span className="text-[8px]">上传</span>
              </button>
            </div>
          </div>
          <Button size="sm" onClick={handleSaveAppearance}>
            <Save className="size-3.5 mr-1" />
            保存外观设置
          </Button>
        </CardContent>
      </Card>

      {/* Account Security */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="size-4 text-primary" />
            账号安全
          </CardTitle>
          <CardDescription>修改管理员登录密码</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div className="space-y-2">
              <Label className="text-xs">当前密码</Label>
              <div className="relative">
                <Input
                  type={showCurrentPwd ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="输入当前密码"
                  className="h-9 text-sm pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPwd ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">新密码</Label>
              <div className="relative">
                <Input
                  type={showNewPwd ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="输入新密码（至少4位）"
                  className="h-9 text-sm pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPwd ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">确认新密码</Label>
              <Input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="再次输入新密码"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <Button size="sm" onClick={handleChangePassword}>
            <Key className="size-3.5 mr-1" />
            修改密码
          </Button>
        </CardContent>
      </Card>

      {/* Services */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="size-4 text-primary" />
            系统服务管理
          </CardTitle>
          <CardDescription>管理系统服务的启停状态</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border/30">
            {services.map((svc) => {
              const cfg = SERVICE_STATUS_CONFIG[svc.status];
              const Icon = cfg.icon;
              return (
                <div key={svc.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`size-8 rounded-lg flex items-center justify-center ${svc.status === 'running' ? 'bg-success/10' : svc.status === 'error' ? 'bg-destructive/10' : 'bg-muted/40'}`}>
                      <Icon className={`size-4 ${cfg.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{svc.name}</span>
                        <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                          {cfg.label}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        端口: {svc.port} · {svc.description}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleService(svc.id)}
                    className="shrink-0 ml-4"
                  >
                    {svc.status === 'running' ? (
                      <ToggleRight className="size-5 text-success" />
                    ) : (
                      <ToggleLeft className="size-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="border-border/40 bg-card/95">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="size-5 text-warning" />
              恢复默认配置
            </DialogTitle>
            <DialogDescription>
              此操作将把所有设置恢复为出厂默认值。已保存的配置将丢失。是否继续？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={resetAll}>
              确认恢复
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
