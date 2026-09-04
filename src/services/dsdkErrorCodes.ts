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
  { code: 1, name: 'DSDK_FAULT', reason: '未细分的错误' },
  { code: 2, name: 'DSDK_PARAM_NULL', reason: '参数为空' },
  { code: 3, name: 'DSDK_PARAM_INVALID', reason: '参数值不合法' },
  { code: 4, name: 'DSDK_BUFFER_OVERFLOW', reason: '缓冲区不足或数据超出缓冲区' },
  { code: 5, name: 'DSDK_MEMORY_ALLOC_FAILED', reason: '内存申请失败' },
  { code: 6, name: 'DSDK_STATE_INVALID', reason: '当前状态不允许执行操作' },
  { code: 100, name: 'DSDK_IPC_SERVICE_UNAVAILABLE', reason: 'IPC 服务不可用' },
  { code: 101, name: 'DSDK_IPC_INVOKE_FAILED', reason: 'IPC 调用失败' },
  { code: 102, name: 'DSDK_IPC_REQUEST_INVALID', reason: 'IPC 请求数据无效' },
  { code: 103, name: 'DSDK_IPC_REPLY_INVALID', reason: 'IPC 回复数据无效' },
  { code: 104, name: 'DSDK_PLUGIN_LOAD_FAILED', reason: '插件加载失败' },
  { code: 200, name: 'DSDK_CONFIG_FORMAT_INVALID', reason: '配置格式错误' },
  { code: 201, name: 'DSDK_CONFIG_FIELD_INVALID', reason: '配置字段类型或值错误' },
  { code: 202, name: 'DSDK_CONFIG_READ_FAILED', reason: '配置读取失败' },
  { code: 203, name: 'DSDK_CONFIG_WRITE_FAILED', reason: '配置写入失败' },
  { code: 300, name: 'DSDK_MODEL_NOT_REGISTERED', reason: '模型未注册' },
  { code: 301, name: 'DSDK_MODEL_NOT_SUPPORTED', reason: '找不到匹配的设备模型' },
  { code: 302, name: 'DSDK_MODEL_INFO_INVALID', reason: '模型注册信息无效' },
  { code: 303, name: 'DSDK_MODEL_METHOD_MISSING', reason: '模型必要接口未实现' },
  { code: 304, name: 'DSDK_DEVICE_CONFIG_NOT_FOUND', reason: '找不到设备配置' },
  { code: 305, name: 'DSDK_DEVICE_INSTANCE_NOT_FOUND', reason: '运行实例中找不到设备' },
  { code: 306, name: 'DSDK_DEVICE_ALREADY_EXISTS', reason: '设备实例已经存在' },
  { code: 307, name: 'DSDK_DEVICE_INIT_FAILED', reason: '设备模型初始化失败' },
  { code: 308, name: 'DSDK_DEVICE_RELEASE_FAILED', reason: '设备模型释放失败' },
  { code: 400, name: 'DSDK_COMM_CONTEXT_INVALID', reason: '通信上下文无效' },
  { code: 401, name: 'DSDK_COMM_TYPE_UNSUPPORTED', reason: '通信类型不支持' },
  { code: 402, name: 'DSDK_COMM_CONFIG_INVALID', reason: '通信配置不合法' },
  { code: 403, name: 'DSDK_COMM_ALREADY_INITIALIZED', reason: '通信已经初始化' },
  { code: 404, name: 'DSDK_COMM_NOT_INITIALIZED', reason: '通信尚未初始化' },
  { code: 405, name: 'DSDK_COMM_ENDPOINT_INVALID', reason: '通信端点无效' },
  { code: 406, name: 'DSDK_COMM_ENDPOINT_CONFLICT', reason: '通信端点冲突' },
  { code: 407, name: 'DSDK_COMM_NOT_CONNECTED', reason: '网络设备未连接' },
  { code: 408, name: 'DSDK_COMM_SEND_FAILED', reason: '数据发送失败' },
  { code: 409, name: 'DSDK_COMM_RECV_FAILED', reason: '数据接收失败' },
  { code: 410, name: 'DSDK_COMM_RECV_TIMEOUT', reason: '接收超时' },
  { code: 500, name: 'DSDK_PROTOCOL_FRAME_INVALID', reason: '数据帧长度或结构错误' },
  { code: 501, name: 'DSDK_PROTOCOL_ADDRESS_INVALID', reason: '设备地址错误' },
  { code: 502, name: 'DSDK_PROTOCOL_COMMAND_INVALID', reason: '命令码错误' },
  { code: 503, name: 'DSDK_PROTOCOL_CHECKSUM_INVALID', reason: 'CRC 或校验码错误' },
  { code: 504, name: 'DSDK_PROTOCOL_DATA_INVALID', reason: '协议数据内容无效' },
  { code: 600, name: 'DSDK_DEVICE_COMMAND_UNSUPPORTED', reason: '设备不支持该业务命令' },
  { code: 601, name: 'DSDK_DEVICE_CONTROL_FAILED', reason: '设备控制执行失败' },
  { code: 602, name: 'DSDK_CONTROL_RESULT_CHECK_FAILED', reason: '控制完成后校验反馈结果失败' },
  { code: 603, name: 'DSDK_DEVICE_STATUS_INVALID', reason: '设备状态无效' },
  { code: 604, name: 'DSDK_DEVICE_PROTECTION_ACTIVE', reason: '设备处于保护状态' },
  { code: 605, name: 'DSDK_DEVICE_MODE_INVALID', reason: '设备工作模式错误' },
  { code: 606, name: 'DSDK_DEVICE_FAULT', reason: '设备上报故障' },
  { code: 607, name: 'DSDK_DEVICE_POWER_OFF', reason: '设备未上电' },
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
  if ((interfaceType === 'RS485' && code === 410)
    || (IsNetworkInterface(interfaceType) && [407, 409, 410].includes(code))) {
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
