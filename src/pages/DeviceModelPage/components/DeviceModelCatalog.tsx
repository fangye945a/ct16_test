import { useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Archive,
  Boxes,
  CheckCircle2,
  CircleAlert,
  Cloud,
  CloudOff,
  Download,
  Eye,
  FileUp,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { GetDeviceInstances } from '@/data/device-instances';
import {
  PRESET_DEVICE_MODEL_SCENARIOS,
  type IDataPoint,
  type IDeviceModel,
  type IDeviceModelScenario,
} from '@/data/device-models';
import {
  MoveDeviceModelDriver,
  MoveDeviceModelIcon,
  RemoveDeviceModelDriver,
  RemoveDeviceModelDrivers,
  RemoveDeviceModelIcon,
  RemoveDeviceModelIcons,
  SaveDeviceModelDriver,
  SaveDeviceModelIcon,
  type DeviceModelDriverAsset,
} from '@/services/deviceModelIcons';
import {
  CreateDeviceModelZipPackage,
  ParseDeviceModelZipPackage,
} from '@/services/deviceModelPackages';
import {
  GetPrototypeCustomDeviceModelScenarios,
  SavePrototypeCustomDeviceModelScenarios,
} from '@/services/prototypeDeviceModels';
import {
  InspectDeviceModelDriver,
  type IDeviceModelDriverMetadata,
} from '@/services/deviceModelDriverMetadata';
import { DeviceModelIcon, DeviceModelIconField } from './DeviceModelIcon';

const DEVICE_TYPE_CATALOG = [
  {
    industry: '智慧交通',
    subIndustries: [{
      name: '智慧隧道',
      deviceTypes: ['隧道鸿蒙控制器', '洞外光强检测仪', '洞内照度检测仪', 'COVI检测仪', '照明主控制器', '风机'],
    }],
  },
  {
    industry: '智慧水利',
    subIndustries: [{
      name: '水利设备',
      deviceTypes: ['水闸CTU', '拍照RTU', '雨量监测器', '智能水位监测器', '自动化CTU'],
    }],
  },
  {
    industry: '边缘计算',
    subIndustries: [{ name: '边缘网关', deviceTypes: ['边缘设备'] }],
  },
  {
    industry: '通用设备',
    subIndustries: [{ name: '工业现场', deviceTypes: ['传感器', '仪表', '驱动器', '控制器'] }],
  },
] as const;

const DEVICE_TYPES = DEVICE_TYPE_CATALOG.flatMap((industry) =>
  industry.subIndustries.flatMap((subIndustry) => subIndustry.deviceTypes),
);

type ModelState = 'pending' | 'conflict' | 'importing' | 'success' | 'skipped' | 'error';
type ConflictPolicy = 'ask' | 'overwrite' | 'skip' | 'overwriteAll' | 'skipAll';

interface ModelDraft {
  name: string;
  type: string;
  version: string;
  description: string;
  vendor: string;
  deviceModel: string;
  typeIdentifier: string;
  protocolDescription: string;
  dataPoints: IDataPoint[];
  tags: string[];
  applicableScenarios: IDeviceModelScenario[];
  icon: Blob | null | undefined;
}

interface ImportItem {
  id: string;
  file: File;
  model: IDeviceModel | null;
  driver: DeviceModelDriverAsset | null;
  icon: Blob | null;
  status: ModelState;
  error?: string;
}

interface PendingCreateConflict {
  model: IDeviceModel;
  icon: Blob | null | undefined;
  driver: DeviceModelDriverAsset;
}

interface DeviceModelCatalogProps {
  models: IDeviceModel[];
  setModels: Dispatch<SetStateAction<IDeviceModel[]>>;
}

function FormatDate(value: string): string {
  return value.replace('T', ' ').replace(/(Z|[+-]\d{2}:\d{2})$/, '');
}

function SplitTags(value: string): string[] {
  return value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean);
}

function GetBaseName(fileName: string): string {
  return fileName.replace(/\.(so|zip)$/i, '').replace(/[_-]+/g, ' ').trim() || '未命名设备模型';
}

function GetModelKey(model: Pick<IDeviceModel, 'name' | 'type'>): string {
  return `${model.name.trim().toLocaleLowerCase()}\u0000${model.type.trim().toLocaleLowerCase()}`;
}

function GetDefaultDeviceType(): string {
  return DEVICE_TYPES[0] || '边缘设备';
}

function BuildMockModel(file: File, draft: ModelDraft): IDeviceModel {
  const modelName = draft.name.trim() || GetBaseName(file.name);
  const type = draft.type.trim() || GetDefaultDeviceType();
  return {
    id: `dm-local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: modelName,
    type,
    version: draft.version.trim() || 'v1.0',
    description: draft.description.trim() || `从本地模型文件 ${file.name} 导入的设备模型。`,
    vendor: draft.vendor.trim() || '本地模型',
    deviceModel: draft.deviceModel.trim() || modelName,
    typeIdentifier: draft.typeIdentifier.trim() || type,
    protocolDescription: draft.protocolDescription.trim() || '未从协议驱动中读取到详细描述。',
    sourceFile: file.name,
    dataPoints: draft.dataPoints,
    dataPointCount: draft.dataPoints.length,
    createdAt: new Date().toISOString(),
    status: 'unsynced',
    tags: Array.from(new Set([...draft.tags, type, '本地导入'])),
    applicableScenarios: draft.applicableScenarios,
  };
}

async function SaveModelAssetsChange(
  modelId: string,
  previousVersion: string | null,
  nextVersion: string,
  icon: Blob | null | undefined,
  driver: DeviceModelDriverAsset | null,
): Promise<void> {
  if (icon instanceof Blob) {
    await SaveDeviceModelIcon(modelId, nextVersion, icon);
    if (previousVersion && previousVersion !== nextVersion) {
      await RemoveDeviceModelIcon(modelId, previousVersion);
    }
  } else if (icon === null) {
    await RemoveDeviceModelIcon(modelId, nextVersion);
    if (previousVersion && previousVersion !== nextVersion) {
      await RemoveDeviceModelIcon(modelId, previousVersion);
    }
  } else if (previousVersion && previousVersion !== nextVersion) {
    await MoveDeviceModelIcon(modelId, previousVersion, nextVersion);
  }
  if (driver) {
    await SaveDeviceModelDriver(modelId, nextVersion, driver);
    if (previousVersion && previousVersion !== nextVersion) {
      await RemoveDeviceModelDriver(modelId, previousVersion);
    }
    return;
  }
  if (previousVersion && previousVersion !== nextVersion) {
    await MoveDeviceModelDriver(modelId, previousVersion, nextVersion);
  }
}

function SyncStatus({ model }: { model: IDeviceModel }) {
  const synced = model.status === 'synced';
  return (
    <Badge className={synced ? 'bg-success/10 text-success text-[10px]' : 'bg-warning/10 text-warning text-[10px]'}>
      {synced ? <CheckCircle2 className="mr-1 size-2.5" /> : <CloudOff className="mr-1 size-2.5" />}
      {synced ? '已同步' : '未同步'}
    </Badge>
  );
}

function ModelDetailDialog({ model, onClose }: { model: IDeviceModel | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(model)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto border-border/40 bg-card/95">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <DeviceModelIcon
              model={model}
              className="size-8 shrink-0 overflow-hidden rounded-md"
              imageClassName="size-8 shrink-0 rounded-md border border-border/60 object-cover"
            />
            {model?.name}
            {model && <SyncStatus model={model} />}
          </DialogTitle>
          <DialogDescription>{model ? `${model.type} · ${model.version || '-'} · ${model.dataPointCount} 个数据点` : ''}</DialogDescription>
        </DialogHeader>
        {model && (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailItem label="设备类型" value={model.type} />
              <DetailItem label="版本" value={model.version || '-'} />
              <DetailItem label="厂商" value={model.vendor || '-'} />
              <DetailItem label="设备型号" value={model.deviceModel || '-'} />
              <DetailItem label="类型标识" value={model.typeIdentifier || '-'} />
              <DetailItem label="创建时间" value={FormatDate(model.createdAt)} />
              <DetailItem label="模型文件" value={model.sourceFile || '-'} fullWidth />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">模型描述</p>
              <p className="mt-1 whitespace-pre-wrap">{model.description || '暂无描述'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">协议描述</p>
              <p className="mt-1 whitespace-pre-wrap">{model.protocolDescription || '暂无协议描述'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">标签</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {model.tags.length > 0 ? model.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                )) : <span className="text-muted-foreground">暂无标签</span>}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">适用场景</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(model.applicableScenarios || []).length > 0 ? model.applicableScenarios?.map((scenario) => (
                  <Badge key={scenario.identifier} variant="secondary" className="text-[10px]">{scenario.name}</Badge>
                )) : <span className="text-muted-foreground">暂未选择</span>}
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ label, value, fullWidth = false }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-all font-medium">{value}</p>
    </div>
  );
}

function IsScenarioIdentifier(value: string): boolean {
  return /^[a-z][a-z0-9_-]{0,63}$/.test(value);
}

function ScenarioSelectionField({
  value,
  onChange,
}: {
  value: IDeviceModelScenario[];
  onChange: (scenarios: IDeviceModelScenario[]) => void;
}) {
  const [customScenarios, setCustomScenarios] = useState<IDeviceModelScenario[]>(() => GetPrototypeCustomDeviceModelScenarios());
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customIdentifier, setCustomIdentifier] = useState('');
  const scenarios = [...PRESET_DEVICE_MODEL_SCENARIOS, ...customScenarios];

  const ToggleScenario = (scenario: IDeviceModelScenario, checked: boolean) => {
    if (checked) {
      onChange(value.some((item) => item.identifier === scenario.identifier) ? value : [...value, scenario]);
      return;
    }
    onChange(value.filter((item) => item.identifier !== scenario.identifier));
  };

  const AddCustomScenario = () => {
    const name = customName.trim();
    const identifier = customIdentifier.trim().toLocaleLowerCase();
    if (!name || !identifier) {
      toast.error('请填写场景名称和场景标识符');
      return;
    }
    if (!IsScenarioIdentifier(identifier)) {
      toast.error('场景标识符需以小写字母开头，仅支持小写字母、数字、连字符和下划线');
      return;
    }
    if (scenarios.some((item) => item.identifier === identifier)) {
      toast.error('场景标识符已存在');
      return;
    }
    const nextScenario: IDeviceModelScenario = { name, identifier, source: 'custom' };
    const nextCustomScenarios = [...customScenarios, nextScenario];
    try {
      SavePrototypeCustomDeviceModelScenarios(nextCustomScenarios);
      setCustomScenarios(nextCustomScenarios);
      onChange([...value, nextScenario]);
      setCustomName('');
      setCustomIdentifier('');
      setCustomOpen(false);
    } catch {
      toast.error('保存自定义场景失败');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label>适用场景</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => setCustomOpen(true)}>
          <Plus className="size-3.5" />
          自定义场景
        </Button>
      </div>
      <div className="grid gap-2 rounded-lg border border-border/50 p-3 sm:grid-cols-2">
        {scenarios.map((scenario) => {
          const checked = value.some((item) => item.identifier === scenario.identifier);
          return (
            <label key={scenario.identifier} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted/50">
              <Checkbox checked={checked} onCheckedChange={(nextChecked) => ToggleScenario(scenario, nextChecked === true)} />
              <span className="min-w-0 flex-1 truncate">{scenario.name}</span>
              <span className="truncate font-mono text-[10px] text-muted-foreground">{scenario.identifier}</span>
            </label>
          );
        })}
      </div>
      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="border-border/40 bg-card/95 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建自定义场景</DialogTitle>
            <DialogDescription>场景标识符创建后不可重复。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-scenario-name">场景名称</Label>
              <Input id="custom-scenario-name" value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="例如 港口装卸场景" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-scenario-identifier">场景标识符</Label>
              <Input id="custom-scenario-identifier" value={customIdentifier} onChange={(event) => setCustomIdentifier(event.target.value)} placeholder="例如 port-handling" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCustomOpen(false)}>取消</Button>
            <Button type="button" onClick={AddCustomScenario}>创建并选择</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ModelFormDialog({
  open,
  model,
  sourceFile,
  driverMetadata,
  inspectingDriver,
  onSelectSourceFile,
  onClose,
  onSaved,
}: {
  open: boolean;
  model: IDeviceModel | null;
  sourceFile: File | null;
  driverMetadata: IDeviceModelDriverMetadata | null;
  inspectingDriver: boolean;
  onSelectSourceFile?: (file: File) => void;
  onClose: () => void;
  onSaved: (draft: ModelDraft) => Promise<void>;
}) {
  const sourceFileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = Boolean(model);
  const [name, setName] = useState('');
  const [type, setType] = useState(GetDefaultDeviceType());
  const [version, setVersion] = useState('v1.0');
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [typeIdentifier, setTypeIdentifier] = useState('');
  const [protocolDescription, setProtocolDescription] = useState('');
  const [dataPoints, setDataPoints] = useState<IDataPoint[]>([]);
  const [tags, setTags] = useState('');
  const [applicableScenarios, setApplicableScenarios] = useState<IDeviceModelScenario[]>([]);
  const [icon, setIcon] = useState<Blob | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const deviceTypes = Array.from(new Set([type, ...DEVICE_TYPES].filter(Boolean)));

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(model?.name || driverMetadata?.modelName || (sourceFile ? GetBaseName(sourceFile.name) : ''));
    setType(model?.type || driverMetadata?.deviceType || GetDefaultDeviceType());
    setVersion(model?.version || 'v1.0');
    setDescription(model?.description || '');
    setVendor(model?.vendor || driverMetadata?.vendor || '');
    setDeviceModel(model?.deviceModel || driverMetadata?.deviceModel || '');
    setTypeIdentifier(model?.typeIdentifier || driverMetadata?.typeIdentifier || '');
    setProtocolDescription(model?.protocolDescription || driverMetadata?.protocolDescription || '');
    setDataPoints(model?.dataPoints || []);
    setTags(model?.tags.join(', ') || '');
    setApplicableScenarios(model?.applicableScenarios || []);
    setIcon(undefined);
  }, [driverMetadata, model, open, sourceFile]);

  const HandleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isEditing && !sourceFile) {
      toast.error('请选择 DSDK 模型开发工程生成的 .so 驱动文件');
      return;
    }
    if (!name.trim()) {
      toast.error('请输入设备模型名称');
      return;
    }
    try {
      setSaving(true);
      await onSaved({
        name: name.trim(),
        type,
        version: version.trim() || 'v1.0',
        description: description.trim(),
        vendor: vendor.trim(),
        deviceModel: deviceModel.trim(),
        typeIdentifier: typeIdentifier.trim(),
        protocolDescription: protocolDescription.trim(),
        dataPoints,
        tags: SplitTags(tags),
        applicableScenarios,
        icon,
      });
    } catch {
      // 保存失败提示由模型目录统一展示，表单保持当前输入内容。
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border/40 bg-card/95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? <Pencil className="size-5 text-primary" /> : <Plus className="size-5 text-primary" />}
            {isEditing ? '编辑设备模型' : '创建设备模型'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? '修改展示信息不会影响已存在设备实例的数据点配置。' : '选择 DSDK .so 协议驱动后，系统会自动读取其中的设备三元组，再由当前页面补充模型信息。'}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={HandleSubmit}>
          {!isEditing && (
            <div className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>协议驱动文件</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => sourceFileInputRef.current?.click()}
                  disabled={inspectingDriver || saving}
                >
                  <FileUp className="mr-1.5 size-3.5" />
                  {sourceFile ? '更换 .so 文件' : '选择 .so 文件'}
                </Button>
              </div>
              <input
                ref={sourceFileInputRef}
                className="hidden"
                type="file"
                accept=".so,application/x-sharedlib"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = '';
                  if (file) {
                    onSelectSourceFile?.(file);
                  }
                }}
              />
              {sourceFile ? (
                <p className="truncate text-sm font-medium" title={sourceFile.name}>{sourceFile.name}</p>
              ) : (
                <p className="text-sm text-muted-foreground">请选择 DSDK 模型开发工程生成的协议驱动文件。</p>
              )}
              {inspectingDriver ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />正在读取 .so 驱动中的模型信息…</p>
              ) : driverMetadata ? (
                <p className={`flex items-start gap-1.5 text-xs ${driverMetadata.loaded ? 'text-success' : 'text-warning'}`}>
                  {driverMetadata.loaded ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" /> : <CircleAlert className="mt-0.5 size-3.5 shrink-0" />}
                  <span>{driverMetadata.message}</span>
                </p>
              ) : null}
            </div>
          )}
          <DeviceModelIconField model={model} value={icon} onChange={setIcon} />
          <div className="space-y-2">
            <Label>模型名称</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="输入设备模型名称" className="h-9" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>设备类型</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {deviceTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>版本号</Label>
              <Input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="v1.0" className="h-9" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>设备厂商</Label>
              <Input value={vendor} onChange={(event) => setVendor(event.target.value)} placeholder="输入设备厂商" className="h-9" />
            </div>
            <div className="space-y-2">
              <Label>设备型号</Label>
              <Input value={deviceModel} onChange={(event) => setDeviceModel(event.target.value)} placeholder="输入设备型号" className="h-9" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>类型标识</Label>
            <Input value={typeIdentifier} onChange={(event) => setTypeIdentifier(event.target.value)} placeholder="输入设备类型标识" className="h-9" />
          </div>
          <div className="space-y-2">
            <Label>模型描述</Label>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="输入模型用途说明" className="min-h-20" />
          </div>
          <div className="space-y-2">
            <Label>协议描述</Label>
            <Textarea value={protocolDescription} onChange={(event) => setProtocolDescription(event.target.value)} placeholder="输入协议描述" className="min-h-20" />
          </div>
          <ScenarioSelectionField value={applicableScenarios} onChange={setApplicableScenarios} />
          <div className="space-y-2">
            <Label>标签</Label>
            <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="多个标签以逗号分隔" className="h-9" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>取消</Button>
            <Button type="submit" disabled={saving || inspectingDriver}>
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              {isEditing ? '保存修改' : '创建模型'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LocalImportDialog({
  models,
  setModels,
  open,
  onClose,
}: {
  models: IDeviceModel[];
  setModels: Dispatch<SetStateAction<IDeviceModel[]>>;
  open: boolean;
  onClose: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [pendingConflictIndex, setPendingConflictIndex] = useState<number | null>(null);

  const UpdateItem = (index: number, status: ModelState, error?: string) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, status, error } : item));
  };

  const ProcessQueue = async (startIndex: number, policy: ConflictPolicy = 'ask') => {
    const knownKeys = new Set(models.map(GetModelKey));
    const knownIds = new Set(models.map((model) => model.id));
    const modelByKey = new Map(models.map((model) => [GetModelKey(model), model]));
    const modelById = new Map(models.map((model) => [model.id, model]));
    setImporting(true);
    for (let index = startIndex; index < items.length; index += 1) {
      const item = items[index];
      if (!item.model || !item.driver || item.status === 'success' || item.status === 'skipped' || item.status === 'error') {
        continue;
      }
      const key = GetModelKey(item.model);
      const conflict = knownKeys.has(key) || knownIds.has(item.model.id);
      if (conflict && policy === 'ask') {
        UpdateItem(index, 'conflict');
        setPendingConflictIndex(index);
        setImporting(false);
        return;
      }
      if (conflict && (policy === 'skip' || policy === 'skipAll')) {
        UpdateItem(index, 'skipped');
        continue;
      }
      try {
        UpdateItem(index, 'importing');
        const matchingModels = Array.from(new Set([modelByKey.get(key), modelById.get(item.model.id)].filter(Boolean)));
        if (conflict) {
          await Promise.all(matchingModels.flatMap((model) => [RemoveDeviceModelIcons(model.id), RemoveDeviceModelDrivers(model.id)]));
        }
        await SaveModelAssetsChange(item.model.id, null, item.model.version, item.icon, item.driver);
        setModels((current) => {
          const withoutConflict = conflict ? current.filter((model) => GetModelKey(model) !== key && model.id !== item.model?.id) : current;
          return [item.model, ...withoutConflict];
        });
        knownKeys.add(key);
        knownIds.add(item.model.id);
        modelByKey.set(key, item.model);
        modelById.set(item.model.id, item.model);
        UpdateItem(index, 'success');
      } catch (error) {
        UpdateItem(index, 'error', error instanceof Error ? error.message : '导入失败');
      }
    }
    setImporting(false);
    setPendingConflictIndex(null);
    toast.success('本地设备模型导入完成');
  };

  const SelectPackages = async (files: FileList | null) => {
    if (!files) {
      return;
    }
    const selected = Array.from(files);
    const invalid = selected.find((file) => !/\.zip$/i.test(file.name));
    if (invalid) {
      toast.error('仅支持 ZIP 格式的设备模型包');
      return;
    }
    try {
      setInspecting(true);
      const parsedItems = await Promise.all(selected.map(async (file) => {
        try {
          const packages = await ParseDeviceModelZipPackage(file);
          return packages.map((item, index): ImportItem => ({
            id: `${file.name}-${item.model.id}-${item.model.version}-${index}`,
            file,
            model: item.model,
            driver: item.driver,
            icon: item.icon,
            status: 'pending',
          }));
        } catch (error) {
          return [{
            id: `${file.name}-${file.lastModified}-${file.size}`,
            file,
            model: null,
            driver: null,
            icon: null,
            status: 'error' as const,
            error: error instanceof Error ? error.message : '解析 ZIP 模型包失败',
          }];
        }
      }));
      setItems(parsedItems.flat());
      setPendingConflictIndex(null);
    } finally {
      setInspecting(false);
    }
  };

  const Close = () => {
    if (importing || inspecting) {
      return;
    }
    setItems([]);
    setPendingConflictIndex(null);
    onClose();
  };

  const pendingItem = pendingConflictIndex === null ? null : items[pendingConflictIndex];
  const completedCount = items.filter((item) => ['success', 'skipped', 'error'].includes(item.status)).length;

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && Close()}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto border-border/40 bg-card/95">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="size-5 text-primary" />
              本地导入设备模型
            </DialogTitle>
            <DialogDescription>选择包含 model.json、SO 文件和可选 PNG 图标的 ZIP 模型包。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept=".zip,application/zip"
              multiple
              onChange={(event) => {
                void SelectPackages(event.target.files);
                event.currentTarget.value = '';
              }}
            />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing || inspecting}>
              <FileUp className="mr-1.5 size-4" />
              {inspecting ? '正在解析模型包' : '选择 ZIP 模型包'}
            </Button>
            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-border/50 p-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.file.name}</p>
                      {item.model && <p className="mt-1 text-xs text-muted-foreground">{item.model.name} · {item.model.type} · {item.model.version}</p>}
                      {item.error && <p className="mt-1 text-xs text-destructive">{item.error}</p>}
                    </div>
                    <Badge variant="outline" className={GetImportStatusClass(item.status)}>{GetImportStatusText(item.status)}</Badge>
                    {!importing && !inspecting && item.status === 'pending' && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                        <X className="size-4" />
                        <span className="sr-only">移除模型包</span>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {items.length > 0 && <Progress value={Math.round(completedCount / items.length * 100)} className="h-2" />}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={Close} disabled={importing || inspecting}>关闭</Button>
            <Button type="button" onClick={() => void ProcessQueue(0)} disabled={items.length === 0 || importing || inspecting}>
              {importing && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              开始导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingConflictIndex !== null} onOpenChange={(nextOpen) => !nextOpen && setPendingConflictIndex(null)}>
        <AlertDialogContent className="border-border/40 bg-card/95">
          <AlertDialogHeader>
            <AlertDialogTitle>发现相同设备模型</AlertDialogTitle>
            <AlertDialogDescription>
              模型“{pendingItem?.model.name || ''}”与本地已有模型名称和类型相同。继续导入将替换现有原型模型记录。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => pendingConflictIndex !== null && void ProcessQueue(pendingConflictIndex, 'skipAll')}
            >
              后续全部跳过
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => pendingConflictIndex !== null && void ProcessQueue(pendingConflictIndex, 'overwriteAll')}
            >
              后续全部覆盖
            </Button>
            <AlertDialogCancel onClick={() => pendingConflictIndex !== null && void ProcessQueue(pendingConflictIndex, 'skip')}>
              跳过
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingConflictIndex !== null && void ProcessQueue(pendingConflictIndex, 'overwrite')}>
              继续
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function GetImportStatusText(status: ModelState): string {
  const text: Record<ModelState, string> = {
    pending: '等待导入',
    conflict: '存在重复',
    importing: '导入中',
    success: '已导入',
    skipped: '已跳过',
    error: '导入失败',
  };
  return text[status];
}

function GetImportStatusClass(status: ModelState): string {
  if (status === 'success') {
    return 'border-success/30 bg-success/10 text-success';
  }
  if (status === 'error') {
    return 'border-destructive/30 bg-destructive/10 text-destructive';
  }
  if (status === 'conflict') {
    return 'border-warning/30 bg-warning/10 text-warning';
  }
  return '';
}

function LocalExportDialog({ models, open, onClose }: { models: IDeviceModel[]; open: boolean; onClose: () => void }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (open) {
      setSelectedIds([]);
      setProgress(0);
    }
  }, [open]);

  const ToggleModel = (id: string, checked: boolean) => {
    setSelectedIds((current) => checked ? [...current, id] : current.filter((modelId) => modelId !== id));
  };

  const ExportSelected = async () => {
    const selectedModels = models.filter((model) => selectedIds.includes(model.id));
    if (selectedModels.length === 0) {
      toast.error('请至少选择一个设备模型');
      return;
    }
    setExporting(true);
    setProgress(15);
    try {
      const blob = await CreateDeviceModelZipPackage(selectedModels);
      setProgress(80);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedModels.length === 1 ? `${selectedModels[0].name}-设备模型.zip` : '设备模型包.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setProgress(100);
      toast.success('设备模型 ZIP 包已导出');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导出设备模型失败');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !exporting && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-border/40 bg-card/95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="size-5 text-primary" />
            本地导出设备模型
          </DialogTitle>
          <DialogDescription>每个模型目录均包含 JSON 配置、SO 文件和可选 PNG 图标。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setSelectedIds(models.map((model) => model.id))}>全选</Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSelectedIds(models.filter((model) => !selectedIds.includes(model.id)).map((model) => model.id))}
            >
              反选
            </Button>
          </div>
          {models.length === 0 ? <div className="py-10 text-center text-sm text-muted-foreground">暂无可导出的设备模型</div> : models.map((model) => (
            <label key={model.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/50 p-3 hover:bg-muted/30">
              <Checkbox checked={selectedIds.includes(model.id)} onCheckedChange={(checked) => ToggleModel(model.id, checked === true)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{model.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{model.type} · {model.version || '-'} · {model.sourceFile || '原型模型'}</span>
              </span>
            </label>
          ))}
          {exporting && <Progress value={progress} className="h-2" />}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={exporting}>取消</Button>
          <Button type="button" onClick={() => void ExportSelected()} disabled={exporting || selectedIds.length === 0}>
            {exporting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            导出所选模型
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DeviceModelCatalog({ models, setModels }: DeviceModelCatalogProps) {
  const driverMetadataRequestRef = useRef(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [createDriverMetadata, setCreateDriverMetadata] = useState<IDeviceModelDriverMetadata | null>(null);
  const [inspectingCreateDriver, setInspectingCreateDriver] = useState(false);
  const [localImportOpen, setLocalImportOpen] = useState(false);
  const [localExportOpen, setLocalExportOpen] = useState(false);
  const [detailModel, setDetailModel] = useState<IDeviceModel | null>(null);
  const [editModel, setEditModel] = useState<IDeviceModel | null>(null);
  const [deleteModel, setDeleteModel] = useState<IDeviceModel | null>(null);
  const [createConflict, setCreateConflict] = useState<PendingCreateConflict | null>(null);

  const types = useMemo(() => Array.from(new Set(models.map((model) => model.type.trim()).filter(Boolean))), [models]);
  const filteredModels = useMemo(() => {
    const keyword = searchTerm.trim().toLocaleLowerCase();
    return models.filter((model) => {
      const matchedKeyword = !keyword
        || model.name.toLocaleLowerCase().includes(keyword)
        || model.tags.some((tag) => tag.toLocaleLowerCase().includes(keyword))
        || (model.applicableScenarios || []).some((scenario) => `${scenario.name} ${scenario.identifier}`.toLocaleLowerCase().includes(keyword));
      const matchedType = typeFilter === 'all' || model.type === typeFilter;
      return matchedKeyword && matchedType;
    });
  }, [models, searchTerm, typeFilter]);

  const SelectCreateFile = async (file: File | null) => {
    if (!file) {
      return;
    }
    if (!file.name.toLocaleLowerCase().endsWith('.so')) {
      toast.error('请选择 DSDK 模型开发工程生成的 .so 文件');
      return;
    }
    setCreateFile(file);
    setCreateDriverMetadata(null);
    const requestId = driverMetadataRequestRef.current + 1;
    driverMetadataRequestRef.current = requestId;
    setInspectingCreateDriver(true);
    try {
      const metadata = await InspectDeviceModelDriver(file);
      if (driverMetadataRequestRef.current === requestId) {
        setCreateDriverMetadata(metadata);
      }
    } catch (error) {
      if (driverMetadataRequestRef.current === requestId) {
        setCreateDriverMetadata({
          modelName: '',
          deviceType: '',
          vendor: '',
          deviceModel: '',
          typeIdentifier: '',
          protocolDescription: '',
          loaded: false,
          message: error instanceof Error ? error.message : '读取 .so 驱动中的模型信息失败，请手动补充。',
        });
      }
    } finally {
      if (driverMetadataRequestRef.current === requestId) {
        setInspectingCreateDriver(false);
      }
    }
  };

  const CloseCreateDialog = () => {
    driverMetadataRequestRef.current += 1;
    setCreateDialogOpen(false);
    setCreateFile(null);
    setCreateDriverMetadata(null);
    setInspectingCreateDriver(false);
  };

  const SaveNewModel = async (draft: ModelDraft) => {
    if (!createFile) {
      return;
    }
    const next = BuildMockModel(createFile, draft);
    if (models.some((model) => GetModelKey(model) === GetModelKey(next))) {
      setCreateConflict({ model: next, icon: draft.icon, driver: { fileName: createFile.name, blob: createFile } });
      return;
    }
    try {
      await SaveModelAssetsChange(next.id, null, next.version, draft.icon, { fileName: createFile.name, blob: createFile });
      setModels((current) => [next, ...current]);
      CloseCreateDialog();
      toast.success(`模型“${next.name}”已创建`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存模型图标失败');
      throw error;
    }
  };

  const SaveEditedModel = async (draft: ModelDraft) => {
    if (!editModel) {
      return;
    }
    const { icon, ...modelDraft } = draft;
    const next = { ...editModel, ...modelDraft, tags: Array.from(new Set(draft.tags)) };
    const duplicate = models.find((model) => model.id !== editModel.id && GetModelKey(model) === GetModelKey(next));
    if (duplicate) {
      toast.error(`已存在同名同类型模型“${duplicate.name}”`);
      return;
    }
    try {
      await SaveModelAssetsChange(next.id, editModel.version, next.version, icon, null);
      setModels((current) => current.map((model) => model.id === next.id ? next : model));
      setDetailModel((current) => current?.id === next.id ? next : current);
      setEditModel(null);
      toast.success('设备模型已更新');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存模型图标失败');
      throw error;
    }
  };

  const ConfirmDelete = async () => {
    if (!deleteModel) {
      return;
    }
    if (GetDeviceInstances().some((device) => device.modelId === deleteModel.id)) {
      toast.error(`模型“${deleteModel.name}”仍关联设备实例，无法删除`);
      setDeleteModel(null);
      return;
    }
    try {
      await Promise.all([RemoveDeviceModelIcons(deleteModel.id), RemoveDeviceModelDrivers(deleteModel.id)]);
    } catch {
      toast.error('模型已删除，但清理关联图标失败');
    }
    setModels((current) => current.filter((model) => model.id !== deleteModel.id));
    setDeleteModel(null);
    toast.success('设备模型已删除');
  };

  const ReplaceCreatedModel = async () => {
    if (!createConflict) {
      return;
    }
    try {
      const matchingModels = models.filter((model) => GetModelKey(model) === GetModelKey(createConflict.model));
      await Promise.all(matchingModels.flatMap((model) => [RemoveDeviceModelIcons(model.id), RemoveDeviceModelDrivers(model.id)]));
      await SaveModelAssetsChange(createConflict.model.id, null, createConflict.model.version, createConflict.icon, createConflict.driver);
      setModels((current) => [createConflict.model, ...current.filter((model) => GetModelKey(model) !== GetModelKey(createConflict.model))]);
      setCreateConflict(null);
      CloseCreateDialog();
      toast.success('原型设备模型已替换');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '替换设备模型失败');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">设备模型管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理控制器中的 DSDK 设备模型</p>
      </div>

      <Card className="border-border/40 bg-card/60">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && setSearchTerm(searchInput)}
                placeholder="搜索模型名称或标签，按 Enter 搜索"
                className="h-9 pl-9 text-sm"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-full lg:w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {types.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2 lg:ml-auto">
              <Button variant="outline" size="sm" className="h-9" onClick={() => toast.info('原型暂未接入云端模型服务')}>
                <Cloud className="mr-1 size-3.5" />
                云端模型
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={() => setLocalImportOpen(true)}>
                <Archive className="mr-1 size-3.5" />
                本地导入
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={() => setLocalExportOpen(true)}>
                <Download className="mr-1 size-3.5" />
                本地导出
              </Button>
              <Button size="sm" className="h-9" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-1 size-3.5" />
                创建模型
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence>
          {filteredModels.map((model, index) => (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
            >
              <Card className="flex h-full flex-col border-border/40 bg-card/60 transition-colors hover:border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <DeviceModelIcon
                        model={model}
                        className="size-9 shrink-0 overflow-hidden rounded-xl"
                        imageClassName="size-9 shrink-0 rounded-xl border border-border/60 object-cover"
                      />
                      <div className="min-w-0">
                        <CardTitle className="truncate text-sm">{model.name}</CardTitle>
                        <CardDescription className="text-xs">{model.type} · {model.version || '-'}</CardDescription>
                      </div>
                    </div>
                    <SyncStatus model={model} />
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{model.description || '暂无描述'}</p>
                  <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <div className="min-w-0"><span className="text-muted-foreground">厂商：</span><span className="truncate">{model.vendor || '-'}</span></div>
                    <div className="min-w-0"><span className="text-muted-foreground">型号：</span><span className="truncate">{model.deviceModel || '-'}</span></div>
                    <div className="col-span-2 text-muted-foreground">创建时间：{FormatDate(model.createdAt)}</div>
                  </div>
                  {model.tags.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {model.tags.map((tag) => <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>)}
                    </div>
                  )}
                  {(model.applicableScenarios || []).length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {model.applicableScenarios?.map((scenario) => <Badge key={scenario.identifier} variant="secondary" className="text-[10px]">{scenario.name}</Badge>)}
                    </div>
                  )}
                  <div className="mt-auto flex items-center gap-1.5 border-t border-border/30 pt-3">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDetailModel(model)}>
                      <Eye className="mr-1 size-3" />
                      查看
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditModel(model)}>
                      <Pencil className="mr-1 size-3" />
                      编辑
                    </Button>
                    <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteModel(model)}>
                      <Trash2 className="mr-1 size-3" />
                      删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {filteredModels.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          <Boxes className="mx-auto mb-3 size-12 opacity-20" />
          <div className="text-sm font-medium">没有找到匹配的设备模型</div>
        </div>
      )}

      <ModelDetailDialog model={detailModel} onClose={() => setDetailModel(null)} />
      <ModelFormDialog
        open={Boolean(editModel)}
        model={editModel}
        sourceFile={null}
        driverMetadata={null}
        inspectingDriver={false}
        onClose={() => setEditModel(null)}
        onSaved={SaveEditedModel}
      />
      <ModelFormDialog
        open={createDialogOpen}
        model={null}
        sourceFile={createFile}
        driverMetadata={createDriverMetadata}
        inspectingDriver={inspectingCreateDriver}
        onSelectSourceFile={(file) => void SelectCreateFile(file)}
        onClose={CloseCreateDialog}
        onSaved={SaveNewModel}
      />
      <LocalImportDialog models={models} setModels={setModels} open={localImportOpen} onClose={() => setLocalImportOpen(false)} />
      <LocalExportDialog models={models} open={localExportOpen} onClose={() => setLocalExportOpen(false)} />

      <AlertDialog open={Boolean(deleteModel)} onOpenChange={(open) => !open && setDeleteModel(null)}>
        <AlertDialogContent className="border-border/40 bg-card/95">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除设备模型</AlertDialogTitle>
            <AlertDialogDescription>
              将从原型模型目录移除“{deleteModel?.name}”。关联设备实例时将拒绝删除，以保证设备实例功能不受影响。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void ConfirmDelete()}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(createConflict)} onOpenChange={(open) => !open && setCreateConflict(null)}>
        <AlertDialogContent className="border-border/40 bg-card/95">
          <AlertDialogHeader>
            <AlertDialogTitle>发现相同设备模型</AlertDialogTitle>
            <AlertDialogDescription>本地已有同名同类型模型。继续将替换旧的原型模型记录，设备实例不会被修改。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void ReplaceCreatedModel()}>继续替换</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
