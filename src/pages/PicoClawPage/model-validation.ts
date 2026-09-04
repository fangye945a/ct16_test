import {
  FETCHABLE_PROVIDER_KEYS,
  KNOWN_PROVIDER_KEYS,
  PROVIDER_ALIASES,
  findClosestProvider,
} from './providers';

export type ValidationLevel = 'error' | 'warning' | 'success';

export interface FieldValidation {
  level: ValidationLevel;
  message: string;
  fix?: string;
}

/** 校验模型标识符，返回中文提示与可选一键修正 */
export function validateModelField(
  input: string,
  selectedProvider?: string,
): FieldValidation {
  const trimmed = input.trim();
  if (!trimmed) return { level: 'success', message: '' };

  if (/\s/.test(trimmed)) {
    return {
      level: 'error',
      message: '模型标识符不能包含空格',
      fix: trimmed.replace(/\s+/g, '/'),
    };
  }
  if (trimmed.startsWith('/')) {
    return {
      level: 'error',
      message: '不应以 / 开头',
      fix: trimmed.replace(/^\/+/, ''),
    };
  }
  if (trimmed.includes('//')) {
    return {
      level: 'error',
      message: '不应包含连续的 /',
      fix: trimmed.replace(/\/+/g, '/'),
    };
  }

  const slashIdx = trimmed.indexOf('/');
  if (slashIdx === -1) {
    if (selectedProvider) {
      return {
        level: 'success',
        message: `服务商=${selectedProvider}，模型=${trimmed}`,
      };
    }
    return {
      level: 'warning',
      message: '未指定服务商，默认使用 OpenAI',
      fix: `openai/${trimmed}`,
    };
  }

  const provider = trimmed.slice(0, slashIdx);
  const model = trimmed.slice(slashIdx + 1);
  if (!model) {
    return { level: 'error', message: '模型名称不能为空' };
  }

  if (!KNOWN_PROVIDER_KEYS.has(provider)) {
    const alias = PROVIDER_ALIASES[provider];
    if (alias) {
      return {
        level: 'warning',
        message: `"${provider}" 应使用 "${alias}"`,
        fix: `${alias}/${model}`,
      };
    }
    const closest = findClosestProvider(provider);
    if (closest) {
      return {
        level: 'warning',
        message: `您是否想输入 "${closest}"？`,
        fix: `${closest}/${model}`,
      };
    }
    return {
      level: 'warning',
      message: `未知服务商 "${provider}"`,
    };
  }

  return {
    level: 'success',
    message: `服务商=${provider}，模型=${model}`,
  };
}

export { FETCHABLE_PROVIDER_KEYS };
