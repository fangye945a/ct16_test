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

import * as XLSX from 'xlsx';

export interface IDeviceBatchImportModel {
  id: string;
  type: string;
  vendor?: string;
  deviceModel?: string;
  typeIdentifier?: string;
  interfaces?: Array<{
    identifier: string;
    type: string;
    defaultConfigJSON?: string;
    defaultConfigJson?: string;
    defaultConfig?: unknown[];
    requiresDeviceAddress?: boolean;
  }>;
}

export interface IDeviceBatchImportModule {
  groupIndex: number;
  moduleType: number;
  channelCount: number;
  funcMask?: number;
  ports?: Array<{ index: number; direction?: string }>;
}

export interface IDeviceBatchImportDevice {
  serialNumber: string;
}

export const DEVICE_IMPORT_HEADERS = [
  '目标控制器SN号',
  '设备SN号',
  '设备类型',
  '设备厂商',
  '设备型号',
  '设备序号(选填)',
  '设备桩号(选填)',
  '设备组名(选填)',
  '私有配置(info)',
] as const;

const REQUIRED_DEVICE_IMPORT_HEADERS = ['目标控制器SN号', '设备SN号', '设备类型', '设备厂商', '设备型号', '私有配置(info)'] as const;

export interface IDeviceBatchImportRow {
  rowNumber: number;
  deviceType: string;
  vendor: string;
  deviceModel: string;
  modelId: string;
  serialNumber: string;
  targetControllerSN: string;
  targetMatched: boolean;
  index: string;
  devPoint: string;
  groupName: string;
  info: string;
  /** 兼容当前批量运维页面的统一字段。 */
  name: string;
  modelName: string;
  interfaceType: string;
  interfaceLabel: string;
  address: string;
  location: string;
  description: string;
  targetController?: { id: string; name: string };
  errors: string[];
}

export type DeviceBatchImportResultStatus = 'success' | 'failed' | 'skipped';

export interface IDeviceBatchImportResult {
  row: IDeviceBatchImportRow;
  status: DeviceBatchImportResultStatus;
  message: string;
}

function NormalizeCellValue(value: unknown): string {
  return String(value ?? '').trim();
}

/**
 * 规范化设备序列号。
 *
 * @param serialNumber 原始设备序列号
 * @returns 去除首尾空格后的序列号
 */
export function NormalizeDeviceSerialNumber(serialNumber: string): string {
  return serialNumber.trim();
}

/**
 * 校验设备序列号格式。
 *
 * @param serialNumber 待校验的设备序列号
 * @returns 序列号格式是否有效
 */
export function IsValidDeviceSerialNumber(serialNumber: string): boolean {
  return /^[A-Za-z0-9_]{1,32}$/.test(serialNumber);
}

function FindHeaderIndex(headers: string[], header: string): number {
  return headers.findIndex((item) => item === header);
}

function GetCellValue(cells: unknown[], headers: string[], header: string): string {
  const index = FindHeaderIndex(headers, header);
  return index >= 0 ? NormalizeCellValue(cells[index]) : '';
}

function GetOptionalCellValue(cells: unknown[], headers: string[], header: string, legacyHeader: string): string {
  return GetCellValue(cells, headers, header) || GetCellValue(cells, headers, legacyHeader);
}

const IO_MODULE_TYPES: Record<string, number[]> = {
  DI: [1, 3, 14, 17, 18],
  DO: [1, 2, 4, 5, 13, 15, 17, 19],
  CI: [9, 11, 16],
  CO: [6, 8],
  VI: [9, 10],
  VO: [6, 7],
  AI: [9, 10, 11, 16],
  AO: [6, 7, 8],
  PWM: [12],
};

const IO_MAX_CHANNELS: Record<string, number> = {
  DI: 16,
  DO: 16,
  CI: 8,
  CO: 8,
  VI: 8,
  VO: 8,
  AI: 8,
  AO: 8,
  PWM: 8,
};

const SERIAL_BAUD_RATES = new Set([1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400]);

function IsRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function ParseInteger(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : null;
  }
  if (typeof value !== 'string' || !/^-?\d+$/.test(value.trim())) {
    return null;
  }
  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function IsIPv4(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const parts = value.trim().split('.');
  return parts.length === 4 && parts.every((part) => /^(0|[1-9]\d*)$/.test(part) && Number(part) <= 255);
}

function ValidateNetworkInfo(info: Record<string, unknown>, interfaceID: string, type: string): string | null {
  const expectedIfType = type === 'UDP' ? 'udp' : type === 'TCP_SERVER' ? 'tcpServer' : 'tcpClient';
  if (typeof info.ifType !== 'string' || info.ifType.trim() !== expectedIfType) {
    return `接口「${interfaceID}」要求 info.ifType 为 ${expectedIfType}`;
  }
  if (!IsIPv4(info.ipAddr)) {
    return `接口「${interfaceID}」的 IPv4 地址无效`;
  }
  const port = ParseInteger(info.port);
  if (port === null || port < 1 || port > 65535) {
    return `接口「${interfaceID}」的端口号必须为 1~65535`;
  }
  if (info.devAddr !== undefined && info.devAddr !== '') {
    const address = ParseInteger(info.devAddr);
    if (address === null || address < 0 || address > 255) {
      return `接口「${interfaceID}」的设备地址必须为 0~255`;
    }
  }
  return null;
}

function InterfaceType(item: { type: string }): string {
  return item.type.trim().toUpperCase().replace(/-/g, '_');
}

function FindModule(modules: IDeviceBatchImportModule[] | undefined, slot: number): IDeviceBatchImportModule | undefined {
  return modules?.find((module) => module.groupIndex === slot);
}

function ModulePortDirection(module: IDeviceBatchImportModule, channel: number): string | null {
  const port = module.ports?.find((item) => item.index === channel);
  if (port?.direction) return port.direction;
  if (typeof module.funcMask === 'number') {
    return ((module.funcMask >> (channel - 1)) & 1) === 1 ? 'output' : 'input';
  }
  return null;
}

function ValidateIoInterface(
  interfaceID: string,
  type: string,
  value: unknown,
  modules: IDeviceBatchImportModule[] | undefined,
  occupied: Map<string, string>,
): string | null {
  if (!Array.isArray(value) || value.length !== 2) {
    return `接口「${interfaceID}」的 ${type} 配置必须是 [槽位号,通道号]`;
  }
  const slot = ParseInteger(value[0]);
  const channel = ParseInteger(value[1]);
  if (slot === null) return `接口「${interfaceID}」的槽位号必须是整数`;
  if (channel === null) return `接口「${interfaceID}」的通道号必须是整数`;
  if (slot < 1 || slot > 16) return `接口「${interfaceID}」的槽位号 ${slot} 不合法，必须为 1~16`;
  if (channel < 1 || channel > (IO_MAX_CHANNELS[type] ?? 24)) {
    return `接口「${interfaceID}」的通道号 ${channel} 不合法，${type} 通道范围为 1~${IO_MAX_CHANNELS[type] ?? 24}`;
  }

  const module = FindModule(modules, slot);
  if (modules !== undefined && !module) {
    return `接口「${interfaceID}」的槽位号 ${slot} 不存在或未检测到硬件模块`;
  }
  if (module) {
    const supportedTypes = IO_MODULE_TYPES[type] ?? [];
    if (!supportedTypes.includes(module.moduleType)) {
      return `接口「${interfaceID}」的槽位 ${slot} 模块类型 ${module.moduleType} 与 ${type} 接口不匹配`;
    }
    if (channel > module.channelCount) {
      return `接口「${interfaceID}」的通道号 ${channel} 超出槽位 ${slot} 模块范围 1~${module.channelCount}`;
    }
    if ((type === 'DI' || type === 'AI' || type === 'CI' || type === 'VI') &&
      ModulePortDirection(module, channel) === 'output') {
      return `接口「${interfaceID}」的通道号 ${channel} 不是输入通道`;
    }
    if ((type === 'DO' || type === 'DO' || type === 'AO' || type === 'CO' || type === 'VO') &&
      ModulePortDirection(module, channel) === 'input') {
      return `接口「${interfaceID}」的通道号 ${channel} 不是输出通道`;
    }
    if (module.moduleType === 6 && type === 'CO' && channel <= 4) {
      return `接口「${interfaceID}」的通道号 ${channel} 不合法，槽位 ${slot} 的 CO 通道为 5~8`;
    }
    if (module.moduleType === 6 && type === 'VO' && channel > 4) {
      return `接口「${interfaceID}」的通道号 ${channel} 不合法，槽位 ${slot} 的 VO 通道为 1~4`;
    }
    if (module.moduleType === 9 && type === 'CI' && channel <= 4) {
      return `接口「${interfaceID}」的通道号 ${channel} 不合法，槽位 ${slot} 的 CI 通道为 5~8`;
    }
    if (module.moduleType === 9 && type === 'VI' && channel > 4) {
      return `接口「${interfaceID}」的通道号 ${channel} 不合法，槽位 ${slot} 的 VI 通道为 1~4`;
    }
  }

  const key = `${slot}\u0000${channel}`;
  const previous = occupied.get(key);
  if (previous) return `接口「${interfaceID}」的槽位号 ${slot}、通道号 ${channel} 已被接口「${previous}」占用`;
  occupied.set(key, interfaceID);
  return null;
}

function ValidateSerialInfo(
  info: Record<string, unknown>,
  interfaceID: string,
  type: string,
  modules: IDeviceBatchImportModule[] | undefined,
  modelRequiresDeviceAddress: boolean,
): string | null {
  const ifType = typeof info.ifType === 'string' ? info.ifType.trim().toLowerCase() : '';
  const expectedIfType = type === 'RS485' ? 'rs485' : 'rs232';
  if (ifType !== expectedIfType) return `接口「${interfaceID}」要求 info.ifType 为 ${expectedIfType}`;
  const slot = ParseInteger(info.slot);
  const channel = ParseInteger(info.channel);
  if (slot === null) return `接口「${interfaceID}」的槽位号必须是整数`;
  if (channel === null) return `接口「${interfaceID}」的通道号必须是整数`;
  if (slot < 0 || slot > 16) return `接口「${interfaceID}」的槽位号 ${slot} 不合法，必须为 0~16`;
  const channelMin = slot === 0 && type === 'RS232' ? 3 : 1;
  const channelMax = slot === 0 ? (type === 'RS485' ? 2 : 3) : 2;
  if (channel < channelMin || channel > channelMax) {
    const range = slot === 0 && type === 'RS232' ? '3' : `1~${channelMax}`;
    return `接口「${interfaceID}」的通道号 ${channel} 不合法，槽位 ${slot} 仅支持 ${range}`;
  }
  if (slot > 0) {
    const module = FindModule(modules, slot);
    if (modules !== undefined && !module) return `接口「${interfaceID}」的槽位号 ${slot} 不存在或未检测到硬件模块`;
    const expectedModuleType = type === 'RS485' ? 23 : 20;
    if (module && module.moduleType !== expectedModuleType) {
      return `接口「${interfaceID}」的槽位 ${slot} 模块类型 ${module.moduleType} 与 ${type} 接口不匹配`;
    }
  }
  if (info.baudRate !== undefined) {
    const baudRate = ParseInteger(info.baudRate);
    if (baudRate === null || !SERIAL_BAUD_RATES.has(baudRate)) return `接口「${interfaceID}」的波特率 ${String(info.baudRate)} 不支持`;
  }
  if (info.dataBits !== undefined) {
    const dataBits = ParseInteger(info.dataBits);
    if (dataBits === null || dataBits < 5 || dataBits > 8) return `接口「${interfaceID}」的数据位必须为 5~8`;
  }
  if (info.stopBits !== undefined) {
    const stopBits = ParseInteger(info.stopBits);
    if (stopBits === null || (stopBits !== 1 && stopBits !== 2)) return `接口「${interfaceID}」的停止位必须为 1 或 2`;
  }
  if (info.parity !== undefined && !['N', 'E', 'O'].includes(String(info.parity).trim().toUpperCase())) {
    return `接口「${interfaceID}」的校验位必须为 N、E 或 O`;
  }
  if (info.devAddr !== undefined && info.devAddr !== '') {
    const address = ParseInteger(info.devAddr);
    if (address === null || address < 0 || address > 255) return `接口「${interfaceID}」的设备地址必须为 0~255`;
  } else if (type === 'RS485' && modelRequiresDeviceAddress) {
    return `接口「${interfaceID}」必须填写设备地址`;
  }
  return null;
}

/**
 * 校验批量导入行中的设备 info 硬件资源配置。
 *
 * @param info 已解析的 info 对象
 * @param model 当前设备模型接口定义
 * @param modules 当前控制器检测到的子模块清单；未传入时执行静态范围校验
 * @returns 错误信息，合法时返回 null
 */
export function ValidateDeviceInfo(
  info: unknown,
  model: IDeviceBatchImportModel,
  modules?: IDeviceBatchImportModule[],
): string | null {
  if (!IsRecord(info)) return '私有配置(info)必须是 JSON 对象';
  const interfaces = model.interfaces || [];
  const occupied = new Map<string, string>();
  const communicationInterfaces = interfaces.filter((item) => ['RS485', 'RS232'].includes(InterfaceType(item)));
  if (communicationInterfaces.length > 1) return '一个设备模型不能同时配置多个 RS485/RS232 通信接口';
  for (const item of interfaces) {
    const interfaceID = item.identifier.trim();
    const type = InterfaceType(item);
    if (!interfaceID) return '设备模型接口标识不能为空';
    if (['RS485', 'RS232'].includes(type)) {
      const error = ValidateSerialInfo(info, interfaceID, type, modules, item.requiresDeviceAddress === true);
      if (error) return error;
      continue;
    }
    if (['TCP_CLIENT', 'TCP_SERVER', 'UDP'].includes(type)) {
      const error = ValidateNetworkInfo(info, interfaceID, type);
      if (error) return error;
      continue;
    }
    if (IO_MODULE_TYPES[type]) {
      if (!(interfaceID in info)) return `接口「${interfaceID}」的硬件资源配置缺失`;
      const error = ValidateIoInterface(interfaceID, type, info[interfaceID], modules, occupied);
      if (error) return error;
    }
  }
  return null;
}

function MatchesDeviceModel(model: IDeviceBatchImportModel, deviceType: string, vendor: string, deviceModel: string): boolean {
  return model.type === deviceType
    && model.vendor === vendor
    && model.deviceModel === deviceModel;
}

function BuildImportRow(
  cells: unknown[],
  headers: string[],
  rowNumber: number,
  models: IDeviceBatchImportModel[],
  devices: IDeviceBatchImportDevice[],
  localControllerSN: string,
  fileSerialNumbers: Set<string>,
  modules: IDeviceBatchImportModule[] | undefined,
): IDeviceBatchImportRow {
  const serialNumber = NormalizeDeviceSerialNumber(GetCellValue(cells, headers, '设备SN号'));
  const targetControllerSN = NormalizeDeviceSerialNumber(GetCellValue(cells, headers, '目标控制器SN号'));
  const deviceType = GetCellValue(cells, headers, '设备类型');
  const vendor = GetCellValue(cells, headers, '设备厂商');
  const deviceModel = GetCellValue(cells, headers, '设备型号');
  const index = GetOptionalCellValue(cells, headers, '设备序号(选填)', '设备序号');
  const devPoint = GetOptionalCellValue(cells, headers, '设备桩号(选填)', '设备桩号');
  const groupName = GetOptionalCellValue(cells, headers, '设备组名(选填)', '设备组名');
  const info = GetCellValue(cells, headers, '私有配置(info)');
  const model = models.find((item) => MatchesDeviceModel(item, deviceType, vendor, deviceModel));
  const errors: string[] = [];

  if (!deviceType || !vendor || !deviceModel) {
    errors.push('设备类型、设备厂商和设备型号不能为空');
  } else if (!model) {
    errors.push(`设备模型「${deviceType}/${vendor}/${deviceModel}」不存在`);
  }
  if (!serialNumber) {
    errors.push('设备SN号不能为空');
  } else if (!IsValidDeviceSerialNumber(serialNumber)) {
    errors.push('设备SN号需为字母、数字或下划线，长度为1至32位');
  } else if (devices.some((device) => NormalizeDeviceSerialNumber(device.serialNumber) === serialNumber)) {
    errors.push(`设备SN号「${serialNumber}」已存在`);
  } else if (fileSerialNumbers.has(serialNumber)) {
    errors.push(`文件内设备SN号「${serialNumber}」重复`);
  }
  const targetMatched = targetControllerSN !== '' && targetControllerSN === NormalizeDeviceSerialNumber(localControllerSN);
  if (!targetControllerSN) {
    errors.push('目标控制器SN号不能为空');
  } else if (!targetMatched) {
    errors.push(`目标控制器SN号「${targetControllerSN}」与本机 SN 不一致，已跳过`);
  }
  if (!info) {
    errors.push('私有配置(info)不能为空');
  } else {
    try {
      const parsed = JSON.parse(info);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        errors.push('私有配置(info)必须是 JSON 对象');
      } else if (model) {
        const hardwareError = ValidateDeviceInfo(parsed, model, modules);
        if (hardwareError) errors.push(hardwareError);
      }
    } catch {
      errors.push('私有配置(info)不是合法 JSON');
    }
  }

  return {
    rowNumber,
    deviceType,
    vendor,
    deviceModel,
    modelId: model?.id || '',
    serialNumber,
    targetControllerSN,
    targetMatched,
    index,
    devPoint,
    groupName,
    info,
    name: deviceType,
    modelName: deviceModel,
    interfaceType: 'ETH',
    interfaceLabel: 'ETH',
    address: '',
    location: devPoint,
    description: info,
    targetController: targetMatched ? { id: targetControllerSN, name: targetControllerSN } : undefined,
    errors,
  };
}

/**
 * 解析设备实例批量导入工作簿并完成行级校验。
 *
 * @param file 待读取的 Excel 文件
 * @param models 当前控制器设备模型列表
 * @param devices 当前控制器设备实例列表
 * @returns 批量导入预览行
 */
export async function ParseDeviceImportWorkbook(
  file: File,
  models: IDeviceBatchImportModel[],
  devices: IDeviceBatchImportDevice[],
  localControllerSN: string,
  modules?: IDeviceBatchImportModule[],
): Promise<IDeviceBatchImportRow[]> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const worksheetName = workbook.SheetNames[0];
  if (!worksheetName) {
    throw new Error('Excel文件中没有可读取的工作表');
  }

  const worksheet = workbook.Sheets[worksheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' });
  const headers = (rows[0] || []).map(NormalizeCellValue);
  const missingHeaders = REQUIRED_DEVICE_IMPORT_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`模板缺少列：${missingHeaders.join('、')}`);
  }

  const fileSerialNumbers = new Set<string>();
  return rows.slice(1).reduce<IDeviceBatchImportRow[]>((result, cells, index) => {
    if (!cells.some((cell) => NormalizeCellValue(cell))) {
      return result;
    }
    const row = BuildImportRow(cells, headers, index + 2, models, devices, localControllerSN, fileSerialNumbers, modules);
    if (row.serialNumber && row.targetMatched) {
      fileSerialNumbers.add(row.serialNumber);
    }
    result.push(row);
    return result;
  }, []);
}

/**
 * 下载设备实例批量添加模板。
 */
function ParseInterfaceDefaultConfig(item: {
  defaultConfigJSON?: string;
  defaultConfigJson?: string;
  defaultConfig?: unknown[];
}): unknown[] {
  if (Array.isArray(item.defaultConfig)) {
    return item.defaultConfig;
  }
  const configJSON = item.defaultConfigJSON || item.defaultConfigJson;
  if (!configJSON) {
    return [];
  }
  try {
    const values = JSON.parse(configJSON);
    return Array.isArray(values) ? values : [];
  } catch {
    return [];
  }
}

export function BuildDeviceInfoTemplate(model: IDeviceBatchImportModel): string {
  const info: Record<string, unknown> = {};
  let ioChannel = 1;

  for (const item of model.interfaces || []) {
    const type = item.type.trim().toUpperCase();
    if (!item.identifier) {
      continue;
    }
    const defaults = ParseInterfaceDefaultConfig(item);
    if (type === 'RS485') {
      if (!info.ifType) {
        info.ifType = 'rs485';
        info.slot = defaults[0] ?? 0;
        info.channel = defaults[1] ?? 1;
        info.baudRate = defaults[2] ?? 9600;
        info.devAddr = defaults[6] ?? 1;
      }
      continue;
    }
    if (type === 'RS232') {
      if (!info.ifType) {
        info.ifType = 'rs232';
        info.slot = defaults[0] ?? 0;
        info.channel = defaults[1] ?? 3;
        info.baudRate = defaults[2] ?? 9600;
        info.devAddr = defaults[6] ?? 1;
      }
      continue;
    }
    if (type === 'TCP' || type === 'TCPCLIENT' || type === 'TCP_CLIENT' || type === 'ETH' || type === 'ETHERNET') {
      if (!info.ifType) {
        info.ifType = 'tcpClient';
        info.ipAddr = defaults[0] ?? '192.168.1.100';
        info.port = defaults[1] ?? 502;
        info.devAddr = defaults[2] ?? 1;
      }
      continue;
    }
    if (type === 'TCP_SERVER') {
      if (!info.ifType) {
        info.ifType = 'tcpServer';
        info.ipAddr = defaults[0] ?? '0.0.0.0';
        info.port = defaults[1] ?? 502;
        info.devAddr = defaults[2] ?? 1;
      }
      continue;
    }
    if (type === 'UDP') {
      if (!info.ifType) {
        info.ifType = 'udp';
        info.ipAddr = defaults[0] ?? '192.168.1.100';
        info.port = defaults[1] ?? 502;
        info.devAddr = defaults[2] ?? 1;
      }
      continue;
    }
    info[item.identifier] = defaults.length > 0 ? defaults : [1, ioChannel];
    ioChannel += 1;
  }

  return JSON.stringify(info);
}

export function BuildDeviceImportTemplateRows(models: IDeviceBatchImportModel[], localControllerSN: string): string[][] {
  return models.map((model) => [
    localControllerSN,
    '',
    model.type,
    model.vendor || '',
    model.deviceModel || '',
    '',
    '',
    '',
    BuildDeviceInfoTemplate(model),
  ]);
}

/**
 * 下载按当前控制器实际设备模型生成的设备实例批量添加模板。
 */
export function DownloadDeviceImportTemplate(models: IDeviceBatchImportModel[], localControllerSN: string): void {
  const worksheet = XLSX.utils.aoa_to_sheet([
    [...DEVICE_IMPORT_HEADERS],
    ...BuildDeviceImportTemplateRows(models, NormalizeDeviceSerialNumber(localControllerSN)),
  ]);
  worksheet['!cols'] = [
    { wch: 24 },
    { wch: 22 },
    { wch: 20 },
    { wch: 24 },
    { wch: 24 },
    { wch: 24 },
    { wch: 16 },
    { wch: 16 },
    { wch: 80 },
  ];
  for (let row = 1; row <= models.length; row += 1) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: DEVICE_IMPORT_HEADERS.length - 1 })];
    if (cell) {
      cell.z = '@';
    }
  }
  const instructionWorksheet = XLSX.utils.aoa_to_sheet([
    ['填写项', '说明'],
    ['生成规则', '每一行对应控制器 /userdata/dsdk_plugins 目录中已加载的一个设备模型。'],
    ['目标控制器SN号', '必填。控制器导入时只处理与本机 SN 完全一致的行，不一致的行会跳过。'],
    ['设备SN号', '必填，由二开人员填写设备唯一 SN。'],
    ['设备类型、设备厂商、设备型号', '由设备模型自动生成，不要修改。'],
    ['设备序号、设备桩号、设备组名', '选填，用于区分相同设备、记录桩号和分组。'],
    ['私有配置(info)', '必须保持为合法 JSON。DI、DO、AI 等接口使用 [槽位号,通道号]；示例中的数字应改为实际接线。'],
    ['通信设备 info', 'RS485/RS232 必须配置 slot 和通道号：主板槽位 0 的 RS485 为通道 1、2，RS232 为通道 3；子板从槽位 1 开始，通道为 1、2。'],
  ]);
  instructionWorksheet['!cols'] = [{ wch: 28 }, { wch: 110 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '设备实例');
  XLSX.utils.book_append_sheet(workbook, instructionWorksheet, '填写说明');
  XLSX.writeFile(workbook, '设备实例批量添加模板.xlsx');
}

/**
 * 根据预览校验结果构建失败项报告。
 *
 * @param row 已完成校验的批量导入行
 * @returns 当前导入行的处理结果
 */
export function BuildDeviceBatchImportResult(row: IDeviceBatchImportRow): IDeviceBatchImportResult {
  if (row.targetControllerSN && !row.targetMatched) {
    return { row, status: 'skipped', message: row.errors.join('；') };
  }
  if (row.errors.length > 0) {
    return { row, status: 'failed', message: row.errors.join('；') };
  }
  return { row, status: 'failed', message: '设备导入请求未执行' };
}
