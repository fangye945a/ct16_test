import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MOCK_DEVICE_NODES, type IDeviceNode } from '@/data/topology';

// ── 设备图标（按类型定制 SVG）──────────────────────────────────

function DeviceIcon({ deviceType, status, size = 34 }: { deviceType: string; status: string; size?: number }) {
  const isNormal = status === 'normal';
  const isWarning = status === 'warning';
  const fillColor = isNormal ? '#00B894' : isWarning ? '#F97316' : '#9CA3AF';
  const fillBg = isNormal ? '#00B89412' : isWarning ? '#F9731612' : '#9CA3AF12';
  const strokeColor = fillColor;

  // 温度传感�?  if (deviceType === '温度传感�?) {
    return (
      <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
        <rect x="12" y="4" width="10" height="20" rx="5" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="17" cy="26" r="4" fill={fillColor} opacity="0.25" stroke={strokeColor} strokeWidth="1.5" />
        <rect x="14" y="6" width="6" height="8" rx="3" fill={fillColor} opacity="0.4" />
      </svg>
    );
  }

  // 湿度传感�?  if (deviceType === '湿度传感�?) {
    return (
      <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
        <path d="M17 4C17 4 8 16 8 22C8 26.97 12.03 31 17 31C21.97 31 26 26.97 26 22C26 16 17 4 17 4Z" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
        <path d="M17 4C17 4 8 16 8 22C8 26.97 12.03 31 17 31" fill={fillColor} opacity="0.2" />
      </svg>
    );
  }

  // 压力变送器
  if (deviceType === '压力变送器') {
    return (
      <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
        <circle cx="17" cy="17" r="13" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="17" cy="17" r="10" fill="none" stroke={strokeColor} strokeWidth="0.8" opacity="0.4" />
        <line x1="17" y1="17" x2="17" y2="8" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
        <circle cx="17" cy="17" r="2" fill={fillColor} />
      </svg>
    );
  }

  // 液位传感�?  if (deviceType === '液位传感�?) {
    return (
      <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
        <rect x="8" y="4" width="18" height="26" rx="4" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
        <rect x="10" y="14" width="14" height="14" rx="2" fill={fillColor} opacity="0.3" />
        <line x1="8" y1="10" x2="4" y2="10" stroke={strokeColor} strokeWidth="1.5" />
        <line x1="8" y1="18" x2="4" y2="18" stroke={strokeColor} strokeWidth="1.5" />
        <line x1="8" y1="26" x2="4" y2="26" stroke={strokeColor} strokeWidth="1.5" />
      </svg>
    );
  }

  // 电磁流量�?  if (deviceType === '电磁流量�?) {
    return (
      <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
        <rect x="3" y="11" width="28" height="12" rx="6" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
        <line x1="17" y1="11" x2="17" y2="23" stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="17" cy="17" r="3" fill={fillColor} opacity="0.4" />
        <line x1="3" y1="17" x2="8" y2="17" stroke={strokeColor} strokeWidth="1.5" />
        <line x1="26" y1="17" x2="31" y2="17" stroke={strokeColor} strokeWidth="1.5" />
      </svg>
    );
  }

  // 风机
  if (deviceType === '风机') {
    return (
      <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
        <circle cx="17" cy="17" r="12" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
        <path d="M17 5L17 29" stroke={strokeColor} strokeWidth="2" opacity="0.5" />
        <path d="M5 17L29 17" stroke={strokeColor} strokeWidth="2" opacity="0.5" />
        <path d="M8.5 8.5L25.5 25.5" stroke={strokeColor} strokeWidth="2" opacity="0.3" />
        <path d="M25.5 8.5L8.5 25.5" stroke={strokeColor} strokeWidth="2" opacity="0.3" />
        <circle cx="17" cy="17" r="4" fill={fillColor} opacity="0.5" />
      </svg>
    );
  }

  // 变频电机
  if (deviceType === '变频电机') {
    return (
      <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
        <circle cx="17" cy="17" r="11" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="17" cy="17" r="6" fill="none" stroke={strokeColor} strokeWidth="1.5" opacity="0.5" />
        <circle cx="17" cy="17" r="2.5" fill={fillColor} />
        <line x1="17" y1="6" x2="17" y2="10" stroke={strokeColor} strokeWidth="1.5" />
      </svg>
    );
  }

  // 信号�?  if (deviceType === '信号�?) {
    return (
      <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
        <rect x="10" y="3" width="14" height="28" rx="7" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="17" cy="10" r="4" fill="#F43F5E" opacity="0.3" />
        <circle cx="17" cy="17" r="4" fill="#F97316" opacity="0.3" />
        <circle cx="17" cy="24" r="4" fill="#00B894" opacity="0.7" />
      </svg>
    );
  }

  // 电动调节阀
  if (deviceType === '电动调节阀') {
    return (
      <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
        <rect x="4" y="12" width="26" height="10" rx="3" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
        <line x1="17" y1="12" x2="17" y2="22" stroke={strokeColor} strokeWidth="2" />
        <circle cx="17" cy="7" r="4" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
        <line x1="17" y1="3" x2="17" y2="5" stroke={strokeColor} strokeWidth="1.5" />
        <line x1="14" y1="7" x2="20" y2="7" stroke={strokeColor} strokeWidth="1" opacity="0.5" />
      </svg>
    );
  }

  // 按钮开�?  if (deviceType === '按钮开�?) {
    return (
      <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
        <circle cx="17" cy="17" r="12" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="17" cy="17" r="6" fill={fillColor} opacity="0.35" />
        <circle cx="17" cy="17" r="3" fill={fillColor} opacity="0.6" />
      </svg>
    );
  }

  // 接近开�?  if (deviceType === '接近开�?) {
    return (
      <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
        <rect x="6" y="6" width="22" height="22" rx="4" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="17" cy="17" r="7" fill="none" stroke={strokeColor} strokeWidth="1" opacity="0.4" />
        <circle cx="17" cy="17" r="3" fill={fillColor} opacity="0.5" />
        <path d="M17 13L17 21M13 17L21 17" stroke={strokeColor} strokeWidth="1.5" opacity="0.4" />
      </svg>
    );
  }

  // PLC控制�?  if (deviceType === 'PLC控制�?) {
    return (
      <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
        <rect x="3" y="5" width="28" height="24" rx="4" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
        <rect x="8" y="10" width="18" height="4" rx="2" fill={fillColor} opacity="0.3" />
        <rect x="8" y="17" width="8" height="2" rx="1" fill={fillColor} opacity="0.4" />
        <rect x="20" y="17" width="6" height="2" rx="1" fill={fillColor} opacity="0.4" />
        <rect x="8" y="22" width="12" height="2" rx="1" fill={fillColor} opacity="0.3" />
      </svg>
    );
  }

  // 工业显示�?  if (deviceType === '工业显示�?) {
    return (
      <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
        <rect x="4" y="4" width="26" height="20" rx="4" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
        <rect x="8" y="8" width="18" height="12" rx="2" fill={fillColor} opacity="0.2" />
        <line x1="12" y1="28" x2="22" y2="28" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="17" y1="28" x2="17" y2="30" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <rect x="10" y="30" width="14" height="2" rx="1" fill={strokeColor} opacity="0.3" />
      </svg>
    );
  }

  // fallback
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
      <rect x="4" y="4" width="26" height="26" rx="6" fill={fillBg} stroke={strokeColor} strokeWidth="1.5" />
      <circle cx="27" cy="7" r="2.5" fill={fillColor} />
    </svg>
  );
}

// ── 设备节点卡片 ──────────────────────────────────────────────

function DeviceNodeCard({ node, onSelect }: { node: IDeviceNode; onSelect: (n: IDeviceNode) => void }) {
  const isNormal = node.status === 'normal';
  const isWarning = node.status === 'warning';

  const dotColor = isNormal ? 'bg-[#00B894]' : isWarning ? 'bg-[#F97316]' : 'bg-[#9CA3AF]';
  const textColor = isNormal ? 'text-[#00B894]' : isWarning ? 'text-[#F97316]' : 'text-[#9CA3AF]';
  const borderColor = isNormal ? 'border-[#00B894]/20' : isWarning ? 'border-[#F97316]/20' : 'border-[#9CA3AF]/20';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center cursor-pointer group"
      onClick={() => onSelect(node)}
    >
      <Card
        className={`relative px-3 py-2.5 rounded-[18px] border bg-white transition-all duration-300 group-hover:shadow-md group-hover:border-[#00B894]/40 w-[105px] shadow-sm ${borderColor}`}
      >
        {/* 接口标签 */}
        <div className="absolute -top-1.5 right-2">
          <span className="text-[7px] font-black text-[#9CA3AF] bg-white px-1.5 py-0.5 rounded-full border border-[#F3F4F6] leading-none">
            {node.interfaceLabel}
          </span>
        </div>

        {/* 图标 */}
        <div className="flex justify-center mt-1 mb-1.5">
          <DeviceIcon deviceType={node.deviceType} status={node.status} size={30} />
        </div>

        {/* 名称 */}
        <div className="text-center">
          <div className="text-[10px] font-black text-[#111827] truncate leading-tight">{node.name}</div>
        </div>

        {/* 数�?+ 状�?*/}
        <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-[#F3F4F6]">
          <span className={`text-xs font-black tabular-nums ${textColor}`}>
            {node.value}
            {node.unit && <span className="text-[8px] ml-0.5 opacity-70">{node.unit}</span>}
          </span>
          <span className={`size-2 rounded-full ${dotColor} ${isNormal ? 'animate-pulse' : ''}`} />
        </div>
      </Card>
    </motion.div>
  );
}

// ── 分类标签 ──────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  sensor: { label: '传感�?, color: '#00B894', bg: '#00B89412' },
  actuator: { label: '执行�?, color: '#F97316', bg: '#F9731612' },
  input: { label: '输入设备', color: '#6366F1', bg: '#6366F112' },
  other: { label: '其他设备', color: '#1F2937', bg: '#1F293712' },
};

// ── 主组�?────────────────────────────────────────────────────

export default function DeviceTopology({ onNodeSelect }: { onNodeSelect: (n: IDeviceNode) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const devices = MOCK_DEVICE_NODES;
  const normalCount = devices.filter((d) => d.status === 'normal').length;
  const warningCount = devices.filter((d) => d.status === 'warning').length;

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
  const resetView = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  return (
    <div className="relative bg-white rounded-[48px] border border-[#F3F4F6] shadow-sm overflow-hidden">
      {/* ── 工具�?── */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button onClick={zoomIn} className="size-9 rounded-2xl bg-[#F9FAFB] border border-[#F3F4F6] flex items-center justify-center text-[#9CA3AF] hover:text-[#00B894] hover:border-[#00B894]/30 transition-all text-sm font-black">+</button>
        <button onClick={zoomOut} className="size-9 rounded-2xl bg-[#F9FAFB] border border-[#F3F4F6] flex items-center justify-center text-[#9CA3AF] hover:text-[#00B894] hover:border-[#00B894]/30 transition-all text-sm font-black">�?/button>
        <button onClick={resetView} className="px-3 py-2 rounded-2xl bg-[#F9FAFB] border border-[#F3F4F6] text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest hover:text-[#00B894] hover:border-[#00B894]/30 transition-all">适应</button>
      </div>

      {/* ── 统计面板 ── */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3 px-4 py-2.5 bg-white/90 backdrop-blur-sm rounded-2xl border border-[#F3F4F6] shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black text-[#111827] uppercase tracking-wider">设备总数</span>
          <span className="text-sm font-black text-[#00B894] tabular-nums">{devices.length}</span>
        </div>
        <span className="w-px h-4 bg-[#F3F4F6]" />
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#00B894] animate-pulse" />
          <span className="text-[10px] font-black text-[#9CA3AF]">{normalCount} 正常</span>
        </div>
        {warningCount > 0 && (
          <>
            <span className="w-px h-4 bg-[#F3F4F6]" />
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#F97316]" />
              <span className="text-[10px] font-black text-[#F97316]">{warningCount} 告警</span>
            </div>
          </>
        )}
      </div>

      {/* ── 画布 ── */}
      <div
        ref={containerRef}
        className="relative w-full h-[620px] overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          background: 'radial-gradient(circle at center, #F3F4F6 1px, transparent 1px)',
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
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
        >
          {/* ── SVG 连线�?── */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
            {/* 分类区域弧线 */}
            {Object.entries(CATEGORY_LABELS).map(([key, cfg]) => {
              const catDevices = devices.filter((d) => d.category === key);
              if (catDevices.length === 0) return null;
              const minAngle = Math.min(...catDevices.map((d) => d.angle));
              const maxAngle = Math.max(...catDevices.map((d) => d.angle));
              const midAngle = (minAngle + maxAngle) / 2;
              const arcR = 150;
              const cx = 50;
              const cy = 50;
              const startRad = ((minAngle - 15) * Math.PI) / 180;
              const endRad = ((maxAngle + 15) * Math.PI) / 180;
              const sx = cx + arcR * Math.cos(startRad);
              const sy = cy + arcR * Math.sin(startRad);
              const ex = cx + arcR * Math.cos(endRad);
              const ey = cy + arcR * Math.sin(endRad);
              const largeArc = endRad - startRad > Math.PI ? 1 : 0;
              return (
                <g key={`arc-${key}`}>
                  <path
                    d={`M ${sx}% ${sy}% A ${arcR}% ${arcR}% 0 ${largeArc} 1 ${ex}% ${ey}%`}
                    fill="none"
                    stroke={cfg.color}
                    strokeWidth="1"
                    strokeDasharray="6 4"
                    opacity="0.15"
                  />
                </g>
              );
            })}

            {/* 设备连接�?*/}
            {devices.map((device) => {
              const xPct = 50 + (Math.cos((device.angle * Math.PI) / 180) * device.distance) / (containerRef.current?.clientWidth || 1200) * 100;
              const yPct = 50 + (Math.sin((device.angle * Math.PI) / 180) * device.distance) / (containerRef.current?.clientHeight || 620) * 100;
              const isNormal = device.status === 'normal';
              const isWarning = device.status === 'warning';
              const lineColor = isNormal ? '#00B894' : isWarning ? '#F97316' : '#D1D5DB';
              const lineOpacity = isNormal ? 0.35 : isWarning ? 0.4 : 0.2;
              return (
                <g key={`line-${device.id}`}>
                  <line
                    x1="50%" y1="50%"
                    x2={`${xPct}%`} y2={`${yPct}%`}
                    stroke={lineColor}
                    strokeWidth="1.2"
                    strokeDasharray={isNormal ? 'none' : '5 3'}
                    opacity={lineOpacity}
                  />
                  {/* 接口标注 */}
                  <text
                    x={`${(50 + xPct) / 2}%`}
                    y={`${(50 + yPct) / 2 - 6}%`}
                    textAnchor="middle"
                    fill="#9CA3AF"
                    fontSize="7"
                    fontWeight="700"
                    fontFamily="'Plus Jakarta Sans', sans-serif"
                    opacity="0.7"
                  >
                    {device.interfaceLabel}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* ── 中心控制�?── */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Card className="px-5 py-4 rounded-[32px] border-2 border-[#00B894]/20 bg-white shadow-lg min-w-[180px]">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-[#00B894] text-white border-[#00B894]">
                主控
              </Badge>
              <div className="flex items-center gap-3 mt-1">
                <div className="size-11 rounded-2xl bg-[#00B894]/10 flex items-center justify-center shrink-0">
                  <svg width="24" height="24" viewBox="0 0 34 34" fill="none">
                    <rect x="3" y="3" width="28" height="28" rx="7" fill="#00B89418" stroke="#00B894" strokeWidth="1.5" />
                    <rect x="9" y="9" width="16" height="5" rx="2" fill="#00B894" opacity="0.3" />
                    <rect x="9" y="17" width="7" height="2.5" rx="1.25" fill="#00B894" opacity="0.5" />
                    <rect x="19" y="17" width="6" height="2.5" rx="1.25" fill="#00B894" opacity="0.5" />
                    <rect x="9" y="22" width="16" height="2.5" rx="1.25" fill="#00B894" opacity="0.25" />
                    <circle cx="28" cy="7" r="2" fill="#00B894" className="animate-pulse" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-black text-[#111827]">CT16 在鸿控制�?/div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="size-2 rounded-full bg-[#00B894] animate-pulse" />
                    <span className="text-[10px] font-black text-[#00B894] uppercase">运行�?/span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ── 设备节点 ── */}
          {devices.map((device) => (
            <div
              key={device.id}
              data-node
              className="absolute"
              style={{
                left: `calc(50% + ${Math.cos((device.angle * Math.PI) / 180) * device.distance}px)`,
                top: `calc(50% + ${Math.sin((device.angle * Math.PI) / 180) * device.distance}px)`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <DeviceNodeCard node={device} onSelect={onNodeSelect} />
            </div>
          ))}

          {/* ── 分类标签 ── */}
          {Object.entries(CATEGORY_LABELS).map(([key, cfg]) => {
            const catDevices = devices.filter((d) => d.category === key);
            if (catDevices.length === 0) return null;
            const minAngle = Math.min(...catDevices.map((d) => d.angle));
            const maxAngle = Math.max(...catDevices.map((d) => d.angle));
            const midAngle = (minAngle + maxAngle) / 2;
            const labelDist = 130;
            return (
              <div
                key={`label-${key}`}
                className="absolute pointer-events-none"
                style={{
                  left: `calc(50% + ${Math.cos((midAngle * Math.PI) / 180) * labelDist}px)`,
                  top: `calc(50% + ${Math.sin((midAngle * Math.PI) / 180) * labelDist}px)`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <span
                  className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: cfg.bg, color: cfg.color }}
                >
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 图例 ── */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-4 px-4 py-2.5 bg-white/90 backdrop-blur-sm rounded-2xl border border-[#F3F4F6] shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#00B894] animate-pulse" />
          <span className="text-[10px] font-black text-[#9CA3AF] uppercase">正常</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#F97316]" />
          <span className="text-[10px] font-black text-[#9CA3AF] uppercase">告警</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#9CA3AF]" />
          <span className="text-[10px] font-black text-[#9CA3AF] uppercase">离线</span>
        </div>
      </div>
    </div>
  );
}
