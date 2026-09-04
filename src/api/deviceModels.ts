import { ct16AuthGet, ct16AuthRequest } from "./client";

export const DEVICE_MODEL_PACKAGE_MAX_BYTES = 64 * 1024 * 1024;
export const DEVICE_MODEL_BATCH_MAX_BYTES = 256 * 1024 * 1024;

async function validateZipSignature(file: File): Promise<void> {
  const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const valid =
    header.length === 4 &&
    header[0] === 0x50 &&
    header[1] === 0x4b &&
    ((header[2] === 0x03 && header[3] === 0x04) ||
      (header[2] === 0x05 && header[3] === 0x06) ||
      (header[2] === 0x07 && header[3] === 0x08));
  if (!valid) {
    throw new Error(`文件「${file.name}」不是有效的 ZIP 压缩包`);
  }
}

export type Ct16DeviceModelSyncStatus = "synced" | "unsynced";

export interface Ct16DeviceModelScenarioDto {
  name: string;
  identifier: string;
  source: "preset" | "custom";
}

export interface Ct16DeviceModelPropertyValueDto {
  valueJSON: string;
  meaning: string;
}

export interface Ct16DeviceModelPropertyDto {
  id: string;
  name: string;
  dataType: string;
  isEnum: boolean;
  required: boolean;
  unit: string;
  minimum: string;
  maximum: string;
  step: string;
  description: string;
  exampleJSON: string;
  values: Ct16DeviceModelPropertyValueDto[];
}

export interface Ct16DeviceModelDto {
  schemaVersion: number;
  id: string;
  pluginFile: string;
  modelName: string;
  deviceType: string;
  deviceVendor: string;
  deviceModel: string;
  version: string;
  description: string;
  protocolDescription: string;
  interfaces: Ct16DeviceModelInterfaceDto[];
  statuses: Ct16DeviceModelPropertyDto[];
  controls: Ct16DeviceModelPropertyDto[];
  applicableScenarios: Ct16DeviceModelScenarioDto[];
  createdAt: string;
  syncStatus: Ct16DeviceModelSyncStatus;
  tags: string[];
  iconId: string;
  iconUrl: string;
}

export async function uploadDeviceModelIcon(
  id: string,
  file: File,
): Promise<Ct16DeviceModelDto> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await ct16AuthRequest(
    `/api/device-model-icons/${encodeURIComponent(id)}`,
    { method: "POST", body: formData },
  );
  return response.json() as Promise<Ct16DeviceModelDto>;
}
export async function removeDeviceModelIcon(
  id: string,
): Promise<Ct16DeviceModelDto> {
  const response = await ct16AuthRequest(
    `/api/device-model-icons/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  return response.json() as Promise<Ct16DeviceModelDto>;
}
export interface Ct16DeviceModelIconDto {
  id: string;
  url: string;
  refCount: number;
}
export async function getDeviceModelIcons(): Promise<Ct16DeviceModelIconDto[]> {
  const response = await ct16AuthGet<{ icons: Ct16DeviceModelIconDto[] }>(
    "/api/device-model-icons",
  );
  return response.icons;
}
export async function selectDeviceModelIcon(
  id: string,
  iconId: string,
): Promise<Ct16DeviceModelDto> {
  const response = await ct16AuthRequest(
    `/api/device-model-icons/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ iconId }),
    },
  );
  return response.json() as Promise<Ct16DeviceModelDto>;
}

export interface Ct16DeviceModelListDto {
  models: Ct16DeviceModelDto[];
  types: string[];
  warnings: string[];
}

export interface Ct16DeviceModelInspectDto {
  draftId: string;
  model: Ct16DeviceModelDto;
}

export interface Ct16DeviceModelBatchInspectItemDto {
  source: string;
  draftId?: string;
  model: Ct16DeviceModelDto;
  error?: string;
}

export interface Ct16DeviceModelBatchInspectDto {
  items: Ct16DeviceModelBatchInspectItemDto[];
}

export interface Ct16DeviceModelInterfaceDto {
  name: string;
  id: string;
  type: string;
  defaultConfigJSON: string;
  defaultConfigJson?: string;
  description: string;
  requiresDeviceAddress: boolean;
}

export interface Ct16DeviceInstanceDto {
  name: string;
  sn: string;
  type: string;
  vendor: string;
  model: string;
  devPoint: string;
  remark: string;
  interfaceConfigs: Record<string, unknown[]>;
  interfaceTypes: Record<string, string>;
}

export interface Ct16DsdkOperationDto {
  success: boolean;
  code: number;
  info?: string;
  error?: string;
}

export function getDeviceModels(): Promise<Ct16DeviceModelListDto> {
  return ct16AuthGet<Ct16DeviceModelListDto>("/api/device-models");
}

export async function getDeviceModelInterfaces(
  id: string,
): Promise<Ct16DeviceModelInterfaceDto[]> {
  const response = await ct16AuthGet<{
    interfaces: Ct16DeviceModelInterfaceDto[];
  }>(`/api/device-models/${encodeURIComponent(id)}/interfaces`);
  if (!Array.isArray(response.interfaces)) {
    throw new Error("设备模型接口配置格式错误");
  }
  return response.interfaces.map((item) => ({
    name: typeof item?.name === "string" ? item.name : "",
    id: typeof item?.id === "string" ? item.id : "",
    type: typeof item?.type === "string" ? item.type : "",
    defaultConfigJSON:
      typeof item?.defaultConfigJSON === "string"
        ? item.defaultConfigJSON
        : "[]",
    description: typeof item?.description === "string" ? item.description : "",
    requiresDeviceAddress: item?.requiresDeviceAddress === true,
  }));
}

export async function getDeviceInstances(): Promise<Ct16DeviceInstanceDto[]> {
  const response = await ct16AuthGet<{ instances: Ct16DeviceInstanceDto[] }>(
    "/api/device-instances",
  );
  if (!Array.isArray(response.instances)) return [];
  return response.instances.flatMap((item) => {
    const name = typeof item?.name === "string" ? item.name.trim() : "";
    const sn = typeof item?.sn === "string" ? item.sn.trim() : "";
    const type = typeof item?.type === "string" ? item.type.trim() : "";
    const vendor = typeof item?.vendor === "string" ? item.vendor.trim() : "";
    const model = typeof item?.model === "string" ? item.model.trim() : "";
    if (!name || !sn || !type || !vendor || !model) return [];
    const interfaceConfigs: Record<string, unknown[]> = {};
    if (item.interfaceConfigs && typeof item.interfaceConfigs === "object") {
      for (const [id, values] of Object.entries(item.interfaceConfigs)) {
        if (Array.isArray(values)) interfaceConfigs[id] = values;
      }
    }
    const interfaceTypes: Record<string, string> = {};
    if (item.interfaceTypes && typeof item.interfaceTypes === "object") {
      for (const [id, type] of Object.entries(item.interfaceTypes)) {
        if (typeof type === "string") interfaceTypes[id] = type;
      }
    }
    return [{
      name,
      sn,
      type,
      vendor,
      model,
      devPoint: typeof item.devPoint === "string" ? item.devPoint : "",
      remark: typeof item.remark === "string" ? item.remark : "",
      interfaceConfigs,
      interfaceTypes,
    }];
  });
}

export async function createDeviceInstance(
  request: Ct16DeviceInstanceDto,
): Promise<Ct16DeviceInstanceDto> {
  const response = await ct16AuthRequest("/api/device-instances", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return response.json() as Promise<Ct16DeviceInstanceDto>;
}

export async function updateDeviceInstance(
  sn: string,
  request: Ct16DeviceInstanceDto,
): Promise<Ct16DeviceInstanceDto> {
  const response = await ct16AuthRequest(
    `/api/device-instances/${encodeURIComponent(sn)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  return response.json() as Promise<Ct16DeviceInstanceDto>;
}

export async function deleteDeviceInstance(sn: string): Promise<void> {
  await ct16AuthRequest(`/api/device-instances/${encodeURIComponent(sn)}`, {
    method: "DELETE",
  });
}

export function readDeviceInstance(sn: string): Promise<Ct16DsdkOperationDto> {
  return ct16AuthRequest(`/api/device-instances/${encodeURIComponent(sn)}/read`, {
    method: "POST",
  }).then((response) => response.json() as Promise<Ct16DsdkOperationDto>);
}

export function controlDeviceInstance(
  sn: string,
  info: string,
): Promise<Ct16DsdkOperationDto> {
  return ct16AuthRequest(
    `/api/device-instances/${encodeURIComponent(sn)}/control`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ info }),
    },
  ).then((response) => response.json() as Promise<Ct16DsdkOperationDto>);
}

export async function inspectDeviceModel(
  file: File,
): Promise<Ct16DeviceModelInspectDto> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await ct16AuthRequest("/api/device-models/inspect", {
    method: "POST",
    body: formData,
  });
  return response.json() as Promise<Ct16DeviceModelInspectDto>;
}

export async function inspectDeviceModelPackage(
  file: File,
): Promise<Ct16DeviceModelInspectDto> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await ct16AuthRequest("/api/device-models/package/inspect", {
    method: "POST",
    body: formData,
  });
  return response.json() as Promise<Ct16DeviceModelInspectDto>;
}

export async function inspectDeviceModelPackages(
  files: File[],
): Promise<Ct16DeviceModelBatchInspectDto> {
	const totalBytes = files.reduce((total, file) => total + file.size, 0);
	if (files.some((file) => file.size > DEVICE_MODEL_PACKAGE_MAX_BYTES)) {
		throw new Error("单个模型 ZIP 不能超过 64 MiB");
	}
	if (totalBytes > DEVICE_MODEL_BATCH_MAX_BYTES) {
		throw new Error("模型 ZIP 总大小不能超过 256 MiB");
	}
	await Promise.all(files.map(validateZipSignature));
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const response = await ct16AuthRequest(
    "/api/device-models/packages/inspect",
    {
      method: "POST",
      body: formData,
    },
  );
  return response.json() as Promise<Ct16DeviceModelBatchInspectDto>;
}

export async function createDeviceModel(request: {
  draftId: string;
  modelName: string;
  description: string;
  applicableScenarios: Ct16DeviceModelScenarioDto[];
  tags: string[];
}): Promise<Ct16DeviceModelDto> {
  const response = await ct16AuthRequest("/api/device-models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return response.json() as Promise<Ct16DeviceModelDto>;
}

export interface Ct16DeviceModelReplaceInspectDto {
  draftId: string;
  model: Ct16DeviceModelDto;
}

export async function inspectDeviceModelReplacement(
  id: string,
  file: File,
): Promise<Ct16DeviceModelReplaceInspectDto> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await ct16AuthRequest(
    `/api/device-models/${encodeURIComponent(id)}/replace/inspect`,
    { method: "POST", body: formData },
  );
  return response.json() as Promise<Ct16DeviceModelReplaceInspectDto>;
}

export async function replaceDeviceModel(
  id: string,
  request: {
    draftId: string;
    modelName: string;
    description: string;
    applicableScenarios: Ct16DeviceModelScenarioDto[];
    tags: string[];
  },
): Promise<Ct16DeviceModelDto> {
  const response = await ct16AuthRequest(
    `/api/device-models/${encodeURIComponent(id)}/replace`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  return response.json() as Promise<Ct16DeviceModelDto>;
}

export async function cancelDeviceModelImport(draftId: string): Promise<void> {
  await ct16AuthRequest(
    `/api/device-models/imports/${encodeURIComponent(draftId)}`,
    {
      method: "DELETE",
    },
  );
}

export async function deleteDeviceModel(id: string): Promise<void> {
  await ct16AuthRequest(`/api/device-models/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function updateDeviceModel(
  id: string,
  request: {
    modelName: string;
    description: string;
    applicableScenarios: Ct16DeviceModelScenarioDto[];
    tags: string[];
  },
): Promise<Ct16DeviceModelDto> {
  const response = await ct16AuthRequest(
    `/api/device-models/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  return response.json() as Promise<Ct16DeviceModelDto>;
}

export async function exportDeviceModel(id: string): Promise<Blob> {
  const response = await ct16AuthRequest(
    `/api/device-models/${encodeURIComponent(id)}/export`,
    {
      method: "GET",
    },
  );
  return response.blob();
}

export async function exportDeviceModels(
  pluginFiles: string[],
): Promise<{ blob: Blob; filename: string }> {
  const response = await ct16AuthRequest("/api/device-models/export", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/zip" },
    body: JSON.stringify({ pluginFiles }),
  });
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const encodedFilename = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  let filename =
    disposition.match(/filename="?([^";]+)"?/)?.[1] ?? "设备模型.zip";
  if (encodedFilename) {
    try {
      filename = decodeURIComponent(encodedFilename);
    } catch {
      // UTF-8 文件名解析失败时使用 ASCII 兜底名称。
    }
  }
  return { blob: await response.blob(), filename };
}
