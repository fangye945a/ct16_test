import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Bot,
  CheckCircle2,
  Cpu,
  Eye,
  FileUp,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Star,
  Store,
  TestTube2,
  Trash2,
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  DeletePrototypeModel,
  DeletePrototypeSkill,
  GetPrototypeMarketplaceSkills,
  GetPrototypeModels,
  GetPrototypeSkills,
  ImportPrototypeSkill,
  SavePrototypeModel,
  SetPrototypeDefaultModel,
  SetPrototypeSkillEnabled,
  TestPrototypeModel,
  type PrototypeModel,
  type PrototypeSkill,
} from '@/services/prototypeRuntime';

const MAX_TOKENS_STORAGE_KEY = 'zaihong:agent-max-tokens';
const DEFAULT_MAX_TOKENS = '32768';

type ModelDraft = Pick<PrototypeModel, 'name' | 'provider' | 'apiBase' | 'apiKey'> & { id?: string };

const EMPTY_MODEL: ModelDraft = {
  name: '',
  provider: '自定义兼容接口',
  apiBase: '',
  apiKey: '',
};

function GetProviderLabel(provider: string): string {
  const normalized = provider.trim().toLocaleLowerCase();
  if (normalized.includes('ollama') || normalized.includes('本地')) {
    return '本地模型';
  }
  if (normalized.includes('qwen') || normalized.includes('通义')) {
    return '通义千问';
  }
  if (normalized.includes('openai')) {
    return 'OpenAI 兼容接口';
  }
  return provider || '其他提供方';
}

function ModelEditorDialog({
  model,
  open,
  onClose,
  onSaved,
}: {
  model: PrototypeModel | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<ModelDraft>(EMPTY_MODEL);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setDraft(model ? {
      id: model.id,
      name: model.name,
      provider: model.provider,
      apiBase: model.apiBase,
      apiKey: model.apiKey,
    } : EMPTY_MODEL);
    setShowKey(false);
  }, [model, open]);

  const Save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.provider.trim() || !draft.apiBase.trim()) {
      toast.error('请填写模型名称、提供方和 API 地址');
      return;
    }
    try {
      setSaving(true);
      await SavePrototypeModel({
        ...draft,
        name: draft.name.trim(),
        provider: draft.provider.trim(),
        apiBase: draft.apiBase.trim(),
      });
      await onSaved();
      onClose();
      toast.success(model ? '模型配置已保存' : '模型已添加');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存模型失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border/40 bg-card/95 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {model ? <Pencil className="size-5 text-primary" /> : <Plus className="size-5 text-primary" />}
            {model ? '编辑模型' : '添加模型'}
          </DialogTitle>
          <DialogDescription>原型模式下配置只保存到当前浏览器，不会连接外部模型服务。</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={Save}>
          <div className="space-y-2">
            <Label htmlFor="agent-model-name">模型名称</Label>
            <Input
              id="agent-model-name"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="例如 Qwen3-8B"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-model-provider">提供方</Label>
            <Input
              id="agent-model-provider"
              value={draft.provider}
              onChange={(event) => setDraft((current) => ({ ...current, provider: event.target.value }))}
              placeholder="本地模型或兼容接口名称"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-model-base">API 地址</Label>
            <Input
              id="agent-model-base"
              value={draft.apiBase}
              onChange={(event) => setDraft((current) => ({ ...current, apiBase: event.target.value }))}
              placeholder="http://127.0.0.1:11434/v1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-model-key">API Key</Label>
            <div className="flex gap-2">
              <Input
                id="agent-model-key"
                type={showKey ? 'text' : 'password'}
                value={draft.apiKey}
                onChange={(event) => setDraft((current) => ({ ...current, apiKey: event.target.value }))}
                placeholder="本地模型可留空"
              />
              <Button type="button" variant="outline" onClick={() => setShowKey((current) => !current)}>
                {showKey ? '隐藏' : '显示'}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>取消</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              保存模型
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ModelSelectionCard({
  models,
  loading,
  savedModelId,
  draftModelId,
  savedMaxTokens,
  draftMaxTokens,
  saving,
  onDraftModelChange,
  onDraftMaxTokensChange,
  onConfirm,
}: {
  models: PrototypeModel[];
  loading: boolean;
  savedModelId: string;
  draftModelId: string;
  savedMaxTokens: string;
  draftMaxTokens: string;
  saving: boolean;
  onDraftModelChange: (id: string) => void;
  onDraftMaxTokensChange: (value: string) => void;
  onConfirm: () => void;
}) {
  const selected = models.find((model) => model.id === draftModelId);
  const modelDirty = draftModelId !== savedModelId;
  const maxTokensDirty = draftMaxTokens.trim() !== savedMaxTokens.trim();
  const dirty = modelDirty || maxTokensDirty;
  const localModels = models.filter((model) => GetProviderLabel(model.provider) === '本地模型');
  const remoteModels = models.filter((model) => GetProviderLabel(model.provider) !== '本地模型');

  return (
    <Card className="border-border/40 bg-card/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="size-4 text-primary" />
          智能体模型
        </CardTitle>
        <CardDescription>选择智能体默认使用的模型，并设置单次响应的最大 Token 数。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="agent-default-model">默认模型</Label>
          <Select value={draftModelId} onValueChange={onDraftModelChange} disabled={loading || saving}>
            <SelectTrigger id="agent-default-model" className="h-9 max-w-xl"><SelectValue placeholder="选择模型" /></SelectTrigger>
            <SelectContent>
              {remoteModels.length > 0 && (
                <SelectGroup>
                  <SelectLabel>云端与兼容接口</SelectLabel>
                  {remoteModels.map((model) => <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>)}
                </SelectGroup>
              )}
              {localModels.length > 0 && (
                <SelectGroup>
                  <SelectLabel>本地模型</SelectLabel>
                  {localModels.map((model) => <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>)}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
          {selected && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {selected.id === savedModelId && <Badge variant="secondary" className="gap-1"><Star className="size-3 fill-current text-primary" />默认</Badge>}
              {modelDirty && <Badge variant="outline" className="border-warning/40 text-warning">待确认</Badge>}
              <Badge variant="outline">{GetProviderLabel(selected.provider)}</Badge>
              <span className="max-w-[18rem] truncate text-xs text-muted-foreground">{selected.apiBase}</span>
            </div>
          )}
        </div>
        <div className="max-w-md space-y-2">
          <Label htmlFor="agent-max-tokens">最大 Token 数</Label>
          <Input
            id="agent-max-tokens"
            type="number"
            min={1}
            step={1}
            className="h-9"
            value={draftMaxTokens}
            disabled={loading || saving}
            onChange={(event) => onDraftMaxTokensChange(event.target.value)}
            placeholder={DEFAULT_MAX_TOKENS}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" disabled={loading || saving || !draftModelId || !dirty} onClick={onConfirm}>
            {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {saving ? '正在保存…' : '确认'}
          </Button>
          {dirty && !saving && <span className="text-xs text-muted-foreground">有未保存的修改，确认后将模拟重启智能体网关。</span>}
        </div>
        {!loading && models.length === 0 && <p className="text-sm text-muted-foreground">暂无可用模型，请先在下方模型列表中添加。</p>}
      </CardContent>
    </Card>
  );
}

function ModelSettingsSection({
  models,
  loading,
  activeModelId,
  applyingDefault,
  onRefresh,
  onApplyDefault,
}: {
  models: PrototypeModel[];
  loading: boolean;
  activeModelId: string;
  applyingDefault: boolean;
  onRefresh: () => Promise<void>;
  onApplyDefault: (id: string) => Promise<void>;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<PrototypeModel | null>(null);
  const [deleting, setDeleting] = useState<PrototypeModel | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const groups = new Map<string, PrototypeModel[]>();
    for (const model of models) {
      const provider = GetProviderLabel(model.provider);
      const items = groups.get(provider) || [];
      items.push(model);
      groups.set(provider, items);
    }
    return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right, 'zh-CN'));
  }, [models]);

  const TestModel = async (model: PrototypeModel) => {
    try {
      setTesting(model.id);
      const result = await TestPrototypeModel(model.id);
      toast.success(result.message, { description: `模拟延迟 ${result.latency} ms` });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '模型测试失败');
    } finally {
      setTesting(null);
    }
  };

  const DeleteModel = async () => {
    if (!deleting) {
      return;
    }
    try {
      await DeletePrototypeModel(deleting.id);
      setDeleting(null);
      await onRefresh();
      toast.success(`已删除：${deleting.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除模型失败');
    }
  };

  return (
    <>
      <Card className="border-border/40 bg-card/60">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base"><Cpu className="size-4 text-primary" />模型列表</CardTitle>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void onRefresh()} disabled={loading || applyingDefault}>
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />刷新
            </Button>
            <Button type="button" size="sm" onClick={() => setAddOpen(true)} disabled={applyingDefault}>
              <Plus className="size-3.5" />添加模型
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && models.length === 0 ? (
            <div className="flex h-24 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />加载模型中…</div>
          ) : models.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">尚未配置任何模型</p>
              <Button type="button" size="sm" className="mt-4" onClick={() => setAddOpen(true)}><Plus className="size-3.5" />添加第一个模型</Button>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(([provider, items]) => (
                <div key={provider} className="space-y-3">
                  <div className="flex items-center gap-2"><h3 className="text-sm font-medium">{provider}</h3><span className="text-xs text-muted-foreground">{items.length} 个</span></div>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {items.map((model) => {
                      const isActive = model.id === activeModelId;
                      const isTesting = testing === model.id;
                      return (
                        <div key={model.id} className="rounded-xl border border-input bg-card/70 p-4 transition-colors hover:border-primary/30">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`size-2 shrink-0 rounded-full ${isActive ? 'bg-primary' : model.available ? 'bg-success' : 'bg-warning'}`} />
                                <span className="truncate text-sm font-semibold">{model.name}</span>
                                {isActive && <Badge className="bg-primary/10 text-primary hover:bg-primary/10">默认</Badge>}
                                <Badge variant="outline">{model.available ? '可用' : '不可用'}</Badge>
                              </div>
                              <p className="truncate text-xs text-muted-foreground">{model.provider} · {model.apiBase}</p>
                              {model.apiKey && <p className="truncate font-mono text-[11px] text-muted-foreground/80">Key: {model.apiKey}</p>}
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5">
                              <Button type="button" variant="ghost" size="icon" className="size-8" disabled={isActive || applyingDefault} title={isActive ? '当前默认' : '设为默认'} onClick={() => void onApplyDefault(model.id)}>
                                <Star className={`size-3.5 ${isActive ? 'fill-primary text-primary' : ''}`} />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className="size-8" disabled={isTesting} title="测试" onClick={() => void TestModel(model)}>
                                {isTesting ? <Loader2 className="size-3.5 animate-spin" /> : <TestTube2 className="size-3.5" />}
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className="size-8" title="编辑" onClick={() => setEditing(model)}><Pencil className="size-3.5" /></Button>
                              <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" title="删除" disabled={isActive} onClick={() => setDeleting(model)}><Trash2 className="size-3.5" /></Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <ModelEditorDialog model={editing} open={Boolean(editing)} onClose={() => setEditing(null)} onSaved={onRefresh} />
      <ModelEditorDialog model={null} open={addOpen} onClose={() => setAddOpen(false)} onSaved={onRefresh} />
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>确认删除模型</AlertDialogTitle><AlertDialogDescription>将删除“{deleting?.name}”的原型配置，且无法恢复。</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void DeleteModel()}>删除</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SkillsSection() {
  const [skills, setSkills] = useState<PrototypeSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<PrototypeSkill | null>(null);
  const [deleting, setDeleting] = useState<PrototypeSkill | null>(null);
  const [marketOpen, setMarketOpen] = useState(false);

  const Refresh = useCallback(async () => {
    try {
      setLoading(true);
      setSkills(await GetPrototypeSkills());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载技能失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Refresh();
  }, [Refresh]);

  const filteredSkills = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized ? skills.filter((skill) => `${skill.name} ${skill.description} ${skill.category}`.toLocaleLowerCase().includes(normalized)) : skills;
  }, [query, skills]);

  const ToggleSkill = async (skill: PrototypeSkill) => {
    try {
      await SetPrototypeSkillEnabled(skill.id, !skill.enabled);
      await Refresh();
      toast.success(`${skill.name} 已${skill.enabled ? '停用' : '启用'}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新技能状态失败');
    }
  };

  const DeleteSkill = async () => {
    if (!deleting) {
      return;
    }
    try {
      await DeletePrototypeSkill(deleting.id);
      setDeleting(null);
      await Refresh();
      toast.success(`已删除：${deleting.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除技能失败');
    }
  };

  const ImportSkill = async (skill: PrototypeSkill) => {
    try {
      await ImportPrototypeSkill(skill.id);
      await Refresh();
      toast.success(`已导入：${skill.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导入技能失败');
    }
  };

  const marketplaceSkills = GetPrototypeMarketplaceSkills();

  return (
    <>
      <Card className="border-border/40 bg-card/60">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base"><Package className="size-4 text-primary" />技能列表</CardTitle>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void Refresh()} disabled={loading}><RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />刷新</Button>
            <Button type="button" size="sm" onClick={() => setMarketOpen(true)}><Store className="size-3.5" />技能市场</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-9 pl-8 text-sm" placeholder="搜索技能名称或描述…" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          {loading ? (
            <div className="flex h-28 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />加载技能中…</div>
          ) : filteredSkills.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 px-4 py-10 text-center"><FileUp className="mx-auto size-8 text-muted-foreground/50" /><p className="mt-3 text-sm text-muted-foreground">{query ? '没有匹配的技能' : '暂无已安装技能'}</p></div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {filteredSkills.map((skill) => (
                <div key={skill.id} className="rounded-xl border border-input bg-card/70 p-4 transition-colors hover:border-primary/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold">{skill.name}</h3><Badge variant="outline">v{skill.version}</Badge><Badge variant="outline" className={skill.enabled ? 'border-success/30 bg-success/5 text-success' : ''}>{skill.enabled ? '已启用' : '已停用'}</Badge></div>
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{skill.description || '暂无描述'}</p>
                      <p className="text-[11px] text-muted-foreground/80">分类：{skill.category}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button type="button" variant="ghost" size="icon" className="size-8" title="查看详情" onClick={() => setDetail(skill)}><Eye className="size-3.5" /></Button>
                      <Button type="button" variant="ghost" size="icon" className="size-8" title={skill.enabled ? '停用' : '启用'} onClick={() => void ToggleSkill(skill)}><CheckCircle2 className={`size-3.5 ${skill.enabled ? 'text-success' : ''}`} /></Button>
                      {skill.system ? <Button type="button" variant="ghost" size="icon" className="size-8" disabled title="系统技能"><Package className="size-3.5" /></Button> : <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" title="删除" onClick={() => setDeleting(skill)}><Trash2 className="size-3.5" /></Button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={marketOpen} onOpenChange={setMarketOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>技能市场</DialogTitle><DialogDescription>导入的技能仅保存到当前浏览器的原型数据，不会安装到设备。</DialogDescription></DialogHeader><div className="space-y-3">{marketplaceSkills.map((skill) => <div key={skill.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"><div className="min-w-0"><p className="text-sm font-medium">{skill.name}</p><p className="mt-1 text-xs text-muted-foreground">{skill.category} · {skill.version}</p></div><Button type="button" size="sm" onClick={() => void ImportSkill(skill)}>导入</Button></div>)}</div><DialogFooter><Button variant="outline" onClick={() => setMarketOpen(false)}>关闭</Button></DialogFooter></DialogContent>
      </Dialog>
      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}><DialogContent><DialogHeader><DialogTitle>{detail?.name}</DialogTitle><DialogDescription>{detail ? `${detail.category} · ${detail.version}` : ''}</DialogDescription></DialogHeader><Textarea readOnly value={detail?.description || ''} className="min-h-28 resize-none" /><DialogFooter><Button onClick={() => setDetail(null)}>关闭</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>确认删除技能</AlertDialogTitle><AlertDialogDescription>将删除“{deleting?.name}”的原型技能配置，且无法恢复。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void DeleteSkill()}>删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}

export default function PicoClawPage() {
  const [activeTab, setActiveTab] = useState('models');
  const [models, setModels] = useState<PrototypeModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedModelId, setSavedModelId] = useState('');
  const [draftModelId, setDraftModelId] = useState('');
  const [savedMaxTokens, setSavedMaxTokens] = useState(() => localStorage.getItem(MAX_TOKENS_STORAGE_KEY) || DEFAULT_MAX_TOKENS);
  const [draftMaxTokens, setDraftMaxTokens] = useState(() => localStorage.getItem(MAX_TOKENS_STORAGE_KEY) || DEFAULT_MAX_TOKENS);
  const [savingSelection, setSavingSelection] = useState(false);

  const RefreshModels = useCallback(async () => {
    try {
      setLoading(true);
      const nextModels = await GetPrototypeModels();
      const defaultModel = nextModels.find((model) => model.isDefault) || nextModels[0];
      setModels(nextModels);
      setSavedModelId(defaultModel?.id || '');
      setDraftModelId((current) => current && nextModels.some((model) => model.id === current) ? current : defaultModel?.id || '');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载模型失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void RefreshModels();
  }, [RefreshModels]);

  const ApplyDefaultModel = useCallback(async (id: string) => {
    if (!id || id === savedModelId) {
      return;
    }
    try {
      setSavingSelection(true);
      await SetPrototypeDefaultModel(id);
      await RefreshModels();
      toast.success('默认模型已切换，原型不会重启智能体服务');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '切换默认模型失败');
    } finally {
      setSavingSelection(false);
    }
  }, [RefreshModels, savedModelId]);

  const ConfirmSelection = async () => {
    const parsedMaxTokens = Number(draftMaxTokens.trim());
    if (!Number.isInteger(parsedMaxTokens) || parsedMaxTokens < 1) {
      toast.error('最大 Token 数必须是大于 0 的整数');
      return;
    }
    try {
      setSavingSelection(true);
      if (draftModelId !== savedModelId) {
        await SetPrototypeDefaultModel(draftModelId);
      }
      const nextMaxTokens = String(parsedMaxTokens);
      localStorage.setItem(MAX_TOKENS_STORAGE_KEY, nextMaxTokens);
      setSavedMaxTokens(nextMaxTokens);
      setDraftMaxTokens(nextMaxTokens);
      await RefreshModels();
      toast.success('智能体模型配置已保存，原型不会重启真实服务');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存模型配置失败');
    } finally {
      setSavingSelection(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto w-full max-w-md rounded-xl bg-muted/60 p-1">
          <TabsTrigger value="models" className="flex-1 gap-1.5 py-2 text-sm"><Bot className="size-3.5" />模型配置</TabsTrigger>
          <TabsTrigger value="skills" className="flex-1 gap-1.5 py-2 text-sm"><Package className="size-3.5" />技能配置</TabsTrigger>
        </TabsList>
        <TabsContent value="models" className="mt-6 space-y-6">
          <ModelSelectionCard models={models} loading={loading} savedModelId={savedModelId} draftModelId={draftModelId} savedMaxTokens={savedMaxTokens} draftMaxTokens={draftMaxTokens} saving={savingSelection} onDraftModelChange={setDraftModelId} onDraftMaxTokensChange={setDraftMaxTokens} onConfirm={() => void ConfirmSelection()} />
          <ModelSettingsSection models={models} loading={loading} activeModelId={savedModelId} applyingDefault={savingSelection} onRefresh={RefreshModels} onApplyDefault={ApplyDefaultModel} />
        </TabsContent>
        <TabsContent value="skills" className="mt-6"><SkillsSection /></TabsContent>
      </Tabs>
    </div>
  );
}
