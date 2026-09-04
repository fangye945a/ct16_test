import { useState } from 'react';
import { Loader2, PlugZap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  testModel,
  testModelInline,
  type ModelInfo,
  type TestModelInlineRequest,
} from './api';

export interface TestInlineParams {
  provider: string;
  model: string;
  apiBase: string;
  apiKey: string;
  authMethod: string;
  modelIndex?: number;
}

interface TestModelDialogProps {
  model: ModelInfo | null;
  open: boolean;
  onClose: () => void;
  inlineParams?: TestInlineParams;
}

interface TestResult {
  success: boolean;
  latency_ms: number;
  status: string;
  error?: string;
}

export function TestModelDialog({
  model,
  open,
  onClose,
  inlineParams,
}: TestModelDialogProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      let res: TestResult;
      if (inlineParams) {
        const req: TestModelInlineRequest = {
          provider: inlineParams.provider,
          model: inlineParams.model,
          api_base: inlineParams.apiBase || undefined,
          api_key: inlineParams.apiKey || undefined,
          auth_method: inlineParams.authMethod || undefined,
          model_index: inlineParams.modelIndex,
        };
        res = await testModelInline(req);
      } else if (model) {
        res = await testModel(model.index);
      } else {
        return;
      }
      setResult(res);
    } catch (e) {
      setResult({
        success: false,
        latency_ms: 0,
        status: 'error',
        error: e instanceof Error ? e.message : '测试失败',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  const displayModelName = inlineParams?.model || model?.model_name || '';
  const displayModel = inlineParams?.model || model?.model || '';
  const displayApiBase = inlineParams?.apiBase || model?.api_base || '';
  const canTest = !!(inlineParams || model);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="border-border/40 bg-card/95 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlugZap className="size-4 text-primary" />
            测试模型连通性
          </DialogTitle>
          <DialogDescription>验证模型端点是否可达且配置正确。</DialogDescription>
        </DialogHeader>

        {canTest && (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <div>
                <span className="text-muted-foreground">模型：</span>
                <span className="font-mono">{displayModelName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">标识符：</span>
                <span className="font-mono">{displayModel}</span>
              </div>
              {displayApiBase && (
                <div>
                  <span className="text-muted-foreground">端点：</span>
                  <span className="font-mono text-xs">{displayApiBase}</span>
                </div>
              )}
            </div>

            {!result && !testing && (
              <Button onClick={() => void handleTest()} className="w-full">
                <PlugZap className="size-4" />
                测试连接
              </Button>
            )}

            {testing && (
              <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                <span>正在测试连接...</span>
              </div>
            )}

            {result && (
              <div
                className={`rounded-lg p-4 text-sm ${
                  result.success
                    ? 'bg-success/10 text-success'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {result.success ? (
                  <div className="space-y-1">
                    <div className="font-medium">连接成功</div>
                    <div className="text-xs opacity-80">响应时间：{result.latency_ms}ms</div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 font-medium">
                      <X className="size-4" />
                      连接失败
                    </div>
                    <div className="text-xs opacity-80">
                      {result.error || `状态：${result.status}`}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            取消
          </Button>
          {result && (
            <Button variant="outline" onClick={() => void handleTest()}>
              重新测试
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
