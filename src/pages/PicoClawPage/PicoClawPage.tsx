import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, Download, LoaderCircle, Package, Plus, RefreshCw, Settings2, TestTube2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

type ModelDraft = Pick<PrototypeModel, 'name' | 'provider' | 'apiBase' | 'apiKey'> & { id?: string };

const EMPTY_MODEL: ModelDraft = { name: '', provider: '自定义兼容接口', apiBase: '', apiKey: '' };

function ModelDialog({ model, open, onOpenChange, onSaved }: { model: PrototypeModel | null; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => Promise<void> }) {
  const [draft, setDraft] = useState<ModelDraft>(EMPTY_MODEL);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setDraft(model ? { id: model.id, name: model.name, provider: model.provider, apiBase: model.apiBase, apiKey: model.apiKey } : EMPTY_MODEL);
    setShowKey(false);
  }, [model, open]);

  const save = async () => {
    if (!draft.name.trim() || !draft.provider.trim() || !draft.apiBase.trim()) {
      toast.error('请填写模型名称、提供方和 API 地址');
      return;
    }
    setSaving(true);
    try {
      await SavePrototypeModel({ ...draft, name: draft.name.trim(), provider: draft.provider.trim(), apiBase: draft.apiBase.trim() });
      await onSaved();
      onOpenChange(false);
      toast.success(model ? '模型配置已保存' : '模型已添加');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存模型失败');
    } finally {
      setSaving(false);
    }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{model ? '编辑模型' : '添加模型'}</DialogTitle><DialogDescription>原型模式下配置仅保存于当前浏览器，不会访问外部模型服务。</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-1.5"><Label htmlFor="model-name">模型名称</Label><Input id="model-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="例如 Qwen3-8B" /></div><div className="space-y-1.5"><Label htmlFor="model-provider">提供方</Label><Input id="model-provider" value={draft.provider} onChange={(event) => setDraft({ ...draft, provider: event.target.value })} placeholder="本地模型或自定义提供方" /></div><div className="space-y-1.5"><Label htmlFor="model-base">API 地址</Label><Input id="model-base" value={draft.apiBase} onChange={(event) => setDraft({ ...draft, apiBase: event.target.value })} placeholder="http://127.0.0.1:11434/v1" /></div><div className="space-y-1.5"><Label htmlFor="model-key">API Key</Label><div className="flex gap-2"><Input id="model-key" type={showKey ? 'text' : 'password'} value={draft.apiKey} onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })} placeholder="原型可留空" /><Button type="button" variant="outline" size="sm" onClick={() => setShowKey((value) => !value)}>{showKey ? '隐藏' : '显示'}</Button></div></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>取消</Button><Button onClick={() => void save()} disabled={saving}>{saving && <LoaderCircle className="size-3.5 animate-spin" />}保存模型</Button></DialogFooter></DialogContent></Dialog>;
}

function ModelPanel() {
  const [models, setModels] = useState<PrototypeModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PrototypeModel | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setModels(await GetPrototypeModels());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载模型配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setDefault = async (id: string) => {
    try {
      await SetPrototypeDefaultModel(id);
      await refresh();
      toast.success('默认模型已切换，原型不会重启智能体服务');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '切换默认模型失败');
    }
  };

  const testModel = async (model: PrototypeModel) => {
    setTesting(model.id);
    try {
      const result = await TestPrototypeModel(model.id);
      toast.success(result.message, { description: `模拟延迟 ${result.latency} ms` });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '模型测试失败');
    } finally {
      setTesting(null);
    }
  };

  const deleteModel = async (model: PrototypeModel) => {
    if (!window.confirm(`确认删除模型“${model.name}”？`)) return;
    try {
      await DeletePrototypeModel(model.id);
      await refresh();
      toast.success('模型已删除');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除模型失败');
    }
  };

  return <div className="space-y-6"><Card className="border-border/40 bg-card/60"><CardHeader className="flex-row items-start justify-between gap-4 space-y-0"><div><CardTitle className="flex items-center gap-2 text-base"><Bot className="size-4 text-primary" />默认模型</CardTitle><CardDescription className="mt-1">选择智能体默认使用的模型配置。</CardDescription></div><Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />刷新</Button></CardHeader><CardContent>{loading ? <div className="grid h-24 place-items-center"><LoaderCircle className="size-5 animate-spin text-primary" /></div> : <div className="grid gap-3 lg:grid-cols-2">{models.map((model) => <button type="button" key={model.id} onClick={() => !model.isDefault && void setDefault(model.id)} className={`rounded-lg border p-4 text-left transition-colors ${model.isDefault ? 'border-primary/50 bg-primary/5' : 'border-border/60 hover:border-primary/40'}`}><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{model.name}</p><p className="mt-1 text-xs text-muted-foreground">{model.provider}</p></div>{model.isDefault ? <Badge className="bg-success text-success-foreground">当前默认</Badge> : <Badge variant="outline">设为默认</Badge>}</div><p className="mt-3 truncate text-xs text-muted-foreground">{model.apiBase}</p></button>)}</div>}</CardContent></Card><Card className="border-border/40 bg-card/60"><CardHeader className="flex-row items-start justify-between gap-4 space-y-0"><div><CardTitle className="flex items-center gap-2 text-base"><Settings2 className="size-4 text-primary" />模型配置</CardTitle><CardDescription className="mt-1">管理本地与兼容接口模型，并提供模拟连通性测试。</CardDescription></div><Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="size-3.5" />添加模型</Button></CardHeader><CardContent className="space-y-3">{models.map((model) => <div key={model.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-4"><div className="min-w-0"><div className="flex items-center gap-2"><p className="font-medium">{model.name}</p>{model.available ? <CheckCircle2 className="size-3.5 text-success" /> : null}</div><p className="mt-1 truncate text-xs text-muted-foreground">{model.provider} · {model.apiBase}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => void testModel(model)} disabled={testing === model.id}>{testing === model.id ? <LoaderCircle className="size-3.5 animate-spin" /> : <TestTube2 className="size-3.5" />}测试</Button><Button variant="outline" size="sm" onClick={() => { setEditing(model); setDialogOpen(true); }}>编辑</Button><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => void deleteModel(model)} disabled={model.isDefault} aria-label={`删除 ${model.name}`}><Trash2 className="size-4" /></Button></div></div>)}</CardContent></Card><ModelDialog model={editing} open={dialogOpen} onOpenChange={setDialogOpen} onSaved={refresh} /></div>;
}

function SkillPanel() {
  const [skills, setSkills] = useState<PrototypeSkill[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [marketOpen, setMarketOpen] = useState(false);
  const [detail, setDetail] = useState<PrototypeSkill | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSkills(await GetPrototypeSkills());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载技能配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visibleSkills = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? skills.filter((skill) => `${skill.name} ${skill.category}`.toLowerCase().includes(normalized)) : skills;
  }, [query, skills]);

  const toggle = async (skill: PrototypeSkill) => {
    await SetPrototypeSkillEnabled(skill.id, !skill.enabled);
    await refresh();
    toast.success(`${skill.name} 已${skill.enabled ? '停用' : '启用'}`);
  };

  const remove = async (skill: PrototypeSkill) => {
    if (!window.confirm(`确认删除技能“${skill.name}”？`)) return;
    try {
      await DeletePrototypeSkill(skill.id);
      await refresh();
      toast.success('技能已删除');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除技能失败');
    }
  };

  const importSkill = async (skill: PrototypeSkill) => {
    try {
      await ImportPrototypeSkill(skill.id);
      await refresh();
      toast.success(`已导入技能：${skill.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导入技能失败');
    }
  };

  const market = GetPrototypeMarketplaceSkills();
  return <div className="space-y-6"><Card className="border-border/40 bg-card/60"><CardHeader className="flex-row items-start justify-between gap-4 space-y-0"><div><CardTitle className="flex items-center gap-2 text-base"><Package className="size-4 text-primary" />技能配置</CardTitle><CardDescription className="mt-1">查看、启停和管理原型智能体技能。</CardDescription></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />刷新</Button><Button size="sm" onClick={() => setMarketOpen(true)}><Download className="size-3.5" />导入技能</Button></div></CardHeader><CardContent className="space-y-4"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索已配置技能" className="max-w-md" />{loading ? <div className="grid h-32 place-items-center"><LoaderCircle className="size-5 animate-spin text-primary" /></div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleSkills.map((skill) => <Card key={skill.id} className="border-border/60"><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-sm">{skill.name}</CardTitle><CardDescription className="mt-1">{skill.category} · {skill.version}</CardDescription></div><Badge variant="outline" className={skill.enabled ? 'border-success/30 bg-success/5 text-success' : ''}>{skill.enabled ? '已启用' : '已停用'}</Badge></div></CardHeader><CardContent><p className="min-h-10 text-xs leading-5 text-muted-foreground">{skill.description}</p><div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => setDetail(skill)}>详情</Button><Button variant="outline" size="sm" onClick={() => void toggle(skill)}>{skill.enabled ? '停用' : '启用'}</Button><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={skill.system} onClick={() => void remove(skill)}>{skill.system ? '系统技能' : '删除'}</Button></div></CardContent></Card>)}</div>}</CardContent></Card><Dialog open={marketOpen} onOpenChange={setMarketOpen}><DialogContent><DialogHeader><DialogTitle>导入技能</DialogTitle><DialogDescription>导入后仅写入当前浏览器的原型数据，不安装到设备。</DialogDescription></DialogHeader><div className="max-h-[50vh] space-y-3 overflow-y-auto">{market.map((skill) => <div key={skill.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"><div><p className="text-sm font-medium">{skill.name}</p><p className="mt-1 text-xs text-muted-foreground">{skill.category} · {skill.version}</p></div><Button size="sm" onClick={() => void importSkill(skill)}>导入</Button></div>)}</div><DialogFooter><Button variant="outline" onClick={() => setMarketOpen(false)}>关闭</Button></DialogFooter></DialogContent></Dialog><Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}><DialogContent><DialogHeader><DialogTitle>{detail?.name}</DialogTitle><DialogDescription>{detail?.category} · {detail?.version}</DialogDescription></DialogHeader><Textarea readOnly value={detail?.description || ''} className="min-h-28 resize-none" /><DialogFooter><Button onClick={() => setDetail(null)}>关闭</Button></DialogFooter></DialogContent></Dialog></div>;
}

export default function PicoClawPage() {
  return <div className="space-y-6"><div><h1 className="text-lg font-semibold">智能体配置</h1><p className="mt-1 text-sm text-muted-foreground">管理模型与技能；原型模式不会连接真实智能体网关。</p></div><Tabs defaultValue="models"><TabsList className="h-auto w-full max-w-md rounded-2xl bg-muted/60 p-1"><TabsTrigger value="models" className="flex-1 gap-1.5 rounded-xl py-2 text-sm"><Bot className="size-3.5" />模型配置</TabsTrigger><TabsTrigger value="skills" className="flex-1 gap-1.5 rounded-xl py-2 text-sm"><Package className="size-3.5" />技能配置</TabsTrigger></TabsList><TabsContent value="models" className="mt-6"><ModelPanel /></TabsContent><TabsContent value="skills" className="mt-6"><SkillPanel /></TabsContent></Tabs></div>;
}
