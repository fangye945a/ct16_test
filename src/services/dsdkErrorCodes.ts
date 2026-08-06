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

export interface IDsdkErrorDefinition {
  code: number
  name: string
  reason: string
}

export interface IDeviceStatusError extends IDsdkErrorDefinition {
  interfaceType: string
  interfaceIdentifier: string
  occurredAt: string
}

export type DeviceStatusLevel = 'normal' | 'warning' | 'offline'

export const DSDK_ERROR_DEFINITIONS: readonly IDsdkErrorDefinition[] = [
  { code: 0, name: 'DSDK_SUCCESS', reason: '操作成功' },
  { code: 1, name: 'DSDK_FAIL', reason: '操作失败' },
  { code: 2, name: 'DSDK_PARAM_EMPTY', reason: '参数为空' },
  { code: 3, name: 'DSDK_PARAM_INVALID', reason: '参数无效或不合法' },
  { code: 4, name: 'DSDK_MEMORY_ERR', reason: '内存错误' },
  { code: 5, name: 'DSDK_CONFIG_INFO_INVALID', reason: '配置信息格式错误或不合法' },
  { code: 6, name: 'DSDK_DEVICE_CTRL_FAIL', reason: '设备控制失败' },
  { code: 7, name: 'DSDK_DEVICE_STATUS_INVALID', reason: '设备状态无效或不合法' },
  { code: 8, name: 'DSDK_DEVICE_CMD_UNSUPPORT', reason: '不支持的设备命令' },
  { code: 9, name: 'DSDK_DEVICE_TYPE_UNSUPPORT', reason: '不支持的设备类型' },
  { code: 10, name: 'DSDK_SEND_FAIL', reason: '发送数据失败' },
  { code: 11, name: 'DSDK_RECV_TIMEOUT', reason: '接收数据超时' },
  { code: 12, name: 'DSDK_RECV_LENGTH_ERR', reason: '接收包长度错误或数据域长度值错误' },
  { code: 13, name: 'DSDK_RECV_ADDR_ERR', reason: '接收地址错误' },
  { code: 14, name: 'DSDK_RECV_CMD_ERR', reason: '接收命令码错误' },
  { code: 15, name: 'DSDK_RECV_CRC_ERR', reason: '接收数据 CRC 校验错误' },
  { code: 16, name: 'DSDK_RECV_DATA_INVALID', reason: '接收到的数据无效或不合理' },
  { code: 17, name: 'DSDK_NETWORK_ERR', reason: '网络错误' },
  { code: 18, name: 'DSDK_IF_UNSUPPORT', reason: '不支持的接口类型' },
  { code: 19, name: 'DSDK_CHARACT_COVERT_ERR', reason: '字符编码转换错误' },
  { code: 20, name: 'DSDK_DEVICE_UNCONNECTED', reason: '设备未连接' },
  { code: 21, name: 'DSDK_CTRL_ACK_STATUS_ERR', reason: '设备反馈状态与控制结果不一致' },
  { code: 22, name: 'DSDK_RCV_MEM_OVERFLOW', reason: '接收缓冲区内存溢出' },
  { code: 23, name: 'DSDK_SN_UNMATCH', reason: '设备 SN 号匹配不成功' },
  { code: 24, name: 'DSDK_DEVICE_UNREGISTER', reason: '设备未注册' },
  { code: 32, name: 'DSDK_DEVICE_PROTECTION', reason: '设备处于保护策略限制中' },
  { code: 33, name: 'DSDK_DEVICE_MODE_ERR', reason: '设备模式错误' },
  { code: 34, name: 'DSDK_DEVICE_FAULT', reason: '设备反馈自身故障' },
  { code: 35, name: 'DSDK_DEVICE_POWEROFF', reason: '设备未上电' },
  { code: 36, name: 'DSDK_IPC_ERR', reason: '进程 IPC 接口错误' },
];

const DSDK_ERROR_DEFINITION_MAP = new Map(
  DSDK_ERROR_DEFINITIONS.map((definition) => [definition.code, definition]),
);

function IsNetworkInterface(interfaceType: string): boolean {
  return ['TCP_CLIENT', 'TCP_SERVER', 'UDP'].includes(interfaceType);
}

/**
 * 获取 DSDK 错误码的名称和中文原因。
 *
 * @param code DSDK 返回码
 * @returns 错误码定义，未知码返回通用描述
 */
export function GetDsdkErrorDefinition(code: number): IDsdkErrorDefinition {
  return DSDK_ERROR_DEFINITION_MAP.get(code) || {
    code,
    name: 'DSDK_UNKNOWN_ERROR',
    reason: '未定义的 DSDK 错误码',
  };
}

/**
 * 根据接口类型和 DSDK 返回码判断设备状态。
 *
 * @param interfaceType 设备通信接口类型
 * @param code DSDK 返回码
 * @returns 设备状态
 */
export function ClassifyDsdkDeviceStatus(interfaceType: string, code: number): DeviceStatusLevel {
  if (code === 0) {
    return 'normal';
  }
  if ((interfaceType === 'RS485' && code === 11)
    || (IsNetworkInterface(interfaceType) && [17, 20].includes(code))) {
    return 'offline';
  }
  return 'warning';
}

/**
 * 构造设备最新 DSDK 状态错误。
 *
 * @param interfaceType 设备通信接口类型
 * @param interfaceIdentifier 设备接口标识
 * @param code DSDK 返回码
 * @param occurredAt 错误发生时间
 * @returns 可持久化的状态错误信息
 */
export function BuildDeviceStatusError(
  interfaceType: string,
  interfaceIdentifier: string,
  code: number,
  occurredAt = new Date().toISOString(),
): IDeviceStatusError {
  return {
    ...GetDsdkErrorDefinition(code),
    interfaceType,
    interfaceIdentifier,
    occurredAt,
  };
}
