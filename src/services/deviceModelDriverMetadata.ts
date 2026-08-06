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

const ELF_SIGNATURE = [0x7f, 0x45, 0x4c, 0x46];
const DSDK_TRIAD_FIELD_LENGTHS = [32, 64];

export interface IDeviceModelDriverMetadata {
  modelName: string;
  deviceType: string;
  vendor: string;
  deviceModel: string;
  typeIdentifier: string;
  protocolDescription: string;
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
    loaded: true,
    message: '已自动读取驱动中的设备类型、厂商和设备型号，可继续补充或修改。',
  };
}
