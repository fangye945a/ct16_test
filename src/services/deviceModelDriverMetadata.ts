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

import type { IDeviceModelInterfaceConfig } from '@/data/device-models';

const ELF_SIGNATURE = [0x7f, 0x45, 0x4c, 0x46];
const DSDK_TRIAD_FIELD_LENGTHS = [32, 64];

const DRIVER_INTERFACE_CONFIGS: Record<string, IDeviceModelInterfaceConfig[]> = {
  covi: [{ name: 'COVI RS485 通信接口', identifier: 'coviRS485', type: 'RS485', defaultConfig: [-1, -1, 9600, 8, 1, 'N'], description: '数组依次表示槽位号、通道号、波特率、数据位、停止位和校验位' }],
  outSideBrightness: [
    { name: '洞外亮度电流输入', identifier: 'outSideBrightnessCi', type: 'CI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和电流输入通道号，槽位号范围 1-6，通道号范围 1-8' },
    { name: '亮度计故障反馈', identifier: 'luxFaultDi', type: 'DI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号，槽位号范围 1-6，通道号范围 1-16' },
  ],
  twoLaneIndicator: [
    { name: '正面绿灯控制', identifier: 'frontGreenCtrlRo', type: 'DO', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
    { name: '正面红灯控制', identifier: 'frontRedCtrlRo', type: 'DO', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
    { name: '反面绿灯控制', identifier: 'backGreenCtrlRo', type: 'DO', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
    { name: '反面红灯控制', identifier: 'backRedCtrlRo', type: 'DO', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
    { name: '正面绿灯反馈', identifier: 'frontGreenCtrlDi', type: 'DI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
    { name: '正面红灯反馈', identifier: 'frontRedCtrlDi', type: 'DI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
    { name: '反面绿灯反馈', identifier: 'backGreenCtrlDi', type: 'DI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
    { name: '反面红灯反馈', identifier: 'backRedCtrlDi', type: 'DI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
  ],
  rollDoor: [
    { name: '开门控制', identifier: 'openRo', type: 'DO', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
    { name: '停止控制', identifier: 'stopRo', type: 'DO', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
    { name: '关门控制', identifier: 'closeRo', type: 'DO', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
    { name: '上限位反馈', identifier: 'upLimitDi', type: 'DI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
    { name: '下限位反馈', identifier: 'downLimitDi', type: 'DI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
    { name: '故障反馈', identifier: 'faultDi', type: 'DI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
  ],
};

export interface IDeviceModelDriverMetadata {
  modelName: string;
  deviceType: string;
  vendor: string;
  deviceModel: string;
  typeIdentifier: string;
  protocolDescription: string;
  interfaces: IDeviceModelInterfaceConfig[];
  loaded: boolean;
  message: string;
}

interface DeviceTriad {
  deviceType: string;
  vendor: string;
  deviceModel: string;
}

function IsElfFile(bytes: Uint8Array): boolean {
  return ELF_SIGNATURE.every((value, index) => bytes[index] === value);
}

function ReadFixedAsciiString(bytes: Uint8Array, offset: number, length: number): string | null {
  let end = offset;
  const limit = offset + length;
  while (end < limit && bytes[end] !== 0) {
    const value = bytes[end];
    if (!((value >= 0x30 && value <= 0x39)
      || (value >= 0x41 && value <= 0x5a)
      || (value >= 0x61 && value <= 0x7a)
      || value === 0x2d
      || value === 0x2e
      || value === 0x5f)) {
      return null;
    }
    end += 1;
  }
  if (end === offset || end === limit) {
    return null;
  }
  for (let index = end; index < limit; index += 1) {
    if (bytes[index] !== 0) {
      return null;
    }
  }
  return new TextDecoder().decode(bytes.slice(offset, end));
}

function FindDeviceTriad(bytes: Uint8Array): DeviceTriad | null {
  for (const fieldLength of DSDK_TRIAD_FIELD_LENGTHS) {
    const triadLength = fieldLength * 3;
    for (let offset = 0; offset <= bytes.length - triadLength; offset += 1) {
      const deviceType = ReadFixedAsciiString(bytes, offset, fieldLength);
      if (!deviceType) {
        continue;
      }
      const vendor = ReadFixedAsciiString(bytes, offset + fieldLength, fieldLength);
      const deviceModel = ReadFixedAsciiString(bytes, offset + fieldLength * 2, fieldLength);
      if (vendor && deviceModel) {
        return { deviceType, vendor, deviceModel };
      }
    }
  }
  return null;
}

function BuildUnloadedMetadata(message: string): IDeviceModelDriverMetadata {
  return {
    modelName: '',
    deviceType: '',
    vendor: '',
    deviceModel: '',
    typeIdentifier: '',
    protocolDescription: '',
    interfaces: [],
    loaded: false,
    message,
  };
}

/**
 * 从 DSDK 协议驱动动态库中读取设备三元组信息。
 *
 * DSDK 驱动在 ELF 数据段中保存连续的 type、vendor、model 定长字段；
 * 此处只读取二进制数据，不执行或加载用户选择的动态库。
 *
 * @param file 用户选择的协议驱动文件。
 * @returns 可回填至设备模型表单的驱动元数据及读取状态。
 */
export async function InspectDeviceModelDriver(file: File): Promise<IDeviceModelDriverMetadata> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!IsElfFile(bytes)) {
    return BuildUnloadedMetadata('所选文件不是有效的 ELF 动态库，请重新选择 .so 驱动文件。');
  }
  const triad = FindDeviceTriad(bytes);
  if (!triad) {
    return BuildUnloadedMetadata('未在驱动中读取到 DSDK 设备三元组，请手动补充模型信息。');
  }
  const typeIdentifier = `DSDK:${triad.deviceType}/${triad.vendor}/${triad.deviceModel}`;
  return {
    modelName: triad.deviceModel,
    deviceType: triad.deviceType,
    vendor: triad.vendor,
    deviceModel: triad.deviceModel,
    typeIdentifier,
    protocolDescription: `已从 DSDK .so 驱动中读取设备三元组：${typeIdentifier}`,
    interfaces: DRIVER_INTERFACE_CONFIGS[triad.deviceType] || [],
    loaded: true,
    message: '已自动读取驱动中的设备类型、厂商和设备型号，创建时不可修改。',
  };
}
