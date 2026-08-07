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
  GetAllDataPoints,
  MOCK_DEVICE_MODELS,
  type IDataPoint,
  type IDeviceModel,
} from '@/data/device-models';
import { MOCK_DEVICE_NODES, type IDeviceNode } from '@/data/topology';
import type { IDeviceStatusError } from '@/services/dsdkErrorCodes';

export const DEVICE_INSTANCES_STORAGE_KEY = 'zaihong:deviceInstances';
export const DEVICE_INSTANCES_CHANGED_EVENT = 'zaihong:device-instances-changed';

export type DeviceStatus = 'normal' | 'warning' | 'offline';
export type DeviceCategory = 'sensor' | 'actuator' | 'input' | 'other';
export type DeviceGroup = 'rs485' | 'di' | 'do' | 'ai' | 'ao' | 'eth';

export interface IDeviceInstance {
  id: string
  name: string
  modelId: string
  modelName: string
  deviceType: string
  category: DeviceCategory
  interfaceType: string
  interfaceLabel: string
  status: DeviceStatus
  serialNumber: string
  address: string
  description: string
  location: string
  displayValue: string
  displayUnit: string
  dataPointValues: Record<string, string>
  interfaceConfigs?: Record<string, string[]>
  statusError?: IDeviceStatusError
  lastUpdate: string
  angle: number
  distance: number
  group: DeviceGroup
}

function GetModelByDeviceType(deviceType: string): IDeviceModel | undefined {
  return MOCK_DEVICE_MODELS.find((model) => model.name === deviceType || model.type === deviceType);
}

function BuildLegacyDeviceInstance(node: IDeviceNode): IDeviceInstance {
  const model = GetModelByDeviceType(node.deviceType);
  const valueParts = node.value.split('/').map((value) => value.trim());
  const dataPointValues = model && GetAllDataPoints(model).reduce<Record<string, string>>((values, dataPoint, index) => {
    if (valueParts[index]) {
      values[dataPoint.identifier] = valueParts[index];
    }
    return values;
  }, {}) || {};
  return {
    id: node.id,
    name: node.name,
    modelId: model?.id || '',
    modelName: model?.name || node.deviceType,
    deviceType: node.deviceType,
    category: node.category,
    interfaceType: node.interfaceType,
    interfaceLabel: node.interfaceLabel,
    status: node.status,
    serialNumber: node.serialNumber,
    address: node.address,
    description: node.description,
    location: node.location,
    displayValue: node.value,
    displayUnit: node.unit,
    dataPointValues,
    lastUpdate: node.lastUpdate,
    angle: node.angle,
    distance: node.distance,
    group: node.group,
  };
}

const INITIAL_DEVICE_INSTANCES: IDeviceInstance[] = MOCK_DEVICE_NODES.map(BuildLegacyDeviceInstance);

export function GetDeviceInstances(): IDeviceInstance[] {
  if (typeof window === 'undefined') {
    return INITIAL_DEVICE_INSTANCES;
  }

  const stored = window.localStorage.getItem(DEVICE_INSTANCES_STORAGE_KEY);
  if (!stored) {
    return INITIAL_DEVICE_INSTANCES;
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) {
      return INITIAL_DEVICE_INSTANCES;
    }
    const devices = parsed as IDeviceInstance[];
    const hasLegacyBuiltinDevices = devices.some((device) => /^dm-\d+$/.test(device.modelId));
    if (hasLegacyBuiltinDevices) {
      return [
        ...INITIAL_DEVICE_INSTANCES,
        ...devices.filter((device) => !/^dm-\d+$/.test(device.modelId)),
      ];
    }
    return devices;
  } catch {
    return INITIAL_DEVICE_INSTANCES;
  }
}

export function SaveDeviceInstances(devices: IDeviceInstance[]): void {
  window.localStorage.setItem(DEVICE_INSTANCES_STORAGE_KEY, JSON.stringify(devices));
  window.dispatchEvent(new Event(DEVICE_INSTANCES_CHANGED_EVENT));
}

export function GetDefaultDataPointValue(dataPoint: IDataPoint): string {
  if (dataPoint.dataType === 'bool') {
    return 'false';
  }
  if (dataPoint.dataType === 'enum') {
    return dataPoint.range.split('/')[0]?.trim() || '';
  }
  if (dataPoint.dataType === 'string') {
    return '';
  }
  return dataPoint.dataType === 'float' ? '0.0' : '0';
}

export function BuildDataPointValues(model: IDeviceModel): Record<string, string> {
  return GetAllDataPoints(model).reduce<Record<string, string>>((values, dataPoint) => {
    if (!Object.prototype.hasOwnProperty.call(values, dataPoint.identifier)) {
      values[dataPoint.identifier] = GetDefaultDataPointValue(dataPoint);
    }
    return values;
  }, {});
}

export function GetDeviceCategory(modelType: string): DeviceCategory {
  if (modelType === '传感器' || modelType === 'covi' || modelType === 'outSideBrightness') {
    return 'sensor';
  }
  if (modelType === '驱动器' || modelType === 'rollDoor' || modelType === 'twoLaneIndicator' || modelType === 'threeLaneIndicator') {
    return 'actuator';
  }
  return 'other';
}

export function GetDeviceGroup(interfaceType: string): DeviceGroup {
  const groupMap: Record<string, DeviceGroup> = {
    RS485: 'rs485',
    RS232: 'rs485',
    DI: 'di',
    DO: 'do',
    AI: 'ai',
    AO: 'ao',
    CI: 'ai',
    CO: 'ao',
    VI: 'ai',
    VO: 'ao',
    UDP: 'eth',
    TCP_CLIENT: 'eth',
    TCP_SERVER: 'eth',
    CAN: 'eth',
    ETH: 'eth',
  };
  return groupMap[interfaceType] || 'eth';
}

export function ToDeviceNode(device: IDeviceInstance, models: IDeviceModel[]): IDeviceNode {
  const model = models.find((item) => item.id === device.modelId);
  const firstDataPoint = model?.dataPoints[0];
  const hasDataPointValue = firstDataPoint && Object.prototype.hasOwnProperty.call(device.dataPointValues, firstDataPoint.identifier);
  const value = firstDataPoint && hasDataPointValue
    ? device.dataPointValues[firstDataPoint.identifier]
    : device.displayValue || (firstDataPoint ? GetDefaultDataPointValue(firstDataPoint) : '');
  const unit = firstDataPoint?.unit || device.displayUnit;

  return {
    id: device.id,
    name: device.name,
    deviceType: device.deviceType,
    category: device.category,
    interfaceType: device.interfaceType,
    interfaceLabel: device.interfaceLabel,
    status: device.status,
    value,
    unit,
    serialNumber: device.serialNumber,
    address: device.address,
    description: device.description,
    location: device.location,
    lastUpdate: device.lastUpdate,
    angle: device.angle,
    distance: device.distance,
    group: device.group,
  };
}
