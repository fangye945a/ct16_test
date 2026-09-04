import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  AlertCircle,
  Archive,
  Boxes,
  CheckCircle2,
  Cloud,
  CloudOff,
  Database,
  Download,
  Eye,
  FileUp,
  FileSpreadsheet,
  ImagePlus,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  Tag,
  Terminal,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Slider } from "@/components/ui/slider";
import {
  cancelDeviceModelImport,
  controlDeviceInstance,
  createDeviceInstance,
  deleteDeviceInstance,
  createDeviceModel,
  inspectDeviceModelReplacement,
  deleteDeviceModel,
  exportDeviceModel,
  exportDeviceModels,
  getDeviceModels,
  getDeviceModelInterfaces,
  getDeviceInstances,
  inspectDeviceModel,
  inspectDeviceModelPackages,
  DEVICE_MODEL_PACKAGE_MAX_BYTES,
  updateDeviceModel,
  replaceDeviceModel,
  updateDeviceInstance,
  getDeviceModelIcons,
  selectDeviceModelIcon,
  uploadDeviceModelIcon,
  removeDeviceModelIcon,
  readDeviceInstance,
  type Ct16DeviceModelIconDto,
  type Ct16DeviceInstanceDto,
  type Ct16DeviceModelInterfaceDto,
  type Ct16DeviceModelPropertyDto,
  type Ct16DeviceModelBatchInspectItemDto,
  type Ct16DeviceModelDto,
  type Ct16DeviceModelScenarioDto,
} from "@/api/deviceModels";
import { getModules } from "@/api/topology";
import { getSystemOverview } from "@/api/overview";
import type { Ct16ModuleInfoDto } from "@/api/types";
import BatchDeviceImportDialog from "@/pages/BatchOperationsPage/BatchDeviceImportDialog";
import type {
  IDeviceBatchImportDevice,
  IDeviceBatchImportModel,
  IDeviceBatchImportResult,
} from "@/pages/BatchOperationsPage/deviceBatchImport";
import { GetDsdkErrorDefinition } from "@/services/dsdkErrorCodes";

function DateTimeText({ value }: { value: string }) {
  const formattedValue = value
    .replace("T", " ")
    .replace(/(Z|[+-]\d{2}:\d{2})$/, "");
  const [date, time] = formattedValue.split(" ");

  return (
    <span className="inline-flex items-center gap-1">
      <span>{date || "-"}</span>
      {time && <span className="border-l border-border/60 pl-1">{time}</span>}
    </span>
  );
}

function OverflowText({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setOverflowing(element.scrollWidth > element.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref} className={className} title={overflowing ? value : undefined}>
      {value}
    </span>
  );
}

function ToBatchImportModel(model: Ct16DeviceModelDto): IDeviceBatchImportModel {
  return {
    id: model.id,
    type: model.deviceType,
    vendor: model.deviceVendor,
    deviceModel: model.deviceModel,
    interfaces: (model.interfaces || []).map((item) => ({
      identifier: item.id,
      type: item.type,
      defaultConfigJSON: item.defaultConfigJSON || item.defaultConfigJson,
    })),
  };
}

function splitTags(value: string): string[] {
  return value
    .split(/[,，]/)
    .map((tag) => limitUtf8Bytes(tag.trim(), 32))
    .filter(Boolean);
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function limitUtf8Bytes(value: string, maxBytes: number): string {
  if (utf8ByteLength(value) <= maxBytes) return value;
  let result = "";
  for (const character of value) {
    if (utf8ByteLength(result + character) > maxBytes) break;
    result += character;
  }
  return result;
}

function limitTagInput(value: string): string {
  return value
    .split(/[,，]/)
    .slice(0, 5)
    .map((tag) => limitUtf8Bytes(tag, 32))
    .join(",");
}

function previewDeviceInfoWithoutRemark(
  interfaces: Ct16DeviceModelInterfaceDto[],
  configs: Record<string, string[]>,
): string {
  const runtimeInfo: Record<string, unknown> = {};
  for (const item of interfaces) {
    const values = configs[item.id] ?? [];
    const interfaceType = item.type.trim().toUpperCase();
    if (interfaceType === "RS485") {
      runtimeInfo.ifType = "rs485";
      if (values[1]) runtimeInfo.rs485Channel = Number(values[1]);
      if (values[6] !== undefined && values[6] !== "") runtimeInfo.devAddr = Number(values[6]);
    } else if (interfaceType === "RS232") {
      runtimeInfo.ifType = "rs232";
      if (values[1]) runtimeInfo.rs232Channel = Number(values[1]);
      if (values[6] !== undefined && values[6] !== "") runtimeInfo.devAddr = Number(values[6]);
    } else if (["TCP_CLIENT", "TCP_SERVER", "UDP"].includes(interfaceType)) {
      runtimeInfo.ifType =
        interfaceType === "TCP_CLIENT"
          ? "tcpClient"
          : interfaceType === "TCP_SERVER"
            ? "tcpServer"
            : "udp";
      if (values[0]) runtimeInfo.ipAddr = values[0];
      if (values[1]) runtimeInfo.port = Number(values[1]);
      if (values[2] !== undefined && values[2] !== "") runtimeInfo.devAddr = Number(values[2]);
    } else if (["DI", "DO", "DO", "CI", "CO", "VI", "VO"].includes(interfaceType)) {
      runtimeInfo[item.id] = [Number(values[0]), Number(values[1])];
    } else {
      runtimeInfo[item.id] = values;
    }
  }
  return JSON.stringify(runtimeInfo);
}

function deviceModelTriadKey(model: Ct16DeviceModelDto): string | null {
  const triad = [
    model.deviceType,
    model.deviceVendor,
    model.deviceModel,
  ].map((value) => value.trim());
  return triad.every(Boolean) ? triad.join("\u0000") : null;
}

function deviceModelTriadText(model: Ct16DeviceModelDto): string {
  return [model.deviceType, model.deviceVendor, model.deviceModel]
    .map((value) => value.trim())
    .join(" / ");
}

const legacyCommunicationInterfaceIDs: Record<string, string> = {
  rs485: "RS485",
  rs232: "RS232",
  tcpClient: "TCP_CLIENT",
  tcpServer: "TCP_SERVER",
  udp: "UDP",
};

function normalizeInstanceInterfaceConfigs(
  configs: Record<string, unknown[]> | undefined,
  interfaces: Ct16DeviceModelInterfaceDto[],
): Record<string, unknown[]> {
  const normalized = { ...(configs ?? {}) };
  for (const [legacyID, interfaceType] of Object.entries(
    legacyCommunicationInterfaceIDs,
  )) {
    if (!normalized[legacyID]) continue;
    const candidates = interfaces.filter(
      (item) => item.type.trim().toUpperCase() === interfaceType,
    );
    if (candidates.length !== 1 || normalized[candidates[0].id]) continue;
    normalized[candidates[0].id] = normalized[legacyID];
    delete normalized[legacyID];
  }
  return normalized;
}

const readOnlyFieldClass =
  "bg-muted/60 border-dashed border-[#cbd5e1] text-muted-foreground cursor-not-allowed focus-visible:ring-0";
const editableFieldClass =
  "border border-foreground/35 bg-background text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:border-primary";
const dialogScrollAreaClass = "min-h-0 flex-1 overflow-hidden";

function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  loading: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[min(90vw,32rem)] border-border/40 bg-card/95">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="break-all whitespace-normal">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-wrap">
          <AlertDialogCancel disabled={loading}>取消</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading && <Loader2 className="mr-1 size-4 animate-spin" />}
            确认删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SyncStatus({ model }: { model: Ct16DeviceModelDto }) {
  const synced = model.syncStatus === "synced";
  return (
    <Badge
      className={
        synced
          ? "bg-success/10 text-success text-[10px]"
          : "bg-warning/10 text-warning text-[10px]"
      }
    >
      {synced ? (
        <CheckCircle2 className="size-2.5 mr-1" />
      ) : (
        <CloudOff className="size-2.5 mr-1" />
      )}
      {synced ? "已同步" : "未同步"}
    </Badge>
  );
}

function modelTags(model: Ct16DeviceModelDto): string[] {
  return Array.isArray(model.tags) ? model.tags : [];
}

function modelProperties(value: unknown): Ct16DeviceModelPropertyDto[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Ct16DeviceModelPropertyDto =>
      typeof item === "object" &&
      item !== null &&
      typeof item.id === "string" &&
      typeof item.name === "string" &&
      typeof item.dataType === "string",
  );
}

function propertyRange(property: Ct16DeviceModelPropertyDto): string {
  if (property.dataType === "boolean") return "true、false";
  if (property.minimum && property.maximum) {
    return `${property.minimum} ~ ${property.maximum}`;
  }
  if (property.minimum) return `>=${property.minimum}`;
  if (property.maximum) return `<=${property.maximum}`;
  return "无范围限制";
}

function propertyRangeMeanings(
  property: Ct16DeviceModelPropertyDto,
): string[] {
  if (!property.isEnum || !property.values?.length) {
    return [];
  }
  return Array.from(
    new Set(
      property.values
        .map((item) => item.meaning.trim())
        .filter(Boolean),
    ),
  );
}

function propertyExampleValue(property: Ct16DeviceModelPropertyDto): string {
  try {
    const parsed: unknown = JSON.parse(property.exampleJSON);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      property.id in parsed
    ) {
      return formatPropertyValue(
        (parsed as Record<string, unknown>)[property.id],
      );
    }
    return formatPropertyValue(parsed);
  } catch {
    return "";
  }
}

function formatPropertyValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return "";
  return JSON.stringify(value);
}

function propertyDisplayValue(
  property: Ct16DeviceModelPropertyDto,
  value: string | undefined,
): string {
  if (!value) return "-";
  let displayValue = value;
  if (property.isEnum) {
    const matchedValue = property.values?.find((item) => {
      try {
        return formatPropertyValue(JSON.parse(item.valueJSON)) === value;
      } catch {
        return item.valueJSON === value;
      }
    });
    displayValue = matchedValue?.meaning.trim() || value;
  }
  const unit = property.unit.trim();
  return unit ? `${displayValue} ${unit}` : displayValue;
}

function propertyValueFromInput(
  property: Ct16DeviceModelPropertyDto,
  value: string,
): unknown {
  if (property.dataType === "integer" || property.dataType === "number") {
    const result = Number(value);
    if (!Number.isFinite(result)) throw new Error(`${property.name}必须是数字`);
    if (property.dataType === "integer" && !Number.isInteger(result)) {
      throw new Error(`${property.name}必须是整数`);
    }
    if (property.minimum.trim()) {
      const minimum = Number(property.minimum);
      if (Number.isFinite(minimum) && result < minimum) {
        throw new Error(`${property.name}不能小于 ${property.minimum}`);
      }
    }
    if (property.maximum.trim()) {
      const maximum = Number(property.maximum);
      if (Number.isFinite(maximum) && result > maximum) {
        throw new Error(`${property.name}不能大于 ${property.maximum}`);
      }
    }
    return result;
  }
  if (property.dataType === "boolean") {
    if (value !== "true" && value !== "false") {
      throw new Error(`${property.name}只能填写 true 或 false`);
    }
    return value === "true";
  }
  if (property.dataType === "array" || property.dataType === "object") {
    return JSON.parse(value);
  }
  return value;
}

function clampNumericControlInput(
  property: Ct16DeviceModelPropertyDto,
  value: string,
): string {
  if (!value || (property.dataType !== "integer" && property.dataType !== "number")) {
    return value;
  }
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;
  let clampedValue = numericValue;
  const minimum = Number(property.minimum);
  const maximum = Number(property.maximum);
  if (property.minimum.trim() && Number.isFinite(minimum)) {
    clampedValue = Math.max(clampedValue, minimum);
  }
  if (property.maximum.trim() && Number.isFinite(maximum)) {
    clampedValue = Math.min(clampedValue, maximum);
  }
  return String(clampedValue);
}

function dsdkErrorText(code: number, detail?: string): string {
  const definition = code < 0
    ? { name: "本地调用错误", reason: "" }
    : GetDsdkErrorDefinition(code);
  const message = definition.reason ? `${definition.name}：${definition.reason}` : definition.name;
  return `${message}（错误码：${code}）${detail ? `：${detail}` : ""}`;
}

function DevicePropertyModel({
  title,
  description,
  pointLabel,
  properties,
  values,
  controlValues,
  readingKey,
  controlling,
  valueLabel,
  readable = false,
  controllable = false,
  onRead,
  onControlValueChange,
  onControl,
}: {
  title: string;
  description: string;
  pointLabel: string;
  properties: Ct16DeviceModelPropertyDto[];
  values: Record<string, string>;
  controlValues: Record<string, string>;
  readingKey: string | null;
  controlling: string | null;
  valueLabel: string;
  readable?: boolean;
  controllable?: boolean;
  onRead: (propertyID: string) => void;
  onControlValueChange: (propertyID: string, value: string) => void;
  onControl: (property: Ct16DeviceModelPropertyDto) => void;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
        {properties.length > 0 && (
          <Badge variant="outline" className="mt-0.5 shrink-0">
            {properties.length} 个{pointLabel}
          </Badge>
        )}
      </div>
      {properties.length ? (
        <div className="overflow-x-auto rounded-xl border border-border/40">
          <Table className="w-full table-auto">
            <TableHeader>
              <TableRow>
                <TableHead>数据点</TableHead>
                <TableHead className="text-center">{valueLabel}</TableHead>
                <TableHead className="text-center">类型</TableHead>
                <TableHead className="text-center">范围</TableHead>
                <TableHead className="text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((property) => {
                const isReading = readingKey === property.id;
                const selectedControlValue = controlValues[property.id] ?? "";
                const selectedControlOption = property.values?.find((item) => {
                  try {
                    return (
                      formatPropertyValue(JSON.parse(item.valueJSON)) ===
                      selectedControlValue
                    );
                  } catch {
                    return item.valueJSON === selectedControlValue;
                  }
                });
                return (
                <TableRow key={property.id}>
                  <TableCell className="whitespace-nowrap align-top">
                    <div className="font-medium">{property.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {property.id}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-28 align-top text-center">
                    {controllable ? (
                      property.isEnum && property.values?.length ? (
                        <div className="flex justify-center">
                          <Select
                            value={selectedControlOption?.valueJSON}
                            onValueChange={(value) => {
                              try {
                                onControlValueChange(property.id, formatPropertyValue(JSON.parse(value)));
                              } catch {
                                onControlValueChange(property.id, value);
                              }
                            }}
                          >
                            <SelectTrigger
                              className={`h-8 w-full min-w-0 ${editableFieldClass}`}
                            >
                              <SelectValue
                                placeholder="选择值"
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {property.values.map((item) => (
                                <SelectItem
                                  key={item.valueJSON}
                                  value={item.valueJSON}
                                >
                                  {item.meaning || item.valueJSON}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <Input
                            type={
                              property.dataType === "integer" ||
                              property.dataType === "number"
                                ? "number"
                                : "text"
                            }
                            min={property.minimum || undefined}
                            max={property.maximum || undefined}
                            step={property.step || undefined}
                            value={controlValues[property.id] ?? ""}
                            onChange={(event) =>
                              onControlValueChange(
                                property.id,
                                clampNumericControlInput(property, event.target.value),
                              )
                            }
                            className={`h-8 min-w-0 flex-1 text-center ${editableFieldClass}`}
                          />
                          {property.unit.trim() && (
                            <span className="shrink-0 text-sm text-muted-foreground">
                              {property.unit.trim()}
                            </span>
                          )}
                        </div>
                      )
                    ) : (
                      <span className="break-words text-sm">
                        {propertyDisplayValue(property, values[property.id])}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="w-20 whitespace-nowrap align-top text-center">
                    <Badge variant="outline" className="text-[10px]">
                      {property.dataType}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-36 align-top text-center text-xs leading-5 text-muted-foreground">
                    {propertyRangeMeanings(property).length ? (
                      <div className="flex flex-wrap justify-center">
                        {propertyRangeMeanings(property).map(
                          (meaning, index, meanings) => (
                            <span key={meaning} className="whitespace-nowrap">
                              {meaning}
                              {index < meanings.length - 1 && "、"}
                            </span>
                          ),
                        )}
                      </div>
                    ) : (
                      <span className="whitespace-normal break-words">
                        {propertyRange(property)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="w-24 whitespace-nowrap align-top">
                    <div className="flex flex-wrap justify-center gap-1">
                      {readable && (
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          disabled={isReading}
                          onClick={() => onRead(property.id)}
                        >
                          {isReading ? "读取中..." : "读取"}
                        </Button>
                      )}
                      {controllable && (
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          disabled={controlling === property.id}
                          onClick={() => onControl(property)}
                        >
                          {controlling === property.id && <Loader2 className="mr-1 size-3.5 animate-spin" />}
                          写入
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {title}未识别，请重新创建或导入设备模型。
        </div>
      )}
    </section>
  );
}

const presetDeviceModelScenarios: Ct16DeviceModelScenarioDto[] = [
  { name: "隧道场景", identifier: "tunnel", source: "preset" },
  { name: "沙盘场景", identifier: "sandbox", source: "preset" },
  { name: "工业控制场景", identifier: "industrial-control", source: "preset" },
  { name: "智慧水利场景", identifier: "water-conservancy", source: "preset" },
  { name: "能源管理场景", identifier: "energy-management", source: "preset" },
  { name: "园区安防场景", identifier: "campus-security", source: "preset" },
];

const customScenarioStorageKey = "ct16:device-model-custom-scenarios";
const lastAddedDeviceModelStorageKey = "ct16:last-added-device-model-id";
const customScenarioNameMaxBytes = 32;
const customScenarioIdentifierMaxLength = 32;

function readLastAddedDeviceModelID(): string {
  try {
    return window.localStorage.getItem(lastAddedDeviceModelStorageKey) ?? "";
  } catch {
    return "";
  }
}

function saveLastAddedDeviceModelID(modelID: string): void {
  try {
    window.localStorage.setItem(lastAddedDeviceModelStorageKey, modelID);
  } catch {
    // 浏览器禁用本地存储时，保留当前页面会话内的默认选择。
  }
}

function readCustomScenarios(): Ct16DeviceModelScenarioDto[] {
  try {
    const stored = window.localStorage.getItem(customScenarioStorageKey);
    const scenarios: unknown = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(scenarios)) return [];
    return scenarios.filter(
      (scenario): scenario is Ct16DeviceModelScenarioDto =>
        typeof scenario === "object" &&
        scenario !== null &&
        typeof scenario.name === "string" &&
        typeof scenario.identifier === "string" &&
        scenario.source === "custom",
    );
  } catch {
    return [];
  }
}

function isScenarioIdentifier(value: string): boolean {
  return /^[a-z][a-z0-9_-]{0,31}$/.test(value);
}

function ScenarioSelectionField({
  value,
  onChange,
  disabled = false,
}: {
  value: Ct16DeviceModelScenarioDto[];
  onChange: (scenarios: Ct16DeviceModelScenarioDto[]) => void;
  disabled?: boolean;
}) {
  const [customScenarios, setCustomScenarios] =
    useState<Ct16DeviceModelScenarioDto[]>(readCustomScenarios);
  const [customOpen, setCustomOpen] = useState(false);
  const [managementOpen, setManagementOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customIdentifier, setCustomIdentifier] = useState("");
  const [deleteScenario, setDeleteScenario] =
    useState<Ct16DeviceModelScenarioDto | null>(null);
  const scenarios = [...presetDeviceModelScenarios, ...customScenarios];

  const saveCustomScenarios = (next: Ct16DeviceModelScenarioDto[]) => {
    window.localStorage.setItem(customScenarioStorageKey, JSON.stringify(next));
    setCustomScenarios(next);
  };

  const toggleScenario = (
    scenario: Ct16DeviceModelScenarioDto,
    checked: boolean,
  ) => {
    if (checked) {
      onChange(
        value.some((item) => item.identifier === scenario.identifier)
          ? value
          : [...value, scenario],
      );
      return;
    }
    onChange(value.filter((item) => item.identifier !== scenario.identifier));
  };

  const addCustomScenario = () => {
    const name = customName.trim();
    const identifier = customIdentifier.trim().toLocaleLowerCase();
    if (!name || !identifier) {
      toast.error("请填写场景名称和场景标识符");
      return;
    }
    if (utf8ByteLength(name) > customScenarioNameMaxBytes) {
      toast.error("场景名称不能超过 32 字节");
      return;
    }
    if (identifier.length > customScenarioIdentifierMaxLength) {
      toast.error("场景标识符不能超过 32 个字符");
      return;
    }
    if (!isScenarioIdentifier(identifier)) {
      toast.error(
        "场景标识符需以小写字母开头，仅支持小写字母、数字、连字符和下划线",
      );
      return;
    }
    if (scenarios.some((scenario) => scenario.identifier === identifier)) {
      toast.error("场景标识符已存在");
      return;
    }
    const scenario: Ct16DeviceModelScenarioDto = {
      name,
      identifier,
      source: "custom",
    };
    try {
      saveCustomScenarios([...customScenarios, scenario]);
      onChange([...value, scenario]);
      setCustomName("");
      setCustomIdentifier("");
      setCustomOpen(false);
    } catch {
      toast.error("保存自定义场景失败");
    }
  };

  const removeCustomScenario = () => {
    if (!deleteScenario) return;
    try {
      saveCustomScenarios(
        customScenarios.filter(
          (scenario) => scenario.identifier !== deleteScenario.identifier,
        ),
      );
      onChange(
        value.filter(
          (scenario) => scenario.identifier !== deleteScenario.identifier,
        ),
      );
      setDeleteScenario(null);
      toast.success(`自定义场景「${deleteScenario.name}」已删除`);
    } catch {
      toast.error("删除自定义场景失败");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm">适用场景</Label>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || customScenarios.length === 0}
            onClick={() => setManagementOpen(true)}
          >
            管理
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => setCustomOpen(true)}
          >
            <Plus className="mr-1 size-3.5" />
            自定义场景
          </Button>
        </div>
      </div>
      <div className="grid gap-2 rounded-md border border-foreground/30 bg-muted/25 p-3 shadow-inner sm:grid-cols-2">
        {scenarios.map((scenario) => {
          const checked = value.some(
            (item) => item.identifier === scenario.identifier,
          );
          return (
            <label
              key={scenario.identifier}
              className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md border border-border/70 bg-background/70 px-2.5 py-2 text-sm transition-colors hover:border-primary/60 hover:bg-background"
            >
              <Checkbox
                checked={checked}
                disabled={disabled}
                className="border-foreground/55 bg-background data-[state=checked]:border-primary"
                onCheckedChange={(nextChecked) =>
                  toggleScenario(scenario, nextChecked === true)
                }
              />
              <span className="min-w-0 flex-1 truncate" title={scenario.name}>
                {scenario.name}
              </span>
              <span
                className="w-28 shrink-0 truncate font-mono text-[10px] text-muted-foreground"
                title={scenario.identifier}
              >
                {scenario.identifier}
              </span>
            </label>
          );
        })}
      </div>
      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="border-border/40 bg-card/95 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建自定义场景</DialogTitle>
            <DialogDescription>场景标识符创建后不可重复。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-scenario-name">场景名称</Label>
              <Input
                id="custom-scenario-name"
                value={customName}
                onChange={(event) =>
                  setCustomName(
                    limitUtf8Bytes(event.target.value, customScenarioNameMaxBytes),
                  )
                }
                maxLength={customScenarioNameMaxBytes}
                placeholder="例如 港口装卸场景（最多 32 字节）"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-scenario-identifier">场景标识符</Label>
              <Input
                id="custom-scenario-identifier"
                value={customIdentifier}
                onChange={(event) =>
                  setCustomIdentifier(
                    event.target.value.slice(0, customScenarioIdentifierMaxLength),
                  )
                }
                maxLength={customScenarioIdentifierMaxLength}
                placeholder="例如 port-handling（最多 32 字符）"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomOpen(false)}
            >
              取消
            </Button>
            <Button type="button" onClick={addCustomScenario}>
              创建并选择
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={managementOpen} onOpenChange={setManagementOpen}>
        <DialogContent className="border-border/40 bg-card/95 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>管理自定义场景</DialogTitle>
            <DialogDescription>
              删除后，将从当前模型的已选场景中移除。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {customScenarios.map((scenario) => (
              <div
                key={scenario.identifier}
                className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2"
              >
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="truncate text-sm font-medium" title={scenario.name}>
                    {scenario.name}
                  </div>
                  <div
                    className="truncate font-mono text-xs text-muted-foreground"
                    title={scenario.identifier}
                  >
                    {scenario.identifier}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => setDeleteScenario(scenario)}
                >
                  删除
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setManagementOpen(false)}
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(deleteScenario)}
        onOpenChange={(open) => !open && setDeleteScenario(null)}
      >
        <AlertDialogContent className="border-border/40 bg-card/95">
          <AlertDialogHeader>
            <AlertDialogTitle>删除自定义场景</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除「{deleteScenario?.name || ""}」吗？此操作无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={removeCustomScenario}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ModelIcon({
  model,
  className = "size-9",
}: {
  model: Ct16DeviceModelDto;
  className?: string;
}) {
  return model.iconUrl ? (
    <img
      src={model.iconUrl}
      alt="模型图标"
      className={`${className} object-cover`}
    />
  ) : (
    <Database className={`${className} text-primary`} />
  );
}

async function toModelIconFile(file: File): Promise<File> {
  if (file.type !== "image/png") throw new Error("仅支持 PNG 格式图标");
  const image = new Image();
  const source = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("图片读取失败"));
      image.src = source;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const size = Math.min(image.width, image.height);
    canvas
      .getContext("2d")
      ?.drawImage(
        image,
        (image.width - size) / 2,
        (image.height - size) / 2,
        size,
        size,
        0,
        0,
        400,
        400,
      );
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw new Error("图片裁切失败");
    return new File([blob], "model-icon.png", { type: "image/png" });
  } finally {
    URL.revokeObjectURL(source);
  }
}

const modelIconSize = 400;

function IconCropDialog({
  open,
  onClose,
  onSaved,
  initialFile = null,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (file: File) => void;
  initialFile?: File | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{
    pointerId: number;
    x: number;
    y: number;
    position: { x: number; y: number };
  } | null>(null);

  const clampPosition = (
    target: HTMLImageElement,
    scale: number,
    next: { x: number; y: number },
  ) => ({
    x: Math.min(
      0,
      Math.max(modelIconSize - target.naturalWidth * scale, next.x),
    ),
    y: Math.min(
      0,
      Math.max(modelIconSize - target.naturalHeight * scale, next.y),
    ),
  });

  const resetCrop = (target = image) => {
    if (!target) return;
    const scale = Math.max(
      modelIconSize / target.naturalWidth,
      modelIconSize / target.naturalHeight,
    );
    setBaseScale(scale);
    setZoom(1);
    setPosition({
      x: (modelIconSize - target.naturalWidth * scale) / 2,
      y: (modelIconSize - target.naturalHeight * scale) / 2,
    });
  };

  const loadFile = async (file: File) => {
    if (file.type !== "image/png") {
      toast.error("模型图标仅支持 PNG 格式");
      return;
    }
    const source = URL.createObjectURL(file);
    const nextImage = new Image();
    try {
      await new Promise<void>((resolve, reject) => {
        nextImage.onload = () => resolve();
        nextImage.onerror = () => reject(new Error("图片读取失败"));
        nextImage.src = source;
      });
      setImage(nextImage);
      const scale = Math.max(
        modelIconSize / nextImage.naturalWidth,
        modelIconSize / nextImage.naturalHeight,
      );
      setBaseScale(scale);
      setZoom(1);
      setPosition({
        x: (modelIconSize - nextImage.naturalWidth * scale) / 2,
        y: (modelIconSize - nextImage.naturalHeight * scale) / 2,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "读取模型图标失败");
    } finally {
      URL.revokeObjectURL(source);
    }
  };

  const scale = baseScale * zoom;

  useEffect(() => {
    if (!open) {
      setImage(null);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [open]);

  useEffect(() => {
    if (open && initialFile) void loadFile(initialFile);
  }, [open, initialFile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, modelIconSize, modelIconSize);
    if (image)
      context.drawImage(
        image,
        position.x,
        position.y,
        image.naturalWidth * scale,
        image.naturalHeight * scale,
      );
  }, [image, position, scale]);

  const handleZoom = (nextZoom: number) => {
    if (!image) return;
    const nextScale = baseScale * nextZoom;
    const center = modelIconSize / 2;
    setZoom(nextZoom);
    setPosition(
      clampPosition(image, nextScale, {
        x: center - (center - position.x) * (nextScale / scale),
        y: center - (center - position.y) * (nextScale / scale),
      }),
    );
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      position,
    });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!image || !dragStart || dragStart.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition(
      clampPosition(image, scale, {
        x:
          dragStart.position.x +
          ((event.clientX - dragStart.x) * modelIconSize) / rect.width,
        y:
          dragStart.position.y +
          ((event.clientY - dragStart.y) * modelIconSize) / rect.height,
      }),
    );
  };

  const saveCrop = async () => {
    const canvas = canvasRef.current;
    if (!image || !canvas) {
      toast.error("请先选择 PNG 模型图标");
      return;
    }
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) {
      toast.error("保存模型图标失败");
      return;
    }
    onSaved(new File([blob], "model-icon.png", { type: "image/png" }));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-border/40 bg-card/95">
        <DialogHeader>
          <DialogTitle>裁切模型图标</DialogTitle>
          <DialogDescription>仅保存 400×400 的 PNG 图标。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="mx-auto w-full max-w-xs overflow-hidden rounded-md border border-border/60 bg-muted/40">
            <canvas
              ref={canvasRef}
              width={modelIconSize}
              height={modelIconSize}
              className={`block aspect-square w-full ${image ? "cursor-move touch-none" : ""}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={() => setDragStart(null)}
              onPointerCancel={() => setDragStart(null)}
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,.png"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void loadFile(file);
            }}
          />
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-1 size-3.5" />
              选择图标
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!image}
              onClick={() => resetCrop()}
            >
              <RotateCcw className="mr-1 size-3.5" />
              重置
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <Label>缩放</Label>
              <span className="text-xs text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <Slider
              value={[zoom]}
              min={1}
              max={4}
              step={0.01}
              disabled={!image}
              onValueChange={([nextZoom]) => handleZoom(nextZoom)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            type="button"
            disabled={!image}
            onClick={() => void saveCrop()}
          >
            保存图标
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModelDetailDialog({
  model,
  open,
  onClose,
}: {
  model: Ct16DeviceModelDto | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!model) return null;

  const fields = [
    { label: "设备类型", value: model.deviceType || "-" },
    { label: "版本号", value: model.version || "-" },
    { label: "设备厂商", value: model.deviceVendor || "-" },
    { label: "设备型号", value: model.deviceModel || "-" },
    { label: "创建时间", value: <DateTimeText value={model.createdAt} /> },
  ];

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="flex h-[88vh] max-w-2xl flex-col overflow-hidden border-border/40 bg-card/95 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle className="flex flex-wrap items-center gap-2 break-all whitespace-normal">
            <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary/10">
              <ModelIcon model={model} className="size-full" />
            </div>
            <span className="min-w-0 break-all">{model.modelName}</span>
            <SyncStatus model={model} />
          </DialogTitle>
          <DialogDescription>
            {model.deviceType || "-"} · {model.version || "-"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea type="always" className={dialogScrollAreaClass}>
          <div className="space-y-5 px-6 py-4 pr-8 text-sm">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.label}>
                <p className="text-xs text-muted-foreground">{field.label}</p>
                <p className="mt-1 break-all font-medium">{field.value}</p>
              </div>
            ))}
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">模型文件</p>
              <p className="mt-1 break-all font-medium">
                {model.pluginFile || "-"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">模型描述</p>
            <p className="mt-1 whitespace-pre-wrap break-all leading-6">
              {model.description || "暂无描述"}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">标签</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {modelTags(model).length > 0 ? (
                modelTags(model).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px]">
                    <Tag className="mr-1 size-2.5" />
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">暂无标签</span>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">适用场景</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {model.applicableScenarios?.length > 0 ? (
                model.applicableScenarios.map((scenario) => (
                  <Badge
                    key={scenario.identifier}
                    variant="secondary"
                    className="text-[10px]"
                  >
                    {scenario.name}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">暂未选择</span>
              )}
            </div>
          </div>
          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0 border-t border-border/40 px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddModelDialog({
  open,
  models,
  onClose,
  onCreated,
}: {
  open: boolean;
  models: Ct16DeviceModelDto[];
  onClose: () => void;
  onCreated: (model: Ct16DeviceModelDto) => void;
}) {
  const modelFileInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [draftId, setDraftId] = useState("");
  const [modelName, setModelName] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [deviceVendor, setDeviceVendor] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");
  const [applicableScenarios, setApplicableScenarios] = useState<
    Ct16DeviceModelScenarioDto[]
  >([]);
  const [tags, setTags] = useState("");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [cropSource, setCropSource] = useState<File | null>(null);
  const [selectedIcon, setSelectedIcon] =
    useState<Ct16DeviceModelIconDto | null>(null);
  const [iconLibraryOpen, setIconLibraryOpen] = useState(false);
  const [iconEditorOpen, setIconEditorOpen] = useState(false);
  const [icons, setIcons] = useState<Ct16DeviceModelIconDto[]>([]);
  const [loadingIcons, setLoadingIcons] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [creating, setCreating] = useState(false);
  const uploadedIconPreviewURL = useMemo(
    () => (iconFile ? URL.createObjectURL(iconFile) : ""),
    [iconFile],
  );
  const visibleIconLibrary = useMemo(() => {
    const selected = selectedIcon && !iconFile ? [selectedIcon] : [];
    const remaining = icons.filter((icon) => icon.id !== selectedIcon?.id);
    return [...selected, ...remaining.slice(0, 2 - selected.length)];
  }, [iconFile, icons, selectedIcon]);
  const hasMoreIcons = icons.some(
    (icon) => !visibleIconLibrary.some((visible) => visible.id === icon.id),
  );

  useEffect(
    () => () => {
      if (uploadedIconPreviewURL) URL.revokeObjectURL(uploadedIconPreviewURL);
    },
    [uploadedIconPreviewURL],
  );
  useEffect(() => {
    if (!open) return;
    setLoadingIcons(true);
    void getDeviceModelIcons()
      .then(setIcons)
      .catch(() => setIcons([]))
      .finally(() => setLoadingIcons(false));
  }, [open]);

  const reset = () => {
    setFileName("");
    setDraftId("");
    setModelName("");
    setDeviceType("");
    setDeviceVendor("");
    setDeviceModel("");
    setVersion("");
    setDescription("");
    setApplicableScenarios([]);
    setTags("");
    setIconFile(null);
    setCropSource(null);
    setSelectedIcon(null);
    setIconLibraryOpen(false);
    setIconEditorOpen(false);
    void getDeviceModelIcons()
      .then(setIcons)
      .catch(() => setIcons([]));
    setIconEditorOpen(false);
  };

  const close = () => {
    if (draftId) void cancelDeviceModelImport(draftId);
    reset();
    onClose();
  };

  const applyInspectedModel = (
    draftId: string,
    model: Ct16DeviceModelDto,
  ) => {
    setFileName(model.pluginFile);
    setDraftId(draftId);
    setModelName(model.modelName);
    setDeviceType(model.deviceType);
    setDeviceVendor(model.deviceVendor);
    setDeviceModel(model.deviceModel);
    setVersion(model.version);
    setDescription(model.description);
    setApplicableScenarios(model.applicableScenarios ?? []);
    setTags(model.tags.join(", "));
    setIconFile(null);
    setSelectedIcon(
      model.iconId && model.iconUrl
        ? { id: model.iconId, url: model.iconUrl, refCount: 0 }
        : null,
    );
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    setInspecting(true);
    try {
      const result = await inspectDeviceModel(file);
      if (draftId) void cancelDeviceModelImport(draftId);
      applyInspectedModel(result.draftId, result.model);
      toast.success("模型文件解析成功，请确认展示信息");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "解析模型文件失败");
    } finally {
      setInspecting(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draftId) {
      toast.error("请先选择并解析模型文件");
      return;
    }
    if (!modelName.trim()) {
      toast.error("模型名称不能为空");
      return;
    }
    if (utf8ByteLength(modelName.trim()) > 64) {
      toast.error("模型名称不能超过 64 字节");
      return;
    }
    if (utf8ByteLength(description.trim()) > 1024) {
      toast.error("模型描述不能超过 1024 字节");
      return;
    }
    const normalizedModelName = modelName.trim().toLocaleLowerCase();
    const conflictingModel = models.find(
      (model) =>
        model.modelName.trim().toLocaleLowerCase() === normalizedModelName &&
        model.pluginFile !== fileName,
    );
    if (conflictingModel) {
      toast.error("设备模型已存在，不能重复创建");
      return;
    }
    setCreating(true);
    try {
      let model = await createDeviceModel({
        draftId,
        modelName: modelName.trim(),
        description: description.trim(),
        applicableScenarios,
        tags: splitTags(tags),
      });
      if (iconFile)
        model = await uploadDeviceModelIcon(
          model.id,
          await toModelIconFile(iconFile),
        );
      else if (selectedIcon)
        model = await selectDeviceModelIcon(model.id, selectedIcon.id);
      setDraftId("");
      onCreated(model);
      toast.success(
        `模型「${model.modelName}」已创建`,
      );
      reset();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "导入模型失败");
    } finally {
      setCreating(false);
    }
  };

  const openIconLibrary = async () => {
    setIconLibraryOpen(true);
    setLoadingIcons(true);
    try {
      setIcons(await getDeviceModelIcons());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "读取图标库失败");
    } finally {
      setLoadingIcons(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[88vh] max-w-2xl flex-col overflow-hidden border-border/40 bg-card/95 p-0"
        >
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-primary" />
              创建设备模型
            </DialogTitle>
            <DialogDescription>
              选择 DSDK .so
              协议驱动后，系统会自动读取其中的设备三元组，再由当前页面补充模型信息。
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <ScrollArea
              type="always"
              className="min-h-0 flex-1 overflow-hidden"
            >
              <div className="space-y-4 px-6 py-4 pr-8">
                <div className="space-y-2">
                  <Label className="text-sm">协议驱动文件</Label>
                  <div className="flex gap-2">
                    <Input
                      value={fileName}
                      readOnly
                      tabIndex={-1}
                      placeholder="请选择 DSDK 模型开发工程生成的协议驱动文件。"
                      className={`h-9 min-w-0 flex-1 text-sm ${readOnlyFieldClass}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 shrink-0"
                      disabled={inspecting || creating}
                      onClick={() => modelFileInputRef.current?.click()}
                    >
                      {inspecting ? (
                        <Loader2 className="mr-1 size-4 animate-spin" />
                      ) : (
                        <FileUp className="mr-1 size-4" />
                      )}
                      选择模型文件
                    </Button>
                    <input
                      ref={modelFileInputRef}
                      type="file"
                      accept=".so"
                      className="hidden"
                      onChange={(event) => {
                        void handleFileChange(event.target.files?.[0] ?? null);
                        event.target.value = "";
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">模型图标</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="使用默认图标"
                      className={`size-14 border-foreground/30 bg-muted/40 ${!iconFile && !selectedIcon ? "border-primary ring-1 ring-primary" : ""}`}
                      onClick={() => {
                        setIconFile(null);
                        setSelectedIcon(null);
                      }}
                    >
                      <Database className="size-5 text-primary" />
                    </Button>
                    {uploadedIconPreviewURL && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="待保存模型图标"
                        className="size-14 overflow-hidden border-primary p-0 ring-1 ring-primary"
                      >
                        <img
                          src={uploadedIconPreviewURL}
                          alt="待保存模型图标"
                          className="size-full object-cover"
                        />
                      </Button>
                    )}
                    {visibleIconLibrary.map((icon) => (
                      <Button
                        key={icon.id}
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="选择已有模型图标"
                        className={`size-14 overflow-hidden p-0 ${selectedIcon?.id === icon.id ? "border-primary ring-1 ring-primary" : ""}`}
                        onClick={() => {
                          setSelectedIcon(icon);
                          setIconFile(null);
                        }}
                      >
                        <img
                          src={icon.url}
                          alt="已有模型图标"
                          className="size-full object-cover"
                        />
                      </Button>
                    ))}
                    {hasMoreIcons && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-14"
                        aria-label="查看更多模型图标"
                        onClick={() => void openIconLibrary()}
                      >
                        <MoreHorizontal className="size-5" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={inspecting}
                      onClick={() => iconInputRef.current?.click()}
                    >
                      <ImagePlus className="mr-1 size-3.5" />
                      上传图标
                    </Button>
                    <input
                      ref={iconInputRef}
                      type="file"
                      accept="image/png,.png"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        event.target.value = "";
                        if (file) {
                          setCropSource(file);
                          setIconEditorOpen(true);
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">模型名称</Label>
                  <Input
                    value={modelName}
                    onChange={(event) =>
                      setModelName(limitUtf8Bytes(event.target.value, 64))
                    }
                    disabled={!draftId || inspecting}
                    placeholder="输入设备模型名称"
                    maxLength={64}
                    className={`h-9 ${editableFieldClass}`}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm">模型类型（只读）</Label>
                    <Input
                      value={deviceType}
                      readOnly
                      tabIndex={-1}
                      className={`h-9 ${readOnlyFieldClass}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">版本号（只读）</Label>
                    <Input
                      value={version}
                      readOnly
                      tabIndex={-1}
                      className={`h-9 ${readOnlyFieldClass}`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm">设备厂商（只读）</Label>
                    <Input
                      value={deviceVendor}
                      readOnly
                      tabIndex={-1}
                      className={`h-9 ${readOnlyFieldClass}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">设备型号（只读）</Label>
                    <Input
                      value={deviceModel}
                      readOnly
                      tabIndex={-1}
                      className={`h-9 ${readOnlyFieldClass}`}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">模型描述</Label>
                  <Textarea
                    value={description}
                    onChange={(event) =>
                      setDescription(limitUtf8Bytes(event.target.value, 1024))
                    }
                    disabled={!draftId || inspecting}
                    placeholder="输入设备模型描述"
                    maxLength={1024}
                    className={`min-h-20 max-h-48 resize-y whitespace-pre-wrap break-all text-sm ${editableFieldClass}`}
                  />
                </div>
                <ScenarioSelectionField
                  value={applicableScenarios}
                  onChange={setApplicableScenarios}
                  disabled={!draftId || inspecting}
                />
                <div className="space-y-2">
                  <Label className="text-sm">标签（逗号分隔）</Label>
                  <Input
                    value={tags}
                    onChange={(event) => setTags(limitTagInput(event.target.value))}
                    disabled={!draftId || inspecting}
                    placeholder="可输入多个标签，使用逗号分隔"
                    maxLength={164}
                    className={`h-9 ${editableFieldClass}`}
                  />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="shrink-0 border-t border-border/40 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={close}
                disabled={creating}
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={!draftId || inspecting || creating}
              >
                {creating && <Loader2 className="mr-1 size-4 animate-spin" />}
                确定
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <IconCropDialog
        open={iconEditorOpen}
        initialFile={cropSource}
        onClose={() => {
          setIconEditorOpen(false);
          setCropSource(null);
        }}
        onSaved={(file) => {
          setIconFile(file);
          setSelectedIcon(null);
          setCropSource(null);
        }}
      />
      <Dialog open={iconLibraryOpen} onOpenChange={setIconLibraryOpen}>
        <DialogContent className="max-w-xl border-border/40 bg-card/95">
          <DialogHeader>
            <DialogTitle>选择模型图标</DialogTitle>
            <DialogDescription>
              图标库中的图标可被多个设备模型共用。
            </DialogDescription>
          </DialogHeader>
          {loadingIcons ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              读取图标库中…
            </div>
          ) : icons.length ? (
            <div className="grid max-h-[50vh] grid-cols-4 gap-3 overflow-y-auto pr-1 sm:grid-cols-5">
              {icons.map((icon) => (
                <Button
                  key={icon.id}
                  type="button"
                  variant="outline"
                  className={`h-auto flex-col gap-1.5 p-2 ${selectedIcon?.id === icon.id ? "border-primary" : ""}`}
                  onClick={() => {
                    setSelectedIcon(icon);
                    setIconFile(null);
                    setIconLibraryOpen(false);
                  }}
                >
                  <img
                    src={icon.url}
                    alt="图标库图标"
                    className="size-14 rounded object-cover"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    已使用 {icon.refCount} 次
                  </span>
                </Button>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              图标库中暂无可用图标
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIconLibraryOpen(false)}
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type BatchImportStatus =
  | "pending"
  | "duplicate"
  | "importing"
  | "success"
  | "skipped"
  | "error";
type BatchImportItem = Ct16DeviceModelBatchInspectItemDto & {
  status: BatchImportStatus;
};

function LocalImportDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (model: Ct16DeviceModelDto) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [items, setItems] = useState<BatchImportItem[]>([]);
  const [inspecting, setInspecting] = useState(false);
  const [importing, setImporting] = useState(false);

  const markBatchDuplicates = (
    sourceItems: BatchImportItem[],
  ): BatchImportItem[] => {
    const counts = new Map<string, number>();
    sourceItems.forEach((item) => {
      const triad = item.model ? deviceModelTriadKey(item.model) : null;
      if (triad) counts.set(triad, (counts.get(triad) ?? 0) + 1);
    });
    return sourceItems.map((item) => {
      if (!item.error && item.model && !deviceModelTriadKey(item.model)) {
        return {
          ...item,
          status: "error",
          error: "无法获取设备三元组，不能导入",
        };
      }
      const triad = item.model ? deviceModelTriadKey(item.model) : null;
      const duplicated = Boolean(triad && (counts.get(triad) ?? 0) > 1);
      if (
        duplicated &&
        (item.status === "pending" ||
          item.status === "duplicate")
      ) {
        return {
          ...item,
          status: "duplicate",
          error: `导入列表中存在相同设备三元组「${deviceModelTriadText(item.model!)}」，请移除重复模型后再导入`,
        };
      }
      if (!duplicated && item.status === "duplicate") {
        return { ...item, status: "pending", error: undefined };
      }
      return item;
    });
  };

  const clearDrafts = async (sourceItems: BatchImportItem[]) => {
    await Promise.all(
      sourceItems
        .filter(
          (item) =>
            item.draftId &&
            item.status !== "success" &&
            item.status !== "skipped",
        )
        .map((item) => cancelDeviceModelImport(item.draftId!)),
    );
  };

  const close = () => {
    void clearDrafts(items);
    setFiles([]);
    setItems([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  const selectPackages = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
		if (selectedFiles.some((file) => file.size > DEVICE_MODEL_PACKAGE_MAX_BYTES)) {
			toast.error("单个模型 ZIP 不能超过 64 MiB");
			return;
		}
    await clearDrafts(items);
    setFiles(selectedFiles);
    setItems([]);
    setInspecting(true);
    try {
      const response = await inspectDeviceModelPackages(selectedFiles);
      setItems(
        markBatchDuplicates(
          response.items.map((item) => ({
            ...item,
            status: item.error ? "error" : "pending",
            error: item.error,
          })),
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "解析模型包失败");
    } finally {
      setInspecting(false);
    }
  };

  const setItemStatus = (
    index: number,
    status: BatchImportStatus,
    error?: string,
  ) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              status,
              error:
                error ??
                (status === "pending" ||
                status === "duplicate"
                  ? item.error
                  : undefined),
            }
          : item,
      ),
    );
  };

  const removeItem = async (index: number) => {
    const item = items[index];
    if (item?.draftId) await cancelDeviceModelImport(item.draftId);
    setItems((current) =>
      markBatchDuplicates(
        current.filter((_, itemIndex) => itemIndex !== index),
      ),
    );
  };

  const processQueue = async (queue: BatchImportItem[]) => {
    setImporting(true);
    for (let index = 0; index < queue.length; index++) {
      const item = queue[index];
      if (
        !item.draftId ||
        item.status !== "pending"
      )
        continue;
      setItemStatus(index, "importing");
      try {
        const model = await createDeviceModel({
          draftId: item.draftId,
          modelName: item.model.modelName,
          description: item.model.description,
          applicableScenarios: item.model.applicableScenarios ?? [],
          tags: item.model.tags,
        });
        onCreated(model);
        setItemStatus(index, "success");
      } catch (error) {
        setItemStatus(
          index,
          "error",
          error instanceof Error ? error.message : "导入模型失败",
        );
      }
    }
    setImporting(false);
    toast.success("模型包导入完成");
  };

  const statusText: Record<BatchImportStatus, string> = {
    pending: "等待导入",
    duplicate: "存在重复",
    importing: "导入中",
    success: "已导入",
    skipped: "已跳过",
    error: "导入失败",
  };
  const completedCount = items.filter((item) =>
    ["success", "skipped", "error"].includes(item.status),
  ).length;
  const successCount = items.filter((item) => item.status === "success").length;
  const skippedCount = items.filter((item) => item.status === "skipped").length;
  const errorCount = items.filter((item) => item.status === "error").length;
  const importFinished =
    items.length > 0 &&
    completedCount === items.length &&
    !importing &&
    !inspecting;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => !nextOpen && !importing && close()}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[88vh] max-w-2xl flex-col overflow-hidden border-border/40 bg-card/95"
        >
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Archive className="size-5 text-primary" />
              本地导入设备模型
            </DialogTitle>
            <DialogDescription>
              选择一个或多个 ZIP 模型包，支持单模型包和批量导出总包。
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-0 items-center gap-2">
              <Input
                value={files.length ? `已选择 ${files.length} 个 ZIP 文件` : ""}
                readOnly
                placeholder="请选择要导入的 ZIP 模型包"
                className={`h-9 min-w-0 flex-1 text-sm ${readOnlyFieldClass}`}
              />
              <Button
                type="button"
                variant="outline"
                className="h-9 shrink-0"
                disabled={inspecting || importing}
                onClick={() => fileInputRef.current?.click()}
              >
                {inspecting ? (
                  <Loader2 className="mr-1 size-4 animate-spin" />
                ) : (
                  <FileUp className="mr-1 size-4" />
                )}
                选择文件
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".zip,application/zip"
                className="hidden"
                onChange={(event) =>
                  void selectPackages(Array.from(event.target.files ?? []))
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              导入信息以 ZIP 内的配置文件为准，导入过程中不支持修改。
            </p>
            {items.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>共识别 {items.length} 个模型</span>
                  {importing && (
                    <span>
                      已处理 {completedCount} / {items.length}
                    </span>
                  )}
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {items.map((item, index) => (
                    <div
                      key={`${item.source}-${index}`}
                      className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm ${item.status === "duplicate" ? "border-destructive/60 bg-destructive/5" : "border-border/50"}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {item.model?.modelName || item.source}
                        </div>
                        <div
                          className={`truncate text-xs ${item.status === "duplicate" ? "text-destructive" : "text-muted-foreground"}`}
                        >
                          {item.error || item.source}
                        </div>
                      </div>
                      <span
                        className={
                          item.status === "error" ||
                          item.status === "duplicate"
                            ? "shrink-0 text-xs text-destructive"
                            : "shrink-0 text-xs text-muted-foreground"
                        }
                      >
                        {item.status === "importing" && (
                          <Loader2 className="mr-1 inline size-3 animate-spin" />
                        )}
                        {statusText[item.status]}
                      </span>
                      {!importing &&
                        (item.status === "pending" ||
                          item.status === "duplicate" ||
                          item.status === "error") && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => void removeItem(index)}
                            aria-label={`移除模型 ${item.model?.modelName || item.source}`}
                          >
                            <X className="size-4" />
                          </Button>
                        )}
                    </div>
                  ))}
                </div>
                {!importing && completedCount > 0 && (
                  <div className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                    导入结果：成功 {successCount} 个，跳过 {skippedCount}{" "}
                    个，失败 {errorCount} 个。
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0">
            {importFinished ? (
              <Button type="button" onClick={close}>
                确定
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={close}
                  disabled={importing}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  onClick={() => void processQueue(items)}
                  disabled={
                    items.some((item) => item.status === "duplicate") ||
                    items.every(
                      (item) =>
                        !item.draftId ||
                        item.status !== "pending",
                    ) ||
                    inspecting ||
                    importing
                  }
                >
                  {importing && (
                    <Loader2 className="mr-1 size-4 animate-spin" />
                  )}
                  开始导入
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LocalExportDialog({
  models,
  open,
  onClose,
}: {
  models: Ct16DeviceModelDto[];
  open: boolean;
  onClose: () => void;
}) {
  const [selectedIDs, setSelectedIDs] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) {
      setSelectedIDs([]);
      setExporting(false);
      setProgress(0);
    }
  }, [open]);

  const toggleModel = (modelID: string, checked: boolean) => {
    setSelectedIDs((ids) =>
      checked ? [...ids, modelID] : ids.filter((id) => id !== modelID),
    );
  };

  const selectAll = () => setSelectedIDs(models.map((model) => model.id));

  const invertSelection = () =>
    setSelectedIDs(
      models
        .filter((model) => !selectedIDs.includes(model.id))
        .map((model) => model.id),
    );

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportSelected = async () => {
    const selectedModels = models.filter((model) =>
      selectedIDs.includes(model.id),
    );
    if (selectedModels.length === 0) {
      toast.error("请至少选择一个设备模型");
      return;
    }
    setExporting(true);
    setProgress(15);
    const timer = window.setInterval(
      () => setProgress((value) => Math.min(value + 10, 85)),
      350,
    );
    try {
      if (selectedModels.length === 1) {
        const model = selectedModels[0];
        const blob = await exportDeviceModel(model.id);
        download(blob, `${model.pluginFile.replace(/\.so$/, "")}.zip`);
      } else {
        const result = await exportDeviceModels(
          selectedModels.map((model) => model.id),
        );
        download(result.blob, result.filename);
      }
      setProgress(100);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "导出设备模型失败");
    } finally {
      window.clearInterval(timer);
      window.setTimeout(() => {
        setExporting(false);
        setProgress(0);
      }, 300);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && !exporting && onClose()}
    >
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto border-border/40 bg-card/95 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="size-5 text-primary" />
            本地导出设备模型
          </DialogTitle>
          <DialogDescription>
            单选下载独立模型包；多选下载包含多个独立模型包的总
            ZIP，后续可直接用于批量导入。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              已选择 {selectedIDs.length} 个模型
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={selectAll}
                disabled={exporting || models.length === 0}
              >
                全选
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={invertSelection}
                disabled={exporting || models.length === 0}
              >
                反选
              </Button>
            </div>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {models.map((model) => {
              const checked = selectedIDs.includes(model.id);
              return (
                <label
                  key={model.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-border/50 px-3 py-2.5 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) =>
                      toggleModel(model.id, value === true)
                    }
                    disabled={exporting}
                    className="border-primary bg-background shadow-sm"
                  />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="truncate font-medium">
                      {model.modelName}
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="truncate">
                        类型：{model.deviceType || "-"}
                      </span>
                      <span className="truncate">
                        厂商：{model.deviceVendor || "-"}
                      </span>
                      <span className="truncate">
                        型号：{model.deviceModel || "-"}
                      </span>
                      <span className="whitespace-nowrap">
                        创建时间：
                        <DateTimeText value={model.createdAt} />
                      </span>
                    </div>
                  </div>
                </label>
              );
            })}
            {models.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                暂无可导出的设备模型
              </div>
            )}
          </div>
          {exporting && (
            <div className="space-y-2 rounded-md bg-muted/60 p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                正在生成导出包，请稍候…
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={exporting}
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={() => void exportSelected()}
            disabled={exporting || models.length === 0}
          >
            {exporting && <Loader2 className="mr-1 size-4 animate-spin" />}
            导出所选模型
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditModelDialog({
  model,
  onClose,
  onSaved,
}: {
  model: Ct16DeviceModelDto | null;
  onClose: () => void;
  onSaved: (model: Ct16DeviceModelDto) => void;
}) {
  const modelFileInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const [modelName, setModelName] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [version, setVersion] = useState("");
  const [deviceVendor, setDeviceVendor] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [description, setDescription] = useState("");
  const [applicableScenarios, setApplicableScenarios] = useState<
    Ct16DeviceModelScenarioDto[]
  >([]);
  const [tags, setTags] = useState("");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [cropSource, setCropSource] = useState<File | null>(null);
  const [selectedIcon, setSelectedIcon] =
    useState<Ct16DeviceModelIconDto | null>(null);
  const [removeIcon, setRemoveIcon] = useState(false);
  const [iconLibraryOpen, setIconLibraryOpen] = useState(false);
  const [iconEditorOpen, setIconEditorOpen] = useState(false);
  const [icons, setIcons] = useState<Ct16DeviceModelIconDto[]>([]);
  const [loadingIcons, setLoadingIcons] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replacementDraftId, setReplacementDraftId] = useState("");
  const [replacementFileName, setReplacementFileName] = useState("");
  const [inspectingReplacement, setInspectingReplacement] = useState(false);

  const localIconURL = useMemo(
    () => (iconFile ? URL.createObjectURL(iconFile) : ""),
    [iconFile],
  );

  useEffect(
    () => () => {
      if (localIconURL) URL.revokeObjectURL(localIconURL);
    },
    [localIconURL],
  );

  useEffect(() => {
    setModelName(model?.modelName ?? "");
    setDeviceType(model?.deviceType ?? "");
    setVersion(model?.version ?? "");
    setDeviceVendor(model?.deviceVendor ?? "");
    setDeviceModel(model?.deviceModel ?? "");
    setDescription(model?.description ?? "");
    setApplicableScenarios(model?.applicableScenarios ?? []);
    setTags(model ? modelTags(model).join(", ") : "");
    setIconFile(null);
    setCropSource(null);
    setSelectedIcon(null);
    setRemoveIcon(false);
    setReplacementDraftId("");
    setReplacementFileName("");
    setInspectingReplacement(false);
    setIconLibraryOpen(false);
    void getDeviceModelIcons()
      .then(setIcons)
      .catch(() => setIcons([]));
  }, [model]);

  const openIconLibrary = async () => {
    setIconLibraryOpen(true);
    setLoadingIcons(true);
    try {
      setIcons(await getDeviceModelIcons());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "读取图标库失败");
    } finally {
      setLoadingIcons(false);
    }
  };

  const close = () => {
    if (replacementDraftId) void cancelDeviceModelImport(replacementDraftId);
    setReplacementDraftId("");
    setReplacementFileName("");
    onClose();
  };

  const inspectReplacement = async (file: File | null) => {
    if (!file || !model) return;
    if (replacementDraftId) await cancelDeviceModelImport(replacementDraftId);
    setInspectingReplacement(true);
    try {
      const result = await inspectDeviceModelReplacement(model.id, file);
      setReplacementDraftId(result.draftId);
      setReplacementFileName(file.name);
      setModelName(result.model.modelName);
      setVersion(result.model.version);
      setDescription(result.model.description);
      setApplicableScenarios(result.model.applicableScenarios ?? []);
      setTags(result.model.tags.join(", "));
      toast.success("新模型文件解析成功，已合并模型信息");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "解析替换模型文件失败");
    } finally {
      setInspectingReplacement(false);
    }
  };

  if (!model) return null;

  const availableIcons = icons.filter((icon) => icon.id !== model.iconId);

  const save = async () => {
    if (!modelName.trim()) {
      toast.error("模型名称不能为空");
      return;
    }
    if (utf8ByteLength(modelName.trim()) > 64) {
      toast.error("模型名称不能超过 64 字节");
      return;
    }
    if (utf8ByteLength(description.trim()) > 1024) {
      toast.error("模型描述不能超过 1024 字节");
      return;
    }
    setSaving(true);
    try {
      let updated = replacementDraftId
        ? await replaceDeviceModel(model.id, {
            draftId: replacementDraftId,
            modelName: modelName.trim(),
            description: description.trim(),
            applicableScenarios,
            tags: splitTags(tags),
          })
        : await updateDeviceModel(model.id, {
            modelName: modelName.trim(),
            description: description.trim(),
            applicableScenarios,
            tags: splitTags(tags),
          });
      if (iconFile) {
        updated = await uploadDeviceModelIcon(
          model.id,
          await toModelIconFile(iconFile),
        );
      } else if (selectedIcon) {
        updated = await selectDeviceModelIcon(model.id, selectedIcon.id);
      } else if (removeIcon && model.iconId) {
        updated = await removeDeviceModelIcon(model.id);
      }
      onSaved(updated);
      toast.success(`模型「${updated.modelName}」已${replacementDraftId ? "替换并保存" : "保存"}`);
      setReplacementDraftId("");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存模型失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(model)} onOpenChange={(open) => !open && close()}>
      <DialogContent className="flex h-[88vh] max-w-2xl flex-col overflow-hidden border-border/40 bg-card/95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-5 text-primary" />
            编辑设备模型
          </DialogTitle>
          <DialogDescription>
            可替换协议驱动文件，但新文件的设备三元组必须与当前模型一致。
          </DialogDescription>
        </DialogHeader>
        <ScrollArea type="always" className="min-h-0 flex-1">
          <div className="space-y-4 px-1 pb-8 pr-4">
            <div className="space-y-2">
              <Label className="text-sm">模型协议驱动文件</Label>
              <div className="flex gap-2">
                <Input
                  value={replacementFileName || model.pluginFile}
                  readOnly
                  tabIndex={-1}
                  className={`h-9 min-w-0 flex-1 text-sm ${readOnlyFieldClass}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 shrink-0"
                  disabled={saving || inspectingReplacement}
                  onClick={() => modelFileInputRef.current?.click()}
                >
                  {inspectingReplacement ? (
                    <Loader2 className="mr-1 size-4 animate-spin" />
                  ) : (
                    <FileUp className="mr-1 size-4" />
                  )}
                  替换模型文件
                </Button>
                <input
                  ref={modelFileInputRef}
                  type="file"
                  accept=".so"
                  className="hidden"
                  onChange={(event) => {
                    void inspectReplacement(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                />
              </div>
              {replacementDraftId && (
                <p className="text-xs text-primary">
                  已读取新文件信息，点击“保存”后才会覆盖设备中的旧模型文件。
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">模型图标</Label>
              <div className="flex flex-wrap items-center gap-2">
                <div className="group relative size-14">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-14 overflow-hidden border-primary p-0 ring-1 ring-primary"
                    aria-label="当前模型图标"
                  >
                    {selectedIcon ? (
                      <img
                        src={selectedIcon.url}
                        alt="当前模型图标"
                        className="size-full object-cover"
                      />
                    ) : localIconURL ? (
                      <img
                        src={localIconURL}
                        alt="待保存模型图标"
                        className="size-full object-cover"
                      />
                    ) : removeIcon ? (
                      <Database className="size-5 text-primary" />
                    ) : (
                      <ModelIcon model={model} className="size-full" />
                    )}
                  </Button>
                  {(model.iconUrl || iconFile || selectedIcon) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 z-10 size-5 rounded-full border border-background bg-background/85 p-0 text-destructive opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                      aria-label="移除当前模型图标"
                      disabled={saving}
                      onClick={() => {
                        setIconFile(null);
                        setSelectedIcon(null);
                        setRemoveIcon(true);
                      }}
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
                {availableIcons.slice(0, 2).map((icon) => (
                  <Button
                    key={icon.id}
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-14 overflow-hidden p-0"
                    onClick={() => {
                      setSelectedIcon(icon);
                      setIconFile(null);
                      setRemoveIcon(false);
                    }}
                  >
                    <img
                      src={icon.url}
                      alt="已有模型图标"
                      className="size-full object-cover"
                    />
                  </Button>
                ))}
                {availableIcons.length > 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-14"
                    onClick={() => void openIconLibrary()}
                  >
                    <MoreHorizontal className="size-5" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => iconInputRef.current?.click()}
                >
                  <ImagePlus className="mr-1 size-3.5" />
                  上传图标
                </Button>
                <input
                  ref={iconInputRef}
                  type="file"
                  accept="image/png,.png"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    event.target.value = "";
                    if (file) {
                      setCropSource(file);
                      setIconEditorOpen(true);
                    }
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                图标修改仅作预览，点击保存后才会生效。
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">模型名称</Label>
              <Input
                value={modelName}
                onChange={(event) =>
                  setModelName(limitUtf8Bytes(event.target.value, 64))
                }
                placeholder="输入设备模型名称"
                maxLength={64}
                className={`h-9 ${editableFieldClass}`}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm">设备类型（只读）</Label>
                <Input
                  value={deviceType}
                  readOnly
                  tabIndex={-1}
                  className={`h-9 ${readOnlyFieldClass}`}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">版本号（只读）</Label>
                <Input
                  value={version}
                  readOnly
                  tabIndex={-1}
                  className={`h-9 ${readOnlyFieldClass}`}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm">设备厂商（只读）</Label>
                <Input
                  value={deviceVendor}
                  readOnly
                  tabIndex={-1}
                  className={`h-9 ${readOnlyFieldClass}`}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">设备型号（只读）</Label>
                <Input
                  value={deviceModel}
                  readOnly
                  tabIndex={-1}
                  className={`h-9 ${readOnlyFieldClass}`}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">描述信息</Label>
              <Textarea
                value={description}
                onChange={(event) =>
                  setDescription(limitUtf8Bytes(event.target.value, 1024))
                }
                maxLength={1024}
                className={`min-h-24 max-h-48 resize-y whitespace-pre-wrap break-all text-sm ${editableFieldClass}`}
              />
            </div>
            <ScenarioSelectionField
              value={applicableScenarios}
              onChange={setApplicableScenarios}
            />
            <div className="space-y-2">
              <Label className="text-sm">标签（逗号分隔）</Label>
              <Input
                value={tags}
                onChange={(event) => setTags(limitTagInput(event.target.value))}
                placeholder="可输入多个标签，使用逗号分隔"
                maxLength={164}
                className={`h-9 ${editableFieldClass}`}
              />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={close}
            disabled={saving}
          >
            取消
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="mr-1 size-4 animate-spin" />}保存
          </Button>
        </DialogFooter>
      </DialogContent>
      <Dialog open={iconLibraryOpen} onOpenChange={setIconLibraryOpen}>
        <DialogContent className="max-w-xl border-border/40 bg-card/95">
          <DialogHeader>
            <DialogTitle>选择模型图标</DialogTitle>
            <DialogDescription>
              选择后仅预览，保存设备模型时才会应用。
            </DialogDescription>
          </DialogHeader>
          {loadingIcons ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              读取图标库中…
            </div>
          ) : icons.length ? (
            <div className="grid max-h-[50vh] grid-cols-4 gap-3 overflow-y-auto pr-1 sm:grid-cols-5">
              {icons.map((icon) => (
                <Button
                  key={icon.id}
                  type="button"
                  variant="outline"
                  className={`h-auto flex-col gap-1.5 p-2 ${selectedIcon?.id === icon.id ? "border-primary" : ""}`}
                  onClick={() => {
                    setSelectedIcon(icon);
                    setIconFile(null);
                    setRemoveIcon(false);
                    setIconLibraryOpen(false);
                  }}
                >
                  <img
                    src={icon.url}
                    alt="图标库图标"
                    className="size-14 rounded object-cover"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    已使用 {icon.refCount} 次
                  </span>
                </Button>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              图标库中暂无可用图标
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIconLibraryOpen(false)}
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <IconCropDialog
        open={iconEditorOpen}
        initialFile={cropSource}
        onClose={() => {
          setIconEditorOpen(false);
          setCropSource(null);
        }}
        onSaved={(file) => {
          setIconFile(file);
          setSelectedIcon(null);
          setRemoveIcon(false);
          setCropSource(null);
        }}
      />
    </Dialog>
  );
}

const serialOptions = [
  "1200",
  "2400",
  "4800",
  "9600",
  "19200",
  "38400",
  "57600",
  "115200",
];

type InterfaceConfigField = {
  label: string;
  kind: "number" | "text" | "select";
  min?: number;
  max?: number;
  options?: string[];
  optional?: boolean;
};

const interfaceConfigDefinitions: Record<string, InterfaceConfigField[]> = {
  DI: [
    { label: "槽位号", kind: "number" },
    { label: "通道号", kind: "number" },
  ],
  DO: [
    { label: "槽位号", kind: "number" },
    { label: "通道号", kind: "number" },
  ],
  CI: [
    { label: "槽位号", kind: "number" },
    { label: "通道号", kind: "number" },
  ],
  CO: [
    { label: "槽位号", kind: "number" },
    { label: "通道号", kind: "number" },
  ],
  VI: [
    { label: "槽位号", kind: "number" },
    { label: "通道号", kind: "number" },
  ],
  VO: [
    { label: "槽位号", kind: "number" },
    { label: "通道号", kind: "number" },
  ],
  RS485: [
    { label: "槽位号", kind: "number" },
    { label: "通道号", kind: "number" },
    { label: "波特率", kind: "select", options: serialOptions },
    { label: "数据位", kind: "select", options: ["5", "6", "7", "8"] },
    { label: "停止位", kind: "select", options: ["1", "2"] },
    { label: "校验位", kind: "select", options: ["N", "E", "O"] },
    { label: "设备地址(可选)", kind: "number", min: 0, max: 255, optional: true },
  ],
  RS232: [
    { label: "槽位号", kind: "number" },
    { label: "通道号", kind: "number" },
    { label: "波特率", kind: "select", options: serialOptions },
    { label: "数据位", kind: "select", options: ["5", "6", "7", "8"] },
    { label: "停止位", kind: "select", options: ["1", "2"] },
    { label: "校验位", kind: "select", options: ["N", "E", "O"] },
    { label: "设备地址(可选)", kind: "number", min: 0, max: 255, optional: true },
  ],
  UDP: [
    { label: "IPv4 地址", kind: "text" },
    { label: "端口号", kind: "number", min: 1, max: 65535 },
    { label: "设备地址(可选)", kind: "number", min: 0, max: 255, optional: true },
  ],
  TCP_CLIENT: [
    { label: "远端 IPv4 地址", kind: "text" },
    { label: "端口号", kind: "number", min: 1, max: 65535 },
    { label: "设备地址(可选)", kind: "number", min: 0, max: 255, optional: true },
  ],
  TCP_SERVER: [
    { label: "监听 IPv4 地址", kind: "text" },
    { label: "端口号", kind: "number", min: 1, max: 65535 },
    { label: "设备地址(可选)", kind: "number", min: 0, max: 255, optional: true },
  ],
  CAN: [
    { label: "槽位号", kind: "number" },
    { label: "CAN 通道号", kind: "number" },
    { label: "波特率", kind: "select", options: serialOptions },
  ],
  ETH: [{ label: "网络地址", kind: "text" }],
};

type DeviceModuleSlot = Pick<
  Ct16ModuleInfoDto,
  "groupIndex" | "moduleType" | "channelCount" | "displayName"
>;

const interfaceModuleTypes: Record<string, number[]> = {
  DI: [1, 3, 14, 17, 18],
  DO: [1, 2, 4, 5, 13, 15, 17, 19],
  CI: [9, 11, 16],
  VI: [9, 10],
  CO: [6, 8],
  VO: [6, 7],
  RS485: [23],
  RS232: [20],
  CAN: [],
};

const mainSerialSlots: Record<string, DeviceModuleSlot[]> = {
  RS485: [
    { groupIndex: 0, moduleType: 0, channelCount: 2, displayName: "主板 RS485" },
  ],
  RS232: [
    { groupIndex: 0, moduleType: 0, channelCount: 3, displayName: "主板 RS232" },
  ],
};

function isSlotField(field: InterfaceConfigField): boolean {
  return field.label === "槽位号";
}

function isChannelField(field: InterfaceConfigField): boolean {
  return field.label.includes("通道号");
}

function compatibleModuleSlots(
  item: Ct16DeviceModelInterfaceDto,
  moduleSlots: DeviceModuleSlot[],
): DeviceModuleSlot[] {
  const interfaceType = item.type.trim().toUpperCase();
  const moduleTypes = interfaceModuleTypes[interfaceType];
  const compatibleSlots = !moduleTypes
    ? moduleSlots
    : moduleSlots.filter((slot) => moduleTypes.includes(slot.moduleType));
  return [...(mainSerialSlots[interfaceType] ?? []), ...compatibleSlots];
}

function availableInterfaceChannels(
  item: Ct16DeviceModelInterfaceDto,
  selectedSlot: DeviceModuleSlot,
): string[] {
  if (item.type.trim().toUpperCase() === "RS232" && selectedSlot.groupIndex === 0) {
    return ["3"];
  }
  return Array.from(
    { length: selectedSlot.channelCount },
    (_, channelIndex) => String(channelIndex + 1),
  );
}

function configChannelKey(slot: string, channel: string): string {
  return `${slot}\u0000${channel}`;
}

function getInterfaceChannelIndexes(
  item: Ct16DeviceModelInterfaceDto,
  count: number,
): { slotIndex: number; channelIndex: number } | null {
  const fields = interfaceConfigFields(item, count);
  const slotIndex = fields.findIndex(isSlotField);
  const channelIndex = fields.findIndex(isChannelField);
  return slotIndex >= 0 && channelIndex >= 0 ? { slotIndex, channelIndex } : null;
}

function isSharedRs485Interface(item: Ct16DeviceModelInterfaceDto): boolean {
  return item.type.trim().toUpperCase() === "RS485";
}

async function loadOccupiedModuleChannels(
  instances: Ct16DeviceInstanceDto[],
  models: Ct16DeviceModelDto[],
  currentSN?: string,
): Promise<Set<string>> {
  const occupied = new Set<string>();
  const otherInstances = instances.filter((item) => item.sn !== currentSN);
  await Promise.all(
    otherInstances.map(async (instance) => {
      const model = models.find(
        (item) =>
          item.deviceType === instance.type &&
          item.deviceVendor === instance.vendor &&
          item.deviceModel === instance.model,
      );
      if (!model) return;
      try {
        const interfaces = await getDeviceModelInterfaces(model.id);
        for (const item of interfaces) {
          if (isSharedRs485Interface(item)) continue;
          const values = instance.interfaceConfigs[item.id] ?? [];
          const indexes = getInterfaceChannelIndexes(item, values.length);
          if (!indexes) continue;
          const slot = String(values[indexes.slotIndex] ?? "").trim();
          const channel = String(values[indexes.channelIndex] ?? "").trim();
          if (slot && channel) occupied.add(configChannelKey(slot, channel));
        }
      } catch {
        // 无法读取旧模型接口时保留提交前的占用校验，避免阻断表单打开。
      }
    }),
  );
  return occupied;
}

function applyDefaultModuleSlots(
  interfaces: Ct16DeviceModelInterfaceDto[],
  configs: Record<string, string[]>,
  moduleSlots: DeviceModuleSlot[],
): Record<string, string[]> {
  let changed = false;
  const next = { ...configs };
  for (const item of interfaces) {
    const values = [...(next[item.id] ?? [])];
    const indexes = getInterfaceChannelIndexes(item, values.length);
    const compatibleSlots = compatibleModuleSlots(item, moduleSlots);
    if (!indexes || compatibleSlots.length === 0) continue;
    const selectedSlot = values[indexes.slotIndex] ?? "";
    if (compatibleSlots.some((slot) => String(slot.groupIndex) === selectedSlot)) continue;
    values[indexes.slotIndex] = String(compatibleSlots[0].groupIndex);
    next[item.id] = values;
    changed = true;
  }
  return changed ? next : configs;
}

function generateDeviceSN(instances: Ct16DeviceInstanceDto[]) {
  const highest = instances.reduce((maximum, instance) => {
    const matched = /^DEVICE_(\d+)$/i.exec(instance.sn);
    return matched ? Math.max(maximum, Number(matched[1])) : maximum;
  }, 0);
  return `DEVICE_${String(highest + 1).padStart(4, "0")}`;
}

function interfaceConfigFields(
  item: Ct16DeviceModelInterfaceDto,
  count: number,
): InterfaceConfigField[] {
  const definedFields = interfaceConfigDefinitions[item.type];
  if (definedFields) {
    return definedFields;
  }
  const matched = (item.description || "").match(/数组依次表示([^，。；;]+)/);
  const names =
    matched?.[1]
      .split(/[、,，]/)
      .map((value) => value.trim())
      .filter(Boolean) ?? [];
  return Array.from({ length: count }, (_, index) => ({
    label: names[index] || `参数 ${index + 1}`,
    kind: "text",
  }));
}

function validateInterfaceConfig(
  item: Ct16DeviceModelInterfaceDto,
  values: string[],
  moduleSlots: DeviceModuleSlot[],
): string | null {
  const fields = interfaceConfigFields(item, values.length);
  for (const [index, field] of fields.entries()) {
    const value = (values[index] ?? "").trim();
    if (!value) {
      if (field.optional) continue;
      return `请填写接口「${item.name}」的${field.label}`;
    }
    if (isSlotField(field)) {
      if (!compatibleModuleSlots(item, moduleSlots).some((slot) => String(slot.groupIndex) === value)) {
        return `接口「${item.name}」的槽位号与接口类型不匹配，请重新选择`;
      }
      continue;
    }
    if (isChannelField(field)) {
      const indexes = getInterfaceChannelIndexes(item, values.length);
      const slot = indexes ? (values[indexes.slotIndex] ?? "").trim() : "";
      const selectedModule = compatibleModuleSlots(item, moduleSlots).find(
        (module) => String(module.groupIndex) === slot,
      );
      if (!selectedModule) {
        return `请先为接口「${item.name}」选择有效的槽位号`;
      }
      if (!availableInterfaceChannels(item, selectedModule).includes(value)) {
        const availableChannels = availableInterfaceChannels(item, selectedModule).join("、");
        return `接口「${item.name}」的通道号必须为槽位 ${slot} 的 ${availableChannels}`;
      }
      continue;
    }
    if (field.kind === "number") {
      const number = Number(value);
      if (!Number.isInteger(number)) {
        return `接口「${item.name}」的${field.label}必须是整数`;
      }
      if (field.min !== undefined && number < field.min) {
        return `接口「${item.name}」的${field.label}不能小于 ${field.min}`;
      }
      if (field.max !== undefined && number > field.max) {
        return `接口「${item.name}」的${field.label}不能大于 ${field.max}`;
      }
    }
    if (field.label.includes("IPv4") || field.label === "网络地址") {
      if (!isValidIPv4(value)) {
        return `接口「${item.name}」的${field.label}无效，请输入正确的 IPv4 地址`;
      }
    }
    if (field.options && !field.options.includes(value)) {
      return `接口「${item.name}」的${field.label}取值无效`;
    }
  }
  return null;
}

function isValidIPv4(value: string): boolean {
  const parts = value.trim().split(".");
  return (
    parts.length === 4 &&
    parts.every((part) => /^(0|[1-9]\d*)$/.test(part) && Number(part) >= 0 && Number(part) <= 255)
  );
}

function validateInterfaceChannelConflicts(
  interfaces: Ct16DeviceModelInterfaceDto[],
  configs: Record<string, string[]>,
): string | null {
  const occupiedChannels = new Map<string, string>();
  for (const item of interfaces) {
    if (isSharedRs485Interface(item)) continue;
    const indexes = getInterfaceChannelIndexes(item, (configs[item.id] ?? []).length);
    if (!indexes) continue;
    const values = configs[item.id] ?? [];
    const slot = (values[indexes.slotIndex] ?? "").trim();
    const channel = (values[indexes.channelIndex] ?? "").trim();
    if (!slot || !channel) continue;
    const key = configChannelKey(slot, channel);
    const previous = occupiedChannels.get(key);
    if (previous) {
      return `接口「${item.name}」与「${previous}」的通道号不能重复`;
    }
    occupiedChannels.set(key, item.name);
  }
  return null;
}

async function validateOccupiedDeviceChannels(
  interfaces: Ct16DeviceModelInterfaceDto[],
  configs: Record<string, string[]>,
  instances: Ct16DeviceInstanceDto[],
  models: Ct16DeviceModelDto[],
  currentSN?: string,
): Promise<string | null> {
  const currentChannels = new Set<string>();
  for (const item of interfaces) {
    if (isSharedRs485Interface(item)) continue;
    const indexes = getInterfaceChannelIndexes(item, (configs[item.id] ?? []).length);
    if (!indexes) continue;
    const values = configs[item.id] ?? [];
    const slot = (values[indexes.slotIndex] ?? "").trim();
    const channel = (values[indexes.channelIndex] ?? "").trim();
    if (slot && channel) currentChannels.add(configChannelKey(slot, channel));
  }
  if (currentChannels.size === 0) return null;

  for (const instance of instances) {
    if (instance.sn === currentSN) continue;
    const model = models.find(
      (item) =>
        item.deviceType === instance.type &&
        item.deviceVendor === instance.vendor &&
        item.deviceModel === instance.model,
    );
    if (!model) continue;
    const existingInterfaces = await getDeviceModelInterfaces(model.id);
    for (const existing of existingInterfaces) {
      if (isSharedRs485Interface(existing)) continue;
      const indexes = getInterfaceChannelIndexes(
        existing,
        (instance.interfaceConfigs[existing.id] ?? []).length,
      );
      if (!indexes) continue;
      const values = instance.interfaceConfigs[existing.id] ?? [];
      const slot = String(values[indexes.slotIndex] ?? "").trim();
      const channel = String(values[indexes.channelIndex] ?? "").trim();
      if (slot && channel && currentChannels.has(configChannelKey(slot, channel))) {
        return `槽位号 ${slot} 的通道号 ${channel} 已被设备「${instance.name}」占用`;
      }
    }
  }
  return null;
}

function parseInterfaceDefaults(item: Ct16DeviceModelInterfaceDto) {
  try {
    const values = JSON.parse(item.defaultConfigJSON || "[]");
    const defaults = Array.isArray(values)
      ? values.map((value) => (String(value) === "-1" ? "" : String(value)))
      : [];
    if (item.type === "RS485" && item.requiresDeviceAddress && defaults.length === 6) {
      defaults.push("");
    }
    return defaults;
  } catch {
    return [];
  }
}

function AddDeviceDialog({
  open,
  models,
  instances,
  instance,
  preferredModelID,
  onClose,
  onCreated,
  onUpdated,
}: {
  open: boolean;
  models: Ct16DeviceModelDto[];
  instances: Ct16DeviceInstanceDto[];
  instance?: Ct16DeviceInstanceDto | null;
  preferredModelID?: string;
  onClose: () => void;
  onCreated: (instance: Ct16DeviceInstanceDto, modelID: string) => void;
  onUpdated: (instance: Ct16DeviceInstanceDto, previousSN: string) => void;
}) {
  const [name, setName] = useState("");
  const [sn, setSN] = useState("");
  const [location, setLocation] = useState("");
  const [remark, setRemark] = useState("");
  const [selectedModelID, setSelectedModelID] = useState("");
  const [interfaces, setInterfaces] = useState<Ct16DeviceModelInterfaceDto[]>(
    [],
  );
  const [configs, setConfigs] = useState<Record<string, string[]>>({});
  const [loadingInterfaces, setLoadingInterfaces] = useState(false);
  const [moduleSlots, setModuleSlots] = useState<DeviceModuleSlot[]>([]);
  const [loadingModuleSlots, setLoadingModuleSlots] = useState(false);
  const [occupiedModuleChannels, setOccupiedModuleChannels] = useState<Set<string>>(
    () => new Set(),
  );
  const [saving, setSaving] = useState(false);
  const sortedModels = useMemo(
    () =>
      [...models].sort((left, right) => {
        const nameOrder = left.modelName.localeCompare(
          right.modelName,
          "zh-CN",
          { numeric: true },
        );
        if (nameOrder !== 0) return nameOrder;

        const vendorOrder = left.deviceVendor.localeCompare(
          right.deviceVendor,
          "zh-CN",
          { numeric: true },
        );
        if (vendorOrder !== 0) return vendorOrder;

        return left.deviceModel.localeCompare(right.deviceModel, "zh-CN", {
          numeric: true,
        });
      }),
    [models],
  );
  const selectedModel =
    models.find((model) => model.id === selectedModelID) ?? null;
  const remarkMaxBytes = useMemo(() => {
    const infoWithoutRemark = previewDeviceInfoWithoutRemark(
      interfaces,
      configs,
    );
    return Math.max(
      0,
      Math.min(128, 1023 - utf8ByteLength(infoWithoutRemark)),
    );
  }, [name, location, interfaces, configs]);

  useEffect(() => {
    setRemark((current) => limitUtf8Bytes(current, remarkMaxBytes));
  }, [remarkMaxBytes]);

  useEffect(() => {
    if (!open) return;
    setName(instance?.name ?? "");
    setSN(instance?.sn ?? generateDeviceSN(instances));
    setLocation(instance?.devPoint ?? "");
    setRemark(instance?.remark ?? "");
    const defaultModel = instance
      ? models.find(
          (model) =>
            model.deviceType === instance.type &&
            model.deviceVendor === instance.vendor &&
            model.deviceModel === instance.model,
        )
      : sortedModels.find((model) => model.id === preferredModelID) ?? sortedModels[0];
    setSelectedModelID(defaultModel?.id ?? "");
    setInterfaces([]);
    setConfigs({});
    if (defaultModel)
      void selectModel(defaultModel.id, instance?.interfaceConfigs);
  }, [open, models, instance]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingModuleSlots(true);
    void Promise.all([
      getModules(),
      loadOccupiedModuleChannels(instances, models, instance?.sn),
    ])
      .then(([response, occupied]) => {
        if (cancelled) return;
        const slots = response.modules
          .filter((module) => module.groupIndex > 0 && module.channelCount > 0)
          .sort((left, right) => left.groupIndex - right.groupIndex)
          .filter(
            (module, index, items) =>
              index === 0 || items[index - 1].groupIndex !== module.groupIndex,
          )
          .map((module) => ({
            groupIndex: module.groupIndex,
            moduleType: module.moduleType,
            channelCount: module.channelCount,
            displayName: module.displayName,
          }));
        setModuleSlots(slots);
        setOccupiedModuleChannels(occupied);
      })
      .catch((error) => {
        if (!cancelled) {
          setModuleSlots([]);
          setOccupiedModuleChannels(new Set());
          toast.error(error instanceof Error ? error.message : "读取子板拓扑失败");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingModuleSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, instances, models, instance?.sn]);

  useEffect(() => {
    if (!open || interfaces.length === 0) return;
    setConfigs((current) => applyDefaultModuleSlots(interfaces, current, moduleSlots));
  }, [open, interfaces, moduleSlots, configs]);

  const selectModel = async (
    modelID: string,
    savedConfigs?: Record<string, unknown[]>,
  ) => {
    setSelectedModelID(modelID);
    setInterfaces([]);
    setConfigs({});
    if (!modelID) return;
    setLoadingInterfaces(true);
    try {
      const nextInterfaces = await getDeviceModelInterfaces(modelID);
      const interfaceIDs = new Set<string>();
      if (
        nextInterfaces.some((item) => {
          const id = item.id.trim();
          const type = item.type.trim();
          if (!id || !type || interfaceIDs.has(id)) return true;
          interfaceIDs.add(id);
          return false;
        })
      ) {
        throw new Error("设备模型接口定义异常，请重新导入设备模型");
      }
      setInterfaces(nextInterfaces);
      const normalizedSavedConfigs = normalizeInstanceInterfaceConfigs(
        savedConfigs,
        nextInterfaces,
      );
      const initialConfigs = Object.fromEntries(
        nextInterfaces.map((item) => {
          const defaults = parseInterfaceDefaults(item);
          const savedValues = normalizedSavedConfigs[item.id] ?? [];
          const values = Array.from(
            { length: Math.max(defaults.length, savedValues.length) },
            (_, index) => {
              const saved = savedValues[index];
              return saved === undefined || saved === "" ? String(defaults[index] ?? "") : String(saved);
            },
          );
          if (item.type === "RS485" && item.requiresDeviceAddress && values.length === 6) {
            values.push("");
          }
          return [item.id, values];
        }),
      );
      setConfigs(applyDefaultModuleSlots(nextInterfaces, initialConfigs, moduleSlots));
    } catch (error) {
      setSelectedModelID("");
      toast.error(
        error instanceof Error ? error.message : "读取模型接口配置失败",
      );
    } finally {
      setLoadingInterfaces(false);
    }
  };

  const updateConfigValue = (
    interfaceID: string,
    index: number,
    value: string,
    item?: Ct16DeviceModelInterfaceDto,
  ) => {
    setConfigs((current) => {
      const values = [...(current[interfaceID] ?? [])];
      values[index] = value;
      if (item && isSlotField(interfaceConfigFields(item, values.length)[index])) {
        const indexes = getInterfaceChannelIndexes(item, values.length);
        const selectedSlot = compatibleModuleSlots(item, moduleSlots).find(
          (slot) => String(slot.groupIndex) === value,
        );
        if (indexes && selectedSlot) {
          if (!availableInterfaceChannels(item, selectedSlot).includes(values[indexes.channelIndex])) {
            values[indexes.channelIndex] = "";
          }
        }
      }
      return { ...current, [interfaceID]: values };
    });
  };

  const isChannelOccupied = (
    interfaceID: string,
    slot: string,
    channel: string,
  ) => {
    const currentInterface = interfaces.find((item) => item.id === interfaceID);
    if (currentInterface && isSharedRs485Interface(currentInterface)) return false;
    const key = configChannelKey(slot, channel);
    if (occupiedModuleChannels.has(key)) return true;
    return interfaces.some((item) => {
      if (item.id === interfaceID) return false;
      if (isSharedRs485Interface(item)) return false;
      const values = configs[item.id] ?? [];
      const indexes = getInterfaceChannelIndexes(item, values.length);
      return Boolean(
        indexes &&
          configChannelKey(
            (values[indexes.slotIndex] ?? "").trim(),
            (values[indexes.channelIndex] ?? "").trim(),
          ) === key,
      );
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return toast.error("请输入设备名称");
    if (Array.from(name.trim()).length > 64) {
      return toast.error("设备名称不能超过 64 个字符");
    }
    if (utf8ByteLength(location.trim()) > 64) {
      return toast.error("安装位置不能超过 64 字节（中文约 21 个字）");
    }
    if (utf8ByteLength(remark.trim()) > 128) {
      return toast.error("备注不能超过 128 字节（中文约 42 个字）");
    }
    if (!selectedModel) return toast.error("请选择设备模型");
    const normalizedSN = sn.trim();
    if (!normalizedSN) return toast.error("请输入 SN 号");
    if (!/^[A-Za-z0-9_]{1,32}$/.test(normalizedSN)) {
      return toast.error("SN号仅支持英文字母、数字和下划线，长度不能超过 32 个字符");
    }
    for (const item of interfaces) {
      if (!item.id) return toast.error("接口标识不能为空");
      const validationError = validateInterfaceConfig(
        item,
        configs[item.id] ?? [],
        moduleSlots,
      );
      if (validationError) return toast.error(validationError);
    }
    const duplicateChannelError = validateInterfaceChannelConflicts(
      interfaces,
      configs,
    );
    if (duplicateChannelError) return toast.error(duplicateChannelError);
    const occupiedChannelError = await validateOccupiedDeviceChannels(
      interfaces,
      configs,
      instances,
      models,
      instance?.sn,
    );
    if (occupiedChannelError) return toast.error(occupiedChannelError);
    setSaving(true);
    try {
      const request = {
        name: name.trim(),
        sn: normalizedSN,
        type: selectedModel.deviceType,
        vendor: selectedModel.deviceVendor,
        model: selectedModel.deviceModel,
        devPoint: location.trim(),
        remark: remark.trim(),
        interfaceConfigs: Object.fromEntries(
          Object.entries(configs).map(([id, values]) => [id, values]),
        ),
        interfaceTypes: Object.fromEntries(
          interfaces.map((item) => [item.id, item.type]),
        ),
      };
      const saved = instance
        ? await updateDeviceInstance(instance.sn, request)
        : await createDeviceInstance(request);
      if (instance) {
        onUpdated(saved, instance?.sn || saved.sn);
        toast.success("设备已更新");
      } else {
        onCreated(saved, selectedModel.id);
        toast.success("设备已添加");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "添加设备失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && !saving && onClose()}
    >
      <DialogContent className="flex h-[88vh] max-w-2xl flex-col overflow-hidden border-border/40 bg-card/95 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5 text-primary" />
            {instance ? "编辑设备" : "添加设备"}
          </DialogTitle>
          <DialogDescription>
            选择设备模型后，系统将读取协议驱动定义的接口配置。
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          noValidate
          onSubmit={(event) => void submit(event)}
        >
          <ScrollArea type="always" className={dialogScrollAreaClass}>
            <div className="space-y-4 px-6 py-4 pr-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    设备名称 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="请输入设备名称"
                    maxLength={64}
                    className={`h-9 ${editableFieldClass}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    设备模型 <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedModelID}
                    onValueChange={(value) => void selectModel(value)}
                    disabled={Boolean(instance)}
                  >
                    <SelectTrigger className={`h-9 ${editableFieldClass}`}>
                      <SelectValue placeholder="请选择设备模型类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.modelName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    SN号 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={sn}
                    onChange={(event) =>
                      setSN(event.target.value.replace(/[^A-Za-z0-9_]/g, "").slice(0, 32))
                    }
                    placeholder="请输入设备 SN 号"
                    maxLength={32}
                    className={`h-9 font-mono ${editableFieldClass}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>安装位置</Label>
                  <Input
                    value={location}
                    onChange={(event) =>
                      setLocation(limitUtf8Bytes(event.target.value, 64))
                    }
                    placeholder="例如：隧道入口配电柜"
                    maxLength={64}
                    className={`h-9 ${editableFieldClass}`}
                  />
                </div>
              </div>
              {selectedModel && (
                <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">
                        模型接口配置信息
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        以下配置由 {selectedModel.deviceType} 的协议驱动定义。
                      </p>
                    </div>
                    <Badge variant="outline">{interfaces.length} 个接口</Badge>
                  </div>
                  {loadingInterfaces ? (
                    <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      正在读取接口配置…
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {interfaces.map((item) => {
                        const values = configs[item.id] ?? [];
                        const fields = interfaceConfigFields(
                          item,
                          values.length,
                        );
                        const channelIndexes = getInterfaceChannelIndexes(
                          item,
                          values.length,
                        );
                        const selectedSlot = compatibleModuleSlots(
                          item,
                          moduleSlots,
                        ).find(
                          (slot) =>
                            String(slot.groupIndex) ===
                            (channelIndexes
                              ? values[channelIndexes.slotIndex] ?? ""
                              : ""),
                        );
                        const useTwoColumnLayout = Boolean(
                          selectedSlot &&
                            `槽位 ${selectedSlot.groupIndex} · ${selectedSlot.displayName}`.length > 20,
                        );
                        return (
                          <div
                            key={item.id}
                            className="space-y-3 rounded-md border border-border/60 bg-background/60 p-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">
                                {item.name}
                              </span>
                              <Badge
                                variant="secondary"
                                className="font-mono text-[10px]"
                              >
                                {item.type}
                              </Badge>
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {item.id}
                              </span>
                            </div>
                            <div
                              className={`grid gap-3 sm:grid-cols-2 ${useTwoColumnLayout ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}
                            >
                              {fields.map((field, index) => (
                                <div
                                  key={`${item.id}-${index}`}
                                  className="min-w-0 space-y-1.5"
                                >
                                  <Label className="text-xs">
                                    {field.label}
                                  </Label>
                                  {isSlotField(field) ? (
                                    <Select
                                      value={values[index] ?? ""}
                                      disabled={compatibleModuleSlots(item, moduleSlots).length === 0}
                                      onValueChange={(value) =>
                                        updateConfigValue(item.id, index, value, item)
                                      }
                                    >
                                      <SelectTrigger className={`h-9 min-w-0 ${editableFieldClass}`}>
                                        <SelectValue
                                          placeholder={
                                            loadingModuleSlots
                                              ? "正在读取子板…"
                                              : compatibleModuleSlots(item, moduleSlots).length
                                                ? "请选择槽位号"
                                                : "未检测到匹配子板"
                                          }
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {compatibleModuleSlots(item, moduleSlots).map((slot) => {
                                          return (
                                            <SelectItem
                                              key={`${item.id}-${slot.groupIndex}`}
                                              value={String(slot.groupIndex)}
                                            >
                                              槽位 {slot.groupIndex} · {slot.displayName}
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectContent>
                                    </Select>
                                  ) : isChannelField(field) ? (
                                    (() => {
                                      return (
                                        <Select
                                          value={values[index] ?? ""}
                                          disabled={!selectedSlot}
                                          onValueChange={(value) =>
                                            updateConfigValue(item.id, index, value)
                                          }
                                        >
                                          <SelectTrigger className={`h-9 ${editableFieldClass}`}>
                                            <SelectValue
                                              placeholder={
                                                loadingModuleSlots
                                                  ? "正在读取子板…"
                                                  : selectedSlot
                                                    ? "请选择通道号"
                                                    : "请先选择槽位号"
                                              }
                                            />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {selectedSlot &&
                                              availableInterfaceChannels(item, selectedSlot).map((channel) => {
                                                const occupied = isChannelOccupied(
                                                  item.id,
                                                  String(selectedSlot.groupIndex),
                                                  channel,
                                                );
                                                return (
                                                  <SelectItem
                                                    key={channel}
                                                    value={channel}
                                                    disabled={
                                                      occupied && values[index] !== channel
                                                    }
                                                  >
                                                    通道 {channel}
                                                    {occupied ? "（已占用）" : ""}
                                                  </SelectItem>
                                                );
                                              })}
                                          </SelectContent>
                                        </Select>
                                      );
                                    })()
                                  ) : field.kind === "select" ? (
                                    <Select
                                      value={values[index] ?? ""}
                                      onValueChange={(value) =>
                                        updateConfigValue(item.id, index, value)
                                      }
                                    >
                                      <SelectTrigger
                                        className={`h-9 ${editableFieldClass}`}
                                      >
                                        <SelectValue
                                          placeholder={`请选择${field.label}`}
                                        />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {field.options?.map((value) => (
                                          <SelectItem key={value} value={value}>
                                            {value}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Input
                                      type={
                                        field.kind === "number"
                                          ? "number"
                                          : "text"
                                      }
                                      min={field.min}
                                      max={field.max}
                                      inputMode={
                                        field.kind === "number"
                                          ? "numeric"
                                          : undefined
                                      }
                                      value={values[index] ?? ""}
                                      onChange={(event) =>
                                        updateConfigValue(
                                          item.id,
                                          index,
                                          event.target.value,
                                        )
                                      }
                                      placeholder={
                                        field.min !== undefined &&
                                        field.max !== undefined
                                          ? `${field.min}-${field.max}`
                                          : `请输入${field.label}`
                                      }
                                      className={`h-9 ${editableFieldClass}`}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={remark}
                  onChange={(event) =>
                    setRemark(limitUtf8Bytes(event.target.value, remarkMaxBytes))
                  }
                  placeholder="请输入设备备注"
                  maxLength={remarkMaxBytes}
                  className={`min-h-20 max-h-40 w-full min-w-0 max-w-full resize-y overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-all ${editableFieldClass}`}
                />
                <div className="text-xs text-muted-foreground">
                  最多可输入 {remarkMaxBytes} 字节
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="shrink-0 border-t border-border/40 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={onClose}
            >
              取消
            </Button>
            <Button type="submit" disabled={saving || loadingInterfaces}>
              {saving && <Loader2 className="mr-1 size-4 animate-spin" />}
              {instance ? "保存修改" : "确定添加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeviceInstancesTab({ models }: { models: Ct16DeviceModelDto[] }) {
  const [searchInput, setSearchInput] = useState("");
  const [modelFilter, setModelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [batchImportOpen, setBatchImportOpen] = useState(false);
  const [batchImportModels, setBatchImportModels] = useState<IDeviceBatchImportModel[]>([]);
  const [localControllerSN, setLocalControllerSN] = useState("");
  const [instances, setInstances] = useState<Ct16DeviceInstanceDto[]>([]);
  const [instanceStatuses, setInstanceStatuses] = useState<
    Record<string, "normal" | "alarm">
  >({});
  const [availableModels, setAvailableModels] = useState<Ct16DeviceModelDto[]>(
    [],
  );
  const [lastAddedModelID, setLastAddedModelID] = useState(
    readLastAddedDeviceModelID,
  );
  const [detailInstance, setDetailInstance] =
    useState<Ct16DeviceInstanceDto | null>(null);
  const [detailValues, setDetailValues] = useState<Record<string, string>>({});
  const [controlValues, setControlValues] = useState<Record<string, string>>({});
  const [readingDetail, setReadingDetail] = useState<string | null>(null);
  const [controllingPropertyID, setControllingPropertyID] = useState<string | null>(null);
  const [editInstance, setEditInstance] =
    useState<Ct16DeviceInstanceDto | null>(null);
  const [deleteInstance, setDeleteInstance] =
    useState<Ct16DeviceInstanceDto | null>(null);
  const [deletingInstance, setDeletingInstance] = useState(false);
  const [interfaceDetails, setInterfaceDetails] = useState<
    Record<string, Record<string, Ct16DeviceModelInterfaceDto>>
  >({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const currentInstances = await getDeviceInstances();
        if (cancelled) return;
        setInstances(currentInstances);
        const statuses: Array<readonly [string, "normal" | "alarm"]> = [];
        for (const instance of currentInstances) {
          try {
            const result = await readDeviceInstance(instance.sn);
            statuses.push([
              instance.sn,
              result.success ? "normal" : "alarm",
            ]);
          } catch {
            statuses.push([instance.sn, "alarm"]);
          }
        }
        const overview = await getSystemOverview().catch(() => null);
        if (overview && !cancelled) {
          setLocalControllerSN(overview.device.serialNumber.trim());
        }
        if (!cancelled) setInstanceStatuses(Object.fromEntries(statuses));
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "读取设备实例失败",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const updateInstanceStatus = async (instance: Ct16DeviceInstanceDto) => {
    try {
      const result = await readDeviceInstance(instance.sn);
      setInstanceStatuses((current) => ({
        ...current,
        [instance.sn]: result.success ? "normal" : "alarm",
      }));
    } catch {
      setInstanceStatuses((current) => ({
        ...current,
        [instance.sn]: "alarm",
      }));
    }
  };
  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      models.map(async (model) => [
        model.id,
        await getDeviceModelInterfaces(model.id),
      ]) as Promise<[string, Ct16DeviceModelInterfaceDto[]]>[],
    )
      .then((items) => {
        if (!cancelled) {
          setInterfaceDetails(
            Object.fromEntries(
              items.map(([modelID, interfaces]) => [
                modelID,
                Object.fromEntries(interfaces.map((item) => [item.id, item])),
              ]),
            ),
          );
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [models]);
  const filteredInstances = instances.filter((instance) => {
    const keyword = searchInput.trim().toLowerCase();
    return (
      (!keyword ||
        [
          instance.name,
          instance.sn,
          instance.type,
          instance.vendor,
          instance.model,
          instance.devPoint,
          communicationText(instance),
        ].some((value) => value.toLowerCase().includes(keyword))) &&
      (modelFilter === "all" || instance.type === modelFilter) &&
      (statusFilter === "all" ||
        (instanceStatuses[instance.sn] ?? "normal") === statusFilter)
    );
  });
  const openAddDevice = async () => {
    try {
      const response = await getDeviceModels();
      const detectedModels = Array.isArray(response.models)
        ? response.models
        : [];
      if (detectedModels.length === 0) {
        toast.error("未检测到可用设备模型，请先导入设备模型后再添加设备。");
        return;
      }
      setAvailableModels(detectedModels);
      setAddOpen(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "读取设备模型失败，请稍后重试。",
      );
    }
  };
  const openBatchImport = async () => {
    let sourceModels = models;
    if (sourceModels.length === 0) {
      try {
        const response = await getDeviceModels();
        sourceModels = Array.isArray(response.models) ? response.models : [];
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "读取设备模型失败");
        return;
      }
    }
    const templateModels = sourceModels.map(ToBatchImportModel);
    if (templateModels.length === 0) {
      toast.error("未检测到设备模型，请先导入或同步设备模型");
      return;
    }
    setBatchImportModels(templateModels);
    setBatchImportOpen(true);
  };
  const batchImportDevices: IDeviceBatchImportDevice[] = instances.map((instance) => ({
    serialNumber: instance.sn,
  }));
  const handleBatchImportComplete = async (_results: IDeviceBatchImportResult[]) => {
    try {
      setInstances(await getDeviceInstances());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "刷新设备实例失败");
    }
  };
  const statistics = [
    {
      label: "设备总数",
      count: instances.length,
      icon: Boxes,
      iconClassName: "bg-primary/10 text-primary",
    },
    {
      label: "正常设备",
      count: instances.filter(
        (instance) => (instanceStatuses[instance.sn] ?? "normal") === "normal",
      ).length,
      icon: CheckCircle2,
      iconClassName: "bg-success/10 text-success",
    },
    {
      label: "异常设备",
      count: instances.filter(
        (instance) => (instanceStatuses[instance.sn] ?? "normal") === "alarm",
      ).length,
      icon: ShieldAlert,
      iconClassName: "bg-warning/10 text-warning",
    },
  ];
  function instanceModel(instance: Ct16DeviceInstanceDto) {
    return models.find(
      (model) =>
        model.deviceType === instance.type &&
        model.deviceVendor === instance.vendor &&
        model.deviceModel === instance.model,
    );
  }

  function communicationText(instance: Ct16DeviceInstanceDto) {
    const model = instanceModel(instance);
    const details = model ? interfaceDetails[model.id] ?? {} : {};
    const configs = normalizeInstanceInterfaceConfigs(
      instance.interfaceConfigs,
      Object.values(details),
    );
    const types = Object.keys(configs).map((interfaceID) =>
      model ? details[interfaceID]?.type : interfaceID,
    );
    if (types.length === 0 && model) {
      types.push(
        ...Object.values(details).map((item) => item.type),
      );
    }
    return (
      Array.from(new Set(types.filter(Boolean))).join(" · ") || "未配置接口"
    );
  }
  const detailModelProperties = (instance: Ct16DeviceInstanceDto) => {
    const model = instanceModel(instance);
    const statuses = modelProperties(model?.statuses);
    const controls = modelProperties(model?.controls);
    return { statuses, controls };
  };
  const readDetailInstance = async (
    instance: Ct16DeviceInstanceDto,
    notify: boolean,
    source: string | null,
  ) => {
    if (readingDetail !== null) return;
    setReadingDetail(source);
    try {
      const result = await readDeviceInstance(instance.sn);
      setInstanceStatuses((current) => ({
        ...current,
        [instance.sn]: result.success ? "normal" : "alarm",
      }));
      if (!result.success) {
        if (notify) toast.error(`读取失败：${dsdkErrorText(result.code, result.error)}`);
        return;
      }
      let data: unknown;
      try {
        data = JSON.parse(result.info || "{}");
      } catch {
        if (notify) toast.error("读取失败：返回数据不是有效 JSON");
        return;
      }
      if (typeof data !== "object" || data === null || Array.isArray(data)) {
        if (notify) toast.error("读取失败：返回数据格式无效");
        return;
      }
      const values = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, formatPropertyValue(value)]),
      );
      setDetailValues((current) => ({ ...current, ...values }));
      if (notify) toast.success("读取成功");
    } catch (error) {
      setInstanceStatuses((current) => ({
        ...current,
        [instance.sn]: "alarm",
      }));
      if (notify) toast.error(error instanceof Error ? error.message : "读取失败");
    } finally {
      setReadingDetail(null);
    }
  };
  const openDetailInstance = (instance: Ct16DeviceInstanceDto) => {
    const { statuses, controls } = detailModelProperties(instance);
    const statusDefaults = Object.fromEntries(
      statuses
        .map((property) => [property.id, propertyExampleValue(property)])
        .filter(([, value]) => value !== ""),
    );
    const controlDefaults = Object.fromEntries(
      controls
        .map((property) => {
          const firstValue = property.values?.[0];
          if (firstValue) {
            try {
              return [property.id, formatPropertyValue(JSON.parse(firstValue.valueJSON))];
            } catch {
              return [property.id, firstValue.valueJSON];
            }
          }
          return [property.id, propertyExampleValue(property)];
        })
        .filter(([, value]) => value !== ""),
    );
    setDetailValues(statusDefaults);
    setControlValues(controlDefaults);
    setDetailInstance(instance);
    void readDetailInstance(instance, false, null);
  };
  const controlDetailInstance = async (property: Ct16DeviceModelPropertyDto) => {
    if (!detailInstance) return;
    const input = controlValues[property.id] ?? "";
    let value: unknown;
    try {
      value = propertyValueFromInput(property, input);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "控制参数无效");
      return;
    }
    setControllingPropertyID(property.id);
    try {
      const result = await controlDeviceInstance(
        detailInstance.sn,
        JSON.stringify({ [property.id]: value }),
      );
      if (!result.success) {
        toast.error(`写入失败：${dsdkErrorText(result.code, result.error)}`);
        return;
      }
      const formattedValue = formatPropertyValue(value);
      setControlValues((current) => ({ ...current, [property.id]: formattedValue }));
      toast.success("写入成功");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "写入失败");
    } finally {
      setControllingPropertyID(null);
    }
  };
  const confirmDeleteInstance = async () => {
    if (!deleteInstance) return;
    setDeletingInstance(true);
    try {
      await deleteDeviceInstance(deleteInstance.sn);
      setInstances((current) =>
        current.filter((item) => item.sn !== deleteInstance.sn),
      );
      setDeleteInstance(null);
      toast.success("设备已删除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除设备失败");
    } finally {
      setDeletingInstance(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {statistics.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="border-border/40 bg-card/60">
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-md ${item.iconClassName}`}
                >
                  <Icon className="size-4" />
                </div>
                <div>
                  <div className="text-xl font-black tabular-nums text-foreground">
                    {item.count}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.label}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/40 bg-card/60">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="输入设备名称、SN、通信接口类型，按 Enter 搜索"
                className="h-9 pl-9 text-sm"
              />
            </div>
            <Select value={modelFilter} onValueChange={setModelFilter}>
              <SelectTrigger className="h-9 w-full text-sm lg:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部设备模型</SelectItem>
                {Array.from(
                  new Set(models.map((model) => model.deviceType)),
                ).map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full text-sm lg:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="normal">正常</SelectItem>
                <SelectItem value="alarm">异常</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex w-full gap-3 lg:w-auto">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 lg:flex-none"
                onClick={() => {
                  window.open(
                    "/logs?tab=system&keyword=DSDK&autoStart=1",
                    "_blank",
                    "noopener,noreferrer",
                  );
                }}
              >
                <Terminal className="mr-1 size-3.5" />
                设备实时日志
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 lg:flex-none"
                onClick={() => void openBatchImport()}
              >
                <FileSpreadsheet className="mr-1 size-3.5" />
                批量添加
              </Button>
              <Button
                size="sm"
                className="flex-1 lg:flex-none"
                onClick={() => void openAddDevice()}
              >
                <Plus className="mr-1 size-3.5" />
                添加设备
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/60">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[24%]">设备</TableHead>
                  <TableHead className="w-[20%]">设备模型</TableHead>
                  <TableHead className="w-[16%]">SN 号</TableHead>
                  <TableHead className="w-[16%]">通信接口</TableHead>
                  <TableHead className="w-[10%]">状态</TableHead>
                  <TableHead className="w-[14%] text-left">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInstances.length ? (
                  filteredInstances.map((instance) => (
                    <TableRow key={instance.sn}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
                            {instanceModel(instance) ? (
                              <ModelIcon
                                model={instanceModel(instance)!}
                                className="size-full"
                              />
                            ) : (
                              <Boxes className="size-4 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <OverflowText value={instance.name} className="block truncate font-medium" />
                            <OverflowText
                              value={instance.devPoint || "未设置位置"}
                              className="block truncate text-xs text-muted-foreground"
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <OverflowText
                          value={instanceModel(instance)?.modelName || instance.type}
                          className="block truncate font-medium"
                        />
                        <OverflowText
                          value={instanceModel(instance)?.deviceType || instance.type}
                          className="block truncate text-xs text-muted-foreground"
                        />
                      </TableCell>
                      <TableCell>
                        <OverflowText value={instance.sn} className="block truncate font-mono text-xs" />
                      </TableCell>
                      <TableCell>
                        <OverflowText
                          value={communicationText(instance)}
                          className="block truncate text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        {(instanceStatuses[instance.sn] ?? "normal") === "alarm" ? (
                          <Badge className="bg-warning/10 text-warning">
                            异常
                          </Badge>
                        ) : (
                          <Badge className="bg-success/10 text-success">
                            正常
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex justify-start gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="查看设备"
                            onClick={() => openDetailInstance(instance)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="编辑设备"
                            onClick={() => setEditInstance(instance)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="删除设备"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteInstance(instance)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-48 text-center text-sm text-muted-foreground"
                    >
                      暂无设备实例
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <AddDeviceDialog
        open={addOpen}
        models={availableModels}
        instances={instances}
        preferredModelID={lastAddedModelID}
        onClose={() => setAddOpen(false)}
        onCreated={(instance, modelID) => {
          setLastAddedModelID(modelID);
          saveLastAddedDeviceModelID(modelID);
          setInstances((current) => [...current, instance]);
          void updateInstanceStatus(instance);
        }}
        onUpdated={(instance, previousSN) =>
          setInstances((current) =>
            current.map((item) => (item.sn === previousSN ? instance : item)),
          )
        }
      />
      <BatchDeviceImportDialog
        open={batchImportOpen}
        devices={batchImportDevices}
        models={batchImportModels}
        localControllerSN={localControllerSN}
        onComplete={handleBatchImportComplete}
        onClose={() => setBatchImportOpen(false)}
      />
      <AddDeviceDialog
        open={Boolean(editInstance)}
        models={availableModels.length ? availableModels : models}
        instances={instances}
        instance={editInstance}
        onClose={() => setEditInstance(null)}
        onCreated={() => undefined}
        onUpdated={(instance, previousSN) => {
          setInstances((current) =>
            current.map((item) => (item.sn === previousSN ? instance : item)),
          );
          setEditInstance(null);
        }}
      />
      <Dialog
        open={Boolean(detailInstance)}
        onOpenChange={(open) => !open && setDetailInstance(null)}
      >
        <DialogContent className="flex h-[88vh] w-[calc(100%-2rem)] max-w-3xl flex-col overflow-hidden border-border/40 bg-card/95 p-0">
          {detailInstance && (() => {
            const model = instanceModel(detailInstance);
            const statuses = modelProperties(model?.statuses);
            const controls = modelProperties(model?.controls);
            return (
              <>
                <DialogHeader className="shrink-0 px-6 pt-6">
                  <div className="flex flex-wrap items-center gap-2 pr-6">
                    <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
                      {model ? (
                        <ModelIcon model={model} className="size-full" />
                      ) : (
                        <Boxes className="size-4 text-primary" />
                      )}
                    </div>
                    <DialogTitle className="min-w-0 max-w-full break-all whitespace-normal">
                      {detailInstance.name}
                    </DialogTitle>
                    <Badge className="bg-success/10 text-success">正常</Badge>
                  </div>
                  <DialogDescription className="break-all whitespace-normal">
                    {model?.modelName || detailInstance.type} · {detailInstance.sn}
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea type="always" className={dialogScrollAreaClass}>
                  <div className="space-y-4 px-6 py-4 pr-8">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">设备模型</div>
                    <div className="mt-1 break-all text-sm font-semibold">
                      {model?.modelName || detailInstance.type}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">设备厂商</div>
                    <div className="mt-1 break-all text-sm font-semibold">
                      {detailInstance.vendor || "未识别"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">设备型号</div>
                    <div className="mt-1 break-all text-sm font-semibold">
                      {detailInstance.model || "未识别"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">通信接口</div>
                    <div className="mt-1 break-all text-sm font-semibold">
                      {communicationText(detailInstance)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">安装位置</div>
                    <div className="mt-1 break-all text-sm font-semibold">
                      {detailInstance.devPoint || "未设置位置"}
                    </div>
                  </div>
                    </div>

                    <div className="space-y-5">
                  <DevicePropertyModel
                    title="状态模型"
                    description="对应 DSDK 状态模型，仅支持读取设备状态。"
                    pointLabel="状态点"
                    properties={statuses}
                    values={detailValues}
                    controlValues={controlValues}
                    readingKey={readingDetail}
                    controlling={controllingPropertyID}
                    valueLabel="当前值"
                    readable
                    onRead={(propertyID) =>
                      void readDetailInstance(detailInstance, true, propertyID)
                    }
                    onControlValueChange={() => undefined}
                    onControl={() => undefined}
                  />
                  {controls.length > 0 && (
                    <DevicePropertyModel
                      title="控制模型"
                      description="对应 DSDK 控制模型，按模型定义处理控制命令。"
                      pointLabel="控制点"
                      properties={controls}
                      values={detailValues}
                      controlValues={controlValues}
                      readingKey={readingDetail}
                      controlling={controllingPropertyID}
                      valueLabel="设置值"
                      controllable
                      onRead={() => undefined}
                      onControlValueChange={(propertyID, value) =>
                        setControlValues((current) => ({ ...current, [propertyID]: value }))
                      }
                      onControl={(property) => void controlDetailInstance(property)}
                    />
                  )}
                    </div>

                    <section className="space-y-2">
                  <h3 className="text-sm font-semibold">备注</h3>
                  <p className="min-h-16 max-w-full overflow-x-hidden whitespace-pre-wrap break-all rounded-xl border border-border/40 bg-muted/20 p-3 text-sm leading-6 text-muted-foreground">
                    {detailInstance.remark || "未填写备注"}
                  </p>
                    </section>
                  </div>
                </ScrollArea>
              </>
            );
          })()}
          <DialogFooter className="shrink-0 border-t border-border/40 px-6 py-4">
            <Button variant="outline" onClick={() => setDetailInstance(null)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDeleteDialog
        open={Boolean(deleteInstance)}
        onOpenChange={(open) => !open && setDeleteInstance(null)}
        title="确认删除设备"
        description={<>将删除设备「{deleteInstance?.name}」及其配置，且无法恢复。</>}
        loading={deletingInstance}
        onConfirm={() => void confirmDeleteInstance()}
      />
    </div>
  );
}

export default function DeviceModelPage() {
  const [models, setModels] = useState<Ct16DeviceModelDto[]>([]);
  const [activeTab, setActiveTab] = useState("instances");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [modelNameFilter, setModelNameFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [localImportOpen, setLocalImportOpen] = useState(false);
  const [localExportOpen, setLocalExportOpen] = useState(false);
  const [detailModel, setDetailModel] = useState<Ct16DeviceModelDto | null>(
    null,
  );
  const [editModel, setEditModel] = useState<Ct16DeviceModelDto | null>(null);
  const [deleteModel, setDeleteModel] = useState<Ct16DeviceModelDto | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const loadModels = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getDeviceModels();
      setModels(Array.isArray(response.models) ? response.models : []);
      setWarnings(Array.isArray(response.warnings) ? response.warnings : []);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "加载设备模型失败";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadModels();
  }, []);

  const modelNames = useMemo(
    () =>
      Array.from(
        new Set(models.map((model) => model.modelName.trim()).filter(Boolean)),
      ).sort((left, right) => left.localeCompare(right, "zh-CN")),
    [models],
  );

  const filteredModels = useMemo(() => {
    const keyword = searchTerm.trim().toLocaleLowerCase();
    return models.filter((model) => {
      const matchedKeyword =
        !keyword ||
        model.modelName.toLocaleLowerCase().includes(keyword) ||
        modelTags(model).some((tag) =>
          tag.toLocaleLowerCase().includes(keyword),
        );
      return (
        matchedKeyword &&
        (modelNameFilter === "all" || model.modelName === modelNameFilter)
      );
    });
  }, [models, searchTerm, modelNameFilter]);

  const confirmDelete = async () => {
    if (!deleteModel) return;
    setDeleting(true);
    try {
      await deleteDeviceModel(deleteModel.id);
      setModels((items) =>
        items.filter((model) => model.id !== deleteModel.id),
      );
      toast.success(`模型「${deleteModel.modelName}」已删除`);
      setDeleteModel(null);
    } catch (requestError) {
      toast.error(
        requestError instanceof Error ? requestError.message : "删除模型失败",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-1 flex-col gap-4"
      >
        <TabsList
          aria-label="南向设备接入标签页"
          className="h-auto w-full max-w-2xl rounded-2xl bg-[#F3F4F6] p-1"
        >
          <TabsTrigger
            value="instances"
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black tracking-wider transition-all ${activeTab === "instances" ? "bg-white text-[#111827] shadow-sm" : "text-[#9CA3AF] hover:text-[#111827]"}`}
          >
            <Boxes className="size-3.5" />
            设备实例
          </TabsTrigger>
          <TabsTrigger
            value="models"
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black tracking-wider transition-all ${activeTab === "models" ? "bg-white text-[#111827] shadow-sm" : "text-[#9CA3AF] hover:text-[#111827]"}`}
          >
            <Database className="size-3.5" />
            设备模型
          </TabsTrigger>
        </TabsList>

        <div className="min-h-0 flex-1">
          <TabsContent value="instances" className="mt-0 h-full">
            <DeviceInstancesTab models={models} />
          </TabsContent>

          <TabsContent value="models" className="mt-0 space-y-6">
            <Card className="border-border/40 bg-card/60">
              <CardContent className="p-4">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <div className="relative w-full flex-1 sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") setSearchTerm(searchInput);
                      }}
                      placeholder="输入模型名称或标签，按 Enter 搜索"
                      className="h-9 pl-9 text-sm"
                    />
                  </div>
                  <Select
                    value={modelNameFilter}
                    onValueChange={setModelNameFilter}
                  >
                    <SelectTrigger className="h-9 w-[150px] text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部模型</SelectItem>
                      {modelNames.map((modelName) => (
                        <SelectItem key={modelName} value={modelName}>
                          {modelName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => toast.info("云端模型功能暂不支持")}
                    >
                      <Cloud className="mr-1 size-3.5" />
                      云端模型
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => setLocalImportOpen(true)}
                    >
                      <Archive className="mr-1 size-3.5" />
                      本地导入
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => setLocalExportOpen(true)}
                    >
                      <Download className="mr-1 size-3.5" />
                      本地导出
                    </Button>
                    <Button
                      size="sm"
                      className="h-9"
                      onClick={() => setAddOpen(true)}
                    >
                      <Plus className="mr-1 size-3.5" />
                      创建模型
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="size-4" />
                {error}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7"
                  onClick={() => void loadModels()}
                >
                  重试
                </Button>
              </div>
            )}
            {warnings.length > 0 && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                {warnings.map((warning) => (
                  <div key={warning}>{warning}</div>
                ))}
              </div>
            )}
            {loading ? (
              <div className="flex min-h-56 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                加载设备模型中…
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <AnimatePresence>
                    {filteredModels.map((model, index) => (
                      <motion.div
                        key={model.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                      >
                        <Card className="flex h-full flex-col border-border/40 bg-card/60 transition-colors hover:border-primary/30">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10">
                                  <ModelIcon
                                    model={model}
                                    className="size-full"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <CardTitle className="break-all whitespace-normal text-sm">
                                    {model.modelName}
                                  </CardTitle>
                                  <CardDescription className="text-xs">
                                    {model.deviceType} · {model.version || "-"}
                                  </CardDescription>
                                </div>
                              </div>
                              <SyncStatus model={model} />
                            </div>
                          </CardHeader>
                          <CardContent className="flex flex-1 flex-col">
                            <p className="mb-3 line-clamp-2 break-all text-xs text-muted-foreground">
                              {model.description || "暂无描述"}
                            </p>
                            <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                              <div className="min-w-0">
                                <span className="text-muted-foreground">
                                  厂商：
                                </span>
                                <span className="truncate">
                                  {model.deviceVendor || "-"}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <span className="text-muted-foreground">
                                  型号：
                                </span>
                                <span className="truncate">
                                  {model.deviceModel || "-"}
                                </span>
                              </div>
                              <div className="col-span-2 text-muted-foreground">
                                创建时间：
                                <DateTimeText value={model.createdAt} />
                              </div>
                            </div>
                            {modelTags(model).length > 0 && (
                              <div className="mb-3 flex flex-wrap gap-1">
                                {modelTags(model).map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <div className="mt-auto flex items-center gap-1.5 border-t border-border/30 pt-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setDetailModel(model)}
                              >
                                <Eye className="mr-1 size-3" />
                                查看
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setEditModel(model)}
                              >
                                <Pencil className="mr-1 size-3" />
                                编辑
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-auto h-7 text-xs text-destructive hover:text-destructive"
                                onClick={() => setDeleteModel(model)}
                              >
                                <Trash2 className="mr-1 size-3" />
                                删除
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                {filteredModels.length === 0 && (
                  <div className="py-16 text-center text-muted-foreground">
                    <Boxes className="mx-auto mb-3 size-12 opacity-20" />
                    <div className="text-sm font-medium">
                      没有找到匹配的设备模型
                    </div>
                  </div>
                )}
              </>
            )}

            <ModelDetailDialog
              model={detailModel}
              open={Boolean(detailModel)}
              onClose={() => setDetailModel(null)}
            />
            <EditModelDialog
              model={editModel}
              onClose={() => setEditModel(null)}
              onSaved={(model) => {
                setModels((items) =>
                  items.map((item) => (item.id === model.id ? model : item)),
                );
                setDetailModel((item) =>
                  item?.id === model.id ? model : item,
                );
                setEditModel((item) => (item?.id === model.id ? model : item));
              }}
            />
            <AddModelDialog
              open={addOpen}
              models={models}
              onClose={() => setAddOpen(false)}
              onCreated={(model) => {
                setModels((items) => [
                  model,
                  ...items.filter(
                    (item) =>
                      item.id !== model.id &&
                      item.pluginFile !== model.pluginFile,
                  ),
                ]);
                void loadModels();
              }}
            />
            <LocalImportDialog
              open={localImportOpen}
              onClose={() => setLocalImportOpen(false)}
              onCreated={(model) => {
                setModels((items) => [
                  model,
                  ...items.filter(
                    (item) =>
                      item.id !== model.id &&
                      item.pluginFile !== model.pluginFile,
                  ),
                ]);
                void loadModels();
              }}
            />
            <LocalExportDialog
              models={models}
              open={localExportOpen}
              onClose={() => setLocalExportOpen(false)}
            />
            <ConfirmDeleteDialog
              open={Boolean(deleteModel)}
              onOpenChange={(open) => !open && setDeleteModel(null)}
              title="确认删除设备模型"
              description={<>将删除「{deleteModel?.modelName}」设备模型及对应配置文件，且无法恢复。</>}
              loading={deleting}
              onConfirm={() => void confirmDelete()}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
