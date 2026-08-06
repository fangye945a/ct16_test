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

import JSZip from 'jszip';
import type { IDeviceModel, IDeviceModelScenario } from '@/data/device-models';
import {
  GetDeviceModelDriver,
  GetDeviceModelIcon,
  type DeviceModelDriverAsset,
} from '@/services/deviceModelIcons';

const PACKAGE_FORMAT = 'zaihong-device-model-package';
const PACKAGE_VERSION = '1.0';
const MODEL_CONFIG_FILE_NAME = 'model.json';
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

interface DeviceModelSoFileDescription {
  path: string;
  fileName: string;
  mimeType: string;
  byteLength: number;
  sha256: string;
  isPlaceholder: boolean;
  description: {
    format: 'DSDK native shared object';
    modelName: string;
    deviceType: string;
    vendor: string;
    deviceModel: string;
    typeIdentifier: string;
    protocolDescription: string;
    dataPointCount: number;
    dataPoints: IDeviceModel['dataPoints'];
  };
}

interface DeviceModelPackageConfig {
  packageFormat: typeof PACKAGE_FORMAT;
  packageVersion: typeof PACKAGE_VERSION;
  exportedAt: string;
  model: IDeviceModel;
  soFile: DeviceModelSoFileDescription;
  icon: {
    path: string;
    mimeType: 'image/png';
    width: 400;
    height: 400;
  } | null;
}

export interface ImportedDeviceModelPackage {
  packageName: string;
  model: IDeviceModel;
  driver: DeviceModelDriverAsset;
  icon: Blob | null;
}

function IsRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function ToString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function ToSafePathSegment(value: string): string {
  const normalized = value.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'device-model';
}

function ToSoFileName(value: string, fallback: string): string {
  const fileName = value.replace(/\\/g, '/').split('/').pop()?.trim() || fallback;
  return fileName.toLocaleLowerCase().endsWith('.so') ? fileName : `${fileName}.so`;
}

function ToRelativeEntryPath(value: unknown): string {
  const path = ToString(value).replace(/\\/g, '/').replace(/^\/+/, '');
  if (!path || path.split('/').some((part) => part === '..')) {
    throw new Error('模型包中的文件路径无效');
  }
  return path;
}

async function GetSha256(blob: Blob): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('当前浏览器不支持模型包完整性校验');
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, '0')).join('');
}

function CreatePlaceholderDriver(model: IDeviceModel): DeviceModelDriverAsset {
  const fileName = ToSoFileName(model.sourceFile || `${ToSafePathSegment(model.id)}.so`, `${ToSafePathSegment(model.id)}.so`);
  return {
    fileName,
    blob: new Blob([
      JSON.stringify({
        message: '该内置原型模型没有可导出的原生动态库。',
        modelId: model.id,
        version: model.version,
      }, null, 2),
    ], { type: 'application/octet-stream' }),
  };
}

function ToScenarios(value: unknown): IDeviceModelScenario[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.reduce<IDeviceModelScenario[]>((result, item) => {
    if (!IsRecord(item)) {
      return result;
    }
    const name = ToString(item.name).trim();
    const identifier = ToString(item.identifier).trim();
    const source = item.source === 'custom' ? 'custom' : 'preset';
    if (name && identifier) {
      result.push({ name, identifier, source });
    }
    return result;
  }, []);
}

function ToDeviceModel(value: unknown, sourceFile: string): IDeviceModel {
  if (!IsRecord(value)) {
    throw new Error('模型包缺少模型配置');
  }
  const id = ToString(value.id).trim();
  const name = ToString(value.name).trim();
  const type = ToString(value.type).trim();
  const version = ToString(value.version).trim();
  if (!id || !name || !type || !version) {
    throw new Error('模型包中的模型标识、名称、类型或版本缺失');
  }
  const dataPoints = Array.isArray(value.dataPoints) ? value.dataPoints as IDeviceModel['dataPoints'] : [];
  const tags = Array.isArray(value.tags) ? value.tags.filter((tag): tag is string => typeof tag === 'string') : [];
  return {
    id,
    name,
    type,
    version,
    description: ToString(value.description),
    vendor: ToString(value.vendor),
    deviceModel: ToString(value.deviceModel),
    typeIdentifier: ToString(value.typeIdentifier),
    protocolDescription: ToString(value.protocolDescription),
    sourceFile,
    dataPoints,
    dataPointCount: typeof value.dataPointCount === 'number' ? value.dataPointCount : dataPoints.length,
    createdAt: ToString(value.createdAt, new Date().toISOString()),
    status: value.status === 'synced' ? 'synced' : 'unsynced',
    tags,
    applicableScenarios: ToScenarios(value.applicableScenarios),
  };
}

function IsSameJsonValue(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item, index) => IsSameJsonValue(item, right[index]));
  }
  if (!IsRecord(left) || !IsRecord(right)) {
    return false;
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => key === rightKeys[index] && IsSameJsonValue(left[key], right[key]));
}

function ValidateSoDescription(value: unknown, model: IDeviceModel): void {
  if (!IsRecord(value) || value.format !== 'DSDK native shared object') {
    throw new Error('模型 JSON 中的 SO 文件描述无效');
  }
  const expectedFields: Array<[string, string]> = [
    ['modelName', model.name],
    ['deviceType', model.type],
    ['vendor', model.vendor || ''],
    ['deviceModel', model.deviceModel || ''],
    ['typeIdentifier', model.typeIdentifier || ''],
    ['protocolDescription', model.protocolDescription || ''],
  ];
  if (expectedFields.some(([key, expected]) => ToString(value[key]) !== expected)) {
    throw new Error('模型 JSON 中的 SO 文件描述与模型配置不一致');
  }
  if (value.dataPointCount !== model.dataPointCount || !IsSameJsonValue(value.dataPoints, model.dataPoints)) {
    throw new Error('模型 JSON 中的 SO 数据点描述与模型配置不一致');
  }
}

async function ValidatePngIcon(icon: Blob): Promise<Blob> {
  const header = new Uint8Array(await icon.slice(0, 24).arrayBuffer());
  if (header.length < 24 || PNG_SIGNATURE.some((value, index) => header[index] !== value)) {
    throw new Error('模型包图标不是 PNG 文件');
  }
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  if (view.getUint32(16) !== 400 || view.getUint32(20) !== 400) {
    throw new Error('模型包图标必须为 400×400 PNG');
  }
  return new Blob([icon], { type: 'image/png' });
}

async function CreatePackageConfig(
  model: IDeviceModel,
  driver: DeviceModelDriverAsset,
  hasDriver: boolean,
  icon: Blob | null,
): Promise<DeviceModelPackageConfig> {
  const driverFileName = ToSoFileName(driver.fileName, `${ToSafePathSegment(model.id)}.so`);
  return {
    packageFormat: PACKAGE_FORMAT,
    packageVersion: PACKAGE_VERSION,
    exportedAt: new Date().toISOString(),
    model: { ...model, sourceFile: driverFileName, applicableScenarios: model.applicableScenarios || [] },
    soFile: {
      path: `drivers/${driverFileName}`,
      fileName: driverFileName,
      mimeType: driver.blob.type || 'application/octet-stream',
      byteLength: driver.blob.size,
      sha256: await GetSha256(driver.blob),
      isPlaceholder: !hasDriver,
      description: {
        format: 'DSDK native shared object',
        modelName: model.name,
        deviceType: model.type,
        vendor: model.vendor || '',
        deviceModel: model.deviceModel || '',
        typeIdentifier: model.typeIdentifier || '',
        protocolDescription: model.protocolDescription || '',
        dataPointCount: model.dataPointCount,
        dataPoints: model.dataPoints,
      },
    },
    icon: icon ? { path: 'assets/model-icon.png', mimeType: 'image/png', width: 400, height: 400 } : null,
  };
}

/**
 * 将设备模型导出为包含 JSON、动态库与图标的标准 ZIP 包。
 *
 * @param models 待导出的设备模型。
 * @returns ZIP 包二进制内容。
 */
export async function CreateDeviceModelZipPackage(models: IDeviceModel[]): Promise<Blob> {
  const archive = new JSZip();
  for (const [index, model] of models.entries()) {
    const storedDriver = await GetDeviceModelDriver(model.id, model.version);
    const driver = storedDriver || CreatePlaceholderDriver(model);
    const icon = await GetDeviceModelIcon(model.id, model.version);
    const folder = `models/${String(index + 1).padStart(2, '0')}-${ToSafePathSegment(model.id)}`;
    const config = await CreatePackageConfig(model, driver, Boolean(storedDriver), icon);
    archive.file(`${folder}/${MODEL_CONFIG_FILE_NAME}`, JSON.stringify(config, null, 2));
    archive.file(`${folder}/${config.soFile.path}`, driver.blob);
    if (icon && config.icon) {
      archive.file(`${folder}/${config.icon.path}`, icon);
    }
  }
  return archive.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

async function ReadPackageConfig(
  archive: JSZip,
  configEntryName: string,
  packageName: string,
): Promise<ImportedDeviceModelPackage> {
  const configEntry = archive.file(configEntryName);
  if (!configEntry) {
    throw new Error('未找到模型 JSON 配置文件');
  }
  let configValue: unknown;
  try {
    configValue = JSON.parse(await configEntry.async('string'));
  } catch {
    throw new Error('模型 JSON 配置文件无法解析');
  }
  if (!IsRecord(configValue) || configValue.packageFormat !== PACKAGE_FORMAT || configValue.packageVersion !== PACKAGE_VERSION) {
    throw new Error('不支持的设备模型包格式');
  }
  if (!IsRecord(configValue.soFile)) {
    throw new Error('模型 JSON 缺少 SO 文件描述');
  }
  const prefix = configEntryName.slice(0, -MODEL_CONFIG_FILE_NAME.length);
  const soPath = ToRelativeEntryPath(configValue.soFile.path);
  const declaredFileName = ToString(configValue.soFile.fileName).trim();
  if (!/\.so$/i.test(soPath) || !/\.so$/i.test(declaredFileName)) {
    throw new Error('模型 JSON 中的 SO 文件路径或名称无效');
  }
  const soEntry = archive.file(`${prefix}${soPath}`);
  if (!soEntry) {
    throw new Error('模型包缺少 JSON 描述的 SO 文件');
  }
  const driverBlob = new Blob([await soEntry.async('blob')], { type: ToString(configValue.soFile.mimeType, 'application/octet-stream') });
  const driverFileName = ToSoFileName(ToString(configValue.soFile.fileName), 'model.so');
  const byteLength = configValue.soFile.byteLength;
  const sha256 = ToString(configValue.soFile.sha256);
  if (typeof byteLength !== 'number' || byteLength !== driverBlob.size || !sha256 || await GetSha256(driverBlob) !== sha256) {
    throw new Error('模型 SO 文件与 JSON 描述不匹配');
  }
  const model = ToDeviceModel(configValue.model, driverFileName);
  ValidateSoDescription(configValue.soFile.description, model);
  let icon: Blob | null = null;
  if (configValue.icon !== null) {
    if (!IsRecord(configValue.icon)) {
      throw new Error('模型 JSON 中的图标描述无效');
    }
    const iconPath = ToRelativeEntryPath(configValue.icon.path);
    if (!/\.png$/i.test(iconPath) || configValue.icon.mimeType !== 'image/png'
      || configValue.icon.width !== 400 || configValue.icon.height !== 400) {
      throw new Error('模型 JSON 中的图标描述无效');
    }
    const iconEntry = archive.file(`${prefix}${iconPath}`);
    if (!iconEntry) {
      throw new Error('模型包缺少 JSON 描述的图标文件');
    }
    icon = await ValidatePngIcon(await iconEntry.async('blob'));
  }
  return { packageName, model, driver: { fileName: driverFileName, blob: driverBlob }, icon };
}

/**
 * 解析 ZIP 模型包中的所有模型配置、动态库和图标。
 *
 * @param file 待解析的 ZIP 文件。
 * @returns 可导入的模型包条目。
 */
export async function ParseDeviceModelZipPackage(file: File): Promise<ImportedDeviceModelPackage[]> {
  const archive = await JSZip.loadAsync(await file.arrayBuffer());
  const configEntries = Object.values(archive.files)
    .filter((entry) => !entry.dir && (entry.name === MODEL_CONFIG_FILE_NAME || entry.name.endsWith(`/${MODEL_CONFIG_FILE_NAME}`)));
  if (configEntries.length === 0) {
    throw new Error('ZIP 包中未找到模型 JSON 配置文件');
  }
  return Promise.all(configEntries.map((entry) => ReadPackageConfig(archive, entry.name, file.name)));
}
