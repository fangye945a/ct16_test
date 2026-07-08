import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Crown,
  Home,
  Wifi,
  Users,
} from 'lucide-react';
import { MOCK_NETWORK_DEVICES, type INetworkDevice } from '@/data/topology';

// ── 设备图标（不同型号不同形状）──────────────────────────────────

function DeviceIcon({ model, status, size = 40 }: { model: string; status: string; size?: number }) {
  const isOnline = status === 'online';
  const fillColor = isOnline ? '#00B894' : '#9CA3AF';
  const fillBg = isOnline ? '#00B89414' : '#9CA3AF14';
  const strokeColor = isOnline ? '#00B894' : '#9CA3AF';

  // CT16: 方形紧凑型控制器
  if (model === 'CT16') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <rect x="3" y="3" width="34" height="34" rx="8" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
        <rect x="10" y="10" width="20" height="6" rx="2" fill={fillColor} opacity="0.3" />
        <rect x="10" y="19" width="8" height="3" rx="1.5" fill={fillColor} opacity="0.5" />
        <rect x="22" y="19" width="8" height="3" rx="1.5" fill={fillColor} opacity="0.5" />
        <rect x="10" y="25" width="20" height="3" rx="1.5" fill={fillColor} opacity="0.3" />
        <circle cx="32" cy="8" r="2.5" fill={fillColor} className={isOnline ? 'animate-pulse' : ''} />
      </svg>
    );
  }

  // CT16: 稍大矩形高性能控制器
  if (model === 'CT16') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <rect x="2" y="4" width="36" height="32" rx="6" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
        <rect x="8" y="10" width="24" height="5" rx="2" fill={fillColor} opacity="0.35" />
        <rect x="8" y="18" width="10" height="3" rx="1.5" fill={fillColor} opacity="0.5" />
        <rect x="22" y="18" width="10" height="3" rx="1.5" fill={fillColor} opacity="0.5" />
        <rect x="8" y="24" width="16" height="3" rx="1.5" fill={fillColor} opacity="0.3" />
        <circle cx="34" cy="8" r="2.5" fill={fillColor} className={isOnline ? 'animate-pulse' : ''} />
      </svg>
    );
  }

  // CT32: 网关/路由器形状
  if (model === 'CT32') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <rect x="4" y="8" width="32" height="24" rx="6" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
        <line x1="12" y1="4" x2="12" y2="8" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="28" y1="4" x2="28" y2="8" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="3" r="2" fill={fillColor} opacity="0.6" />
        <circle cx="28" cy="3" r="2" fill={fillColor} opacity="0.6" />
        <rect x="10" y="14" width="20" height="4" rx="2" fill={fillColor} opacity="0.3" />
        <rect x="10" y="21" width="8" height="3" rx="1.5" fill={fillColor} opacity="0.5" />
        <rect x="22" y="21" width="8" height="3" rx="1.5" fill={fillColor} opacity="0.5" />
        <circle cx="34" cy="12" r="2.5" fill={fillColor} className={isOnline ? 'animate-pulse' : ''} />
      </svg>
    );
  }

  // CT33: 网关形状（与CT32略有区别——更宽）
  if (model === 'CT33') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <rect x="2" y="8" width="36" height="24" rx="6" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
        <line x1="10" y1="3" x2="10" y2="8" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="20" y1="3" x2="20" y2="8" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="30" y1="3" x2="30" y2="8" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="2" r="2" fill={fillColor} opacity="0.6" />
        <circle cx="20" cy="2" r="2" fill={fillColor} opacity="0.6" />
        <circle cx="30" cy="2" r="2" fill={fillColor} opacity="0.6" />
        <rect x="8" y="14" width="24" height="4" rx="2" fill={fillColor} opacity="0.3" />
        <rect x="8" y="21" width="10" height="3" rx="1.5" fill={fillColor} opacity="0.5" />
        <rect x="22" y="21" width="10" height="3" rx="1.5" fill={fillColor} opacity="0.5" />
        <circle cx="35" cy="12" r="2.5" fill={fillColor} className={isOnline ? 'animate-pulse' : ''} />
      </svg>
    );
  }

  // CT21B: 工控机/服务器形状
  if (model === 'CT21B') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <rect x="4" y="2" width="32" height="36" rx="5" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
        <rect x="10" y="8" width="20" height="4" rx="2" fill={fillColor} opacity="0.25" />
        <rect x="10" y="15" width="20" height="2" rx="1" fill={fillColor} opacity="0.2" />
        <rect x="10" y="19" width="20" height="2" rx="1" fill={fillColor} opacity="0.2" />
        <rect x="10" y="23" width="20" height="2" rx="1" fill={fillColor} opacity="0.2" />
        <rect x="10" y="28" width="12" height="3" rx="1.5" fill={fillColor} opacity="0.4" />
        <circle cx="33" cy="6" r="2.5" fill={fillColor} className={isOnline ? 'animate-pulse' : ''} />
      </svg>
    );
  }

  // HarmonyPad: 平板形状
  if (model === 'HarmonyPad') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <rect x="5" y="3" width="30" height="34" rx="7" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
        <rect x="12" y="10" width="16" height="20" rx="2" fill={fillColor} opacity="0.15" />
        <circle cx="20" cy="30" r="2" fill={fillColor} opacity="0.5" />
        <circle cx="33" cy="7" r="2.5" fill={fillColor} className={isOnline ? 'animate-pulse' : ''} />
      </svg>
    );
  }

  // fallback
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect x="3" y="3" width="34" height="34" rx="8" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
      <circle cx="32" cy="8" r="2.5" fill={fillColor} />
    </svg>
  );
}

// ── 设备名称简写映射 ──────────────────────────────────

function getShortName(device: INetworkDevice): string {
  const parts = device.name.split('-');
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1].slice(0, 2)}`;
  }
  return device.name.slice(0, 8);
}

// ── 总线节点卡片（简约版）─────────────────────────────────

function BusNodeCard({
  device,
  isMaster,
  isLocal,
  onSelect,
}: {
  device: INetworkDevice;
  isMaster: boolean;
  isLocal: boolean;
  onSelect: (d: INetworkDevice) => void;
}) {
  const isOnline = device.status === 'online';
  const highlight = isMaster || isLocal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center cursor-pointer group"
      onClick={() => onSelect(device)}
    >
      {/* 节点卡片 */}
      <Card
        className={`relative px-3 py-3 rounded-[20px] border bg-white transition-all duration-300 group-hover:shadow-md group-hover:border-[#00B894]/40 w-[110px] ${
          highlight
            ? 'shadow-sm ring-1 ring-[#00B894]/25 border-[#00B894]/30'
            : 'shadow-sm border-[#F3F4F6]'
        }`}
      >
        {/* 角色标签 */}
        {(isMaster || isLocal) && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
            {isMaster && (
              <Badge className="text-[8px] font-black uppercase px-1.5 py-0 rounded-full bg-[#00B894] text-white border-[#00B894] flex items-center gap-0.5">
                <Crown className="size-2" />主机
              </Badge>
            )}
            {isLocal && (
              <Badge className="text-[8px] font-black uppercase px-1.5 py-0 rounded-full bg-[#1F2937] text-white border-[#1F2937] flex items-center gap-0.5">
                <Home className="size-2" />本机
              </Badge>
            )}
          </div>
        )}

        {/* 设备图标 */}
        <div className="flex justify-center mt-1 mb-2">
          <DeviceIcon model={device.model} status={device.status} size={36} />
        </div>

        {/* 设备名称 */}
        <div className="text-center">
          <div className="text-[11px] font-black text-[#111827] truncate leading-tight">
            {getShortName(device)}
          </div>
          <div className="text-[9px] font-bold text-[#9CA3AF] mt-0.5">{device.model}</div>
        </div>

        {/* 状态指示灯 */}
        <div className="flex items-center justify-center gap-1 mt-2 pt-2 border-t border-[#F3F4F6]">
          <span
            className={`size-2 rounded-full ${
              isOnline ? 'bg-[#00B894] animate-pulse' : 'bg-[#9CA3AF]'
            }`}
          />
          <span
            className={`text-[9px] font-black uppercase ${
              isOnline ? 'text-[#00B894]' : 'text-[#9CA3AF]'
            }`}
          >
            {isOnline ? '在线' : '离线'}
          </span>
        </div>
      </Card>
    </motion.div>
  );
}

// ── 主组件 ─────────────────────────────────────────────

export default function NetworkTopology({ onNodeSelect }: { onNodeSelect: (d: INetworkDevice) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const busYPct = 54;

  const master = MOCK_NETWORK_DEVICES.find((d) => d.role === 'master')!;
  const slaves = MOCK_NETWORK_DEVICES.filter((d) => d.role === 'slave');

  // 所有设备按顺序排列（master 在中间偏左位置）
  const orderedDevices = [master, ...slaves];
  const deviceXPct = orderedDevices.map((_, i) => 10 + (i / (orderedDevices.length - 1)) * 80);
  const deviceLayout = orderedDevices.map((device, i) => {
    const isAbove = i % 2 === 0;
    return {
      device,
      xPct: deviceXPct[i],
      isAbove,
      nodeYPct: isAbove ? 32 : 76,
      cardTopPct: isAbove ? 26 : 70,
      latencyYPct: isAbove ? busYPct - 8 : busYPct + 16,
    };
  });
  const onlineCount = orderedDevices.filter((d) => d.status === 'online').length;
  const totalCount = orderedDevices.length;
  const masterLayout = deviceLayout.find((item) => item.device.role === 'master')!;
  const connectionFlowSpecs = deviceLayout
    .filter((item) => item.device.role === 'slave')
    .flatMap((item, index) => {
      if (masterLayout.device.status !== 'online' || item.device.status !== 'online') {
        return [];
      }

      return [
        {
          key: `${item.device.id}-downlink`,
          direction: 'downlink' as const,
          startX: masterLayout.xPct,
          startY: masterLayout.nodeYPct,
          busY: busYPct,
          endX: item.xPct,
          endY: item.nodeYPct,
          duration: 3.2 + (index % 3) * 0.35,
          delay: index * 0.32,
          dotFill: '#8CF9FF',
          glowFill: '#00D4FF',
        },
        {
          key: `${item.device.id}-uplink`,
          direction: 'uplink' as const,
          startX: item.xPct,
          startY: item.nodeYPct,
          busY: busYPct,
          endX: masterLayout.xPct,
          endY: masterLayout.nodeYPct,
          duration: 3.55 + (index % 3) * 0.4,
          delay: 0.6 + index * 0.36,
          dotFill: '#B8FFCF',
          glowFill: '#00B894',
        },
      ];
    });
  const horizontalBusSegments = deviceLayout.slice(0, -1).map((item, index) => {
    const nextItem = deviceLayout[index + 1];
    return {
      key: `${item.device.id}-${nextItem.device.id}`,
      startX: item.xPct,
      endX: nextItem.xPct,
      active: item.device.status === 'online' && nextItem.device.status === 'online',
    };
  });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((prev) => Math.min(2, Math.max(0.3, prev - e.deltaY * 0.001)));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-node]')) return;
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPan({
        x: dragStart.current.panX + (e.clientX - dragStart.current.x),
        y: dragStart.current.panY + (e.clientY - dragStart.current.y),
      });
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const zoomIn = () => setScale((s) => Math.min(2, s + 0.15));
  const zoomOut = () => setScale((s) => Math.max(0.3, s - 0.15));
  const resetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative bg-white rounded-[48px] border border-[#F3F4F6] shadow-sm overflow-hidden">
      {/* ── 工具栏 ── */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={zoomIn}
          className="size-9 rounded-2xl bg-[#F9FAFB] border border-[#F3F4F6] flex items-center justify-center text-[#9CA3AF] hover:text-[#00B894] hover:border-[#00B894]/30 transition-all text-sm font-black"
        >
          +
        </button>
        <button
          onClick={zoomOut}
          className="size-9 rounded-2xl bg-[#F9FAFB] border border-[#F3F4F6] flex items-center justify-center text-[#9CA3AF] hover:text-[#00B894] hover:border-[#00B894]/30 transition-all text-sm font-black"
        >
          −
        </button>
        <button
          onClick={resetView}
          className="px-3 py-2 rounded-2xl bg-[#F9FAFB] border border-[#F3F4F6] text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest hover:text-[#00B894] hover:border-[#00B894]/30 transition-all"
        >
          适应
        </button>
      </div>

      {/* ── 总线信息面板 ── */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-4 px-4 py-2.5 bg-white/90 backdrop-blur-sm rounded-2xl border border-[#F3F4F6] shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-xl bg-[#00B894]/10">
            <Wifi className="size-3.5 text-[#00B894]" />
          </div>
          <div>
            <div className="text-[10px] font-black text-[#111827]">在鸿轻量软总线</div>
            <div className="text-[9px] font-bold text-[#9CA3AF]">轻量协同组网通道</div>
          </div>
        </div>
        <span className="h-7 w-px bg-[#E5E7EB]" />
        <div className="flex items-center gap-1.5">
          <Users className="size-3 text-[#9CA3AF]" />
          <span className="text-[10px] font-black text-[#9CA3AF]">
            <span className="text-[#00B894]">{onlineCount}</span>/{totalCount} 在线
          </span>
        </div>
      </div>

      {/* ── 画布 ── */}
      <div
        ref={containerRef}
        className="relative w-full h-[620px] overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          background:
            'radial-gradient(circle at center, #F3F4F6 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="absolute inset-0 transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          }}
        >
          {/* ── 总线 SVG 层 ── */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ overflow: 'visible' }}
          >
            {/* 水平总线 */}
            <line
              x1="5%"
              y1={`${busYPct}%`}
              x2="95%"
              y2={`${busYPct}%`}
              stroke="#00B894"
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.55"
            />
            {/* 总线光晕 */}
            <line
              x1="5%"
              y1={`${busYPct}%`}
              x2="95%"
              y2={`${busYPct}%`}
              stroke="#00B894"
              strokeWidth="14"
              strokeLinecap="round"
              opacity="0.12"
            />
            {horizontalBusSegments.map((segment) => (
              <line
                key={segment.key}
                x1={`${segment.startX}%`}
                y1={`${busYPct}%`}
                x2={`${segment.endX}%`}
                y2={`${busYPct}%`}
                stroke={segment.active ? '#00B894' : '#D1D5DB'}
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity={segment.active ? 0.35 : 0.18}
              />
            ))}
            {connectionFlowSpecs.map((segment) => (
              <motion.g
                key={segment.key}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{
                  duration: segment.duration,
                  delay: segment.delay,
                  repeat: Infinity,
                  repeatDelay: 0.4,
                  ease: 'linear',
                }}
              >
                <motion.circle
                  r="3.5"
                  fill={segment.dotFill}
                  animate={{
                    cx: [`${segment.startX}%`, `${segment.startX}%`, `${segment.endX}%`, `${segment.endX}%`],
                    cy: [`${segment.startY}%`, `${segment.busY}%`, `${segment.busY}%`, `${segment.endY}%`],
                  }}
                  transition={{
                    duration: segment.duration,
                    delay: segment.delay,
                    repeat: Infinity,
                    repeatDelay: 0.4,
                    ease: 'linear',
                  }}
                />
                <motion.circle
                  r="8"
                  fill={segment.glowFill}
                  opacity={0.14}
                  animate={{
                    cx: [`${segment.startX}%`, `${segment.startX}%`, `${segment.endX}%`, `${segment.endX}%`],
                    cy: [`${segment.startY}%`, `${segment.busY}%`, `${segment.busY}%`, `${segment.endY}%`],
                  }}
                  transition={{
                    duration: segment.duration,
                    delay: segment.delay,
                    repeat: Infinity,
                    repeatDelay: 0.4,
                    ease: 'linear',
                  }}
                />
              </motion.g>
            ))}

            {/* 设备连接线 */}
            {deviceLayout.map(({ device, xPct, isAbove, nodeYPct, latencyYPct }) => {
              const isOnline = device.status === 'online';
              const isMaster = device.role === 'master';
              const lineColor = isOnline ? '#00B894' : '#D1D5DB';
              const lineOpacity = isOnline ? 0.5 : 0.25;

              return (
                <g key={`conn-${device.id}`}>
                  {/* 垂直连接线 */}
                  <line
                    x1={`${xPct}%`}
                    y1={`${busYPct}%`}
                    x2={`${xPct}%`}
                    y2={`${nodeYPct}%`}
                    stroke={lineColor}
                    strokeWidth={isMaster ? 2.5 : 1.5}
                    strokeLinecap="round"
                    opacity={lineOpacity}
                  />
                  {/* 连接点 */}
                  <circle
                    cx={`${xPct}%`}
                    cy={`${busYPct}%`}
                    r={isMaster ? 5 : 3.5}
                    fill="white"
                    stroke={lineColor}
                    strokeWidth={isMaster ? 2.5 : 1.5}
                  />
                  <circle
                    cx={`${xPct}%`}
                    cy={`${busYPct}%`}
                    r={isMaster ? 2.5 : 1.5}
                    fill={lineColor}
                    className={isOnline ? 'animate-pulse' : ''}
                  />
                  {/* 延迟标注 */}
                  {isOnline && device.latency > 0 && (
                    <text
                      x={`${xPct}%`}
                      y={`${latencyYPct}%`}
                      textAnchor="middle"
                      fill="#9CA3AF"
                      fontSize="8"
                      fontWeight="700"
                      fontFamily="'Plus Jakarta Sans', sans-serif"
                    >
                      {device.latency}ms
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* ── 设备节点 ── */}
          {deviceLayout.map(({ device, xPct, isAbove, cardTopPct }, i) => {
            const isMaster = device.role === 'master';
            // 第一个设备（master）同时是本机
            const isLocal = i === 0;

            return (
              <div
                key={device.id}
                data-node
                className="absolute"
                style={{
                  left: `${xPct}%`,
                  top: `${cardTopPct}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <BusNodeCard
                  device={device}
                  isMaster={isMaster}
                  isLocal={isLocal}
                  onSelect={onNodeSelect}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 图例 ── */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-4 px-4 py-2.5 bg-white/90 backdrop-blur-sm rounded-2xl border border-[#F3F4F6] shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#00B894] animate-pulse" />
          <span className="text-[10px] font-black text-[#9CA3AF] uppercase">在线</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#9CA3AF]" />
          <span className="text-[10px] font-black text-[#9CA3AF] uppercase">离线</span>
        </div>
        <span className="w-px h-3 bg-[#E5E7EB]" />
        <div className="flex items-center gap-1.5">
          <Crown className="size-3 text-[#00B894]" />
          <span className="text-[10px] font-black text-[#9CA3AF] uppercase">主机</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Home className="size-3 text-[#1F2937]" />
          <span className="text-[10px] font-black text-[#9CA3AF] uppercase">本机</span>
        </div>
      </div>
    </div>
  );
}
