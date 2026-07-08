import { useMemo, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Activity, ChevronDown, ChevronRight, Cpu, Layers3, RadioTower } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MOCK_DEVICE_NODES, type IDeviceNode } from '@/data/topology';

type DeviceGroup = {
  deviceType: string;
  devices: IDeviceNode[];
  x: number;
};

const STATUS_STYLE = {
  normal: { dot: 'bg-[#00B894]', text: 'text-[#00B894]', border: 'border-[#00B894]/25', line: '#00B894', label: '正常' },
  warning: { dot: 'bg-[#F97316]', text: 'text-[#F97316]', border: 'border-[#F97316]/25', line: '#F97316', label: '告警' },
  offline: { dot: 'bg-[#9CA3AF]', text: 'text-[#9CA3AF]', border: 'border-[#9CA3AF]/25', line: '#D1D5DB', label: '离线' },
};

const CANVAS_WIDTH = 1180;
const CANVAS_HEIGHT = 640;
const CONTROLLER_X = CANVAS_WIDTH / 2;
const CONTROLLER_Y = 78;
const TYPE_Y = 274;
const DEVICE_Y = 500;
const TYPE_WIDTH = 210;
const DEVICE_WIDTH = 188;
const GROUP_X_LIST = [170, 410, 650, 890];

function BuildDeviceGroups(devices: IDeviceNode[]): DeviceGroup[] {
  const order = ['温湿度传感器', '执行器', '输入设备', 'PLC控制器'];
  const grouped = devices.reduce<Record<string, IDeviceNode[]>>((acc, node) => {
    acc[node.deviceType] = [...(acc[node.deviceType] || []), node];
    return acc;
  }, {});

  return order
    .filter((deviceType) => grouped[deviceType]?.length)
    .map((deviceType, index) => ({
      deviceType,
      devices: grouped[deviceType],
      x: GROUP_X_LIST[index] ?? 170 + index * 240,
    }));
}

function GetDeviceX(group: DeviceGroup, index: number) {
  const gap = 82;
  const offset = ((group.devices.length - 1) * gap) / 2;
  return group.x - offset + index * gap;
}

function ControllerNode() {
  return (
    <Card className="w-[240px] rounded-[28px] border-2 border-[#00B894]/25 bg-white p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <Badge className="rounded-full border-[#00B894] bg-[#00B894] px-3 py-1 text-[10px] font-black text-white">
          控制
        </Badge>
        <span className="flex items-center gap-1 text-[10px] font-black text-[#00B894]">
          <span className="size-2 rounded-full bg-[#00B894] animate-pulse" />
          运行中
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#00B894]/10">
          <Cpu className="size-6 text-[#00B894]" />
        </div>
        <div>
          <div className="text-sm font-black text-[#111827]">CT16 在鸿控制器</div>
          <div className="mt-1 text-[10px] font-bold text-[#9CA3AF]">下游设备树根节点</div>
        </div>
      </div>
    </Card>
  );
}

function TypeNode({
  group,
  collapsed,
  onToggle,
}: {
  group: DeviceGroup;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const normalCount = group.devices.filter((device) => device.status === 'normal').length;
  const interfaceLabels = Array.from(new Set(group.devices.map((device) => device.interfaceType))).join(' / ');
  const ToggleIcon = collapsed ? ChevronRight : ChevronDown;

  return (
    <motion.button
      data-node
      type="button"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.25 }}
      className="group text-left"
      onClick={onToggle}
    >
      <Card className="w-[210px] rounded-[24px] border border-[#00B894]/20 bg-white p-3 shadow-sm transition-all group-hover:border-[#00B894]/40 group-hover:shadow-md">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-[#00B894]/10">
              <Layers3 className="size-4 text-[#00B894]" />
            </div>
            <div>
              <div className="max-w-[120px] truncate text-xs font-black text-[#111827]">{group.deviceType}</div>
              <div className="text-[9px] font-bold text-[#9CA3AF]">{interfaceLabels}</div>
            </div>
          </div>
          <ToggleIcon className="size-4 text-[#9CA3AF] transition-colors group-hover:text-[#00B894]" />
        </div>
        <div className="flex items-center justify-between rounded-xl bg-[#F9FAFB] px-2 py-1 text-[9px]">
          <span className="font-bold text-[#9CA3AF]">正常设备</span>
          <span className="font-black text-[#111827] tabular-nums">{normalCount}/{group.devices.length}</span>
        </div>
        <Badge variant="outline" className="mt-2 rounded-full border-[#00B894]/30 px-2 py-0 text-[9px] font-black text-[#00B894]">
          {collapsed ? `已折叠 ${group.devices.length} 台` : `${group.devices.length} 台设备`}
        </Badge>
      </Card>
    </motion.button>
  );
}

function DeviceNodeCard({ node, onSelect }: { node: IDeviceNode; onSelect: (node: IDeviceNode) => void }) {
  const sc = STATUS_STYLE[node.status];

  return (
    <motion.button
      data-node
      type="button"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.25 }}
      className="group text-left"
      onClick={() => onSelect(node)}
    >
      <Card className={`w-[188px] rounded-[20px] border bg-white p-3 shadow-sm transition-all duration-200 group-hover:border-[#00B894]/40 group-hover:shadow-md ${sc.border}`}>
        <div className="mb-2 flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#F9FAFB]">
            <RadioTower className={`size-4 ${sc.text}`} />
          </div>
          <span className={`size-2 shrink-0 rounded-full ${sc.dot} ${node.status === 'normal' ? 'animate-pulse' : ''}`} />
          <span className={`ml-auto text-[9px] font-black ${sc.text}`}>{sc.label}</span>
        </div>
        <div className="truncate text-xs font-black text-[#111827]">{node.serialNumber}</div>
        <div className="mt-2 flex items-center justify-between border-t border-[#F3F4F6] pt-2">
          <span className="text-[9px] font-black text-[#9CA3AF]">{node.interfaceLabel}</span>
          <span className={`max-w-[92px] truncate text-[10px] font-black tabular-nums ${sc.text}`}>
            {node.value}
            {node.unit && <span className="ml-0.5 text-[8px] opacity-70">{node.unit}</span>}
          </span>
        </div>
      </Card>
    </motion.button>
  );
}

function OrthogonalConnector({ d, color = '#00B894', opacity = 0.34, dashed = false }: { d: string; color?: string; opacity?: number; dashed?: boolean }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      opacity={opacity}
      strokeDasharray={dashed ? '5 4' : undefined}
      strokeLinejoin="round"
      strokeLinecap="square"
    />
  );
}

export default function DeviceTopology({ onNodeSelect }: { onNodeSelect: (node: IDeviceNode) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [collapsedTypes, setCollapsedTypes] = useState<Record<string, boolean>>({});
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const devices = MOCK_DEVICE_NODES;
  const groups = useMemo(() => BuildDeviceGroups(devices), [devices]);
  const normalCount = devices.filter((device) => device.status === 'normal').length;
  const warningCount = devices.filter((device) => device.status === 'warning').length;
  const offlineCount = devices.filter((device) => device.status === 'offline').length;
  const visibleGroups = groups.filter((group) => !collapsedTypes[group.deviceType]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((prev) => Math.min(2, Math.max(0.35, prev - e.deltaY * 0.001)));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-node]')) {
        return;
      }
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) {
        return;
      }
      setPan({
        x: dragStart.current.panX + (e.clientX - dragStart.current.x),
        y: dragStart.current.panY + (e.clientY - dragStart.current.y),
      });
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  const zoomIn = () => setScale((value) => Math.min(2, value + 0.15));
  const zoomOut = () => setScale((value) => Math.max(0.35, value - 0.15));
  const resetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };
  const toggleType = (deviceType: string) => {
    setCollapsedTypes((prev) => ({ ...prev, [deviceType]: !prev[deviceType] }));
  };

  const firstGroupX = groups[0]?.x ?? CONTROLLER_X;
  const lastGroupX = groups[groups.length - 1]?.x ?? CONTROLLER_X;

  return (
    <div className="relative overflow-hidden rounded-[48px] border border-[#F3F4F6] bg-white shadow-sm">
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <button onClick={zoomIn} className="flex size-9 items-center justify-center rounded-2xl border border-[#F3F4F6] bg-[#F9FAFB] text-sm font-black text-[#9CA3AF] transition-all hover:border-[#00B894]/30 hover:text-[#00B894]">+</button>
        <button onClick={zoomOut} className="flex size-9 items-center justify-center rounded-2xl border border-[#F3F4F6] bg-[#F9FAFB] text-sm font-black text-[#9CA3AF] transition-all hover:border-[#00B894]/30 hover:text-[#00B894]">-</button>
        <button onClick={resetView} className="rounded-2xl border border-[#F3F4F6] bg-[#F9FAFB] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] transition-all hover:border-[#00B894]/30 hover:text-[#00B894]">适应</button>
      </div>

      <div className="absolute left-4 top-4 z-20 flex items-center gap-3 rounded-2xl border border-[#F3F4F6] bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <Activity className="size-3.5 text-[#00B894]" />
          <span className="text-[10px] font-black uppercase tracking-wider text-[#111827]">三层设备树</span>
        </div>
        <span className="h-4 w-px bg-[#F3F4F6]" />
        <span className="text-[10px] font-black text-[#9CA3AF]">
          <span className="text-[#00B894]">{devices.length}</span> 台设备
        </span>
        <span className="h-4 w-px bg-[#F3F4F6]" />
        <span className="text-[10px] font-black text-[#9CA3AF]">{groups.length} 类设备</span>
      </div>

      <div
        ref={containerRef}
        className="relative h-[640px] w-full cursor-grab overflow-hidden active:cursor-grabbing"
        style={{ background: 'radial-gradient(circle at center, #F3F4F6 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="absolute left-1/2 top-0 transition-transform duration-75"
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, transform: `translate(calc(-50% + ${pan.x}px), ${pan.y}px) scale(${scale})`, transformOrigin: 'center top' }}
        >
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            <OrthogonalConnector d={`M ${CONTROLLER_X} 150 L ${CONTROLLER_X} 206 L ${firstGroupX} 206 L ${lastGroupX} 206`} opacity={0.28} />
            {groups.map((group) => {
              const isCollapsed = collapsedTypes[group.deviceType];
              return (
                <g key={`type-line-${group.deviceType}`}>
                  <OrthogonalConnector d={`M ${group.x} 206 L ${group.x} ${TYPE_Y - 62}`} opacity={0.38} />
                  {!isCollapsed && (
                    <OrthogonalConnector d={`M ${group.x} ${TYPE_Y + 64} L ${group.x} 392`} opacity={0.3} />
                  )}
                </g>
              );
            })}
            {visibleGroups.map((group) => {
              const firstDeviceX = GetDeviceX(group, 0);
              const lastDeviceX = GetDeviceX(group, group.devices.length - 1);
              return (
                <g key={`device-lines-${group.deviceType}`}>
                  <OrthogonalConnector d={`M ${firstDeviceX} 392 L ${lastDeviceX} 392`} opacity={0.24} />
                  {group.devices.map((device, index) => {
                    const deviceX = GetDeviceX(group, index);
                    const sc = STATUS_STYLE[device.status];
                    return (
                      <OrthogonalConnector
                        key={`device-line-${device.id}`}
                        d={`M ${deviceX} 392 L ${deviceX} ${DEVICE_Y - 52}`}
                        color={sc.line}
                        opacity={device.status === 'offline' ? 0.24 : 0.42}
                        dashed={device.status !== 'normal'}
                      />
                    );
                  })}
                </g>
              );
            })}
          </svg>

          <div className="absolute" style={{ left: CONTROLLER_X - 120, top: CONTROLLER_Y - 68 }}>
            <ControllerNode />
          </div>

          {groups.map((group) => (
            <div key={group.deviceType} className="absolute" style={{ left: group.x - TYPE_WIDTH / 2, top: TYPE_Y - 58 }}>
              <TypeNode group={group} collapsed={!!collapsedTypes[group.deviceType]} onToggle={() => toggleType(group.deviceType)} />
            </div>
          ))}

          {visibleGroups.flatMap((group) =>
            group.devices.map((device, index) => (
              <div key={device.id} className="absolute" style={{ left: GetDeviceX(group, index) - DEVICE_WIDTH / 2, top: DEVICE_Y - 44 }}>
                <DeviceNodeCard node={device} onSelect={onNodeSelect} />
              </div>
            )),
          )}
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-4 rounded-2xl border border-[#F3F4F6] bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#00B894] animate-pulse" />
          <span className="text-[10px] font-black uppercase text-[#9CA3AF]">正常 {normalCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#F97316]" />
          <span className="text-[10px] font-black uppercase text-[#9CA3AF]">告警 {warningCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#9CA3AF]" />
          <span className="text-[10px] font-black uppercase text-[#9CA3AF]">离线 {offlineCount}</span>
        </div>
      </div>
    </div>
  );
}
