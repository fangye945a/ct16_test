import { BrainCircuit, Loader2, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ModelInfo } from './api';
import { getProviderLabel } from './providers';

function isLocalModel(model: ModelInfo): boolean {
  const isLocalHostBase = Boolean(
    model.api_base?.includes('localhost') || model.api_base?.includes('127.0.0.1'),
  );
  return model.auth_method === 'local' || (!model.auth_method && isLocalHostBase);
}

interface ModelSelectionCardProps {
  models: ModelInfo[];
  /** 已保存的默认模型 */
  savedModelName: string;
  /** 下拉草稿值 */
  draftModelName: string;
  onDraftModelChange: (modelName: string) => void;
  /** 已保存的 max_tokens */
  savedMaxTokens: string;
  /** 输入框草稿值 */
  draftMaxTokens: string;
  onDraftMaxTokensChange: (value: string) => void;
  loading?: boolean;
  saving?: boolean;
  onConfirm: () => void;
}

export function ModelSelectionCard({
  models,
  savedModelName,
  draftModelName,
  onDraftModelChange,
  savedMaxTokens,
  draftMaxTokens,
  onDraftMaxTokensChange,
  loading,
  saving,
  onConfirm,
}: ModelSelectionCardProps) {
  const selectable = models.filter(
    (m) => m.default_model_allowed !== false && !m.is_virtual && m.available,
  );

  const apiKeyModels = selectable.filter(
    (m) => m.auth_method !== 'oauth' && !isLocalModel(m),
  );
  const oauthModels = selectable.filter((m) => m.auth_method === 'oauth');
  const localModels = selectable.filter((m) => isLocalModel(m));

  const current = models.find((m) => m.model_name === draftModelName);
  const modelDirty = draftModelName.trim() !== '' && draftModelName !== savedModelName;
  const maxTokensDirty = draftMaxTokens.trim() !== savedMaxTokens.trim();
  const dirty = modelDirty || maxTokensDirty;
  const canConfirm = dirty && !loading && !saving;

  return (
    <Card className="border-border/40 bg-card/60">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BrainCircuit className="size-4 text-primary" />
          模型配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label className="text-sm font-medium">当前默认模型</Label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <Select
              value={draftModelName || undefined}
              onValueChange={onDraftModelChange}
              disabled={loading || saving || selectable.length === 0}
            >
              <SelectTrigger className="h-9 w-full max-w-md text-sm">
                <SelectValue placeholder={loading ? '加载中…' : '暂无可用模型'} />
              </SelectTrigger>
              <SelectContent>
                {apiKeyModels.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>API Key</SelectLabel>
                    {apiKeyModels.map((m) => (
                      <SelectItem key={m.index} value={m.model_name}>
                        {m.model_name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {apiKeyModels.length > 0 && (oauthModels.length > 0 || localModels.length > 0) && (
                  <SelectSeparator />
                )}
                {oauthModels.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>OAuth</SelectLabel>
                    {oauthModels.map((m) => (
                      <SelectItem key={m.index} value={m.model_name}>
                        {m.model_name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {oauthModels.length > 0 && localModels.length > 0 && <SelectSeparator />}
                {localModels.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>本地</SelectLabel>
                    {localModels.map((m) => (
                      <SelectItem key={m.index} value={m.model_name}>
                        {m.model_name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>

            {current && (
              <div className="flex flex-wrap items-center gap-2">
                {current.model_name === savedModelName && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="size-3 fill-current text-primary" />
                    默认
                  </Badge>
                )}
                {modelDirty && (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/40">
                    待确认
                  </Badge>
                )}
                <Badge variant="outline">{getProviderLabel(current.provider)}</Badge>
                <span className="text-xs text-muted-foreground truncate max-w-[12rem]">
                  {current.model}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 max-w-md">
          <Label htmlFor="agents-max-tokens" className="text-sm font-medium">
            最大 Token 数
            <span className="text-xs font-normal text-muted-foreground">
              （单次模型响应允许的最大 Token 数）
            </span>
          </Label>
          <Input
            id="agents-max-tokens"
            type="number"
            min={1}
            step={1}
            className="h-9"
            value={draftMaxTokens}
            disabled={loading || saving}
            onChange={(e) => onDraftMaxTokensChange(e.target.value)}
            placeholder="32768"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="sm"
            disabled={!canConfirm}
            onClick={onConfirm}
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                正在保存…
              </>
            ) : (
              '确认'
            )}
          </Button>
          {dirty && !saving && (
            <span className="text-xs text-muted-foreground">
              有未保存的修改，点击确认后才会写入配置
            </span>
          )}
        </div>

        {!loading && selectable.length === 0 && (
          <p className="text-sm text-muted-foreground">
            暂无可用模型，请先在下方「模型列表」中添加并配置 API Key。
          </p>
        )}
      </CardContent>
    </Card>
  );
}
