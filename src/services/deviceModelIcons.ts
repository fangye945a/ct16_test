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

const DATABASE_NAME = 'zaihong-device-model-assets';
const DATABASE_VERSION = 2;
const ICON_STORE_NAME = 'model-icons';
const DRIVER_STORE_NAME = 'model-drivers';

export interface DeviceModelDriverAsset {
  fileName: string;
  blob: Blob;
}

function GetIconKey(modelId: string, version: string): string {
  return `${modelId}:${version.trim() || 'v1.0'}`;
}

function OpenDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error || new Error('无法打开模型图标存储'));
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(ICON_STORE_NAME)) {
        request.result.createObjectStore(ICON_STORE_NAME);
      }
      if (!request.result.objectStoreNames.contains(DRIVER_STORE_NAME)) {
        request.result.createObjectStore(DRIVER_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function CompleteTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('模型图标存储操作失败'));
    transaction.onabort = () => reject(transaction.error || new Error('模型图标存储操作已取消'));
  });
}

/**
 * 读取指定模型版本的图标文件。
 *
 * @param modelId 模型唯一标识。
 * @param version 模型版本号。
 * @returns 图标 PNG 文件，不存在时返回 null。
 */
export async function GetDeviceModelIcon(modelId: string, version: string): Promise<Blob | null> {
  const database = await OpenDatabase();
  try {
    const transaction = database.transaction(ICON_STORE_NAME, 'readonly');
    const request = transaction.objectStore(ICON_STORE_NAME).get(GetIconKey(modelId, version));
    const result = await new Promise<unknown>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('读取模型图标失败'));
    });
    return result instanceof Blob ? result : null;
  } finally {
    database.close();
  }
}

/**
 * 保存指定模型版本的 400×400 PNG 图标。
 *
 * @param modelId 模型唯一标识。
 * @param version 模型版本号。
 * @param icon 已裁切完成的 PNG 文件。
 */
export async function SaveDeviceModelIcon(modelId: string, version: string, icon: Blob): Promise<void> {
  const database = await OpenDatabase();
  try {
    const transaction = database.transaction(ICON_STORE_NAME, 'readwrite');
    transaction.objectStore(ICON_STORE_NAME).put(icon, GetIconKey(modelId, version));
    await CompleteTransaction(transaction);
  } finally {
    database.close();
  }
}

/**
 * 移除指定模型版本的图标。
 *
 * @param modelId 模型唯一标识。
 * @param version 模型版本号。
 */
export async function RemoveDeviceModelIcon(modelId: string, version: string): Promise<void> {
  const database = await OpenDatabase();
  try {
    const transaction = database.transaction(ICON_STORE_NAME, 'readwrite');
    transaction.objectStore(ICON_STORE_NAME).delete(GetIconKey(modelId, version));
    await CompleteTransaction(transaction);
  } finally {
    database.close();
  }
}

/**
 * 将图标关联迁移到同一模型的新版本。
 *
 * @param modelId 模型唯一标识。
 * @param fromVersion 原版本号。
 * @param toVersion 新版本号。
 */
export async function MoveDeviceModelIcon(modelId: string, fromVersion: string, toVersion: string): Promise<void> {
  if (fromVersion === toVersion) {
    return;
  }
  const icon = await GetDeviceModelIcon(modelId, fromVersion);
  if (!icon) {
    return;
  }
  await SaveDeviceModelIcon(modelId, toVersion, icon);
  await RemoveDeviceModelIcon(modelId, fromVersion);
}

/**
 * 移除某一模型所有版本的图标。
 *
 * @param modelId 模型唯一标识。
 */
export async function RemoveDeviceModelIcons(modelId: string): Promise<void> {
  await RemoveModelAssets(ICON_STORE_NAME, modelId);
}

async function RemoveModelAssets(storeName: string, modelId: string): Promise<void> {
  const database = await OpenDatabase();
  try {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const prefix = `${modelId}:`;
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        return;
      }
      if (typeof cursor.key === 'string' && cursor.key.startsWith(prefix)) {
        cursor.delete();
      }
      cursor.continue();
    };
    await CompleteTransaction(transaction);
  } finally {
    database.close();
  }
}

/**
 * 读取指定模型版本关联的动态库文件。
 *
 * @param modelId 模型唯一标识。
 * @param version 模型版本号。
 * @returns 动态库文件及其文件名，不存在时返回 null。
 */
export async function GetDeviceModelDriver(modelId: string, version: string): Promise<DeviceModelDriverAsset | null> {
  const database = await OpenDatabase();
  try {
    const transaction = database.transaction(DRIVER_STORE_NAME, 'readonly');
    const request = transaction.objectStore(DRIVER_STORE_NAME).get(GetIconKey(modelId, version));
    const result = await new Promise<unknown>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('读取模型动态库失败'));
    });
    if (!result || typeof result !== 'object') {
      return null;
    }
    const asset = result as Partial<DeviceModelDriverAsset>;
    return typeof asset.fileName === 'string' && asset.blob instanceof Blob ? { fileName: asset.fileName, blob: asset.blob } : null;
  } finally {
    database.close();
  }
}

/**
 * 保存指定模型版本关联的动态库文件。
 *
 * @param modelId 模型唯一标识。
 * @param version 模型版本号。
 * @param driver 动态库文件及其原始文件名。
 */
export async function SaveDeviceModelDriver(modelId: string, version: string, driver: DeviceModelDriverAsset): Promise<void> {
  const database = await OpenDatabase();
  try {
    const transaction = database.transaction(DRIVER_STORE_NAME, 'readwrite');
    transaction.objectStore(DRIVER_STORE_NAME).put(driver, GetIconKey(modelId, version));
    await CompleteTransaction(transaction);
  } finally {
    database.close();
  }
}

/**
 * 移除指定模型版本关联的动态库文件。
 *
 * @param modelId 模型唯一标识。
 * @param version 模型版本号。
 */
export async function RemoveDeviceModelDriver(modelId: string, version: string): Promise<void> {
  const database = await OpenDatabase();
  try {
    const transaction = database.transaction(DRIVER_STORE_NAME, 'readwrite');
    transaction.objectStore(DRIVER_STORE_NAME).delete(GetIconKey(modelId, version));
    await CompleteTransaction(transaction);
  } finally {
    database.close();
  }
}

/**
 * 将动态库关联迁移到同一模型的新版本。
 *
 * @param modelId 模型唯一标识。
 * @param fromVersion 原版本号。
 * @param toVersion 新版本号。
 */
export async function MoveDeviceModelDriver(modelId: string, fromVersion: string, toVersion: string): Promise<void> {
  if (fromVersion === toVersion) {
    return;
  }
  const driver = await GetDeviceModelDriver(modelId, fromVersion);
  if (!driver) {
    return;
  }
  await SaveDeviceModelDriver(modelId, toVersion, driver);
  await RemoveDeviceModelDriver(modelId, fromVersion);
}

/**
 * 移除某一模型所有版本关联的动态库文件。
 *
 * @param modelId 模型唯一标识。
 */
export async function RemoveDeviceModelDrivers(modelId: string): Promise<void> {
  await RemoveModelAssets(DRIVER_STORE_NAME, modelId);
}
