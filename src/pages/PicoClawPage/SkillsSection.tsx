import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  FileUp,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Store,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  deleteSkill,
  getSkill,
  getSkills,
  type SkillDetailResponse,
  type SkillSupportItem,
} from './api';
import { originLabel, sourceLabel } from './providers';

/** 系统/内置技能目录：这些路径下的技能不允许删除 */
const PROTECTED_PATH_PREFIXES = [
  'F:/zhos-claw/workspace/skills',
  '/app/zaiagent/skills',
];

function normalizeSkillPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+$/, '');
}

function isProtectedSkillPath(path: string): boolean {
  const normalized = normalizeSkillPath(path);
  const lower = normalized.toLowerCase();
  return PROTECTED_PATH_PREFIXES.some((prefix) => {
    const p = prefix.toLowerCase();
    return lower === p || lower.startsWith(`${p}/`);
  });
}

function canDeleteSkill(skill: SkillSupportItem): boolean {
  if (isProtectedSkillPath(skill.path)) return false;
  return skill.source === 'workspace';
}

export function SkillsSection() {
  const [skills, setSkills] = useState<SkillSupportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<SkillDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleting, setDeleting] = useState<SkillSupportItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadSkills = async () => {
    setLoading(true);
    try {
      const data = await getSkills();
      setSkills(data.skills ?? []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载技能失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing || loading) return;
    setRefreshing(true);
    const startedAt = Date.now();
    try {
      await loadSkills();
    } finally {
      const elapsed = Date.now() - startedAt;
      const remain = Math.max(0, 400 - elapsed);
      if (remain > 0) {
        await new Promise((resolve) => setTimeout(resolve, remain));
      }
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadSkills();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills
      .filter((s) => {
        if (!q) return true;
        return (
          s.name.toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q) ||
          (s.registry_name || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  }, [skills, query]);

  const handleView = async (skill: SkillSupportItem) => {
    setDetailLoading(true);
    setDetail({ ...skill, content: '' });
    try {
      const data = await getSkill(skill.name);
      setDetail(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '加载技能详情失败');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    if (!canDeleteSkill(deleting)) {
      toast.error('该技能位于系统目录，不可删除');
      setDeleting(null);
      return;
    }
    setDeletePending(true);
    try {
      await deleteSkill(deleting.name);
      toast.success(`已删除：${deleting.name}`);
      setDeleting(null);
      await loadSkills();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <>
      <Card className="border-border/40 bg-card/60">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="size-4 text-primary" />
            技能列表
          </CardTitle>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleRefresh()}
              disabled={loading || refreshing}
            >
              <RefreshCw
                className={`size-3.5 ${loading || refreshing ? 'animate-spin' : ''}`}
              />
              {refreshing ? '刷新中' : '刷新'}
            </Button>
            <Button type="button" size="sm" onClick={() => setMarketplaceOpen(true)}>
              <Store className="size-3.5" />
              技能市场
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-8 text-sm"
              placeholder="搜索技能名称或描述…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {loading && skills.length === 0 ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
              <FileUp className="mx-auto size-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                {query ? '没有匹配的技能' : '暂无已安装技能'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {filtered.map((skill) => (
                <div
                  key={`${skill.source}-${skill.name}`}
                  className="rounded-xl border border-input bg-card/70 p-4 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold">{skill.name}</h3>
                        {skill.installed_version && (
                          <Badge variant="outline">v{skill.installed_version}</Badge>
                        )}
                      </div>
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {skill.description || '暂无描述'}
                      </p>
                      {skill.registry_name && (
                        <p className="truncate text-[11px] text-muted-foreground/80">
                          来源：{skill.registry_name}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="查看详情"
                        onClick={() => void handleView(skill)}
                      >
                        <Eye className="size-3.5" />
                      </Button>
                      {canDeleteSkill(skill) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          title="删除"
                          onClick={() => setDeleting(skill)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={marketplaceOpen} onOpenChange={setMarketplaceOpen}>
        <DialogContent className="border-border/40 bg-card/95 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="size-4 text-primary" />
              技能市场
            </DialogTitle>
          </DialogHeader>
          <Empty className="border border-dashed border-border/60 py-10 md:py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Store />
              </EmptyMedia>
              <EmptyTitle>暂无可用技能</EmptyTitle>
              <EmptyDescription>技能市场即将上线，敬请期待</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="border-border/40 bg-card/95 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.name}</DialogTitle>
            <DialogDescription>
              {detail
                ? `${originLabel(detail.origin_kind)} · ${sourceLabel(detail.source)}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              加载详情…
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {detail?.description || '暂无描述'}
              </p>
              <pre className="max-h-[50vh] overflow-auto rounded-xl border border-border/40 bg-muted/30 p-4 text-xs leading-relaxed whitespace-pre-wrap">
                {detail?.content || '（无内容）'}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent className="border-border/40 bg-card/95">
          <AlertDialogHeader>
            <AlertDialogTitle>删除技能</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除技能「{deleting?.name}」？系统目录下的技能不可删除。
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
