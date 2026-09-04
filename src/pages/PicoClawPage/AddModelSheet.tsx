import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, Eye, EyeOff, Loader2, PlugZap } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  addModel,
  getCatalogs,
  type ModelProviderOption,
} from './api';
import { FetchModelsDialog } from './FetchModelsDialog';
import { ProviderSelect } from './ProviderSelect';
import { TestModelDialog } from './TestModelDialog';
import { type FieldValidation, validateModelField } from './model-validation';
import {
  FETCHABLE_PROVIDER_KEYS,
  PROVIDER_MAP,
  getNextApiBaseForProviderChange,
  getProviderKey,
} from './providers';

interface AddForm {
  modelName: string;
  provider: string;
  model: string;
  apiBase: string;
  apiKey: string;
  proxy: string;
  authMethod: string;
  connectMode: string;
  workspace: string;
  rpm: string;
  maxTokensField: string;
  requestTimeout: string;
  thinkingLevel: string;
  toolSchemaTransform: string;
  streamingEnabled: boolean;
  extraBody: string;
  customHeaders: string;
}

const EMPTY_ADD_FORM: AddForm = {
  modelName: '',
  provider: '',
  model: '',
  apiBase: '',
  apiKey: '',
  proxy: '',
  authMethod: '',
  connectMode: '',
  workspace: '',
  rpm: '',
  maxTokensField: '',
  requestTimeout: '',
  thinkingLevel: '',
  toolSchemaTransform: '',
  streamingEnabled: false,
  extraBody: '',
  customHeaders: '',
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>}
      {children}
    </div>
  );
}

interface AddModelSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  existingModelNames: string[];
  providerOptions?: ModelProviderOption[];
  onApplyDefault: (modelName: string) => Promise<void>;
}

export function AddModelSheet({
  open,
  onClose,
  onSaved,
  existingModelNames,
  providerOptions = [],
  onApplyDefault,
}: AddModelSheetProps) {
  const [form, setForm] = useState<AddForm>(EMPTY_ADD_FORM);
  const [saving, setSaving] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AddForm, string>>>({});
  const [serverError, setServerError] = useState('');
  const [modelValidation, setModelValidation] = useState<FieldValidation | null>(null);
  const [fetchOpen, setFetchOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [catalogModels, setCatalogModels] = useState<string[]>([]);
  const [showApiKey, setShowApiKey] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isDirty =
    JSON.stringify(form) !== JSON.stringify(EMPTY_ADD_FORM) || setAsDefault;

  useEffect(() => {
    if (open) {
      setForm(EMPTY_ADD_FORM);
      setSetAsDefault(false);
      setFieldErrors({});
      setServerError('');
      setModelValidation(null);
      setFetchedModels([]);
      setCatalogModels([]);
      setShowApiKey(false);
      setAdvancedOpen(false);
    }
  }, [open]);

  useEffect(() => {
    const providerKey = getProviderKey(form.provider || undefined);
    const apiBase = form.apiBase.trim().replace(/\/+$/, '');
    if (!form.provider.trim()) {
      setCatalogModels([]);
      return;
    }
    let cancelled = false;
    getCatalogs()
      .then((res) => {
        if (cancelled) return;
        const matched = (res.entries || []).filter((e) => {
          const ep = getProviderKey(e.provider || undefined);
          const eb = (e.api_base ?? '').trim().replace(/\/+$/, '');
          return ep === providerKey && eb === apiBase;
        });
        const ids = matched.flatMap((e) => e.models.map((m) => m.id));
        setCatalogModels([...new Set(ids)]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [form.provider, form.apiBase]);

  const debouncedValidateModel = useCallback((value: string, provider: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setModelValidation(validateModelField(value, provider || undefined));
    }, 300);
  }, []);

  const setField =
    (key: keyof AddForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      if (fieldErrors[key]) {
        setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
      }
    };

  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, model: value }));
    if (fieldErrors.model) {
      setFieldErrors((prev) => ({ ...prev, model: undefined }));
    }
    debouncedValidateModel(value, form.provider);
  };

  const handleProviderChange = (provider: string) => {
    setForm((f) => ({
      ...f,
      provider,
      apiBase: getNextApiBaseForProviderChange(f.apiBase, f.provider, provider),
    }));
    if (form.model) debouncedValidateModel(form.model, provider);
    // 与 zhos-claw 一致：缺省视为不允许设为默认
    const allowed =
      providerOptions.find((o) => o.id === provider)?.default_model_allowed ?? false;
    if (!allowed) setSetAsDefault(false);
  };

  const applyFix = () => {
    if (modelValidation?.fix) {
      setForm((f) => ({ ...f, model: modelValidation.fix! }));
      setModelValidation(null);
    }
  };

  const handleCommonModel = (modelId: string) => {
    setForm((f) => ({ ...f, model: modelId }));
    setModelValidation(null);
    if (fieldErrors.model) {
      setFieldErrors((prev) => ({ ...prev, model: undefined }));
    }
  };

  const handleFetchFill = (models: string[]) => {
    setFetchedModels(models);
    if (models.length >= 1) {
      setForm((f) => ({ ...f, model: models[0] }));
      setModelValidation(null);
      if (fieldErrors.model) {
        setFieldErrors((prev) => ({ ...prev, model: undefined }));
      }
    }
  };

  const providerDef = PROVIDER_MAP.get(form.provider);
  const commonModels = providerDef?.commonModels || [];
  const defaultModelAllowed = form.provider
    ? (providerOptions.find((o) => o.id === form.provider)?.default_model_allowed ?? false)
    : false;

  const validate = (): boolean => {
    const errors: Partial<Record<keyof AddForm, string>> = {};
    const modelName = form.modelName.trim();
    if (!modelName) {
      errors.modelName = '此字段为必填项。';
    } else if (existingModelNames.some((name) => name.trim() === modelName)) {
      errors.modelName = '模型别名已存在，请使用其他名称。';
    }
    if (!form.provider.trim()) errors.provider = '此字段为必填项。';
    if (!form.model.trim()) errors.model = '此字段为必填项。';
    if (modelValidation?.level === 'error') {
      errors.model = modelValidation.message;
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    let extraBody: Record<string, unknown> | undefined;
    let customHeaders: Record<string, string> | undefined;
    try {
      extraBody = form.extraBody.trim() ? JSON.parse(form.extraBody.trim()) : {};
    } catch {
      setServerError('Extra Body: JSON 格式不正确');
      return;
    }
    try {
      customHeaders = form.customHeaders.trim()
        ? JSON.parse(form.customHeaders.trim())
        : {};
    } catch {
      setServerError('Custom Headers: JSON 格式不正确');
      return;
    }

    setSaving(true);
    setServerError('');
    try {
      const modelName = form.modelName.trim();
      await addModel({
        model_name: modelName,
        provider: form.provider.trim() || undefined,
        model: form.model.trim(),
        api_base: form.apiBase.trim() || undefined,
        api_key: form.apiKey.trim() || undefined,
        proxy: form.proxy.trim() || undefined,
        auth_method: form.authMethod.trim() || undefined,
        connect_mode: form.connectMode.trim() || undefined,
        workspace: form.workspace.trim() || undefined,
        rpm: form.rpm ? Number(form.rpm) : undefined,
        max_tokens_field: form.maxTokensField.trim() || undefined,
        request_timeout: form.requestTimeout ? Number(form.requestTimeout) : undefined,
        thinking_level: form.thinkingLevel.trim() || undefined,
        tool_schema_transform: form.toolSchemaTransform.trim() || undefined,
        streaming: form.streamingEnabled ? { enabled: true } : undefined,
        extra_body: extraBody,
        custom_headers: customHeaders,
      });
      if (setAsDefault) {
        await onApplyDefault(modelName);
      } else {
        toast.success('模型已添加。');
      }
      onSaved();
      onClose();
    } catch (e) {
      setServerError(e instanceof Error ? e.message : '添加模型失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-border/40 bg-card p-0 sm:max-w-[560px]"
        >
          <SheetHeader className="border-b border-border/40 px-6 py-5">
            <SheetTitle className="text-base">添加自定义模型</SheetTitle>
            <SheetDescription className="text-xs">
              添加兼容 OpenAI 或原生协议的模型端点。
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-5 px-6 py-5">
              <Field label="模型别名" hint="用于在对话中识别此模型的简短名称。">
                <Input
                  className="h-9 text-sm"
                  value={form.modelName}
                  onChange={setField('modelName')}
                  placeholder="例如 my-gpt4"
                  aria-invalid={!!fieldErrors.modelName}
                />
                {fieldErrors.modelName && (
                  <p className="text-xs text-destructive">{fieldErrors.modelName}</p>
                )}
              </Field>

              <Field
                label="Provider"
                hint="请选择一个由后端 catalog 提供的 Provider；“模型标识符”字段会按该 Provider 的规范模型 ID 解释。"
              >
                <ProviderSelect
                  value={form.provider}
                  onChange={handleProviderChange}
                  providerOptions={providerOptions}
                />
                {fieldErrors.provider && (
                  <p className="text-xs text-destructive">{fieldErrors.provider}</p>
                )}
              </Field>

              <Field
                label="模型标识符"
                hint="此字段将作为所选 Provider 的规范模型 ID 使用。若模型标识符本身包含斜杠（如 openai/gpt-5.4），将作为完整 ID 保留，不会再次拆分 Provider。"
              >
                <Input
                  className="h-9 font-mono text-sm"
                  value={form.model}
                  onChange={handleModelChange}
                  placeholder={
                    providerDef
                      ? `${commonModels[0] || 'model-name'}`
                      : '例如 gpt-4o 或 openai/gpt-4o'
                  }
                  aria-invalid={!!fieldErrors.model || modelValidation?.level === 'error'}
                />
                {modelValidation?.message && (
                  <div
                    className={`flex items-center gap-2 text-xs ${
                      modelValidation.level === 'error'
                        ? 'text-destructive'
                        : modelValidation.level === 'warning'
                          ? 'text-warning'
                          : 'text-success'
                    }`}
                  >
                    <span>{modelValidation.message}</span>
                    {modelValidation.fix && (
                      <button
                        type="button"
                        onClick={applyFix}
                        className="text-primary underline hover:no-underline"
                      >
                        修复
                      </button>
                    )}
                  </div>
                )}
                {fieldErrors.model && !modelValidation && (
                  <p className="text-xs text-destructive">{fieldErrors.model}</p>
                )}
                {commonModels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {commonModels.map((m) => (
                      <Badge
                        key={m}
                        variant="secondary"
                        className="cursor-pointer font-mono text-xs hover:bg-secondary/80"
                        onClick={() => handleCommonModel(m)}
                      >
                        {m}
                      </Badge>
                    ))}
                  </div>
                )}
                {catalogModels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {catalogModels.map((m) => (
                      <Badge
                        key={m}
                        variant={form.model === m ? 'default' : 'outline'}
                        className="cursor-pointer font-mono text-xs"
                        onClick={() => handleCommonModel(m)}
                      >
                        {m}
                      </Badge>
                    ))}
                  </div>
                )}
                {fetchedModels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {fetchedModels.map((m) => (
                      <Badge
                        key={m}
                        variant={form.model === m ? 'default' : 'outline'}
                        className="cursor-pointer font-mono text-xs"
                        onClick={() => handleCommonModel(m)}
                      >
                        {m}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {form.provider && FETCHABLE_PROVIDER_KEYS.has(form.provider) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setFetchOpen(true)}
                    >
                      <Download className="size-3" />
                      获取可用模型
                    </Button>
                  )}
                  {!form.provider && (
                    <span className="text-xs text-muted-foreground">请先选择服务商</span>
                  )}
                </div>
              </Field>

              <Field label="API Key">
                <div className="relative">
                  <Input
                    className="h-9 pr-9 text-sm"
                    type={showApiKey ? 'text' : 'password'}
                    autoComplete="off"
                    value={form.apiKey}
                    onChange={setField('apiKey')}
                    placeholder="请输入 API Key"
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowApiKey((v) => !v)}
                  >
                    {showApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </Field>

              <Field label="API Base URL">
                <Input
                  className="h-9 text-sm"
                  value={form.apiBase}
                  onChange={setField('apiBase')}
                  placeholder="https://api.example.com/v1"
                />
              </Field>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTestOpen(true)}
                  disabled={!form.provider || !form.model}
                >
                  <PlugZap className="size-3.5" />
                  测试连接
                </Button>
              </div>

              <div
                className={[
                  'rounded-xl border p-3 transition-colors',
                  defaultModelAllowed
                    ? 'border-border/40 bg-card/70'
                    : 'border-border/30 bg-muted/30 opacity-70',
                ].join(' ')}
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <Checkbox
                    className="mt-0.5"
                    checked={setAsDefault}
                    disabled={!defaultModelAllowed}
                    onCheckedChange={(checked) => setSetAsDefault(checked === true)}
                  />
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">默认模型</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {!defaultModelAllowed && form.provider
                        ? '该 Provider 可以保存在 model_list 中，但不能作为默认聊天模型使用。'
                        : '保存后自动将该模型设置为默认模型。'}
                    </p>
                  </div>
                </label>
              </div>

              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-0 text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown
                      className={`size-3.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                    />
                    高级选项
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-5 pt-3">
                  <Field label="HTTP 代理" hint="可选。例如 http://127.0.0.1:7890">
                    <Input
                      className="h-9 text-sm"
                      value={form.proxy}
                      onChange={setField('proxy')}
                      placeholder="http://127.0.0.1:7890"
                    />
                  </Field>

                  <Field
                    label="认证方式"
                    hint="认证方式：oauth、token。留空表示使用 API Key 认证。"
                  >
                    <Input
                      className="h-9 text-sm"
                      value={form.authMethod}
                      onChange={setField('authMethod')}
                      placeholder="oauth"
                    />
                  </Field>

                  <Field
                    label="连接模式"
                    hint="CLI 型服务商的连接模式：stdio 或 grpc。"
                  >
                    <Input
                      className="h-9 text-sm"
                      value={form.connectMode}
                      onChange={setField('connectMode')}
                      placeholder="stdio"
                    />
                  </Field>

                  <Field
                    label="工作目录"
                    hint="CLI 型服务商的工作目录路径（如 GitHub Copilot）。"
                  >
                    <Input
                      className="h-9 text-sm"
                      value={form.workspace}
                      onChange={setField('workspace')}
                      placeholder="/path/to/workspace"
                    />
                  </Field>

                  <Field
                    label="请求超时（秒）"
                    hint="等待响应的最大秒数，0 表示使用默认值。"
                  >
                    <Input
                      className="h-9 text-sm"
                      type="number"
                      min={0}
                      value={form.requestTimeout}
                      onChange={setField('requestTimeout')}
                      placeholder="60"
                    />
                  </Field>

                  <Field label="速率限制（RPM）" hint="每分钟最大请求数，0 表示不限制。">
                    <Input
                      className="h-9 text-sm"
                      type="number"
                      min={0}
                      value={form.rpm}
                      onChange={setField('rpm')}
                      placeholder="60"
                    />
                  </Field>

                  <Field
                    label="思考级别"
                    hint="扩展思考预算：off、low、medium、high、xhigh、adaptive。"
                  >
                    <Input
                      className="h-9 text-sm"
                      value={form.thinkingLevel}
                      onChange={setField('thinkingLevel')}
                      placeholder="off"
                    />
                  </Field>

                  <Field
                    label="Max Tokens 字段名"
                    hint="覆盖请求中 max_tokens 的字段名，例如 max_completion_tokens。"
                  >
                    <Input
                      className="h-9 text-sm"
                      value={form.maxTokensField}
                      onChange={setField('maxTokensField')}
                      placeholder="max_completion_tokens"
                    />
                  </Field>

                  <Field
                    label="工具 Schema 转换"
                    hint="可选的工具 JSON Schema 兼容性转换。留空表示保持原生行为。当前支持值：simple。"
                  >
                    <Input
                      className="h-9 text-sm"
                      value={form.toolSchemaTransform}
                      onChange={setField('toolSchemaTransform')}
                      placeholder="google"
                    />
                  </Field>

                  <div className="rounded-xl border border-border/40 bg-card/70 p-3">
                    <label className="flex cursor-pointer items-start gap-3">
                      <Checkbox
                        className="mt-0.5"
                        checked={form.streamingEnabled}
                        onCheckedChange={(checked) =>
                          setForm((f) => ({ ...f, streamingEnabled: checked === true }))
                        }
                      />
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium">流式输出</div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          允许此模型条目尝试 Provider 流式请求；还需要当前频道的流式开关同时开启。
                        </p>
                      </div>
                    </label>
                  </div>

                  <Field
                    label="Extra Body"
                    hint='要注入到请求体中的额外 JSON 字段，例如 {"reasoning_split": true}。'
                  >
                    <Textarea
                      value={form.extraBody}
                      onChange={setField('extraBody')}
                      placeholder='{"key": "value"}'
                      rows={3}
                      className="font-mono text-xs"
                    />
                  </Field>

                  <Field
                    label="Custom Headers"
                    hint='要注入到每个请求中的额外 HTTP Headers，例如 {"X-Source": "coding-plan"}。'
                  >
                    <Textarea
                      value={form.customHeaders}
                      onChange={setField('customHeaders')}
                      placeholder='{"X-Source": "coding-plan"}'
                      rows={3}
                      className="font-mono text-xs"
                    />
                  </Field>
                </CollapsibleContent>
              </Collapsible>

              {serverError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {serverError}
                </p>
              )}
            </div>
          </div>

          <SheetFooter className="border-t border-border/40 px-6 py-4 sm:flex-row sm:justify-end">
            {isDirty && (
              <p className="mr-auto text-xs text-muted-foreground">
                当前修改尚未保存，保存后才会写入模型配置。
              </p>
            )}
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              取消
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={!isDirty || saving || modelValidation?.level === 'error'}
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              添加模型
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <FetchModelsDialog
        open={fetchOpen}
        onClose={() => setFetchOpen(false)}
        onFill={handleFetchFill}
        provider={form.provider}
        apiKey={form.apiKey}
        apiBase={form.apiBase}
      />

      <TestModelDialog
        model={null}
        open={testOpen}
        onClose={() => setTestOpen(false)}
        inlineParams={{
          provider: form.provider,
          model: form.model,
          apiBase: form.apiBase,
          apiKey: form.apiKey,
          authMethod: form.authMethod,
        }}
      />
    </>
  );
}
