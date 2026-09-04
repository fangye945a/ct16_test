import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Cpu,
  Server,
  Monitor,
  Tablet,
  Clock,
  Activity,
  MapPin,
  Hash,
  Cable,
  RefreshCw,
  Database,
} from 'lucide-react';
import type { INetworkDevice, IDeviceNode } from '@/data/topology';
import { readDeviceInstance } from '@/api/deviceModels';

const DEVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CT16: Cpu, CT32: Server, CT33: Server, CT21B: Monitor, HarmonyPad: Tablet,
};

interface NodeDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  node: INetworkDevice | IDeviceNode | null;
  tab: 'network' | 'device';
  onDeviceNodeUpdate: (node: IDeviceNode) => void;
}

function isNetworkDevice(node: INetworkDevice | IDeviceNode): node is INetworkDevice {
  return 'role' in node;
}

type DeviceStatusValue = NonNullable<IDeviceNode['statusValues']>[number];

function formatStatusValue(value: unknown, item: DeviceStatusValue): string {
  if (value === null || value === undefined) return '--';
  if (item.isEnum) {
    const matched = item.values.find((candidate) => {
      try {
        return JSON.stringify(JSON.parse(candidate.valueJSON)) === JSON.stringify(value);
      } catch {
        return candidate.valueJSON === String(value);
      }
    });
    if (matched?.meaning) return matched.meaning;
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export default function NodeDetailDrawer({
  open,
  onClose,
  node,
  tab,
  onDeviceNodeUpdate,
}: NodeDetailDrawerProps) {
  const navigate = useNavigate();
  const [readError, setReadError] = useState('');
  const deviceNodeRef = useRef<IDeviceNode | null>(null);

  if (node && !isNetworkDevice(node)) {
    deviceNodeRef.current = node;
  }

  useEffect(() => {
    if (!node || isNetworkDevice(node)) {
      setReadError('');
      return;
    }
    setReadError(node.readError || '');
  }, [node]);

  useEffect(() => {
    if (!open || !node || isNetworkDevice(node)) return;

    let stopped = false;
    const readStatus = async () => {
      const current = deviceNodeRef.current;
      if (!current) return;
      try {
        const response = await readDeviceInstance(current.serialNumber);
        if (!response.success) {
          if (!stopped) {
            const error = response.error || `读取失败，错误码 ${response.code}`;
            setReadError(error);
            onDeviceNodeUpdate({ ...current, status: 'warning', readError: error });
          }
          return;
        }
        const payload = JSON.parse(response.info || '{}');
        if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
          throw new Error('返回数据格式无效');
        }
        const values = current.statusValues?.map((item) => ({
          ...item,
          value: formatStatusValue((payload as Record<string, unknown>)[item.id], item),
        }));
        if (!stopped) {
          setReadError('');
          onDeviceNodeUpdate({
            ...current,
            status: 'normal',
            readError: '',
            value: values?.[0]?.value || '--',
            statusValues: values,
            lastUpdate: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          });
        }
      } catch (error) {
        if (!stopped) {
          const message = error instanceof Error ? error.message : '读取失败';
          setReadError(message);
          onDeviceNodeUpdate({ ...current, status: 'warning', readError: message });
        }
      }
    };

    void readStatus();
    const timer = window.setInterval(() => void readStatus(), 1000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [open, node?.id, onDeviceNodeUpdate]);

  if (!node) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        className="w-[400px] sm:w-[480px] p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {isNetworkDevice(node) ? (
          <SheetHeader className="px-6 pt-6 pb-4">
            <SheetTitle className="text-lg font-black text-[#111827]">{node.name}</SheetTitle>
            <SheetDescription className="text-xs font-bold text-[#9CA3AF]">
              {node.deviceType}
            </SheetDescription>
          </SheetHeader>
        ) : (
          <SheetHeader className="sr-only">
            <SheetTitle>{node.name}</SheetTitle>
            <SheetDescription>{node.deviceType}</SheetDescription>
          </SheetHeader>
        )}

        <div className={`space-y-4 px-6 pb-6 ${isNetworkDevice(node) ? '' : 'pt-6'}`}>
          {isNetworkDevice(node) ? (
            <>
              {/* Network device detail */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F9FAFB] border border-[#F3F4F6]">
                {(() => {
                  const Icon = DEVICE_ICONS[node.model] || Cpu;
                  return (
                    <div className="size-14 rounded-2xl bg-[#00B894]/10 flex items-center justify-center shrink-0">
                      <Icon className="size-7 text-[#00B894]" />
                    </div>
                  );
                })()}
                <div>
                  <Badge className={`text-[10px] font-black uppercase mb-1 ${
                    node.role === 'master' ? 'bg-[#00B894] text-white' : 'bg-[#1F2937] text-white'
                  }`}>
                    {node.role === 'master' ? '主设备 · 本机' : '从设备'}
                  </Badge>
                  <div className="text-sm font-bold text-[#111827] mt-1">{node.model}</div>
                </div>
              </div>

              <Card className="p-4 rounded-[24px] border border-[#F3F4F6] shadow-sm">
                <div className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-3">网络信息</div>
                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9CA3AF] font-bold">IP 地址</span>
                    <span className="font-black text-[#111827] tabular-nums">{node.ip}</span>
                  </div>
                  <div className="flex items-start gap-3 border-t border-[#F3F4F6] pt-2.5 text-sm">
                    <span className="shrink-0 font-bold text-[#9CA3AF]">固件版本</span>
                    <span className="min-w-0 flex-1 break-all text-right font-black leading-5 text-[#111827] tabular-nums" title={node.firmware}>
                      {node.firmware}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 rounded-[24px] border border-[#F3F4F6] shadow-sm">
                <div className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-3">运行状态</div>
                <div className="flex items-center gap-3">
                  <span className={`size-3 rounded-full ${node.status === 'online' ? 'bg-[#00B894] animate-pulse' : 'bg-[#9CA3AF]'}`} />
                  <span className={`text-sm font-black ${node.status === 'online' ? 'text-[#00B894]' : 'text-[#9CA3AF]'}`}>
                    {node.status === 'online' ? '在线' : '离线'}
                  </span>
                </div>
              </Card>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-2xl border border-[#F3F4F6] bg-[#F9FAFB] p-4">
                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#00B894]/10">
                  {node.iconUrl ? (
                    <img src={node.iconUrl} alt="模型图标" className="size-full object-cover" />
                  ) : (
                    <Database className="size-7 text-[#00B894]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black text-[#111827]" title={node.name}>{node.name}</div>
                  <div className="mt-1 truncate text-xs font-bold text-[#9CA3AF]" title={node.deviceType}>
                    {node.deviceType}
                  </div>
                </div>
                <Badge className={`shrink-0 text-[10px] font-black uppercase ${
                  node.status === 'normal'
                    ? 'bg-[#00B894]/10 text-[#00B894]'
                    : node.status === 'warning'
                      ? 'bg-[#F97316]/10 text-[#F97316]'
                      : 'bg-[#9CA3AF]/10 text-[#9CA3AF]'
                }`}>
                  {node.status === 'normal' ? '正常' : node.status === 'warning' ? '异常' : '离线'}
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    onClose();
                    navigate('/device-models');
                  }}
                >
                  管理设备
                </Button>
              </div>

              {/* 实时数据 */}
              <Card className="p-4 rounded-[24px] border border-[#F3F4F6] shadow-sm">
                <div className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-3">实时数据</div>
                <div className="space-y-2.5">
                  {node.statusValues?.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4 text-sm">
                      <span className="min-w-0 flex-1 font-bold text-[#9CA3AF]">{item.name}</span>
                      <span className="max-w-[55%] break-words text-right font-black text-[#111827] tabular-nums">
                        {item.value}{item.unit && <span className="ml-1 text-xs text-[#9CA3AF]">{item.unit}</span>}
                      </span>
                    </div>
                  ))}
                  {!node.statusValues?.length && (
                    <div className="text-sm font-bold text-[#9CA3AF]">暂无状态点</div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[#9CA3AF]">
                  <RefreshCw className="size-3" />
                  <span>更新于 {node.lastUpdate}</span>
                </div>
              </Card>

              {/* 连接信息 */}
              <Card className="p-4 rounded-[24px] border border-[#F3F4F6] shadow-sm">
                <div className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-3">连接信息</div>
                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9CA3AF] font-bold flex items-center gap-1.5">
                      <Cable className="size-3.5" />接口类型
                    </span>
                    <span className="font-black text-[#111827]">{node.interfaceType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9CA3AF] font-bold flex items-center gap-1.5">
                      <Hash className="size-3.5" />SN号
                    </span>
                    <span className="font-black text-[#111827] text-xs">{node.serialNumber}</span>
                  </div>
                </div>
              </Card>

              {/* 位置与描述 */}
              <Card className="p-4 rounded-[24px] border border-[#F3F4F6] shadow-sm">
                <div className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-3">设备信息</div>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="size-3.5 text-[#9CA3AF] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[10px] font-bold text-[#9CA3AF]">安装位置</div>
                      <div className="font-black text-[#111827] text-xs mt-0.5">{node.location}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm pt-2 border-t border-[#F3F4F6]">
                    <Activity className="size-3.5 text-[#9CA3AF] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[10px] font-bold text-[#9CA3AF]">设备描述</div>
                      <div className="font-medium text-[#111827] text-xs mt-0.5 leading-relaxed">{node.description}</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* 运行状态 */}
              <Card className="p-4 rounded-[24px] border border-[#F3F4F6] shadow-sm">
                <div className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-3">运行状态</div>
                <div className="flex items-center gap-3">
                  <span className={`size-3 rounded-full ${
                    node.status === 'normal' ? 'bg-[#00B894] animate-pulse' :
                    node.status === 'warning' ? 'bg-[#F97316]' : 'bg-[#9CA3AF]'
                  }`} />
                  <span className={`text-sm font-black ${
                    node.status === 'normal' ? 'text-[#00B894]' :
                    node.status === 'warning' ? 'text-[#F97316]' : 'text-[#9CA3AF]'
                  }`}>
                    {node.status === 'normal' ? '运行正常' : node.status === 'warning' ? '运行异常' : '离线'}
                  </span>
                </div>
                {readError && (
                  <div className="mt-2 break-words text-xs font-bold leading-5 text-[#F97316]">
                    异常原因：{readError}
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-[#9CA3AF]">
                  <Clock className="size-3" />
                  <span>最后更新：{node.lastUpdate}</span>
                </div>
              </Card>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
