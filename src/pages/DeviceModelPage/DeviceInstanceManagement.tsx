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

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Activity,
  Cable,
  CircleAlert,
  Eye,
  Hash,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Wifi,
} from 'lucide-react';
import { toast } from 'sonner';
import { type IDataPoint, type IDeviceModel } from '@/data/device-models';
import {
  BuildDataPointValues,
  DEVICE_INSTANCES_CHANGED_EVENT,
  GetDefaultDataPointValue,
  GetDeviceCategory,
  GetDeviceGroup,
  GetDeviceInstances,
  SaveDeviceInstances,
  type DeviceStatus,
  type IDeviceInstance,
} from '@/data/device-instances';
import BatchDeviceImportDialog from './components/BatchDeviceImportDialog';
import type { IDeviceBatchImportRow } from './deviceBatchImport';

const INTERFACE_TYPES = ['RS485', 'ETH', 'DI', 'DO', 'AI', 'AO'];
const DEVICE_STATUS_OPTIONS: Array<{ value: DeviceStatus | 'all'; label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'normal', label: '正常' },
  { value: 'warning', label: '告警' },
  { value: 'offline', label: '离线' },
];

interface DeviceDraft {
  name: string
  modelId: string
  serialNumber: string
  interfaceType: string
  interfaceLabel: string
  address: string
  location: string
  description: string
}

function GetEmptyDraft(models: IDeviceModel[]): DeviceDraft {
  return {
    name: '',
    modelId: models[0]?.id || '',
    serialNumber: '',
    interfaceType: 'RS485',
    interfaceLabel: 'RS485-1',
    address: '',
    location: '',
    description: '',
  };
}

function GetDraftFromDevice(device: IDeviceInstance): DeviceDraft {
  return {
    name: device.name,
    modelId: device.modelId,
    serialNumber: device.serialNumber,
    interfaceType: device.interfaceType,
    interfaceLabel: device.interfaceLabel,
    address: device.address,
    location: device.location,
    description: device.description,
  };
}

function NormalizeSerialNumber(serialNumber: string): string {
  return serialNumber.trim().toUpperCase();
}

function IsValidSerialNumber(serialNumber: string): boolean {
  return /^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(serialNumber);
}

function GetModelSerialPrefix(model: IDeviceModel): string {
  const prefixMap: Record<string, string> = {
    传感器: 'SEN',
    仪表: 'MTR',
    驱动器: 'DRV',
    控制器: 'CTL',
  };
  return prefixMap[model.type] || 'DEV';
}

function GenerateSerialNumber(model: IDeviceModel, devices: IDeviceInstance[]): string {
  const prefix = `SN-${GetModelSerialPrefix(model)}`;
  let sequence = devices.length + 1;
  let serialNumber = `${prefix}-${String(sequence).padStart(4, '0')}`;
  while (devices.some((device) => device.serialNumber === serialNumber)) {
    sequence += 1;
    serialNumber = `${prefix}-${String(sequence).padStart(4, '0')}`;
  }
  return serialNumber;
}

function GetStatusLabel(status: DeviceStatus): string {
  return DEVICE_STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
}

function GetStatusClassName(status: DeviceStatus): string {
  if (status === 'normal') {
    return 'bg-success/10 text-success';
  }
  if (status === 'warning') {
    return 'bg-warning/10 text-warning';
  }
  return 'bg-muted text-muted-foreground';
}

function GetDataPointValueError(dataPoint: IDataPoint, value: string): string | null {
  const trimmedValue = value.trim();
  if (dataPoint.dataType !== 'string' && !trimmedValue) {
    return `请输入${dataPoint.name}`;
  }
  if (dataPoint.dataType === 'int' && !/^-?\d+$/.test(trimmedValue)) {
    return `${dataPoint.name}必须是整数`;
  }
  if (dataPoint.dataType === 'float' && !Number.isFinite(Number(trimmedValue))) {
    return `${dataPoint.name}必须是数字`;
  }
  if ((dataPoint.dataType === 'int' || dataPoint.dataType === 'float') && dataPoint.range.includes('~')) {
    const [minimumText, maximumText] = dataPoint.range.split('~').map((item) => item.trim());
    const numericValue = Number(trimmedValue);
    if (numericValue < Number(minimumText) || numericValue > Number(maximumText)) {
      return `${dataPoint.name}应在 ${dataPoint.range} 范围内`;
    }
  }
  if (dataPoint.dataType === 'bool' && !['true', 'false'].includes(trimmedValue)) {
    return `${dataPoint.name}只能设置为 true 或 false`;
  }
  if (dataPoint.dataType === 'enum' && dataPoint.range && !dataPoint.range.split('/').includes(trimmedValue)) {
    return `${dataPoint.name}只能设置为 ${dataPoint.range}`;
  }
  return null;
}

function DeviceFormDialog({
  open,
  device,
  models,
  devices,
  onClose,
  onSubmit,
}: {
  open: boolean
  device: IDeviceInstance | null
  models: IDeviceModel[]
  devices: IDeviceInstance[]
  onClose: () => void
  onSubmit: (draft: DeviceDraft, deviceId?: string) => void
}) {
  const [draft, setDraft] = useState<DeviceDraft>(() => GetEmptyDraft(models));

  useEffect(() => {
    if (open) {
      setDraft(device ? GetDraftFromDevice(device) : GetEmptyDraft(models));
    }
  }, [device, models, open]);

  const selectedModel = models.find((model) => model.id === draft.modelId);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const serialNumber = NormalizeSerialNumber(draft.serialNumber);
    if (!draft.name.trim()) {
      toast.error('请输入设备名称');
      return;
    }
    if (!selectedModel) {
      toast.error('请选择设备模型');
      return;
    }
    if (!IsValidSerialNumber(serialNumber)) {
      toast.error('SN号需为3至64位字母、数字、下划线或连字符');
      return;
    }
    if (devices.some((item) => item.serialNumber === serialNumber && item.id !== device?.id)) {
      toast.error(`SN号「${serialNumber}」已存在`);
      return;
    }
    if (!draft.interfaceType || !draft.address.trim()) {
      toast.error('请填写通信接口和通信地址');
      return;
    }
    onSubmit({ ...draft, name: draft.name.trim(), serialNumber, address: draft.address.trim() }, device?.id);
  };

  const handleGenerateSerialNumber = () => {
    if (!selectedModel) {
      toast.error('请先选择设备模型');
      return;
    }
    setDraft((current) => ({ ...current, serialNumber: GenerateSerialNumber(selectedModel, devices) }));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-border/40 bg-card/95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5 text-primary" />
            {device ? '编辑设备' : '添加设备'}
          </DialogTitle>
          <DialogDescription>选择设备模型后，设备将继承该模型的数据点和读写能力。</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>设备名称</Label>
              <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="例如：车间温湿度传感器-01" />
            </div>
            <div className="space-y-2">
              <Label>设备模型</Label>
              <Select value={draft.modelId} onValueChange={(modelId) => setDraft({ ...draft, modelId })}>
                <SelectTrigger><SelectValue placeholder="选择设备模型" /></SelectTrigger>
                <SelectContent>
                  {models.map((model) => <SelectItem key={model.id} value={model.id}>{model.name} · {model.version}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>唯一 SN 号</Label>
              <div className="flex gap-2">
                <Input value={draft.serialNumber} onChange={(event) => setDraft({ ...draft, serialNumber: event.target.value })} placeholder="SN-XXXX-0001" className="font-mono" />
                <Button type="button" variant="outline" onClick={handleGenerateSerialNumber} className="shrink-0">自动生成</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>设备分类</Label>
              <Input value={selectedModel ? GetDeviceCategory(selectedModel.type) : ''} disabled placeholder="由模型类型决定" />
            </div>
            <div className="space-y-2">
              <Label>通信接口</Label>
              <Select value={draft.interfaceType} onValueChange={(interfaceType) => setDraft({ ...draft, interfaceType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTERFACE_TYPES.map((interfaceType) => <SelectItem key={interfaceType} value={interfaceType}>{interfaceType}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>接口编号</Label>
              <Input value={draft.interfaceLabel} onChange={(event) => setDraft({ ...draft, interfaceLabel: event.target.value })} placeholder="例如：RS485-1" />
            </div>
            <div className="space-y-2">
              <Label>通信地址</Label>
              <Input value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} placeholder="例如：MODBUS-0x01 或 192.168.1.50" />
            </div>
            <div className="space-y-2">
              <Label>安装位置</Label>
              <Input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} placeholder="例如：车间A区-东墙" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>备注</Label>
            <Textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="填写设备用途或运维说明" className="min-h-20" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>取消</Button>
            <Button type="submit">{device ? '保存修改' : '确认添加'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeviceDetailDialog({
  device,
  model,
  open,
  onClose,
  onRead,
  onWrite,
}: {
  device: IDeviceInstance | null
  model: IDeviceModel | null
  open: boolean
  onClose: () => void
  onRead: (deviceId: string, identifier: string) => void
  onWrite: (deviceId: string, dataPoint: IDataPoint, value: string) => void
}) {
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraftValues(device?.dataPointValues || {});
  }, [device]);

  if (!device) return null;

  const dataPoints = model?.dataPoints || [];
  const statusLabel = GetStatusLabel(device.status);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-border/40 bg-card/95">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <Activity className="size-5 text-primary" />
            {device.name}
            <Badge className={GetStatusClassName(device.status)}>{statusLabel}</Badge>
          </DialogTitle>
          <DialogDescription>{device.modelName} · SN {device.serialNumber}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">设备模型</div>
            <div className="mt-1 text-sm font-semibold">{device.modelName}</div>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">通信接口</div>
            <div className="mt-1 text-sm font-semibold">{device.interfaceType} · {device.interfaceLabel}</div>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">通信地址</div>
            <div className="mt-1 text-sm font-semibold break-all">{device.address}</div>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">安装位置</div>
            <div className="mt-1 flex items-center gap-1 text-sm font-semibold"><MapPin className="size-3.5 text-primary" />{device.location || '未设置'}</div>
          </div>
        </div>

        {!model || dataPoints.length === 0 ? (
          <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            该设备模型暂未定义数据点，当前只能查看设备基础信息。
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">数据点控制</div>
                <div className="text-xs text-muted-foreground">读取数据或修改模型允许写入的数据点。</div>
              </div>
              <Badge variant="outline">{dataPoints.length} 个数据点</Badge>
            </div>
            <div className="overflow-hidden rounded-xl border border-border/40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>数据点</TableHead>
                    <TableHead>当前值</TableHead>
                    <TableHead>类型 / 范围</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataPoints.map((dataPoint) => {
                    const value = draftValues[dataPoint.identifier] ?? device.dataPointValues[dataPoint.identifier] ?? GetDefaultDataPointValue(dataPoint);
                    const options = dataPoint.dataType === 'bool'
                      ? ['false', 'true']
                      : dataPoint.dataType === 'enum'
                        ? dataPoint.range.split('/').map((item) => item.trim()).filter(Boolean)
                        : [];
                    return (
                      <TableRow key={dataPoint.id}>
                        <TableCell>
                          <div className="font-medium">{dataPoint.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">{dataPoint.identifier}</div>
                        </TableCell>
                        <TableCell className="min-w-[180px]">
                          {options.length > 0 ? (
                            <Select value={value} onValueChange={(nextValue) => setDraftValues((current) => ({ ...current, [dataPoint.identifier]: nextValue }))}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                            </Select>
                          ) : (
                            <Input value={value} onChange={(event) => setDraftValues((current) => ({ ...current, [dataPoint.identifier]: event.target.value }))} className="h-8" placeholder="输入值" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{dataPoint.dataType}</Badge>
                          <div className="mt-1 text-xs text-muted-foreground">{dataPoint.range || '无范围限制'}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => onRead(device.id, dataPoint.identifier)}>
                              <RefreshCw className="mr-1 size-3.5" />读取
                            </Button>
                            {dataPoint.access === 'readwrite' && (
                              <Button size="sm" className="h-8 text-xs" onClick={() => onWrite(device.id, dataPoint, value)}>写入</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {device.description && <p className="text-sm text-muted-foreground">备注：{device.description}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DeviceInstanceManagement({ models }: { models: IDeviceModel[] }) {
  const [devices, setDevices] = useState<IDeviceInstance[]>(() => GetDeviceInstances());
  const [search, setSearch] = useState('');
  const [modelFilter, setModelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [batchImportOpen, setBatchImportOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<IDeviceInstance | null>(null);
  const [detailDeviceId, setDetailDeviceId] = useState<string | null>(null);
  const [deleteDevice, setDeleteDevice] = useState<IDeviceInstance | null>(null);

  useEffect(() => {
    const reloadDevices = () => setDevices(GetDeviceInstances());
    window.addEventListener(DEVICE_INSTANCES_CHANGED_EVENT, reloadDevices);
    return () => window.removeEventListener(DEVICE_INSTANCES_CHANGED_EVENT, reloadDevices);
  }, []);

  const filteredDevices = useMemo(() => {
    const searchText = search.trim().toLowerCase();
    return devices.filter((device) => {
      const matchesSearch = !searchText || [device.name, device.serialNumber, device.modelName, device.address].some((value) => value.toLowerCase().includes(searchText));
      const matchesModel = modelFilter === 'all' || device.modelId === modelFilter;
      const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
      return matchesSearch && matchesModel && matchesStatus;
    });
  }, [devices, modelFilter, search, statusFilter]);

  const detailDevice = devices.find((device) => device.id === detailDeviceId) || null;
  const detailModel = models.find((model) => model.id === detailDevice?.modelId) || null;
  const normalCount = devices.filter((device) => device.status === 'normal').length;
  const warningCount = devices.filter((device) => device.status === 'warning').length;
  const offlineCount = devices.filter((device) => device.status === 'offline').length;

  const UpdateDevices = (nextDevices: IDeviceInstance[]) => {
    setDevices(nextDevices);
    SaveDeviceInstances(nextDevices);
  };

  const handleSubmit = (draft: DeviceDraft, deviceId?: string) => {
    const model = models.find((item) => item.id === draft.modelId);
    if (!model) {
      toast.error('设备模型不存在，请重新选择');
      return;
    }
    const currentDevice = devices.find((device) => device.id === deviceId);
    const dataPointValues = {
      ...BuildDataPointValues(model),
      ...(currentDevice?.modelId === model.id ? currentDevice.dataPointValues : {}),
    };
    const firstDataPoint = model.dataPoints[0];
    const nextDevice: IDeviceInstance = {
      id: deviceId || `device-${Date.now()}`,
      name: draft.name,
      modelId: model.id,
      modelName: model.name,
      deviceType: model.name,
      category: GetDeviceCategory(model.type),
      interfaceType: draft.interfaceType,
      interfaceLabel: draft.interfaceLabel.trim() || draft.interfaceType,
      status: currentDevice?.status || 'normal',
      serialNumber: draft.serialNumber,
      address: draft.address,
      description: draft.description.trim(),
      location: draft.location.trim(),
      displayValue: firstDataPoint ? dataPointValues[firstDataPoint.identifier] : currentDevice?.displayValue || '-',
      displayUnit: firstDataPoint?.unit || currentDevice?.displayUnit || '',
      dataPointValues,
      lastUpdate: '刚刚',
      angle: currentDevice?.angle || 0,
      distance: currentDevice?.distance || 200,
      group: GetDeviceGroup(draft.interfaceType),
    };
    const nextDevices = deviceId
      ? devices.map((device) => device.id === deviceId ? nextDevice : device)
      : [nextDevice, ...devices];
    UpdateDevices(nextDevices);
    setFormOpen(false);
    setEditingDevice(null);
    toast.success(deviceId ? `设备「${nextDevice.name}」已更新` : `设备「${nextDevice.name}」已添加`);
  };

  const handleBatchAdd = (rows: IDeviceBatchImportRow[]) => {
    if (rows.length === 0) {
      return;
    }
    const nextDevices = rows.reduce<IDeviceInstance[]>((currentDevices, row, index) => {
      const model = models.find((item) => item.id === row.modelId);
      if (!model) {
        return currentDevices;
      }
      const dataPointValues = BuildDataPointValues(model);
      const firstDataPoint = model.dataPoints[0];
      const nextDevice: IDeviceInstance = {
        id: `device-${Date.now()}-${index}`,
        name: row.name,
        modelId: model.id,
        modelName: model.name,
        deviceType: model.name,
        category: GetDeviceCategory(model.type),
        interfaceType: row.interfaceType,
        interfaceLabel: row.interfaceLabel || row.interfaceType,
        status: 'normal',
        serialNumber: row.serialNumber,
        address: row.address,
        description: row.description,
        location: row.location,
        displayValue: firstDataPoint ? dataPointValues[firstDataPoint.identifier] : '-',
        displayUnit: firstDataPoint?.unit || '',
        dataPointValues,
        lastUpdate: '刚刚',
        angle: 0,
        distance: 200,
        group: GetDeviceGroup(row.interfaceType),
      };
      return [nextDevice, ...currentDevices];
    }, devices);
    UpdateDevices(nextDevices);
    toast.success(`本机成功添加 ${rows.length} 台设备`);
  };

  const handleDelete = () => {
    if (!deleteDevice) return;
    UpdateDevices(devices.filter((device) => device.id !== deleteDevice.id));
    toast.success(`设备「${deleteDevice.name}」已删除`);
    setDeleteDevice(null);
  };

  const handleRead = (deviceId: string) => {
    UpdateDevices(devices.map((device) => device.id === deviceId ? { ...device, lastUpdate: '刚刚' } : device));
    toast.success('数据点读取成功');
  };

  const handleWrite = (deviceId: string, dataPoint: IDataPoint, value: string) => {
    const errorMessage = GetDataPointValueError(dataPoint, value);
    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }
    UpdateDevices(devices.map((device) => device.id === deviceId ? {
      ...device,
      dataPointValues: { ...device.dataPointValues, [dataPoint.identifier]: value.trim() },
      displayValue: dataPoint.identifier === Object.keys(device.dataPointValues)[0] ? value.trim() : device.displayValue,
      lastUpdate: '刚刚',
    } : device));
    toast.success(`数据点「${dataPoint.name}」写入成功`);
  };

  const openAddDialog = () => {
    setEditingDevice(null);
    setFormOpen(true);
  };

  const openEditDialog = (device: IDeviceInstance) => {
    setEditingDevice(device);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
      >
        <div>
          <h1 className="text-2xl font-black text-foreground">设备实例</h1>
          <p className="mt-1 text-sm text-muted-foreground">根据设备模型创建实例，为设备配置唯一 SN 并进行数据点读写</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setBatchImportOpen(true)}><Upload className="mr-1.5 size-4" />批量添加</Button>
          <Button onClick={openAddDialog}><Plus className="mr-1.5 size-4" />添加设备</Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-border/40 bg-card/60"><CardContent className="p-4"><div className="text-xs text-muted-foreground">设备总数</div><div className="mt-1 text-2xl font-black">{devices.length}</div></CardContent></Card>
        <Card className="border-border/40 bg-card/60"><CardContent className="p-4"><div className="text-xs text-muted-foreground">正常设备</div><div className="mt-1 text-2xl font-black text-success">{normalCount}</div></CardContent></Card>
        <Card className="border-border/40 bg-card/60"><CardContent className="p-4"><div className="text-xs text-muted-foreground">告警设备</div><div className="mt-1 text-2xl font-black text-warning">{warningCount}</div></CardContent></Card>
        <Card className="border-border/40 bg-card/60"><CardContent className="p-4"><div className="text-xs text-muted-foreground">离线设备</div><div className="mt-1 text-2xl font-black text-muted-foreground">{offlineCount}</div></CardContent></Card>
      </div>

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3"><CardTitle className="text-sm">设备实例列表</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索设备名称、SN、模型或地址" className="pl-9" />
            </div>
            <Select value={modelFilter} onValueChange={setModelFilter}>
              <SelectTrigger className="lg:w-[220px]"><SelectValue placeholder="全部设备模型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部设备模型</SelectItem>
                {models.map((model) => <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as DeviceStatus | 'all')}>
              <SelectTrigger className="lg:w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEVICE_STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filteredDevices.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border/40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>设备</TableHead>
                    <TableHead>设备模型</TableHead>
                    <TableHead>SN 号</TableHead>
                    <TableHead>通信信息</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Wifi className="size-4 text-primary" /></div>
                          <div className="min-w-0"><div className="max-w-[180px] truncate font-semibold">{device.name}</div><div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{device.location || '未设置位置'}</div></div>
                        </div>
                      </TableCell>
                      <TableCell><div className="font-medium">{device.modelName}</div><div className="text-xs text-muted-foreground">{device.deviceType}</div></TableCell>
                      <TableCell><span className="font-mono text-xs">{device.serialNumber}</span></TableCell>
                      <TableCell><div className="flex items-center gap-1 text-sm"><Cable className="size-3.5 text-muted-foreground" />{device.interfaceType} · {device.interfaceLabel}</div><div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Hash className="size-3" />{device.address}</div></TableCell>
                      <TableCell><Badge className={GetStatusClassName(device.status)}>{GetStatusLabel(device.status)}</Badge></TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="查看与读写" onClick={() => setDetailDeviceId(device.id)}><Eye className="size-4" /></Button>
                          <Button variant="ghost" size="icon" title="编辑设备" onClick={() => openEditDialog(device)}><Pencil className="size-4" /></Button>
                          <Button variant="ghost" size="icon" title="删除设备" className="text-destructive hover:text-destructive" onClick={() => setDeleteDevice(device)}><Trash2 className="size-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 py-16 text-center text-muted-foreground">
              <Wifi className="mx-auto mb-3 size-10 opacity-20" />
              <div className="text-sm font-medium">没有找到匹配的设备</div>
              <Button variant="outline" size="sm" className="mt-4" onClick={openAddDialog}><Plus className="mr-1 size-3.5" />添加设备</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <DeviceFormDialog open={formOpen} device={editingDevice} models={models} devices={devices} onClose={() => { setFormOpen(false); setEditingDevice(null); }} onSubmit={handleSubmit} />
      <BatchDeviceImportDialog open={batchImportOpen} devices={devices} models={models} onAddLocalDevices={handleBatchAdd} onClose={() => setBatchImportOpen(false)} />
      <DeviceDetailDialog device={detailDevice} model={detailModel} open={Boolean(detailDevice)} onClose={() => setDetailDeviceId(null)} onRead={handleRead} onWrite={handleWrite} />
      <AlertDialog open={Boolean(deleteDevice)} onOpenChange={(isOpen) => !isOpen && setDeleteDevice(null)}>
        <AlertDialogContent className="border-border/40 bg-card/95">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除设备</AlertDialogTitle>
            <AlertDialogDescription>删除设备「{deleteDevice?.name}」后，它将同时从设备拓扑中移除，是否继续？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>确认删除</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
