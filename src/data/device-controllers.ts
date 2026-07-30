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

import { MOCK_SYSTEM_INFO } from '@/data/dashboard';
import { MOCK_NETWORK_DEVICES } from '@/data/topology';

export type DeviceControllerStatus = 'online' | 'offline';

export interface IDeviceController {
  id: string
  name: string
  model: string
  serialNumber: string
  status: DeviceControllerStatus
}

const PEER_CONTROLLER_SERIAL_NUMBERS: Record<string, string> = {
  'net-slave-01': 'SN-CT16-SLAVE-01',
  'net-slave-02': 'SN-CT32-GATEWAY-01',
  'net-slave-03': 'SN-CT21B-IPC-01',
  'net-slave-04': 'SN-HARMONYPAD-OPS-01',
  'net-slave-05': 'SN-CT33-GATEWAY-02',
};

export const LOCAL_CONTROLLER_SERIAL_NUMBER = MOCK_SYSTEM_INFO.serialNumber;

export const MOCK_DEVICE_CONTROLLERS: IDeviceController[] = MOCK_NETWORK_DEVICES.map((controller) => ({
  id: controller.id,
  name: controller.name,
  model: controller.model,
  serialNumber: controller.role === 'master'
    ? LOCAL_CONTROLLER_SERIAL_NUMBER
    : PEER_CONTROLLER_SERIAL_NUMBERS[controller.id] || `SN-${controller.id.toUpperCase()}`,
  status: controller.status,
}));
