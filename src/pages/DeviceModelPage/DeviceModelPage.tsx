import { useState, useMemo, useRef, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Search,
  Plus,
  Upload,
  Download,
  Eye,
  Trash2,
  Boxes,
  Database,
  CheckCircle2,
  CloudOff,
  Clock,
  Hash,
  Tag,
  Loader2,
  FileUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { MOCK_CLOUD_DEVICE_MODELS, MOCK_DEVICE_MODELS, type IDeviceModel } from '@/data/device-models';
import { GetDeviceInstances } from '@/data/device-instances';
import DeviceInstanceManagement from './DeviceInstanceManagement';

const DEVICE_TYPES = ['all', '传感器', '仪表', '驱动器', '控制器'];

function ModelDetailDialog({
  model,
  open,
  onClose,
}: {
  model: IDeviceModel | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!model) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto border-border/40 bg-card/95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="size-5 text-primary" />
            {model.name}
            <Badge className={model.status === 'synced' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
              {model.status === 'synced' ? '已同步' : '未同步'}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {model.type} · {model.version} · {model.dataPointCount} 个数据点
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">设备类型：</span>
              <span className="font-medium">{model.type}</span>
            </div>
            <div>
              <span className="text-muted-foreground">版本：</span>
              <span className="font-medium">{model.version}</span>
            </div>
            <div>
              <span className="text-muted-foreground">创建时间：</span>
              <span className="font-medium">{model.createdAt}</span>
            </div>
            <div>
              <span className="text-muted-foreground">数据点数：</span>
              <span className="font-medium">{model.dataPointCount}</span>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold mb-1">描述</div>
            <p className="text-sm text-muted-foreground">{model.description}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {model.tags.map((t) => (
              <Badge key={t} variant="outline" className="text-xs">
                <Tag className="size-2.5 mr-1" />
                {t}
              </Badge>
            ))}
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">数据点列表</div>
            <div className="border border-border/40 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap text-xs">名称</TableHead>
                    <TableHead className="whitespace-nowrap text-xs">标识符</TableHead>
                    <TableHead className="whitespace-nowrap text-xs">类型</TableHead>
                    <TableHead className="whitespace-nowrap text-xs">读写</TableHead>
                    <TableHead className="whitespace-nowrap text-xs">单位</TableHead>
                    <TableHead className="whitespace-nowrap text-xs">范围</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {model.dataPoints.map((dp) => (
                    <TableRow key={dp.id}>
                      <TableCell className="text-xs font-medium">{dp.name}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{dp.identifier}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px]">{dp.dataType}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge className={dp.access === 'readonly' ? 'bg-muted/50 text-muted-foreground text-[10px]' : 'bg-primary/10 text-primary text-[10px]'}>
                          {dp.access === 'readonly' ? '只读' : '读写'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{dp.unit || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{dp.range}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddModelDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, type: string, version: string, desc: string, modelFile: File | null) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('传感器');
  const [version, setVersion] = useState('v1.0');
  const [desc, setDesc] = useState('');
  const [modelFile, setModelFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('请输入模型名称'); return; }
    onAdd(name.trim(), type, version.trim() || 'v1.0', desc.trim(), modelFile);
    setName('');
    setDesc('');
    setModelFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-border/40 bg-card/95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5 text-primary" />
            添加设备模型
          </DialogTitle>
          <DialogDescription>创建新的设备模型，可从空白开始或基于模板</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">模型名称</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="输入模型名称" className="h-9" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">设备类型</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEVICE_TYPES.filter((t) => t !== 'all').map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">版本号</Label>
            <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v1.0" className="h-9" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">描述</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="模型功能描述..." className="h-20 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">模型文件</Label>
            <div className="flex items-center gap-2">
              <Input
                value={modelFile?.name || ''}
                readOnly
                placeholder="从电脑选择模型文件上传到控制器"
                className="h-9 text-sm"
              />
              <Button type="button" variant="outline" className="h-9 shrink-0" onClick={() => fileInputRef.current?.click()}>
                <FileUp className="size-4 mr-1" />
                选择文件
              </Button>
            </div>
            {modelFile && (
              <div className="text-xs text-muted-foreground">
                文件大小：{(modelFile.size / 1024).toFixed(1)} KB
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".json,.yaml,.yml,.model"
              onChange={(e) => setModelFile(e.target.files?.[0] || null)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>取消</Button>
            <Button type="submit">上传到控制器</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CloudModelDownloadDialog({
  open,
  downloading,
  localModelIds,
  onClose,
  onDownload,
}: {
  open: boolean;
  downloading: boolean;
  localModelIds: string[];
  onClose: () => void;
  onDownload: (model: IDeviceModel) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto border-border/40 bg-card/95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="size-5 text-primary" />
            下载云平台模型
          </DialogTitle>
          <DialogDescription>选择需要下载到控制器的云平台设备模型</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {MOCK_CLOUD_DEVICE_MODELS.map((model) => {
            const downloaded = localModelIds.includes(model.id);
            return (
              <div key={model.id} className="flex flex-col gap-3 rounded-lg border border-border/40 bg-muted/20 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold">{model.name}</div>
                    <Badge variant="outline" className="text-[10px]">{model.type}</Badge>
                    <Badge className="bg-primary/10 text-primary text-[10px]">{model.version}</Badge>
                    {downloaded && <Badge className="bg-success/10 text-success text-[10px]">已下载</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{model.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {model.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="h-8 shrink-0"
                  disabled={downloading || downloaded}
                  onClick={() => onDownload(model)}
                >
                  {downloading ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <Download className="size-3.5 mr-1" />}
                  {downloaded ? '已下载' : '下载'}
                </Button>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadToCloudDialog({
  model,
  open,
  onClose,
  onUpload,
}: {
  model: IDeviceModel | null;
  open: boolean;
  onClose: () => void;
  onUpload: (id: string) => void;
}) {
  const [category, setCategory] = useState('传感器');
  const [deviceModel, setDeviceModel] = useState('CT16');
  const [version, setVersion] = useState(model?.version || 'v1.0');
  const [desc, setDesc] = useState(model?.description || '');
  const [tags, setTags] = useState(model?.tags.join(', ') || '');
  const [uploading, setUploading] = useState(false);

  if (!model) return null;

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    setUploading(true);
    await new Promise((r) => setTimeout(r, 1500));
    onUpload(model.id);
    setUploading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-border/40 bg-card/95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5 text-primary" />
            上传到云平台
          </DialogTitle>
          <DialogDescription>将「{model.name}」上传到云端设备模型库</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">模型名称</Label>
            <Input value={model.name} disabled className="h-9" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">模型分类</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEVICE_TYPES.filter((t) => t !== 'all').map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">适用设备型号</Label>
            <Input value={deviceModel} onChange={(e) => setDeviceModel(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">版本号</Label>
            <Input value={version} onChange={(e) => setVersion(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">模型描述</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="h-16 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">标签/关键词（逗号分隔）</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} className="h-9" placeholder="传感器, Modbus, 温湿度" />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>取消</Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? (
                <><Loader2 className="size-4 mr-1 animate-spin" />上传中...</>
              ) : (
                <><Upload className="size-4 mr-1" />确认上传</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeviceModelCatalog({ models, setModels }: { models: IDeviceModel[]; setModels: React.Dispatch<React.SetStateAction<IDeviceModel[]>> }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortAsc, setSortAsc] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [detailModel, setDetailModel] = useState<IDeviceModel | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [uploadModel, setUploadModel] = useState<IDeviceModel | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteModel, setDeleteModel] = useState<IDeviceModel | null>(null);

  const filtered = useMemo(() => {
    let result = models;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(s) || m.tags.some((t) => t.toLowerCase().includes(s)));
    }
    if (typeFilter !== 'all') {
      result = result.filter((m) => m.type === typeFilter);
    }
    return [...result].sort((a, b) => sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
  }, [models, search, typeFilter, sortAsc]);

  const handleAddModel = (name: string, type: string, version: string, desc: string, modelFile: File | null) => {
    const newModel: IDeviceModel = {
      id: `dm-new-${Date.now()}`,
      name,
      type,
      version,
      description: desc || (modelFile ? `从本地文件 ${modelFile.name} 上传到控制器的设备模型。` : '本地新增设备模型。'),
      dataPoints: [],
      dataPointCount: 0,
      createdAt: new Date().toISOString().slice(0, 10),
      status: 'unsynced',
      tags: modelFile ? [type, '本地上传'] : [type],
    };
    setModels((prev) => [newModel, ...prev]);
    toast.success(modelFile ? `模型文件「${modelFile.name}」已上传到控制器` : `模型「${name}」已创建`);
  };

  const handleDelete = () => {
    if (!deleteModel) return;
    if (GetDeviceInstances().some((device) => device.modelId === deleteModel.id)) {
      toast.error(`模型「${deleteModel.name}」仍有关联设备，无法删除`);
      setDeleteModel(null);
      return;
    }
    setModels((prev) => prev.filter((x) => x.id !== deleteModel.id));
    toast.success(`模型「${deleteModel.name}」已删除`);
    setDeleteModel(null);
  };

  const handleDownloadModel = async (cloudModel: IDeviceModel) => {
    setDownloading(true);
    await new Promise((r) => setTimeout(r, 1200));
    const downloadedModel: IDeviceModel = {
      ...cloudModel,
      status: 'synced',
      tags: Array.from(new Set([...cloudModel.tags, '云端下载'])),
    };
    setModels((prev) => {
      const exists = prev.some((m) => m.id === cloudModel.id);
      if (exists) {
        return prev;
      }
      return [downloadedModel, ...prev];
    });
    setDownloading(false);
    toast.success(`模型「${cloudModel.name}」已下载到控制器`);
  };

  const handleUploadToCloud = (id: string) => {
    setModels((prev) => prev.map((m) => m.id === id ? { ...m, status: 'synced' as const } : m));
    toast.success('模型已上传到云平台');
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-black text-foreground">设备模型</h1>
          <p className="text-sm text-muted-foreground mt-1">管理 DSDK 设备模型，支持与云平台同步</p>
        </div>
      </motion.div>

      {/* 工具栏 */}
      <Card className="border-border/40 bg-card/60">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索模型名称或标签..."
                className="pl-9 h-9 text-sm"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-[140px] text-sm">
                <SelectValue placeholder="设备类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {DEVICE_TYPES.filter((t) => t !== 'all').map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" size="sm" className="h-9" onClick={() => setDownloadOpen(true)}>
                <Download className="size-3.5 mr-1" />
                下载模型
              </Button>
              <Button size="sm" className="h-9" onClick={() => setAddOpen(true)}>
                <Plus className="size-3.5 mr-1" />
                添加模型
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 模型列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((model, i) => (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card className="border-border/40 bg-card/60 hover:border-primary/30 transition-colors h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Database className="size-4.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm truncate">{model.name}</CardTitle>
                        <CardDescription className="text-xs">{model.type} · {model.version}</CardDescription>
                      </div>
                    </div>
                    <Badge className={model.status === 'synced' ? 'bg-success/10 text-success text-[10px]' : 'bg-warning/10 text-warning text-[10px]'}>
                      {model.status === 'synced' ? <CheckCircle2 className="size-2.5 mr-1" /> : <CloudOff className="size-2.5 mr-1" />}
                      {model.status === 'synced' ? '已同步' : '未同步'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{model.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Hash className="size-3" />
                      {model.dataPointCount} 数据点
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {model.createdAt}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {model.tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 mt-auto pt-3 border-t border-border/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => { setDetailModel(model); setDetailOpen(true); }}
                    >
                      <Eye className="size-3 mr-1" />
                      查看
                    </Button>
                    {model.status === 'unsynced' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => { setUploadModel(model); setUploadOpen(true); }}
                      >
                        <Upload className="size-3 mr-1" />
                        上传
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive ml-auto"
                      onClick={() => setDeleteModel(model)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Boxes className="size-12 mx-auto mb-3 opacity-20" />
          <div className="text-sm font-medium">没有找到匹配的设备模型</div>
        </div>
      )}

      <ModelDetailDialog model={detailModel} open={detailOpen} onClose={() => setDetailOpen(false)} />
      <AddModelDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAddModel} />
      <CloudModelDownloadDialog
        open={downloadOpen}
        downloading={downloading}
        localModelIds={models.map((model) => model.id)}
        onClose={() => setDownloadOpen(false)}
        onDownload={handleDownloadModel}
      />
      <UploadToCloudDialog model={uploadModel} open={uploadOpen} onClose={() => setUploadOpen(false)} onUpload={handleUploadToCloud} />
      <AlertDialog open={Boolean(deleteModel)} onOpenChange={(open) => !open && setDeleteModel(null)}>
        <AlertDialogContent className="border-border/40 bg-card/95">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除设备模型</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将从控制器本地模型列表移除「{deleteModel?.name}」。该操作不可直接恢复，请确认是否继续。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function DeviceModelPage() {
  const [models, setModels] = useState<IDeviceModel[]>(MOCK_DEVICE_MODELS);

  return (
    <Tabs defaultValue="instances" className="w-full space-y-6">
      <TabsList className="grid h-auto w-full max-w-md grid-cols-2 rounded-xl bg-muted/60 p-1">
        <TabsTrigger value="instances" className="py-2.5 text-sm">设备实例</TabsTrigger>
        <TabsTrigger value="models" className="py-2.5 text-sm">设备模型</TabsTrigger>
      </TabsList>
      <TabsContent value="instances" className="mt-0">
        <DeviceInstanceManagement models={models} />
      </TabsContent>
      <TabsContent value="models" className="mt-0">
        <DeviceModelCatalog models={models} setModels={setModels} />
      </TabsContent>
    </Tabs>
  );
}
