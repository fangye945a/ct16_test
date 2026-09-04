import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Cpu, Database, Loader2, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type IDeviceNode } from '@/data/topology';
import { useDeviceTopology } from '@/hooks/useDeviceTopology';
import { BrandLogo } from '@/components/BrandLogo';
import { CT16_APPEARANCE_EVENT, getCt16Appearance, type Ct16Appearance } from '@/lib/appearance';

type DeviceGroup = {
  deviceType: string;
  devices: IDeviceNode[];
  x: number;
  width: number;
  collapsed: boolean;
};

const STATUS_STYLE = {
  normal: { dot: 'bg-[#00B894]', text: 'text-[#00B894]', border: 'border-[#00B894]/25', line: '#00B894', label: '正常' },
  warning: { dot: 'bg-[#F97316]', text: 'text-[#F97316]', border: 'border-[#F97316]/25', line: '#F97316', label: '异常' },
  offline: { dot: 'bg-[#9CA3AF]', text: 'text-[#9CA3AF]', border: 'border-[#9CA3AF]/25', line: '#D1D5DB', label: '离线' },
};

const MIN_CANVAS_WIDTH = 1180;
const CANVAS_HEIGHT = 640;
const CONTROLLER_Y = 78;
const TYPE_Y = 240;
const DEVICE_Y = 448;
const DEVICE_BRANCH_Y = 348;
const TYPE_WIDTH = 210;
const DEVICE_WIDTH = 220;
const DEVICE_GAP = 24;
const GROUP_GAP = 56;
const CANVAS_PADDING = 80;

function GetGroupWidth(devices: IDeviceNode[], collapsed: boolean) {
  if (collapsed) {
    return TYPE_WIDTH;
  }
  return Math.max(TYPE_WIDTH, devices.length * DEVICE_WIDTH + (devices.length - 1) * DEVICE_GAP);
}

function BuildDeviceGroups(devices: IDeviceNode[], collapsedTypes: Record<string, boolean>): DeviceGroup[] {
  const preferredOrder = ['温湿度传感器', '执行器', '输入设备', 'PLC控制器'];
  const grouped = devices.reduce<Record<string, IDeviceNode[]>>((acc, node) => {
    acc[node.deviceType] = [...(acc[node.deviceType] || []), node];
    return acc;
  }, {});
  const order = [
    ...preferredOrder.filter((deviceType) => grouped[deviceType]?.length),
    ...Object.keys(grouped)
      .filter((deviceType) => !preferredOrder.includes(deviceType))
      .sort((left, right) => left.localeCompare(right, 'zh-CN')),
  ];

  let cursor = CANVAS_PADDING;
  return order.map((deviceType) => {
      const groupDevices = grouped[deviceType];
      const collapsed = !!collapsedTypes[deviceType];
      const width = GetGroupWidth(groupDevices, collapsed);
      const group = {
        deviceType,
        devices: groupDevices,
        x: cursor + width / 2,
        width,
        collapsed,
      };
      cursor += width + GROUP_GAP;
      return group;
    });
}

function GetCanvasWidth(groups: DeviceGroup[]) {
  if (groups.length === 0) {
    return MIN_CANVAS_WIDTH;
  }
  const contentWidth = groups.reduce((sum, group) => sum + group.width, 0) + (groups.length - 1) * GROUP_GAP + CANVAS_PADDING * 2;
  return Math.max(MIN_CANVAS_WIDTH, contentWidth);
}

function GetDeviceX(group: DeviceGroup, index: number) {
  const groupStart = group.x - group.width / 2;
  return groupStart + DEVICE_WIDTH / 2 + index * (DEVICE_WIDTH + DEVICE_GAP);
}

function ControllerNode({
  appearance,
  totalCount,
  typeCount,
}: {
  appearance: Ct16Appearance;
  totalCount: number;
  typeCount: number;
}) {
  return (
    <Card className="w-[280px] rounded-[28px] border-2 border-[#00B894]/25 bg-white p-4 shadow-lg">
      <div className="flex items-center gap-3">
        <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${appearance.logoType === 'custom' ? 'bg-transparent' : 'bg-[#00B894]/10'}`}>
          <BrandLogo
            logoType={appearance.logoType}
            logoImage={appearance.logoImage}
            className="size-6 text-[#00B894]"
          />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-black text-[#111827]">CT16 在鸿控制器</div>
            <span className="flex items-center gap-1.5 whitespace-nowrap text-xs font-black text-[#00B894]">
              <span className="size-2 rounded-full bg-[#00B894] animate-pulse" />
              运行中
            </span>
          </div>
          <div className="mt-1 text-xs font-bold text-[#9CA3AF]">
            {totalCount} 台设备 {typeCount} 类设备
          </div>
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
  const model = group.devices[0];
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
              {model?.iconUrl ? (
                <img src={model.iconUrl} alt="模型图标" className="size-6 object-cover" />
              ) : (
                <Database className="size-4 text-[#00B894]" />
              )}
            </div>
            <div>
              <div className="max-w-[140px] truncate text-sm font-black text-[#111827]">
                {model?.modelName || group.deviceType}
              </div>
            </div>
          </div>
          <ToggleIcon className="size-4 text-[#9CA3AF] transition-colors group-hover:text-[#00B894]" />
        </div>
        <div className="flex items-center justify-between rounded-xl bg-[#F9FAFB] px-2 py-1 text-xs">
          <span className="font-bold text-[#9CA3AF]">正常设备</span>
          <span className="font-black text-[#111827] tabular-nums">{normalCount}/{group.devices.length}</span>
        </div>
        <Badge variant="outline" className="mt-2 rounded-full border-[#00B894]/30 px-2 py-0 text-xs font-black text-[#00B894]">
          {collapsed ? `已折叠 ${group.devices.length} 台` : `${group.devices.length} 台设备`}
        </Badge>
      </Card>
    </motion.button>
  );
}

function DeviceNodeCard({
  node,
  onSelect,
}: {
  node: IDeviceNode;
  onSelect: (node: IDeviceNode) => void;
}) {
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
      <Card className={`w-[220px] rounded-[20px] border bg-white p-3 shadow-sm transition-all duration-200 group-hover:border-[#00B894]/40 group-hover:shadow-md ${sc.border}`}>
        <div className="mb-2 flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F9FAFB]">
            {node.iconUrl ? (
              <img src={node.iconUrl} alt="模型图标" className="size-full object-cover" />
            ) : (
              <Database className={`size-4 ${sc.text}`} />
            )}
          </div>
          <span className="min-w-0 flex-1 truncate text-sm font-black text-[#111827]" title={node.name}>
            {node.name}
          </span>
          <span className={`flex shrink-0 items-center gap-1 text-xs font-black ${sc.text}`}>
            <span className={`size-2 rounded-full ${sc.dot} ${node.status === 'normal' ? 'animate-pulse' : ''}`} />
            {sc.label}
          </span>
        </div>
        <div className="truncate text-sm font-black text-[#111827]">{node.serialNumber}</div>
        <div className="mt-2 space-y-1.5 border-t border-[#F3F4F6] pt-2">
          {node.statusValues?.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-2 text-xs">
              <span className="min-w-0 flex-1 text-[#9CA3AF]">{item.name}</span>
              <span className={`max-w-[100px] break-words text-right font-black tabular-nums ${sc.text}`}>
                {item.value}
                {item.unit && <span className="ml-0.5 text-[9px] opacity-70">{item.unit}</span>}
              </span>
            </div>
          ))}
          {!node.statusValues?.length && (
            <div className="text-xs font-bold text-[#9CA3AF]">未定义状态点</div>
          )}
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

export default function DeviceTopology({
  active,
  onNodeSelect,
}: {
  active: boolean;
  onNodeSelect: (node: IDeviceNode, updateNode: (node: IDeviceNode) => void) => void;
}) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [collapsedTypes, setCollapsedTypes] = useState<Record<string, boolean>>({});
  const [appearance, setAppearance] = useState(getCt16Appearance);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const {
    nodes: devices,
    normalCount,
    warningCount,
    offlineCount,
    totalCount,
    loading,
    error,
    refresh,
    updateNode,
  } = useDeviceTopology(active);

  useEffect(() => {
    const syncAppearance = () => setAppearance(getCt16Appearance());
    window.addEventListener(CT16_APPEARANCE_EVENT, syncAppearance);
    return () => window.removeEventListener(CT16_APPEARANCE_EVENT, syncAppearance);
  }, []);

  const groups = useMemo(() => BuildDeviceGroups(devices, collapsedTypes), [devices, collapsedTypes]);
  const canvasWidth = GetCanvasWidth(groups);
  const controllerX = canvasWidth / 2;
  const visibleGroups = groups.filter((group) => !group.collapsed);

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

  const firstGroupX = groups[0]?.x ?? controllerX;
  const lastGroupX = groups[groups.length - 1]?.x ?? controllerX;

  if (loading && devices.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-[48px] border border-[#F3F4F6] bg-white shadow-sm">
        <div className="flex items-center justify-center h-[640px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 text-[#00B894] animate-spin" />
            <span className="text-sm font-bold text-[#9CA3AF]">正在加载系统拓扑...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && devices.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-[48px] border border-[#F3F4F6] bg-white shadow-sm">
        <div className="flex items-center justify-center h-[640px]">
          <div className="flex flex-col items-center gap-3 max-w-md text-center">
            <Cpu className="size-8 text-[#9CA3AF]" />
            <span className="text-sm font-bold text-[#9CA3AF]">{error}</span>
            <button
              onClick={refresh}
              className="px-4 py-2 rounded-2xl bg-[#00B894]/10 text-sm font-black text-[#00B894] hover:bg-[#00B894]/20 transition-all"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-[48px] border border-[#F3F4F6] bg-white shadow-sm">
        <div className="flex items-center justify-center h-[640px]">
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <Cpu className="size-8 text-[#9CA3AF]" />
            <div>
              <p className="text-sm font-bold text-[#374151]">暂未发现设备实例</p>
              <p className="mt-1 text-xs text-[#9CA3AF]">添加设备实例后，可在这里查看设备拓扑关系。</p>
            </div>
            <Button
              type="button"
              size="sm"
              className="mt-1"
              onClick={() => navigate('/device-models')}
            >
              <Plus className="mr-1 size-3.5" />
              添加设备实例
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[48px] border border-[#F3F4F6] bg-white shadow-sm">
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <button onClick={zoomIn} className="flex size-9 items-center justify-center rounded-2xl border border-[#F3F4F6] bg-[#F9FAFB] text-sm font-black text-[#9CA3AF] transition-all hover:border-[#00B894]/30 hover:text-[#00B894]">+</button>
        <button onClick={zoomOut} className="flex size-9 items-center justify-center rounded-2xl border border-[#F3F4F6] bg-[#F9FAFB] text-sm font-black text-[#9CA3AF] transition-all hover:border-[#00B894]/30 hover:text-[#00B894]">-</button>
        <button onClick={resetView} className="rounded-2xl border border-[#F3F4F6] bg-[#F9FAFB] px-3 py-2 text-sm font-black uppercase tracking-widest text-[#9CA3AF] transition-all hover:border-[#00B894]/30 hover:text-[#00B894]">适应</button>
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
          style={{ width: canvasWidth, height: CANVAS_HEIGHT, transform: `translate(calc(-50% + ${pan.x}px), ${pan.y}px) scale(${scale})`, transformOrigin: 'center top' }}
        >
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            <OrthogonalConnector d={`M ${controllerX} 122 L ${controllerX} 164 L ${firstGroupX} 164 L ${lastGroupX} 164`} opacity={0.28} />
            {groups.map((group) => {
              return (
                <g key={`type-line-${group.deviceType}`}>
                  <OrthogonalConnector d={`M ${group.x} 206 L ${group.x} ${TYPE_Y - 62}`} opacity={0.38} />
                  {!group.collapsed && (
                    <OrthogonalConnector d={`M ${group.x} ${TYPE_Y + 64} L ${group.x} ${DEVICE_BRANCH_Y}`} opacity={0.3} />
                  )}
                </g>
              );
            })}
            {visibleGroups.map((group) => {
              const firstDeviceX = GetDeviceX(group, 0);
              const lastDeviceX = GetDeviceX(group, group.devices.length - 1);
              return (
                <g key={`device-lines-${group.deviceType}`}>
                  <OrthogonalConnector d={`M ${firstDeviceX} ${DEVICE_BRANCH_Y} L ${lastDeviceX} ${DEVICE_BRANCH_Y}`} opacity={0.24} />
                  {group.devices.map((device, index) => {
                    const deviceX = GetDeviceX(group, index);
                    const sc = STATUS_STYLE[device.status];
                    return (
                      <OrthogonalConnector
                        key={`device-line-${device.id}`}
                        d={`M ${deviceX} ${DEVICE_BRANCH_Y} L ${deviceX} ${DEVICE_Y - 52}`}
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

          <div className="absolute" style={{ left: controllerX - 140, top: CONTROLLER_Y - 48 }}>
            <ControllerNode appearance={appearance} totalCount={totalCount} typeCount={groups.length} />
          </div>

          {groups.map((group) => (
            <div key={group.deviceType} className="absolute" style={{ left: group.x - TYPE_WIDTH / 2, top: TYPE_Y - 58 }}>
              <TypeNode group={group} collapsed={!!collapsedTypes[group.deviceType]} onToggle={() => toggleType(group.deviceType)} />
            </div>
          ))}

          {visibleGroups.flatMap((group) =>
            group.devices.map((device, index) => (
              <div key={device.id} className="absolute" style={{ left: GetDeviceX(group, index) - DEVICE_WIDTH / 2, top: DEVICE_Y - 44 }}>
                <DeviceNodeCard node={device} onSelect={(node) => onNodeSelect(node, updateNode)} />
              </div>
            )),
          )}
        </div>
      </div>

      <div className="absolute left-4 top-4 z-20 flex items-center gap-4 rounded-2xl border border-[#F3F4F6] bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#00B894] animate-pulse" />
          <span className="text-sm font-black uppercase text-[#9CA3AF]">正常 {normalCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#F97316]" />
          <span className="text-sm font-black uppercase text-[#9CA3AF]">告警 {warningCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#9CA3AF]" />
          <span className="text-sm font-black uppercase text-[#9CA3AF]">离线 {offlineCount}</span>
        </div>
      </div>
    </div>
  );
}
