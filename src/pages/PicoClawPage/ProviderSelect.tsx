import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ModelProviderOption } from './api';
import {
  getCreatableProviders,
  getProviderDisplayLabel,
  mergeProviders,
} from './providers';

const CUSTOM_VALUE = '__custom__';

interface ProviderSelectProps {
  value: string;
  onChange: (provider: string) => void;
  providerOptions: ModelProviderOption[];
  /** 与 zhos-claw ProviderCombobox.filterCreateAllowed 一致，默认 true */
  filterCreateAllowed?: boolean;
}

/**
 * 厂商下拉：列表与 zhos-claw 一致，并支持「自定义」自由输入。
 */
export function ProviderSelect({
  value,
  onChange,
  providerOptions,
  filterCreateAllowed = true,
}: ProviderSelectProps) {
  const providers = useMemo(() => {
    if (!filterCreateAllowed) {
      return mergeProviders(providerOptions);
    }
    return getCreatableProviders(providerOptions);
  }, [providerOptions, filterCreateAllowed]);

  const knownKeys = useMemo(() => new Set(providers.map((p) => p.key)), [providers]);
  const isCustom = Boolean(value && !knownKeys.has(value));

  const [customMode, setCustomMode] = useState(isCustom);
  const [customDraft, setCustomDraft] = useState(isCustom ? value : '');

  useEffect(() => {
    if (isCustom) {
      setCustomMode(true);
      setCustomDraft(value);
    } else if (!value) {
      setCustomMode(false);
      setCustomDraft('');
    }
  }, [isCustom, value]);

  const selectValue = customMode || isCustom ? CUSTOM_VALUE : value || undefined;

  const handleSelect = (next: string) => {
    if (next === CUSTOM_VALUE) {
      setCustomMode(true);
      setCustomDraft(isCustom ? value : '');
      return;
    }
    setCustomMode(false);
    onChange(next);
  };

  const commitCustom = () => {
    const trimmed = customDraft.trim();
    if (trimmed) onChange(trimmed);
  };

  return (
    <div className="space-y-2">
      <Select value={selectValue} onValueChange={handleSelect}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="请选择 Provider" />
        </SelectTrigger>
        <SelectContent>
          {providers.map((p) => (
            <SelectItem key={p.key} value={p.key}>
              {getProviderDisplayLabel(p)}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_VALUE}>自定义…</SelectItem>
        </SelectContent>
      </Select>
      {(customMode || isCustom) && (
        <Input
          className="h-9 font-mono text-sm"
          value={customDraft}
          onChange={(e) => setCustomDraft(e.target.value)}
          onBlur={commitCustom}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitCustom();
            }
          }}
          placeholder="输入自定义 Provider key"
        />
      )}
    </div>
  );
}
