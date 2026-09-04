import { useMemo, useState } from 'react';
import {
  Cpu,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  deleteModel,
  type ModelInfo,
  type ModelProviderOption,
} from './api';
import { AddModelSheet } from './AddModelSheet';
import { EditModelSheet } from './EditModelSheet';
import { getProviderLabel, statusLabel } from './providers';

function statusDotClass(status: ModelInfo['status'], isDefault: boolean): string {
  if (isDefault) return 'bg-primary';
  if (status === 'available') return 'bg-success';
  if (status === 'unreachable') return 'bg-warning';
  return 'bg-muted-foreground/40';
}

interface ModelSettingsSectionProps {
  models: ModelInfo[];
  providerOptions: ModelProviderOption[];
  loading: boolean;
  error: string;
  applyingDefault?: boolean;
  onRefresh: () => Promise<void>;
  onApplyDefault: (modelName: string) => Promise<void>;
}

export function ModelSettingsSection({
  models,
  providerOptions,
  loading,
  error,
  applyingDefault = false,
  onRefresh,
  onApplyDefault,
}: ModelSettingsSectionProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ModelInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [settingDefaultIndex, setSettingDefaultIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<ModelInfo | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const existingNames = useMemo(() => models.map((m) => m.model_name), [models]);

  const handleRefresh = async () => {
    if (refreshing || loading) return;
    setRefreshing(true);
    const startedAt = Date.now();
    try {
      await onRefresh();
    } finally {
      const elapsed = Date.now() - startedAt;
      const remain = Math.max(0, 400 - elapsed);
      if (remain > 0) {
        await new Promise((resolve) => setTimeout(resolve, remain));
      }
      setRefreshing(false);
    }
  };

  const handleSetDefault = async (model: ModelInfo) => {
    if (model.is_default || applyingDefault) return;
    setSettingDefaultIndex(model.index);
    try {
      await onApplyDefault(model.model_name);
    } catch {
      // 成功/失败提示由页面统一处理
    } finally {
      setSettingDefaultIndex(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await deleteModel(deleting.index);
      toast.success(`已删除：${deleting.model_name}`);
      setDeleting(null);
      await onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    } finally {
      setDeletePending(false);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, ModelInfo[]>();
    for (const model of models) {
      const key = model.provider || 'other';
      const list = map.get(key) ?? [];
      list.push(model);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => {
      const aDefault = a[1].some((m) => m.is_default);
      const bDefault = b[1].some((m) => m.is_default);
      if (aDefault !== bDefault) return aDefault ? -1 : 1;
      return getProviderLabel(a[0]).localeCompare(getProviderLabel(b[0]), 'zh-CN');
    });
  }, [models]);

  return (
    <>
      <Card className="border-border/40 bg-card/60">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cpu className="size-4 text-primary" />
              模型列表
            </CardTitle>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleRefresh()}
              disabled={loading || refreshing || applyingDefault}
            >
              <RefreshCw
                className={`size-3.5 ${loading || refreshing ? 'animate-spin' : ''}`}
              />
              {refreshing ? '刷新中' : '刷新'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setAddOpen(true)}
              disabled={applyingDefault}
            >
              <Plus className="size-3.5" />
              添加模型
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && models.length === 0 ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : models.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">尚未配置任何模型</p>
              <Button type="button" size="sm" className="mt-4" onClick={() => setAddOpen(true)}>
                <Plus className="size-3.5" />
                添加第一个模型
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(([provider, list]) => (
                <div key={provider} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground">
                      {getProviderLabel(provider)}
                    </h3>
                    <span className="text-xs text-muted-foreground">{list.length} 个</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {list.map((model) => {
                      const canSetDefault =
                        model.available &&
                        !model.is_default &&
                        !model.is_virtual &&
                        model.default_model_allowed !== false;
                      const setting = settingDefaultIndex === model.index;
                      return (
                        <div
                          key={model.index}
                          className="rounded-xl border border-input bg-card/70 p-4 transition-colors hover:border-primary/30"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`size-2 shrink-0 rounded-full ${statusDotClass(model.status, model.is_default)}`}
                                  title={statusLabel(model.status)}
                                />
                                <span className="truncate text-sm font-semibold">
                                  {model.model_name}
                                </span>
                                {model.is_default && (
                                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                                    默认
                                  </Badge>
                                )}
                                {model.is_virtual && (
                                  <Badge variant="secondary">虚拟</Badge>
                                )}
                                <Badge variant="outline">{statusLabel(model.status)}</Badge>
                              </div>
                              <p className="truncate text-xs text-muted-foreground">
                                {model.model}
                                {model.api_base ? ` · ${model.api_base}` : ''}
                              </p>
                              {model.api_key && (
                                <p className="truncate font-mono text-[11px] text-muted-foreground/80">
                                  Key: {model.api_key}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                disabled={!canSetDefault || setting || applyingDefault}
                                title={model.is_default ? '当前默认' : '设为默认'}
                                onClick={() => void handleSetDefault(model)}
                              >
                                {setting ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Star
                                    className={`size-3.5 ${model.is_default ? 'fill-primary text-primary' : ''}`}
                                  />
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                title="编辑"
                                onClick={() => setEditing(model)}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-destructive"
                                title="删除"
                                disabled={model.is_default}
                                onClick={() => setDeleting(model)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
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

      <AddModelSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => void onRefresh()}
        existingModelNames={existingNames}
        providerOptions={providerOptions}
        onApplyDefault={onApplyDefault}
      />

      <EditModelSheet
        model={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={() => void onRefresh()}
        providerOptions={providerOptions}
        onApplyDefault={onApplyDefault}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent className="border-border/40 bg-card/95">
          <AlertDialogHeader>
            <AlertDialogTitle>删除模型</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除「{deleting?.model_name}」？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePending}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              {deletePending && <Loader2 className="size-3.5 animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
