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
import type { IDeviceInstance } from '@/data/device-instances';
import type { IDeviceController } from '@/data/device-controllers';
import type { IDeviceModel } from '@/data/device-models';

export const DEVICE_IMPORT_HEADERS = [
  '控制器SN号',
  '设备名称',
  '设备模型',
  '设备SN号',
  '通信接口',
  '接口编号',
  '通信地址',
  '安装位置',
  '备注',
] as const;

const REQUIRED_DEVICE_IMPORT_HEADERS = [
  '控制器SN号',
  '设备名称',
  '设备模型',
  '设备SN号',
  '通信接口',
  '通信地址',
] as const;

export const SUPPORTED_INTERFACE_TYPES = ['RS485', 'ETH', 'DI', 'DO', 'AI', 'AO'] as const;

export type DeviceImportRoute = 'local' | 'softbus' | 'unknown';

export interface IDeviceBatchImportRow {
  rowNumber: number
  controllerSerialNumber: string
  name: string
  modelId: string
  modelName: string
  serialNumber: string
  interfaceType: string
  interfaceLabel: string
  address: string
  location: string
  description: string
  route: DeviceImportRoute
  targetController: IDeviceController | null
  errors: string[]
}

export type DeviceBatchImportResultStatus = 'success' | 'failed';

export interface IDeviceBatchImportResult {
  row: IDeviceBatchImportRow
  status: DeviceBatchImportResultStatus
  message: string
}

function NormalizeCellValue(value: unknown): string {
  return String(value ?? '').trim();
}

/**
 * 规范化设备序列号。
 *
 * @param serialNumber 原始设备序列号
 * @returns 去除首尾空格并转换为大写后的序列号
 */
export function NormalizeDeviceSerialNumber(serialNumber: string): string {
  return serialNumber.trim().toUpperCase();
}

/**
 * 校验设备序列号格式。
 *
 * @param serialNumber 待校验的设备序列号
 * @returns 序列号格式是否有效
 */
export function IsValidDeviceSerialNumber(serialNumber: string): boolean {
  return /^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(serialNumber);
}

function FindHeaderIndex(headers: string[], header: string): number {
  return headers.findIndex((item) => item === header);
}

function GetCellValue(cells: unknown[], headers: string[], header: string): string {
  const index = FindHeaderIndex(headers, header);
  return index >= 0 ? NormalizeCellValue(cells[index]) : '';
}

function FindController(controllers: IDeviceController[], serialNumber: string): IDeviceController | null {
  const normalizedSerialNumber = NormalizeDeviceSerialNumber(serialNumber);
  return controllers.find((controller) => NormalizeDeviceSerialNumber(controller.serialNumber) === normalizedSerialNumber) || null;
}

function BuildImportRow(
  cells: unknown[],
  headers: string[],
  rowNumber: number,
  models: IDeviceModel[],
  devices: IDeviceInstance[],
  controllers: IDeviceController[],
  localControllerSerialNumber: string,
  fileSerialNumbers: Set<string>,
): IDeviceBatchImportRow {
  const controllerSerialNumber = NormalizeDeviceSerialNumber(GetCellValue(cells, headers, '控制器SN号'));
  const name = GetCellValue(cells, headers, '设备名称');
  const modelName = GetCellValue(cells, headers, '设备模型');
  const serialNumber = NormalizeDeviceSerialNumber(GetCellValue(cells, headers, '设备SN号'));
  const interfaceType = GetCellValue(cells, headers, '通信接口').toUpperCase();
  const interfaceLabel = GetCellValue(cells, headers, '接口编号') || interfaceType;
  const address = GetCellValue(cells, headers, '通信地址');
  const location = GetCellValue(cells, headers, '安装位置');
  const description = GetCellValue(cells, headers, '备注');
  const model = models.find((item) => item.name === modelName);
  const targetController = FindController(controllers, controllerSerialNumber);
  const isLocalController = NormalizeDeviceSerialNumber(localControllerSerialNumber) === controllerSerialNumber;
  const route: DeviceImportRoute = isLocalController ? 'local' : targetController ? 'softbus' : 'unknown';
  const errors: string[] = [];

  if (!controllerSerialNumber) {
    errors.push('控制器SN号不能为空');
  } else if (!targetController) {
    errors.push('未找到目标控制器');
  }
  if (!name) {
    errors.push('设备名称不能为空');
  }
  if (!modelName) {
    errors.push('设备模型不能为空');
  } else if (!model) {
    errors.push(`设备模型「${modelName}」不存在`);
  }
  if (!serialNumber) {
    errors.push('设备SN号不能为空');
  } else if (!IsValidDeviceSerialNumber(serialNumber)) {
    errors.push('设备SN号需为3至64位字母、数字、下划线或连字符');
  } else if (devices.some((device) => NormalizeDeviceSerialNumber(device.serialNumber) === serialNumber)) {
    errors.push(`设备SN号「${serialNumber}」已存在`);
  } else if (fileSerialNumbers.has(serialNumber)) {
    errors.push(`文件内设备SN号「${serialNumber}」重复`);
  }
  if (!interfaceType) {
    errors.push('通信接口不能为空');
  } else if (!SUPPORTED_INTERFACE_TYPES.includes(interfaceType as typeof SUPPORTED_INTERFACE_TYPES[number])) {
    errors.push(`通信接口「${interfaceType}」不受支持`);
  }
  if (!address) {
    errors.push('通信地址不能为空');
  }

  return {
    rowNumber,
    controllerSerialNumber,
    name,
    modelId: model?.id || '',
    modelName,
    serialNumber,
    interfaceType,
    interfaceLabel,
    address,
    location,
    description,
    route,
    targetController,
    errors,
  };
}

/**
 * 解析设备实例批量导入工作簿并完成行级校验。
 *
 * @param file 待读取的 Excel 文件
 * @param models 当前控制器设备模型列表
 * @param devices 当前控制器设备实例列表
 * @param controllers 软总线控制器列表
 * @param localControllerSerialNumber 本机控制器序列号
 * @returns 批量导入预览行
 */
export async function ParseDeviceImportWorkbook(
  file: File,
  models: IDeviceModel[],
  devices: IDeviceInstance[],
  controllers: IDeviceController[],
  localControllerSerialNumber: string,
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
    const row = BuildImportRow(
      cells,
      headers,
      index + 2,
      models,
      devices,
      controllers,
      localControllerSerialNumber,
      fileSerialNumbers,
    );
    if (row.serialNumber) {
      fileSerialNumbers.add(row.serialNumber);
    }
    result.push(row);
    return result;
  }, []);
}

/**
 * 下载设备实例批量添加模板。
 */
export function DownloadDeviceImportTemplate(): void {
  const worksheet = XLSX.utils.aoa_to_sheet([
    [...DEVICE_IMPORT_HEADERS],
  ]);
  const instructionWorksheet = XLSX.utils.aoa_to_sheet([
    ['填写项', '说明'],
    ['控制器SN号', '填写目标控制器SN号；本机SN号为 SN-2024X8A1。'],
    ['设备模型', '必须填写设备模型列表中的名称。'],
    ['通信接口', `支持：${SUPPORTED_INTERFACE_TYPES.join('、')}`],
    ['必填列', '控制器SN号、设备名称、设备模型、设备SN号、通信接口、通信地址。'],
    ['处理规则', '本机SN号匹配时由本机添加，其它控制器通过软总线通知。'],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '设备实例');
  XLSX.utils.book_append_sheet(workbook, instructionWorksheet, '填写说明');
  XLSX.writeFile(workbook, '设备实例批量添加模板.xlsx');
}

/**
 * 根据导入行模拟本机添加或软总线通知结果。
 *
 * @param row 已完成校验的批量导入行
 * @returns 当前导入行的处理结果
 */
export function BuildDeviceBatchImportResult(row: IDeviceBatchImportRow): IDeviceBatchImportResult {
  if (row.errors.length > 0) {
    return { row, status: 'failed', message: row.errors.join('；') };
  }
  if (row.route === 'local') {
    return { row, status: 'success', message: '本机已添加' };
  }
  if (row.route === 'softbus' && row.targetController?.status === 'online') {
    return { row, status: 'success', message: `已通过软总线通知 ${row.targetController.name}` };
  }
  return { row, status: 'failed', message: '目标控制器离线，软总线通知失败' };
}
