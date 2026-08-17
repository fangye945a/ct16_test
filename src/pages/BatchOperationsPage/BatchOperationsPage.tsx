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

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { toast } from 'sonner';
import {
  AppWindow,
  Archive,
  Boxes,
  CheckCircle2,
  CircleAlert,
  Clock3,
  DatabaseBackup,
  Download,
  FileArchive,
  FileSpreadsheet,
  History,
  ListChecks,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MOCK_DEVICE_CONTROLLERS, type IDeviceController } from '@/data/device-controllers';
import { BuildDataPointValues, GetDeviceCategory, GetDeviceGroup, GetDeviceInstances, SaveDeviceInstances, type IDeviceInstance } from '@/data/device-instances';
import type { IDeviceModel } from '@/data/device-models';
import {
  CreateConfigurationBackups,
  DownloadConfigurationBackup,
  GetApplicationPackages,
  GetBatchOperationTasks,
  GetConfigurationBackups,
  GetSyncPolicies,
  ParseConfigurationBackup,
  RecordBatchOperationResult,
  RetryBatchOperation,
  RunBatchOperation,
  RunSyncPolicy,
  SaveApplicationPackage,
  SaveSyncPolicy,
  SetSyncPolicyEnabled,
  type BackupScope,
  type BatchOperationType,
  type IApplicationPackage,
  type IBatchOperationTask,
  type IConfigurationBackup,
  type IConfigurationBackupPayload,
  type ISyncPolicy,
  type SyncContentType,
  type SyncTriggerType,
} from '@/services/batchOperationsPrototype';
import { GetPrototypeDeviceModels, SavePrototypeDeviceModels } from '@/services/prototypeDeviceModels';
import BatchDeviceImportDialog from './BatchDeviceImportDialog';
import type { IDeviceBatchImportResult, IDeviceBatchImportRow } from './deviceBatchImport';

type OperationDialogType = Exclude<BatchOperationType, 'device' | 'restore'>;

const TASK_LABELS: Record<BatchOperationType, string> = {
  device: '批量添加设备',
  model: '分发设备模型',
  application: '安装应用程序',
  parameter: '修改配置参数',
  restore: '恢复设备配置',
};

const SYNC_CONTENT_LABELS: Record<SyncContentType, string> = {
  model: '设备模型',
  application: '应用程序',
  parameter: '配置参数',
};

const BACKUP_SCOPE_LABELS: Record<BackupScope, string> = {
  system: '系统参数',
  models: '设备模型',
  devices: '设备配置',
};

function FormatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ToggleValue<T extends string>(values: T[], value: T, checked: boolean): T[] {
  return checked ? [...new Set([...values, value])] : values.filter((item) => item !== value);
}

function GetTaskStatus(task: IBatchOperationTask) {
  if (task.status === 'succeeded') {
    return { label: '全部成功', className: 'bg-success/10 text-success' };
  }
  if (task.status === 'partial') {
    return { label: '部分失败', className: 'bg-warning/10 text-warning' };
  }
  return { label: '执行中', className: 'bg-primary/10 text-primary' };
}

function TargetSelector({ controllers, selectedIds, onChange }: { controllers: IDeviceController[]; selectedIds: string[]; onChange: (ids: string[]) => void }) {
  return (
    <div className="grid max-h-56 gap-2 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-2">
      {controllers.map((controller) => {
        const selected = selectedIds.includes(controller.id);
        return (
          <label
            key={controller.id}
            className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
              selected ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:bg-muted/50'
            }`}
          >
            <Checkbox checked={selected} onCheckedChange={(checked) => onChange(ToggleValue(selectedIds, controller.id, checked === true))} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-medium">
                {controller.name}
                {controller.status === 'online' ? <Wifi className="size-3.5 text-success" /> : <WifiOff className="size-3.5 text-muted-foreground" />}
              </span>
              <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">{controller.serialNumber}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

function OperationDialog({
  type,
  models,
  controllers,
  running,
  onClose,
  onRun,
}: {
  type: OperationDialogType | null;
  models: IDeviceModel[];
  controllers: IDeviceController[];
  running: boolean;
  onClose: () => void;
  onRun: (type: OperationDialogType, name: string, targetIds: string[], app?: { file: File; name: string; version: string }) => void;
}) {
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [modelId, setModelId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [appName, setAppName] = useState('');
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [parameterGroup, setParameterGroup] = useState('network');
  const [parameterKey, setParameterKey] = useState('report.interval');
  const [parameterValue, setParameterValue] = useState('30');

  useEffect(() => {
    if (type) {
      setTargetIds([]);
      setModelId(models[0]?.id || '');
      setFile(null);
      setAppName('');
      setAppVersion('1.0.0');
    }
  }, [models, type]);

  const Submit = () => {
    if (!type || targetIds.length === 0) {
      toast.error('请至少选择一个目标控制器');
      return;
    }
    if (type === 'model') {
      const model = models.find((item) => item.id === modelId);
      if (!model) {
        toast.error('请选择需要分发的设备模型');
        return;
      }
      onRun(type, `分发模型：${model.name} ${model.version}`, targetIds);
      return;
    }
    if (type === 'application') {
      if (!file || !/\.hap$/i.test(file.name)) {
        toast.error('请选择 .hap 格式的应用程序包');
        return;
      }
      if (!appName.trim() || !appVersion.trim()) {
        toast.error('请填写应用名称和版本');
        return;
      }
      onRun(type, `安装应用：${appName.trim()} ${appVersion.trim()}`, targetIds, { file, name: appName.trim(), version: appVersion.trim() });
      return;
    }
    if (!parameterKey.trim() || !parameterValue.trim()) {
      toast.error('请填写配置参数和值');
      return;
    }
    onRun(type, `修改参数：${parameterGroup}.${parameterKey} = ${parameterValue}`, targetIds);
  };

  return (
    <Dialog open={Boolean(type)} onOpenChange={(open) => !open && !running && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{type ? TASK_LABELS[type] : ''}</DialogTitle>
          <DialogDescription>选择任务内容和软总线目标，执行前可再次确认影响范围。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {type === 'model' && (
            <div className="space-y-2">
              <Label>设备模型</Label>
              <Select value={modelId} onValueChange={setModelId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择设备模型" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name} · {model.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {type === 'application' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>HAP 应用程序包</Label>
                <Input type="file" accept=".hap" onChange={(event) => setFile(event.target.files?.[0] || null)} />
              </div>
              <div className="space-y-2">
                <Label>应用名称</Label>
                <Input value={appName} onChange={(event) => setAppName(event.target.value)} placeholder="例如：隧道监控服务" />
              </div>
              <div className="space-y-2">
                <Label>应用版本</Label>
                <Input value={appVersion} onChange={(event) => setAppVersion(event.target.value)} />
              </div>
              {file && (
                <div className="sm:col-span-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  {file.name} · {FormatBytes(file.size)}
                </div>
              )}
            </div>
          )}
          {type === 'parameter' && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>参数分类</Label>
                <Select value={parameterGroup} onValueChange={setParameterGroup}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="network">网络参数</SelectItem>
                    <SelectItem value="collector">采集参数</SelectItem>
                    <SelectItem value="logging">日志参数</SelectItem>
                    <SelectItem value="system">系统参数</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>参数键</Label>
                <Input value={parameterKey} onChange={(event) => setParameterKey(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>新值</Label>
                <Input value={parameterValue} onChange={(event) => setParameterValue(event.target.value)} />
              </div>
              <div className="sm:col-span-3 rounded-md border border-warning/20 bg-warning/5 px-3 py-2 text-xs text-muted-foreground">
                任务执行时将先比较目标设备当前值，仅向存在差异的控制器写入新值。
              </div>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>目标控制器</Label>
              <span className="text-xs text-muted-foreground">已选择 {targetIds.length} 台</span>
            </div>
            <TargetSelector controllers={controllers} selectedIds={targetIds} onChange={setTargetIds} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={running}>
            取消
          </Button>
          <Button onClick={Submit} disabled={running}>
            {running ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Play className="mr-1.5 size-4" />}
            {running ? '正在执行' : '确认执行'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SyncPolicyDialog({
  open,
  controllers,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  controllers: IDeviceController[];
  saving: boolean;
  onClose: () => void;
  onSave: (policy: Omit<ISyncPolicy, 'id' | 'lastRunAt' | 'lastStatus'>) => void;
}) {
  const [name, setName] = useState('配置自动同步策略');
  const [sourceId, setSourceId] = useState(controllers[0]?.id || '');
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [contents, setContents] = useState<SyncContentType[]>(['model']);
  const [trigger, setTrigger] = useState<SyncTriggerType>('change');
  const [schedule, setSchedule] = useState('每天 02:00');

  useEffect(() => {
    if (open) {
      setName('配置自动同步策略');
      setSourceId(controllers[0]?.id || '');
      setTargetIds([]);
      setContents(['model']);
      setTrigger('change');
    }
  }, [controllers, open]);

  const targets = controllers.filter((controller) => controller.id !== sourceId);
  const Submit = () => {
    if (!name.trim() || !sourceId || targetIds.length === 0 || contents.length === 0) {
      toast.error('请完整填写策略名称、同步内容和目标控制器');
      return;
    }
    onSave({
      name: name.trim(),
      sourceControllerId: sourceId,
      targetControllerIds: targetIds,
      contents,
      trigger,
      schedule: trigger === 'schedule' ? schedule.trim() : '',
      enabled: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新增自动同步策略</DialogTitle>
          <DialogDescription>源控制器配置发生变化后，通过软总线自动同步至目标控制器。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>策略名称</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>源控制器</Label>
              <Select
                value={sourceId}
                onValueChange={(value) => {
                  setSourceId(value);
                  setTargetIds((ids) => ids.filter((id) => id !== value));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {controllers.map((controller) => (
                    <SelectItem key={controller.id} value={controller.id}>
                      {controller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>同步内容</Label>
            <div className="flex flex-wrap gap-3 rounded-lg border border-border p-3">
              {(Object.keys(SYNC_CONTENT_LABELS) as SyncContentType[]).map((content) => (
                <label key={content} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={contents.includes(content)} onCheckedChange={(checked) => setContents(ToggleValue(contents, content, checked === true))} />
                  {SYNC_CONTENT_LABELS[content]}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>触发方式</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={trigger === 'change' ? 'default' : 'outline'} onClick={() => setTrigger('change')}>
                配置变更时
              </Button>
              <Button type="button" variant={trigger === 'schedule' ? 'default' : 'outline'} onClick={() => setTrigger('schedule')}>
                定时同步
              </Button>
            </div>
            {trigger === 'schedule' && <Input value={schedule} onChange={(event) => setSchedule(event.target.value)} placeholder="例如：每天 02:00" />}
          </div>
          <div className="space-y-2">
            <Label>目标控制器</Label>
            <TargetSelector controllers={targets} selectedIds={targetIds} onChange={setTargetIds} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={Submit} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}保存策略
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RestoreDialog({
  payload,
  controllers,
  restoring,
  onClose,
  onRestore,
}: {
  payload: IConfigurationBackupPayload | null;
  controllers: IDeviceController[];
  restoring: boolean;
  onClose: () => void;
  onRestore: (controller: IDeviceController) => void;
}) {
  const compatibleControllers = payload ? controllers.filter((controller) => controller.model === payload.sourceController.model) : [];
  const [targetId, setTargetId] = useState('');

  useEffect(() => {
    setTargetId(compatibleControllers[0]?.id || '');
  }, [payload]);

  const target = compatibleControllers.find((controller) => controller.id === targetId);
  return (
    <Dialog open={Boolean(payload)} onOpenChange={(open) => !open && !restoring && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="size-5 text-primary" />
            恢复设备配置
          </DialogTitle>
          <DialogDescription>配置文件已通过结构校验。恢复会覆盖目标设备中对应范围的数据。</DialogDescription>
        </DialogHeader>
        {payload && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/20 p-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">来源设备</div>
                <div className="mt-1 font-medium">{payload.sourceController.name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">设备型号</div>
                <div className="mt-1 font-medium">{payload.sourceController.model}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">备份时间</div>
                <div className="mt-1">{payload.createdAt}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">恢复范围</div>
                <div className="mt-1">{payload.scopes.map((scope) => BACKUP_SCOPE_LABELS[scope]).join('、')}</div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>目标控制器</Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择相同型号控制器" />
                </SelectTrigger>
                <SelectContent>
                  {compatibleControllers.map((controller) => (
                    <SelectItem key={controller.id} value={controller.id}>
                      {controller.name} · {controller.status === 'online' ? '在线' : '离线'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {compatibleControllers.length === 0 && <p className="text-xs text-destructive">没有找到型号兼容的目标控制器。</p>}
            </div>
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
              恢复前请确认目标设备已停止关键业务。原型仅修改浏览器中的模拟配置。
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={restoring}>
            取消
          </Button>
          <Button onClick={() => target && onRestore(target)} disabled={!target || restoring}>
            {restoring && <Loader2 className="mr-1.5 size-4 animate-spin" />}确认恢复
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BatchOperationsPage() {
  const [models, setModels] = useState<IDeviceModel[]>(() => GetPrototypeDeviceModels());
  const [devices, setDevices] = useState<IDeviceInstance[]>(() => GetDeviceInstances());
  const [tasks, setTasks] = useState<IBatchOperationTask[]>([]);
  const [policies, setPolicies] = useState<ISyncPolicy[]>([]);
  const [applications, setApplications] = useState<IApplicationPackage[]>([]);
  const [backups, setBackups] = useState<IConfigurationBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchImportOpen, setBatchImportOpen] = useState(false);
  const [operationType, setOperationType] = useState<OperationDialogType | null>(null);
  const [operationRunning, setOperationRunning] = useState(false);
  const [selectedTask, setSelectedTask] = useState<IBatchOperationTask | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [runningPolicyId, setRunningPolicyId] = useState<string | null>(null);
  const [backupControllerIds, setBackupControllerIds] = useState<string[]>([]);
  const [backupScopes, setBackupScopes] = useState<BackupScope[]>(['system', 'models', 'devices']);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restorePayload, setRestorePayload] = useState<IConfigurationBackupPayload | null>(null);
  const [restoring, setRestoring] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  const LoadData = async () => {
    try {
      const [nextTasks, nextPolicies, nextApps, nextBackups] = await Promise.all([
        GetBatchOperationTasks(),
        GetSyncPolicies(),
        GetApplicationPackages(),
        GetConfigurationBackups(),
      ]);
      setTasks(nextTasks);
      setPolicies(nextPolicies);
      setApplications(nextApps);
      setBackups(nextBackups);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '批量运维数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void LoadData();
  }, []);

  const taskSuccessCount = tasks.filter((task) => task.status === 'succeeded').length;
  const taskFailureCount = tasks.filter((task) => task.status === 'partial').length;
  const onlineControllers = MOCK_DEVICE_CONTROLLERS.filter((controller) => controller.status === 'online');

  const HandleBatchAdd = (rows: IDeviceBatchImportRow[]) => {
    if (rows.length === 0) {
      return;
    }
    const nextDevices = rows.reduce<IDeviceInstance[]>((current, row, index) => {
      const model = models.find((item) => item.id === row.modelId);
      if (!model) {
        return current;
      }
      const firstInterface = model.interfaces?.[0];
      const interfaceType = firstInterface?.type || row.interfaceType || 'ETH';
      const dataPointValues = BuildDataPointValues(model);
      const firstPoint = model.dataPoints[0];
      const device: IDeviceInstance = {
        id: `device-${Date.now()}-${index}`,
        name: row.name,
        modelId: model.id,
        modelName: model.name,
        deviceType: model.name,
        category: GetDeviceCategory(model.type),
        interfaceType,
        interfaceLabel: firstInterface?.name || row.interfaceLabel || interfaceType,
        status: 'normal',
        serialNumber: row.serialNumber,
        address: row.address,
        description: row.description,
        location: row.location,
        displayValue: firstPoint ? dataPointValues[firstPoint.identifier] : '-',
        displayUnit: firstPoint?.unit || '',
        dataPointValues,
        interfaceConfigs: model.interfaces?.reduce<Record<string, string[]>>((configs, item) => {
          configs[item.identifier] = item.defaultConfig.map(String);
          return configs;
        }, {}),
        lastUpdate: '刚刚',
        angle: 0,
        distance: 200,
        group: GetDeviceGroup(interfaceType),
      };
      return [device, ...current];
    }, devices);
    setDevices(nextDevices);
    SaveDeviceInstances(nextDevices);
    toast.success(`本机成功添加 ${rows.length} 台设备`);
  };

  const HandleBatchImportComplete = async (results: IDeviceBatchImportResult[]) => {
    const task = await RecordBatchOperationResult(
      'device',
      `Excel 批量添加 ${results.length} 台设备`,
      results.map((result) => ({
        controllerId: `${result.row.targetController?.id || 'unknown'}-${result.row.rowNumber}`,
        controllerName: `${result.row.targetController?.name || '未知控制器'} · ${result.row.name}`,
        status: result.status,
        message: result.message,
      })),
    );
    setTasks((current) => [task, ...current]);
  };

  const ExecuteOperation = async (type: OperationDialogType, name: string, targetIds: string[], app?: { file: File; name: string; version: string }) => {
    try {
      setOperationRunning(true);
      if (app) {
        await SaveApplicationPackage(app.file, app.name, app.version);
      }
      const targets = MOCK_DEVICE_CONTROLLERS.filter((controller) => targetIds.includes(controller.id));
      const task = await RunBatchOperation(type, name, targets);
      setTasks((current) => [task, ...current]);
      setOperationType(null);
      await LoadData();
      toast[task.status === 'partial' ? 'warning' : 'success'](task.status === 'partial' ? '任务已完成，部分控制器执行失败' : '批量任务执行成功');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '批量任务执行失败');
    } finally {
      setOperationRunning(false);
    }
  };

  const RetryTask = async (task: IBatchOperationTask) => {
    try {
      const retried = await RetryBatchOperation(task.id, MOCK_DEVICE_CONTROLLERS);
      await LoadData();
      setSelectedTask(retried);
      toast[retried.status === 'partial' ? 'warning' : 'success']('失败项重试任务已完成');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '任务重试失败');
    }
  };

  const SavePolicy = async (policy: Omit<ISyncPolicy, 'id' | 'lastRunAt' | 'lastStatus'>) => {
    try {
      setSavingPolicy(true);
      await SaveSyncPolicy(policy);
      setSyncDialogOpen(false);
      await LoadData();
      toast.success('自动同步策略已保存');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '同步策略保存失败');
    } finally {
      setSavingPolicy(false);
    }
  };

  const ExecutePolicy = async (policy: ISyncPolicy) => {
    try {
      setRunningPolicyId(policy.id);
      const next = await RunSyncPolicy(policy.id, MOCK_DEVICE_CONTROLLERS);
      setPolicies((current) => current.map((item) => (item.id === next.id ? next : item)));
      toast[next.lastStatus === 'partial' ? 'warning' : 'success'](next.lastStatus === 'partial' ? '同步完成，部分控制器离线' : '同步执行成功');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '同步执行失败');
    } finally {
      setRunningPolicyId(null);
    }
  };

  const CreateBackups = async () => {
    if (backupControllerIds.length === 0 || backupScopes.length === 0) {
      toast.error('请选择备份设备和备份范围');
      return;
    }
    try {
      setCreatingBackup(true);
      const controllers = onlineControllers.filter((controller) => backupControllerIds.includes(controller.id));
      const created = await CreateConfigurationBackups(controllers, backupScopes, models, devices);
      setBackups((current) => [...created, ...current]);
      setBackupControllerIds([]);
      toast.success(`已完成 ${created.length} 台设备的配置备份`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '配置备份失败');
    } finally {
      setCreatingBackup(false);
    }
  };

  const RestoreConfiguration = async (controller: IDeviceController) => {
    if (!restorePayload) {
      return;
    }
    try {
      setRestoring(true);
      if (controller.id === 'net-master') {
        if (restorePayload.models) {
          SavePrototypeDeviceModels(restorePayload.models);
          setModels(restorePayload.models);
        }
        if (restorePayload.devices) {
          SaveDeviceInstances(restorePayload.devices);
          setDevices(restorePayload.devices);
        }
      } else {
        await RunBatchOperation('restore', `恢复配置：${controller.name}`, [controller]);
        await LoadData();
      }
      setRestorePayload(null);
      toast.success(`“${controller.name}”配置恢复任务已完成`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '设备配置恢复失败');
    } finally {
      setRestoring(false);
    }
  };

  const ParseRestoreFile = async (file: File) => {
    try {
      setRestorePayload(await ParseConfigurationBackup(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '配置文件读取失败');
    }
  };

  const operationCards: Array<{ type: BatchOperationType; title: string; description: string; icon: ComponentType<{ className?: string }> }> = [
    { type: 'device', title: '批量添加设备', description: '通过 Excel 模板校验并按控制器 SN 分发设备。', icon: FileSpreadsheet },
    { type: 'model', title: '分发设备模型', description: '将当前网关中的设备模型同步至多个控制器。', icon: Boxes },
    { type: 'application', title: '安装应用程序', description: `校验 HAP 包信息并批量下发，已上传 ${applications.length} 个应用包。`, icon: AppWindow },
    { type: 'parameter', title: '修改配置参数', description: '预览差异后批量修改网络、采集和系统参数。', icon: SlidersHorizontal },
  ];

  const currentBackupPayload = useMemo(() => restorePayload, [restorePayload]);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin text-primary" />
        正在加载批量运维数据
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">批量运维管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">借助鸿蒙软总线统一分发设备、模型、应用和配置，并管理自动同步与故障恢复。</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>在线控制器</span>
              <Wifi className="size-4 text-success" />
            </div>
            <div className="mt-1 text-2xl font-bold">
              {onlineControllers.length} / {MOCK_DEVICE_CONTROLLERS.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>成功任务</span>
              <CheckCircle2 className="size-4 text-success" />
            </div>
            <div className="mt-1 text-2xl font-bold text-success">{taskSuccessCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>待处理失败</span>
              <CircleAlert className="size-4 text-warning" />
            </div>
            <div className="mt-1 text-2xl font-bold text-warning">{taskFailureCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>配置备份</span>
              <DatabaseBackup className="size-4 text-primary" />
            </div>
            <div className="mt-1 text-2xl font-bold">{backups.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList className="grid h-auto w-full max-w-2xl grid-cols-3 bg-muted/60 p-1">
          <TabsTrigger value="tasks" className="gap-1.5 py-2.5">
            <ListChecks className="size-4" />
            批量任务
          </TabsTrigger>
          <TabsTrigger value="sync" className="gap-1.5 py-2.5">
            <RefreshCw className="size-4" />
            自动同步
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-1.5 py-2.5">
            <Archive className="size-4" />
            配置备份
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {operationCards.map((operation) => (
              <Card key={operation.type} className="transition-colors hover:border-primary/30">
                <CardContent className="flex h-full flex-col p-4">
                  <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <operation.icon className="size-5" />
                  </div>
                  <div className="mt-3 font-semibold">{operation.title}</div>
                  <p className="mt-1 flex-1 text-sm leading-6 text-muted-foreground">{operation.description}</p>
                  <Button
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={() => (operation.type === 'device' ? setBatchImportOpen(true) : setOperationType(operation.type as OperationDialogType))}
                  >
                    开始操作
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="size-4 text-primary" />
                任务记录
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">暂无批量任务记录</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>任务名称</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>创建时间</TableHead>
                        <TableHead>进度</TableHead>
                        <TableHead>结果</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.map((task) => {
                        const status = GetTaskStatus(task);
                        return (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium">{task.name}</TableCell>
                            <TableCell>{TASK_LABELS[task.type]}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{task.createdAt}</TableCell>
                            <TableCell>
                              <div className="flex min-w-28 items-center gap-2">
                                <Progress value={task.progress} className="h-1.5" />
                                <span className="text-xs">{task.progress}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={status.className}>{status.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedTask(task)}>
                                查看详情
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync" className="mt-0 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setSyncDialogOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              新增同步策略
            </Button>
          </div>
          {policies.length === 0 ? (
            <Card>
              <CardContent className="py-14 text-center text-sm text-muted-foreground">尚未创建自动同步策略</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {policies.map((policy) => {
                const source = MOCK_DEVICE_CONTROLLERS.find((controller) => controller.id === policy.sourceControllerId);
                return (
                  <Card key={policy.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{policy.name}</span>
                            <Badge variant="outline">{policy.trigger === 'change' ? '变更触发' : policy.schedule}</Badge>
                            {policy.contents.map((content) => (
                              <Badge key={content} variant="secondary">
                                {SYNC_CONTENT_LABELS[content]}
                              </Badge>
                            ))}
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            {source?.name || '未知源设备'} → {policy.targetControllerIds.length} 台目标控制器
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            最近执行：{policy.lastRunAt} · {policy.lastStatus === 'success' ? '成功' : policy.lastStatus === 'partial' ? '部分失败' : '尚未执行'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={policy.enabled}
                            onCheckedChange={async (enabled) => {
                              try {
                                const next = await SetSyncPolicyEnabled(policy.id, enabled);
                                setPolicies((current) => current.map((item) => (item.id === next.id ? next : item)));
                              } catch (error) {
                                toast.error(error instanceof Error ? error.message : '策略状态更新失败');
                              }
                            }}
                          />
                          <Button variant="outline" onClick={() => void ExecutePolicy(policy)} disabled={!policy.enabled || runningPolicyId === policy.id}>
                            {runningPolicyId === policy.id ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Play className="mr-1.5 size-4" />}立即同步
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="backup" className="mt-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">创建批量配置备份</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>备份设备</Label>
                  <span className="text-xs text-muted-foreground">离线设备需恢复连接后备份</span>
                </div>
                <TargetSelector controllers={onlineControllers} selectedIds={backupControllerIds} onChange={setBackupControllerIds} />
              </div>
              <div className="space-y-2">
                <Label>备份范围</Label>
                <div className="flex flex-wrap gap-4 rounded-lg border border-border p-3">
                  {(Object.keys(BACKUP_SCOPE_LABELS) as BackupScope[]).map((scope) => (
                    <label key={scope} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={backupScopes.includes(scope)} onCheckedChange={(checked) => setBackupScopes(ToggleValue(backupScopes, scope, checked === true))} />
                      {BACKUP_SCOPE_LABELS[scope]}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <input
                  ref={restoreInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) void ParseRestoreFile(file);
                  }}
                />
                <Button variant="outline" onClick={() => restoreInputRef.current?.click()}>
                  <Upload className="mr-1.5 size-4" />
                  上传配置恢复
                </Button>
                <Button onClick={() => void CreateBackups()} disabled={creatingBackup}>
                  {creatingBackup ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <DatabaseBackup className="mr-1.5 size-4" />}创建备份
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">备份记录</CardTitle>
            </CardHeader>
            <CardContent>
              {backups.length === 0 ? (
                <div className="py-12 text-center">
                  <FileArchive className="mx-auto size-9 text-muted-foreground/40" />
                  <div className="mt-3 text-sm text-muted-foreground">暂无配置备份</div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>备份名称</TableHead>
                        <TableHead>设备</TableHead>
                        <TableHead>范围</TableHead>
                        <TableHead>创建时间</TableHead>
                        <TableHead>大小</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backups.map((backup) => (
                        <TableRow key={backup.id}>
                          <TableCell className="font-medium">{backup.name}</TableCell>
                          <TableCell>
                            {backup.controllerName}
                            <div className="text-xs text-muted-foreground">{backup.controllerModel}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {backup.scopes.map((scope) => (
                                <Badge key={scope} variant="secondary">
                                  {BACKUP_SCOPE_LABELS[scope]}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{backup.createdAt}</TableCell>
                          <TableCell>{FormatBytes(backup.size)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" title="下载备份" onClick={() => DownloadConfigurationBackup(backup)}>
                                <Download className="size-4" />
                              </Button>
                              <Button variant="ghost" size="icon" title="恢复配置" onClick={() => setRestorePayload(backup.payload)}>
                                <RotateCcw className="size-4" />
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
      </Tabs>

      <BatchDeviceImportDialog
        open={batchImportOpen}
        devices={devices}
        models={models}
        onAddLocalDevices={HandleBatchAdd}
        onComplete={(results) => void HandleBatchImportComplete(results)}
        onClose={() => setBatchImportOpen(false)}
      />
      <OperationDialog
        type={operationType}
        models={models}
        controllers={MOCK_DEVICE_CONTROLLERS}
        running={operationRunning}
        onClose={() => setOperationType(null)}
        onRun={(type, name, targetIds, app) => void ExecuteOperation(type, name, targetIds, app)}
      />
      <SyncPolicyDialog
        open={syncDialogOpen}
        controllers={MOCK_DEVICE_CONTROLLERS}
        saving={savingPolicy}
        onClose={() => setSyncDialogOpen(false)}
        onSave={(policy) => void SavePolicy(policy)}
      />
      <RestoreDialog
        payload={currentBackupPayload}
        controllers={MOCK_DEVICE_CONTROLLERS}
        restoring={restoring}
        onClose={() => setRestorePayload(null)}
        onRestore={(controller) => void RestoreConfiguration(controller)}
      />

      <AlertDialog open={Boolean(selectedTask)} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{selectedTask?.name}</AlertDialogTitle>
            <AlertDialogDescription>逐设备执行结果和软总线返回信息。</AlertDialogDescription>
          </AlertDialogHeader>
          {selectedTask && (
            <div className="max-h-80 overflow-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>控制器</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>说明</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedTask.results.map((result) => (
                    <TableRow key={result.controllerId}>
                      <TableCell>{result.controllerName}</TableCell>
                      <TableCell>
                        {result.status === 'success' ? <span className="text-xs text-success">成功</span> : <span className="text-xs text-destructive">失败</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{result.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>关闭</AlertDialogCancel>
            {selectedTask?.status === 'partial' && selectedTask.type !== 'device' && (
              <AlertDialogAction onClick={() => void RetryTask(selectedTask)}>
                <RefreshCw className="mr-1.5 size-4" />
                重试失败项
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
