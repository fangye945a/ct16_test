/*
 * Copyright (c) 2026 Hunan OpenValley Digital Industry Development Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  MOCK_DEVICE_MODELS,
  type IDeviceModel,
  type IDeviceModelScenario,
} from '@/data/batch-device-models';

const DEVICE_MODELS_STORAGE_KEY = 'zaihong:device-models';
const CUSTOM_SCENARIOS_STORAGE_KEY = 'zaihong:device-model-custom-scenarios';

function CloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function ReadArray<T>(key: string, fallback: T[]): T[] {
  try {
    const stored = window.localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : null;
    return Array.isArray(parsed) ? parsed as T[] : CloneValue(fallback);
  } catch {
    return CloneValue(fallback);
  }
}

function RemoveLegacyProtocolDescription(model: IDeviceModel): IDeviceModel {
  const modelValue = model as IDeviceModel & { protocolDescription?: unknown };
  if (!Object.prototype.hasOwnProperty.call(modelValue, 'protocolDescription')) {
    return model;
  }
  const normalizedModel = { ...modelValue };
  delete normalizedModel.protocolDescription;
  return normalizedModel;
}

/**
 * 获取设备模型原型清单。
 *
 * @returns 当前浏览器保存的设备模型，首次访问时返回内置模型。
 */
export function GetPrototypeDeviceModels(): IDeviceModel[] {
  const models = ReadArray(DEVICE_MODELS_STORAGE_KEY, MOCK_DEVICE_MODELS);
  const hasLegacyBuiltinModels = models.some((model) => /^dm-\d+$/.test(model.id));
  if (hasLegacyBuiltinModels) {
    return [
      ...CloneValue(MOCK_DEVICE_MODELS),
      ...models.filter((model) => !/^dm-\d+$/.test(model.id)).map(RemoveLegacyProtocolDescription),
    ];
  }
  const builtinModels = new Map(MOCK_DEVICE_MODELS.map((model) => [model.id, model]));
  return models.map((model) => {
    const normalizedModel = RemoveLegacyProtocolDescription(model);
    const builtinModel = builtinModels.get(normalizedModel.id);
    if (normalizedModel.interfaces || !builtinModel?.interfaces) {
      return normalizedModel;
    }
    return {
      ...normalizedModel,
      interfaces: CloneValue(builtinModel.interfaces),
    };
  });
}

/**
 * 保存设备模型原型清单。
 *
 * @param models 待保存的完整模型清单。
 */
export function SavePrototypeDeviceModels(models: IDeviceModel[]): void {
  window.localStorage.setItem(DEVICE_MODELS_STORAGE_KEY, JSON.stringify(models));
}

/**
 * 获取用户创建的设备模型适用场景。
 *
 * @returns 自定义场景清单。
 */
export function GetPrototypeCustomDeviceModelScenarios(): IDeviceModelScenario[] {
  return ReadArray(CUSTOM_SCENARIOS_STORAGE_KEY, []);
}

/**
 * 保存用户创建的设备模型适用场景。
 *
 * @param scenarios 待保存的自定义场景清单。
 */
export function SavePrototypeCustomDeviceModelScenarios(scenarios: IDeviceModelScenario[]): void {
  window.localStorage.setItem(CUSTOM_SCENARIOS_STORAGE_KEY, JSON.stringify(scenarios));
}
