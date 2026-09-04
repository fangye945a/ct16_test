import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  applyAgentSelectionSettings,
  applyDefaultModel,
  getAgentsDefaultsMaxTokens,
  getModels,
  type ModelInfo,
  type ModelProviderOption,
} from './api';
import { ModelSelectionCard } from './ModelSelectionCard';
import { ModelSettingsSection } from './ModelSettingsSection';
import { SkillsSection } from './SkillsSection';

type TabKey = 'agent' | 'skills';

export default function PicoClawPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('agent');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [providerOptions, setProviderOptions] = useState<ModelProviderOption[]>([]);
  const [savedModelName, setSavedModelName] = useState('');
  const [draftModelName, setDraftModelName] = useState('');
  const [savedMaxTokens, setSavedMaxTokens] = useState('32768');
  const [draftMaxTokens, setDraftMaxTokens] = useState('32768');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingSelection, setSavingSelection] = useState(false);
  const [applyingDefault, setApplyingDefault] = useState<string | null>(null);
  const applyRequestIdRef = useRef(0);

  const refreshModels = useCallback(async () => {
    setLoading(true);
    try {
      const [data, maxTokens] = await Promise.all([
        getModels(),
        getAgentsDefaultsMaxTokens().catch(() => null),
      ]);
      const sorted = [...(data.models ?? [])].sort((a, b) => {
        if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
        if (a.available !== b.available) return a.available ? -1 : 1;
        return a.model_name.localeCompare(b.model_name, 'zh-CN');
      });
      setModels(sorted);
      setProviderOptions(data.provider_options ?? []);
      const defaultName = data.default_model || '';
      setSavedModelName(defaultName);
      setDraftModelName(defaultName);
      if (maxTokens !== null) {
        const tokenText = String(maxTokens);
        setSavedMaxTokens(tokenText);
        setDraftMaxTokens(tokenText);
      }
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载模型失败，请确认 zhos-claw 服务已启动（:18800）');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshModels();
  }, [refreshModels]);

  const runApplyDefault = useCallback(
    async (modelName: string) => {
      const name = modelName.trim();
      if (!name) return;

      const requestId = ++applyRequestIdRef.current;
      setApplyingDefault(name);
      const toastId = toast.loading(`模型切换中：${name}`, {
        description: '正在保存配置并重启智能体网关',
      });

      try {
        await applyDefaultModel(name);
        if (requestId !== applyRequestIdRef.current) return;

        setSavedModelName(name);
        setDraftModelName(name);
        toast.success(`已切换默认模型：${name}`, {
          id: toastId,
          description: '智能体网关已应用新配置',
        });
        await refreshModels();
      } catch (e) {
        if (requestId !== applyRequestIdRef.current) return;
        toast.error(e instanceof Error ? e.message : '切换默认模型失败', {
          id: toastId,
        });
        try {
          await refreshModels();
        } catch {
          // ignore refresh error after apply failure
        }
        throw e;
      } finally {
        if (requestId === applyRequestIdRef.current) {
          setApplyingDefault(null);
        }
      }
    },
    [refreshModels],
  );

  const handleConfirmSelection = async () => {
    if (savingSelection || applyingDefault) return;

    const nextModel = draftModelName.trim();
    const modelDirty = nextModel !== '' && nextModel !== savedModelName;
    const maxTokensDirty = draftMaxTokens.trim() !== savedMaxTokens.trim();
    if (!modelDirty && !maxTokensDirty) return;

    let parsedMaxTokens: number | null = null;
    if (maxTokensDirty) {
      const raw = draftMaxTokens.trim();
      const n = Number(raw);
      if (!raw || !Number.isInteger(n) || n < 1) {
        toast.error('最大 Token 数必须是大于等于 1 的整数');
        return;
      }
      parsedMaxTokens = n;
    }

    const requestId = ++applyRequestIdRef.current;
    setSavingSelection(true);
    const toastId = toast.loading('正在保存配置…');

    try {
      await applyAgentSelectionSettings({
        modelName: modelDirty ? nextModel : null,
        maxTokens: parsedMaxTokens,
      });
      if (requestId !== applyRequestIdRef.current) return;

      if (modelDirty) {
        setSavedModelName(nextModel);
        setDraftModelName(nextModel);
      }
      if (parsedMaxTokens !== null) {
        const text = String(parsedMaxTokens);
        setSavedMaxTokens(text);
        setDraftMaxTokens(text);
      }

      toast.success('配置已保存', { id: toastId });
      await refreshModels();
    } catch (e) {
      if (requestId !== applyRequestIdRef.current) return;
      toast.error(e instanceof Error ? e.message : '保存配置失败', {
        id: toastId,
      });
      try {
        await refreshModels();
      } catch {
        // ignore
      }
    } finally {
      if (requestId === applyRequestIdRef.current) {
        setSavingSelection(false);
      }
    }
  };

  const busy = savingSelection || !!applyingDefault;

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabKey)}
        className="w-full"
      >
        <TabsList className="h-auto w-full max-w-md rounded-2xl bg-muted/60 p-1">
          <TabsTrigger
            value="agent"
            className="flex-1 gap-1.5 rounded-xl px-3 py-2 text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <Bot className="size-3.5" />
            模型配置
          </TabsTrigger>
          <TabsTrigger
            value="skills"
            className="flex-1 gap-1.5 rounded-xl px-3 py-2 text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <Package className="size-3.5" />
            技能配置
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agent" className="mt-6 space-y-6">
          <ModelSelectionCard
            models={models}
            savedModelName={savedModelName}
            draftModelName={draftModelName}
            onDraftModelChange={setDraftModelName}
            savedMaxTokens={savedMaxTokens}
            draftMaxTokens={draftMaxTokens}
            onDraftMaxTokensChange={setDraftMaxTokens}
            loading={loading}
            saving={busy}
            onConfirm={() => void handleConfirmSelection()}
          />
          <ModelSettingsSection
            models={models}
            providerOptions={providerOptions}
            loading={loading}
            error={error}
            applyingDefault={busy}
            onRefresh={refreshModels}
            onApplyDefault={runApplyDefault}
          />
        </TabsContent>

        <TabsContent value="skills" className="mt-6">
          <SkillsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
