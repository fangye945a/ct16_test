import { useMemo, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, Layers3, RadioTower } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MOCK_DEVICE_NODES, type IDeviceNode } from '@/data/topology';

type DeviceGroup = {
  deviceType: string;
  devices: IDeviceNode[];
  x: number;
  y: number;
};

const STATUS_STYLE = {
  normal: { dot: 'bg-[#00B894]', text: 'text-[#00B894]', border: 'border-[#00B894]/25', line: '#00B894', label: '正常' },
  warning: { dot: 'bg-[#F97316]', text: 'text-[#F97316]', border: 'border-[#F97316]/25', line: '#F97316', label: '告警' },
  offline: { dot: 'bg-[#9CA3AF]', text: 'text-[#9CA3AF]', border: 'border-[#9CA3AF]/25', line: '#D1D5DB', label: '离线' },
};

const CANVAS_WIDTH = 1180;
const GROUP_X = 470;
const DEVICE_X = 850;
const TOP_PADDING = 96;
const GROUP_GAP = 138;
const DEVICE_GAP = 76;
const NODE_HEIGHT = 52;

function BuildDeviceGroups(devices: IDeviceNode[]): DeviceGroup[] {
  const grouped = devices.reduce<Record<string, IDeviceNode[]>>((acc, node) => {
    acc[node.deviceType] = [...(acc[node.deviceType] || []), node];
    return acc;
  }, {});

  return Object.entries(grouped).map(([deviceType, groupDevices], index) => ({
    deviceType,
    devices: groupDevices,
    x: GROUP_X,
    y: TOP_PADDING + index * GROUP_GAP,
  }));
}

function GetCanvasHeight(groups: DeviceGroup[]) {
  if (groups.length === 0) {
    return 560;
  }
  const lastGroup = groups[groups.length - 1];
  const lastDeviceCount = Math.max(1, lastGroup.devices.length);
  return Math.max(620, lastGroup.y + (lastDeviceCount - 1) * DEVICE_GAP + 150);
}

function GetDeviceY(group: DeviceGroup, index: number) {
  const offset = ((group.devices.length - 1) * DEVICE_GAP) / 2;
  return group.y + index * DEVICE_GAP - offset;
}

function ControllerNode() {
  return (
    <Card className="w-[220px] rounded-[28px] border-2 border-[#00B894]/25 bg-white p-4 shadow-lg">
      <Badge className="mb-3 rounded-full border-[#00B894] bg-[#00B894] px-3 py-1 text-[10px] font-black text-white">
        控制
      </Badge>
      <div className="flex items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#00B894]/10">
          <Cpu className="size-6 text-[#00B894]" />
        </div>
        <div>
          <div className="text-sm font-black text-[#111827]">CT16 在鸿控制器</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#00B894] animate-pulse" />
            <span className="text-[10px] font-black text-[#00B894]">运行中</span>
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[9px]">
        <div className="rounded-xl bg-[#F9FAFB] px-2 py-1">
          <div className="font-bold text-[#9CA3AF]">总线</div>
          <div className="font-black text-[#111827]">本地 IO</div>
        </div>
        <div className="rounded-xl bg-[#F9FAFB] px-2 py-1">
          <div className="font-bold text-[#9CA3AF]">状态</div>
          <div className="font-black text-[#00B894]">在线</div>
        </div>
      </div>
    </Card>
  );
}

function TypeNode({ group }: { group: DeviceGroup }) {
  const normalCount = group.devices.filter((device) => device.status === 'normal').length;
  const interfaceLabels = Array.from(new Set(group.devices.map((device) => device.interfaceType))).join(' / ');

  return (
    <Card className="w-[210px] rounded-[24px] border border-[#00B894]/20 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-[#00B894]/10">
            <Layers3 className="size-4 text-[#00B894]" />
          </div>
          <div>
            <div className="max-w-[130px] truncate text-xs font-black text-[#111827]">{group.deviceType}</div>
            <div className="text-[9px] font-bold text-[#9CA3AF]">{interfaceLabels}</div>
          </div>
        </div>
        <Badge variant="outline" className="rounded-full border-[#00B894]/30 px-2 py-0 text-[9px] font-black text-[#00B894]">
          {group.devices.length} 台
        </Badge>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-[#F9FAFB] px-2 py-1 text-[9px]">
        <span className="font-bold text-[#9CA3AF]">正常设备</span>
        <span className="font-black text-[#111827] tabular-nums">{normalCount}/{group.devices.length}</span>
      </div>
    </Card>
  );
}

function DeviceNodeCard({ node, onSelect }: { node: IDeviceNode; onSelect: (node: IDeviceNode) => void }) {
  const sc = STATUS_STYLE[node.status];

  return (
    <motion.button
      data-node
      type="button"
      initial={{ opacity: 0, x: 18 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.25 }}
      className="group text-left"
      onClick={() => onSelect(node)}
    >
      <Card className={`w-[260px] rounded-[22px] border bg-white p-3 shadow-sm transition-all duration-200 group-hover:border-[#00B894]/40 group-hover:shadow-md ${sc.border}`}>
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F9FAFB]">
            <RadioTower className={`size-4 ${sc.text}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-xs font-black text-[#111827]">{node.name}</span>
              <span className={`size-2 shrink-0 rounded-full ${sc.dot} ${node.status === 'normal' ? 'animate-pulse' : ''}`} />
            </div>
            <div className="mt-1 truncate text-[9px] font-bold text-[#9CA3AF]">SN {node.serialNumber}</div>
            <div className="mt-2 flex items-center justify-between border-t border-[#F3F4F6] pt-2">
              <span className="text-[9px] font-black text-[#9CA3AF]">{node.interfaceLabel}</span>
              <span className={`text-xs font-black tabular-nums ${sc.text}`}>
                {node.value}
                {node.unit && <span className="ml-0.5 text-[8px] opacity-70">{node.unit}</span>}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </motion.button>
  );
}

export default function DeviceTopology({ onNodeSelect }: { onNodeSelect: (node: IDeviceNode) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const devices = MOCK_DEVICE_NODES;
  const groups = useMemo(() => BuildDeviceGroups(devices), [devices]);
  const canvasHeight = GetCanvasHeight(groups);
  const controllerY = canvasHeight / 2;
  const normalCount = devices.filter((device) => device.status === 'normal').length;
  const warningCount = devices.filter((device) => device.status === 'warning').length;
  const offlineCount = devices.filter((device) => device.status === 'offline').length;

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
          <span className="text-[10px] font-black uppercase tracking-wider text-[#111827]">树状设备拓扑</span>
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
        className="relative h-[620px] w-full cursor-grab overflow-hidden active:cursor-grabbing"
        style={{ background: 'radial-gradient(circle at center, #F3F4F6 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="absolute left-1/2 top-0 transition-transform duration-75"
          style={{ width: CANVAS_WIDTH, height: canvasHeight, transform: `translate(calc(-50% + ${pan.x}px), ${pan.y}px) scale(${scale})`, transformOrigin: 'center top' }}
        >
          <svg className="absolute inset-0 h-full w-full pointer-events-none">
            <defs>
              <marker id="device-tree-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M 0 0 L 8 4 L 0 8 z" fill="#00B894" opacity="0.65" />
              </marker>
            </defs>
            {groups.map((group) => (
              <g key={`group-line-${group.deviceType}`}>
                <path
                  d={`M 320 ${controllerY} C 380 ${controllerY}, 390 ${group.y}, ${group.x - 112} ${group.y}`}
                  fill="none"
                  stroke="#00B894"
                  strokeWidth="1.5"
                  opacity="0.32"
                  markerEnd="url(#device-tree-arrow)"
                />
                {group.devices.map((device, index) => {
                  const deviceY = GetDeviceY(group, index);
                  const sc = STATUS_STYLE[device.status];
                  return (
                    <path
                      key={`device-line-${device.id}`}
                      d={`M ${group.x + 108} ${group.y} C ${group.x + 190} ${group.y}, ${DEVICE_X - 150} ${deviceY}, ${DEVICE_X - 132} ${deviceY}`}
                      fill="none"
                      stroke={sc.line}
                      strokeWidth="1.3"
                      opacity={device.status === 'offline' ? 0.24 : 0.38}
                      strokeDasharray={device.status === 'normal' ? 'none' : '5 4'}
                    />
                  );
                })}
              </g>
            ))}
          </svg>

          <div className="absolute" style={{ left: 88, top: controllerY - 68 }}>
            <ControllerNode />
          </div>

          {groups.map((group) => (
            <div key={group.deviceType} data-node className="absolute" style={{ left: group.x - 105, top: group.y - NODE_HEIGHT / 2 }}>
              <TypeNode group={group} />
            </div>
          ))}

          {groups.flatMap((group) =>
            group.devices.map((device, index) => (
              <div key={device.id} className="absolute" style={{ left: DEVICE_X - 130, top: GetDeviceY(group, index) - 42 }}>
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
