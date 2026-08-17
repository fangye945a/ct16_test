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

import type { IDeviceController } from '@/data/device-controllers';
import type { IDeviceInstance } from '@/data/device-instances';
import type { IDeviceModel } from '@/data/device-models';

export type BatchOperationType = 'device' | 'model' | 'application' | 'parameter' | 'restore';
export type BatchTaskStatus = 'running' | 'succeeded' | 'partial';
export type SyncContentType = 'model' | 'application' | 'parameter';
export type SyncTriggerType = 'change' | 'schedule';
export type BackupScope = 'system' | 'models' | 'devices';

export interface IBatchTargetResult {
  controllerId: string;
  controllerName: string;
  status: 'success' | 'failed';
  message: string;
}

export interface IBatchOperationTask {
  id: string;
  type: BatchOperationType;
  name: string;
  createdAt: string;
  status: BatchTaskStatus;
  progress: number;
  results: IBatchTargetResult[];
}

export interface ISyncPolicy {
  id: string;
  name: string;
  sourceControllerId: string;
  targetControllerIds: string[];
  contents: SyncContentType[];
  trigger: SyncTriggerType;
  schedule: string;
  enabled: boolean;
  lastRunAt: string;
  lastStatus: 'success' | 'partial' | 'never';
}

export interface IApplicationPackage {
  id: string;
  name: string;
  version: string;
  fileName: string;
  size: number;
  uploadedAt: string;
}

export interface IConfigurationBackupPayload {
  schemaVersion: '1.0';
  createdAt: string;
  sourceController: IDeviceController;
  scopes: BackupScope[];
  system?: Record<string, string>;
  models?: IDeviceModel[];
  devices?: IDeviceInstance[];
}

export interface IConfigurationBackup {
  id: string;
  name: string;
  controllerId: string;
  controllerName: string;
  controllerModel: string;
  createdAt: string;
  scopes: BackupScope[];
  size: number;
  payload: IConfigurationBackupPayload;
}

const TASK_STORAGE_KEY = 'zaihong:batch-operation-tasks';
const SYNC_STORAGE_KEY = 'zaihong:batch-sync-policies';
const APP_STORAGE_KEY = 'zaihong:batch-applications';
const BACKUP_STORAGE_KEY = 'zaihong:configuration-backups';

function Clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function ReadArray<T>(key: string, fallback: T[] = []): T[] {
  try {
    const stored = localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : null;
    return Array.isArray(parsed) ? (parsed as T[]) : Clone(fallback);
  } catch {
    return Clone(fallback);
  }
}

function WriteArray<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function Wait(delay = 420): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, delay));
}

function GetNow(): string {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}

/**
 * 获取批量运维任务记录。
 *
 * @returns 已保存的任务列表
 */
export async function GetBatchOperationTasks(): Promise<IBatchOperationTask[]> {
  await Wait(100);
  return ReadArray(TASK_STORAGE_KEY);
}

/**
 * 保存已在页面内完成的批量任务结果。
 *
 * @param type 批量任务类型
 * @param name 任务名称
 * @param results 逐目标执行结果
 * @returns 保存后的批量任务
 */
export async function RecordBatchOperationResult(type: BatchOperationType, name: string, results: IBatchTargetResult[]): Promise<IBatchOperationTask> {
  const task: IBatchOperationTask = {
    id: `batch-task-${Date.now()}`,
    type,
    name,
    createdAt: GetNow(),
    status: results.some((result) => result.status === 'failed') ? 'partial' : 'succeeded',
    progress: 100,
    results,
  };
  WriteArray(TASK_STORAGE_KEY, [task, ...ReadArray(TASK_STORAGE_KEY)]);
  await Wait(120);
  return Clone(task);
}

/**
 * 模拟通过软总线执行批量运维任务。
 *
 * @param type 批量任务类型
 * @param name 任务名称
 * @param controllers 目标控制器列表
 * @returns 完成后的批量任务
 */
export async function RunBatchOperation(type: BatchOperationType, name: string, controllers: IDeviceController[]): Promise<IBatchOperationTask> {
  const running: IBatchOperationTask = {
    id: `batch-task-${Date.now()}`,
    type,
    name,
    createdAt: GetNow(),
    status: 'running',
    progress: 15,
    results: [],
  };
  WriteArray(TASK_STORAGE_KEY, [running, ...ReadArray(TASK_STORAGE_KEY)]);
  await Wait(850);
  const results = controllers.map<IBatchTargetResult>((controller) => ({
    controllerId: controller.id,
    controllerName: controller.name,
    status: controller.status === 'online' ? 'success' : 'failed',
    message: controller.status === 'online' ? '软总线任务执行成功' : '目标控制器离线，请恢复连接后重试',
  }));
  const completed: IBatchOperationTask = {
    ...running,
    status: results.some((result) => result.status === 'failed') ? 'partial' : 'succeeded',
    progress: 100,
    results,
  };
  WriteArray(
    TASK_STORAGE_KEY,
    ReadArray<IBatchOperationTask>(TASK_STORAGE_KEY).map((task) => (task.id === running.id ? completed : task)),
  );
  return Clone(completed);
}

/**
 * 重试批量任务中的失败目标。
 *
 * @param taskId 原任务标识
 * @param controllers 可用控制器列表
 * @returns 新建的失败项重试任务
 */
export async function RetryBatchOperation(taskId: string, controllers: IDeviceController[]): Promise<IBatchOperationTask> {
  const task = ReadArray<IBatchOperationTask>(TASK_STORAGE_KEY).find((item) => item.id === taskId);
  if (!task) {
    throw new Error('未找到批量任务');
  }
  const failedIds = new Set(task.results.filter((result) => result.status === 'failed').map((result) => result.controllerId));
  return RunBatchOperation(
    task.type,
    `${task.name}（失败项重试）`,
    controllers.filter((controller) => failedIds.has(controller.id)),
  );
}

/**
 * 保存待分发应用程序包的原型元数据。
 *
 * @param file HAP 应用程序包
 * @param name 应用名称
 * @param version 应用版本
 * @returns 保存后的应用记录
 */
export async function SaveApplicationPackage(file: File, name: string, version: string): Promise<IApplicationPackage> {
  const app: IApplicationPackage = {
    id: `application-${Date.now()}`,
    name,
    version,
    fileName: file.name,
    size: file.size,
    uploadedAt: GetNow(),
  };
  WriteArray(APP_STORAGE_KEY, [app, ...ReadArray(APP_STORAGE_KEY)]);
  await Wait();
  return Clone(app);
}

/**
 * 获取已上传的应用程序包。
 *
 * @returns 应用程序包记录
 */
export async function GetApplicationPackages(): Promise<IApplicationPackage[]> {
  await Wait(100);
  return ReadArray(APP_STORAGE_KEY);
}

/**
 * 获取自动同步策略。
 *
 * @returns 当前同步策略列表
 */
export async function GetSyncPolicies(): Promise<ISyncPolicy[]> {
  await Wait(100);
  return ReadArray(SYNC_STORAGE_KEY, [
    {
      id: 'sync-policy-default',
      name: '设备模型自动同步',
      sourceControllerId: 'net-master',
      targetControllerIds: ['net-slave-01', 'net-slave-02', 'net-slave-03'],
      contents: ['model'],
      trigger: 'change',
      schedule: '',
      enabled: true,
      lastRunAt: '2026-08-17 09:30:12',
      lastStatus: 'success',
    },
  ]);
}

/**
 * 新增或更新自动同步策略。
 *
 * @param policy 同步策略配置
 * @returns 保存后的同步策略
 */
export async function SaveSyncPolicy(policy: Omit<ISyncPolicy, 'id' | 'lastRunAt' | 'lastStatus'> & { id?: string }): Promise<ISyncPolicy> {
  const policies = await GetSyncPolicies();
  const current = policies.find((item) => item.id === policy.id);
  const next: ISyncPolicy = {
    ...policy,
    id: current?.id || `sync-policy-${Date.now()}`,
    lastRunAt: current?.lastRunAt || '尚未执行',
    lastStatus: current?.lastStatus || 'never',
  };
  WriteArray(SYNC_STORAGE_KEY, current ? policies.map((item) => (item.id === next.id ? next : item)) : [next, ...policies]);
  await Wait();
  return Clone(next);
}

/**
 * 更新自动同步策略启用状态。
 *
 * @param id 同步策略标识
 * @param enabled 是否启用策略
 * @returns 更新后的同步策略
 */
export async function SetSyncPolicyEnabled(id: string, enabled: boolean): Promise<ISyncPolicy> {
  const policies = await GetSyncPolicies();
  const current = policies.find((policy) => policy.id === id);
  if (!current) {
    throw new Error('未找到同步策略');
  }
  const next = { ...current, enabled };
  WriteArray(
    SYNC_STORAGE_KEY,
    policies.map((policy) => (policy.id === id ? next : policy)),
  );
  await Wait();
  return Clone(next);
}

/**
 * 立即执行自动同步策略。
 *
 * @param id 同步策略标识
 * @param controllers 当前控制器列表
 * @returns 更新执行结果后的同步策略
 */
export async function RunSyncPolicy(id: string, controllers: IDeviceController[]): Promise<ISyncPolicy> {
  const policies = await GetSyncPolicies();
  const current = policies.find((policy) => policy.id === id);
  if (!current) {
    throw new Error('未找到同步策略');
  }
  await Wait(700);
  const targets = controllers.filter((controller) => current.targetControllerIds.includes(controller.id));
  const next: ISyncPolicy = {
    ...current,
    lastRunAt: GetNow(),
    lastStatus: targets.some((controller) => controller.status === 'offline') ? 'partial' : 'success',
  };
  WriteArray(
    SYNC_STORAGE_KEY,
    policies.map((policy) => (policy.id === id ? next : policy)),
  );
  return Clone(next);
}

/**
 * 获取配置备份记录。
 *
 * @returns 当前配置备份列表
 */
export async function GetConfigurationBackups(): Promise<IConfigurationBackup[]> {
  await Wait(100);
  return ReadArray(BACKUP_STORAGE_KEY);
}

/**
 * 为多个控制器创建配置备份。
 *
 * @param controllers 待备份控制器
 * @param scopes 备份数据范围
 * @param models 当前设备模型
 * @param devices 当前设备实例
 * @returns 新创建的配置备份
 */
export async function CreateConfigurationBackups(
  controllers: IDeviceController[],
  scopes: BackupScope[],
  models: IDeviceModel[],
  devices: IDeviceInstance[],
): Promise<IConfigurationBackup[]> {
  const createdAt = GetNow();
  const backups = controllers.map<IConfigurationBackup>((controller, index) => {
    const payload: IConfigurationBackupPayload = {
      schemaVersion: '1.0',
      createdAt,
      sourceController: controller,
      scopes,
      system: scopes.includes('system') ? { timezone: 'Asia/Shanghai', networkMode: 'static', logLevel: 'INFO' } : undefined,
      models: scopes.includes('models') ? Clone(models) : undefined,
      devices: scopes.includes('devices') ? Clone(devices) : undefined,
    };
    return {
      id: `backup-${Date.now()}-${index}`,
      name: `${controller.name}-${createdAt.replace(/[\/:\s]/g, '')}`,
      controllerId: controller.id,
      controllerName: controller.name,
      controllerModel: controller.model,
      createdAt,
      scopes: [...scopes],
      size: new Blob([JSON.stringify(payload)]).size,
      payload,
    };
  });
  WriteArray(BACKUP_STORAGE_KEY, [...backups, ...ReadArray(BACKUP_STORAGE_KEY)]);
  await Wait(650);
  return Clone(backups);
}

/**
 * 下载指定配置备份文件。
 *
 * @param backup 待下载的配置备份
 */
export function DownloadConfigurationBackup(backup: IConfigurationBackup): void {
  const blob = new Blob([JSON.stringify(backup.payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${backup.name}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * 解析并校验配置备份文件。
 *
 * @param file 用户选择的 JSON 配置文件
 * @returns 已通过结构校验的备份内容
 */
export async function ParseConfigurationBackup(file: File): Promise<IConfigurationBackupPayload> {
  let payload: unknown;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    throw new Error('配置文件不是有效的 JSON 格式');
  }
  if (!payload || typeof payload !== 'object') {
    throw new Error('配置文件内容为空');
  }
  const candidate = payload as Partial<IConfigurationBackupPayload>;
  if (candidate.schemaVersion !== '1.0' || !candidate.sourceController || !Array.isArray(candidate.scopes)) {
    throw new Error('配置文件结构或版本不受支持');
  }
  return Clone(candidate as IConfigurationBackupPayload);
}
