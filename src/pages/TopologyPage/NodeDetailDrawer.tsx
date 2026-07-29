import { motion } from 'framer-motion';
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
  Wifi,
  WifiOff,
  Gauge,
  Zap,
  Thermometer,
  Droplets,
  Power,
  ToggleLeft,
  Lightbulb,
  Radio,
  Waves,
  ArrowUpDown,
  ArrowRight,
  MapPin,
  Hash,
  Cable,
  RefreshCw,
} from 'lucide-react';
import type { INetworkDevice, IDeviceNode } from '@/data/topology';

const DEVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CT16: Cpu, CT32: Server, CT33: Server, CT21B: Monitor, HarmonyPad: Tablet,
};

const SUB_DEVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '温度传感器': Thermometer, '湿度传感器': Droplets, '电磁流量计': Waves,
  '压力变送器': Gauge, '液位传感器': ArrowUpDown, '按钮开关': ToggleLeft,
  '旋钮开关': ToggleLeft, '接近开关': Radio, '接触器': Power, '指示灯': Lightbulb,
  '电动调节阀': Zap, '风机': Power, '变频电机': Zap, '信号灯': Lightbulb,
  'PLC控制器': Cpu, '工业显示屏': Monitor,
};

interface NodeDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  node: INetworkDevice | IDeviceNode | null;
  tab: 'network' | 'device';
}

function isNetworkDevice(node: INetworkDevice | IDeviceNode): node is INetworkDevice {
  return 'role' in node;
}

export default function NodeDetailDrawer({ open, onClose, node, tab }: NodeDetailDrawerProps) {
  const navigate = useNavigate();
  if (!node) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[400px] sm:w-[480px] p-0">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="text-lg font-black text-[#111827]">
            {isNetworkDevice(node) ? node.name : node.name}
          </SheetTitle>
          <SheetDescription className="text-xs font-bold text-[#9CA3AF]">
            {isNetworkDevice(node) ? node.deviceType : node.deviceType}
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 pb-6 space-y-4">
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
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9CA3AF] font-bold">固件版本</span>
                    <span className="font-black text-[#111827]">{node.firmware}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9CA3AF] font-bold">运行时长</span>
                    <span className="font-black text-[#111827]">{node.uptime}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9CA3AF] font-bold">吞吐量</span>
                    <span className="font-black text-[#111827]">{node.throughput}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9CA3AF] font-bold">延迟</span>
                    <span className="font-black text-[#111827]">{node.latency}ms</span>
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
              {/* Sub-device detail - expanded */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F9FAFB] border border-[#F3F4F6]">
                {(() => {
                  const Icon = SUB_DEVICE_ICONS[node.deviceType] || Zap;
                  const sc = node.status === 'normal'
                    ? 'bg-[#00B894]/10 text-[#00B894]'
                    : node.status === 'warning'
                      ? 'bg-[#F97316]/10 text-[#F97316]'
                      : 'bg-[#9CA3AF]/10 text-[#9CA3AF]';
                  return (
                    <div className={`size-14 rounded-2xl flex items-center justify-center shrink-0 ${sc}`}>
                      <Icon className="size-7" />
                    </div>
                  );
                })()}
                <div>
                  <Badge className={`text-[10px] font-black uppercase ${
                    node.status === 'normal'
                      ? 'bg-[#00B894]/10 text-[#00B894]'
                      : node.status === 'warning'
                        ? 'bg-[#F97316]/10 text-[#F97316]'
                        : 'bg-[#9CA3AF]/10 text-[#9CA3AF]'
                  }`}>
                    {node.status === 'normal' ? '正常' : node.status === 'warning' ? '告警' : '离线'}
                  </Badge>
                  <div className="text-sm font-bold text-[#111827] mt-1">{node.deviceType}</div>
                </div>
                <Button variant="outline" size="sm" className="ml-auto shrink-0 text-xs" onClick={() => navigate('/device-models')}>
                  管理设备
                  <ArrowRight className="ml-1 size-3.5" />
                </Button>
              </div>

              {/* 实时数据 */}
              <Card className="p-4 rounded-[24px] border border-[#F3F4F6] shadow-sm">
                <div className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-3">实时数据</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-[#111827] tabular-nums">{node.value}</span>
                  {node.unit && <span className="text-lg font-bold text-[#9CA3AF]">{node.unit}</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-[#9CA3AF]">
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
                      <Hash className="size-3.5" />接口编号
                    </span>
                    <span className="font-black text-[#111827]">{node.interfaceLabel}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9CA3AF] font-bold flex items-center gap-1.5">
                      <Hash className="size-3.5" />SN号
                    </span>
                    <span className="font-black text-[#111827] text-xs">{node.serialNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9CA3AF] font-bold flex items-center gap-1.5">
                      <Hash className="size-3.5" />设备地址
                    </span>
                    <span className="font-black text-[#111827] text-xs">{node.address}</span>
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
                    {node.status === 'normal' ? '运行正常' : node.status === 'warning' ? '告警' : '离线'}
                  </span>
                </div>
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
