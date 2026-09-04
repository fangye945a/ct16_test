import { useCallback, useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fetchUpstreamModels, type UpstreamModel } from './api';
import { PROVIDER_MAP } from './providers';

interface FetchModelsDialogProps {
  open: boolean;
  onClose: () => void;
  onFill: (models: string[]) => void;
  provider: string;
  apiKey: string;
  apiBase: string;
}

export function FetchModelsDialog({
  open,
  onClose,
  onFill,
  provider,
  apiKey,
  apiBase,
}: FetchModelsDialogProps) {
  const [fetching, setFetching] = useState(false);
  const [models, setModels] = useState<UpstreamModel[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  const providerDef = PROVIDER_MAP.get(provider);
  const needsKey = providerDef?.requiresApiKey !== false;

  const handleFetch = useCallback(async () => {
    setFetching(true);
    setError('');
    setModels([]);
    setSelected(new Set());
    try {
      const res = await fetchUpstreamModels({
        provider,
        api_key: apiKey,
        api_base: apiBase,
      });
      setModels(res.models);
      setSelected(new Set(res.models.map((m) => m.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取模型失败');
    } finally {
      setFetching(false);
    }
  }, [provider, apiKey, apiBase]);

  useEffect(() => {
    if (open && provider && !(needsKey && !apiKey)) {
      void handleFetch();
    }
  }, [open, provider, apiKey, needsKey, handleFetch]);

  const handleClose = () => {
    setModels([]);
    setSelected(new Set());
    setError('');
    setFilter('');
    onClose();
  };

  const handleFill = () => {
    onFill(Array.from(selected));
    handleClose();
  };

  const toggleModel = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredModels = filter
    ? models.filter((m) => m.id.toLowerCase().includes(filter.toLowerCase()))
    : models;

  const toggleAll = () => {
    const ids = filteredModels.map((m) => m.id);
    if (ids.every((id) => selected.has(id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(ids));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="border-border/40 bg-card/95 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="size-4 text-primary" />
            获取可用模型
          </DialogTitle>
          <DialogDescription>
            从上游服务商获取模型列表。
            {provider && (
              <span className="mt-1 block font-mono text-xs">
                服务商：{provider}
                {apiBase ? ` | ${apiBase}` : ''}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {needsKey && !apiKey && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
              请先输入 API Key 再获取模型。
            </div>
          )}

          {fetching && (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span>正在获取模型...</span>
            </div>
          )}

          {error && (
            <div className="space-y-2">
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
              <Button variant="outline" size="sm" onClick={() => void handleFetch()} className="w-full">
                重试
              </Button>
            </div>
          )}

          {models.length > 0 && (
            <>
              <Input
                placeholder="筛选模型..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  已找到 {models.length} 个模型
                  {filter ? `（显示 ${filteredModels.length} 个）` : ''}
                </span>
                <button type="button" onClick={toggleAll} className="text-primary hover:underline">
                  {filteredModels.every((m) => selected.has(m.id)) ? '取消全选' : '全选'}
                </button>
              </div>
              <div className="max-h-[300px] space-y-1 overflow-y-auto rounded-md border border-border/40 p-2">
                {filteredModels.map((m) => (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selected.has(m.id)}
                      onCheckedChange={() => toggleModel(m.id)}
                    />
                    <span className="font-mono text-xs">{m.id}</span>
                    {m.owned_by && (
                      <span className="ml-auto text-xs text-muted-foreground">{m.owned_by}</span>
                    )}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            取消
          </Button>
          {models.length > 0 && (
            <Button onClick={handleFill} disabled={selected.size === 0}>
              填充 {selected.size} 个选中的模型
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
