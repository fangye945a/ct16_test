import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Cpu,
  Wifi,
  Bluetooth,
  Radio,
  Network,
  Power,
  Plus,
  AlertTriangle,
  Settings2,
  Cable,
  Loader2,
  RefreshCw,
  BadgeCheck,
  Shuffle,
} from 'lucide-react';
import { useModuleTopology, type ModuleSlotData, type ChannelData } from '@/hooks/useModuleTopology';
import type { Ct16UartAttrDto } from '@/api/types';
import { getSystemOverview } from '@/api/overview';
import { getNetworkSettings, getWirelessModules } from '@/api/settings';
import { getWirelessModuleTopology } from '@/api/topology';
import type {
  Ct16SystemOverviewDto,
  Ct16NetworkSettingsDto,
  Ct16WirelessSlotTopologyDto,
  Ct16WirelessTopologyDto,
} from '@/api/types';
import type { INetworkInterfaceConfig } from '@/data/settings';

const ONLINE_STATUS = {
  online: { dot: 'bg-[#00B894]', text: 'text-[#00B894]', bg: 'bg-[#00B894]/10', border: 'border-[#00B894]/30', label: '在线' },
  offline: { dot: 'bg-[#9CA3AF]', text: 'text-[#6B7280]', bg: 'bg-[#F9FAFB]', border: 'border-[#E5E7EB]', label: '离线' },
};

const MAIN_MODULE_LEDS = [
  { label: 'POW', dot: 'bg-[#FF4444]', flash: false },
  { label: 'SYS', dot: 'bg-[#00B894]', flash: true },
  { label: 'NET', dot: 'bg-[#00B894]', flash: true },
  { label: 'BLE', dot: 'bg-[#3B82F6]', flash: true },
  { label: 'ERR', dot: 'bg-[#D1D5DB]', flash: false },
] as const;

function formatUptimeShort(seconds: number): string {
  if (seconds <= 0) return '--';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}天 ${hours}时`;
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}时 ${minutes}分`;
  return `${minutes}分`;
}

function GetModuleOnlineState(isOnline: boolean) {
  return isOnline ? ONLINE_STATUS.online : ONLINE_STATUS.offline;
}

function IsDigitalOn(value: string) {
  return value === 'ON' || value === '导通';
}

function GetDigitalChannelState(channel: ChannelData) {
  const isOn = IsDigitalOn(channel.value);
  return {
    label: isOn ? '导通' : '截止',
    dot: isOn ? 'bg-[#00B894]' : 'bg-[#9CA3AF]',
    text: isOn ? 'text-[#00B894]' : 'text-[#6B7280]',
    bg: isOn ? 'bg-[#00B894]/10' : 'bg-[#F9FAFB]',
    border: isOn ? 'border-[#00B894]/30' : 'border-[#E5E7EB]',
  };
}

function IsCurrentChannel(channel: ChannelData) {
  return channel.label.startsWith('CI-') || channel.label.startsWith('CO-');
}

function GetAnalogChannelState(channel: ChannelData, value = parseFloat(channel.value)) {
  const isLowCurrent = IsCurrentChannel(channel) && value < 4;
  return {
    lowCurrent: isLowCurrent,
    label: isLowCurrent ? '低于4mA' : '正常',
    dot: isLowCurrent ? 'bg-[#F59E0B]' : 'bg-[#00B894]',
    text: isLowCurrent ? 'text-[#D97706]' : 'text-[#00B894]',
    bg: isLowCurrent ? 'bg-[#F59E0B]/10' : 'bg-[#00B894]/10',
    border: isLowCurrent ? 'border-[#F59E0B]/30' : 'border-[#00B894]/30',
    bar: isLowCurrent ? '#F59E0B' : '#00B894',
  };
}

function AddressModeBadge({ mode }: { mode: INetworkInterfaceConfig['addressMode'] }) {
  const isStatic = mode === 'static';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-xs font-black ${isStatic ? 'border-[#6366F1]/30 text-[#6366F1]' : 'border-[#00B894]/30 text-[#00B894]'}`}>
      {isStatic ? <BadgeCheck className="size-2.5" /> : <Shuffle className="size-2.5" />}
      {isStatic ? '静态' : 'DHCP'}
    </span>
  );
}

function ModuleMeta({ slot }: { slot: ModuleSlotData }) {
  return (
    <div className="mt-2 grid grid-cols-3 gap-2 text-[9px]">
      <div className="rounded-xl bg-[#F9FAFB] px-2 py-1">
        <div className="font-bold text-[#9CA3AF]">槽位</div>
        <div className="font-black text-[#111827] tabular-nums">#{slot.slotNumber}</div>
      </div>
      <div className="rounded-xl bg-[#F9FAFB] px-2 py-1">
        <div className="font-bold text-[#9CA3AF]">版本</div>
        <div className="font-black text-[#111827] tabular-nums">{slot.version}</div>
      </div>
      <div className="rounded-xl bg-[#F9FAFB] px-2 py-1">
        <div className="font-bold text-[#9CA3AF]">ADC</div>
        <div className="font-black text-[#111827] tabular-nums">{slot.adcValue}</div>
      </div>
    </div>
  );
}

function ChannelIndicator({ channel, valueText }: { channel: ChannelData; valueText?: string }) {
  const isDigital = channel.label.startsWith('DI-') || channel.label.startsWith('DO-');
  const sc = isDigital ? GetDigitalChannelState(channel) : GetAnalogChannelState(channel);
  return (
    <div className="flex items-center gap-1.5">
      <span className={`size-1.5 rounded-full ${sc.dot}`} />
      <span className="text-[9px] font-bold text-[#9CA3AF]">{channel.label}</span>
      <span className={`text-[9px] font-black tabular-nums ml-auto ${sc.text}`}>
        {isDigital ? sc.label : (valueText ?? `${channel.value}${channel.unit || ''}`)}
      </span>
    </div>
  );
}

function ModulePanelHeader({
  slot,
  title,
  subtitle,
}: {
  slot: ModuleSlotData;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-5">
      <div>
        <div className="text-base font-black text-[#111827]">{title}</div>
        <div className="text-sm font-bold text-[#9CA3AF] uppercase tracking-wider mt-0.5">{subtitle}</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-xs font-black rounded-full px-2 py-0.5 border-[#F3F4F6] text-[#111827]">
            槽位 #{slot.slotNumber}
          </Badge>
          <Badge variant="outline" className="text-xs font-black rounded-full px-2 py-0.5 border-[#00B894]/30 text-[#00B894]">
            {slot.version}
          </Badge>
          <Badge variant="outline" className="text-xs font-black rounded-full px-2 py-0.5 border-[#6366F1]/30 text-[#6366F1]">
            ADC {slot.adcValue}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// DI Module Control Panel
function DIControlPanel({
  slot,
  onDetectDigitalGroup,
}: {
  slot: ModuleSlotData;
  onDetectDigitalGroup: (group: number) => Promise<{ statusCode: number } | null>;
}) {
  const [portLevels, setPortLevels] = useState<Record<number, { level: number; levelStr: string }>>({});

  const fetchAll = useCallback(async () => {
    const r = await onDetectDigitalGroup(slot.groupIndex);
    if (!r) return;
    const sc = r.statusCode;
    const results: Record<number, { level: number; levelStr: string }> = {};
    for (const ch of slot.channelList) {
      const level = (sc >> (ch.index - 1)) & 1;
      results[ch.index] = { level, levelStr: level === 1 ? 'ON' : 'OFF' };
    }
    setPortLevels(results);
  }, [slot, onDetectDigitalGroup]);

  useEffect(() => {
    fetchAll();
    const timer = setInterval(fetchAll, 1000);
    return () => clearInterval(timer);
  }, [fetchAll]);

  const leftChannels = slot.channelList.slice(0, 8);
  const rightChannels = slot.channelList.slice(8, 16);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-[32px] border border-[#F3F4F6] shadow-lg p-6"
    >
      <ModulePanelHeader slot={slot} title={`${slot.model} 通道状态`} subtitle="16路数字量输入 · 每1秒刷新" />
      <div className="grid grid-cols-2 gap-3">
        {[leftChannels, rightChannels].map((column, columnIndex) => (
          <div key={columnIndex} className="space-y-2">
            {column.map((ch) => {
              const pl = portLevels[ch.index];
              const isOn = pl ? pl.level === 1 : ch.value === 'ON';
              const sc = GetDigitalChannelState({ ...ch, value: isOn ? 'ON' : 'OFF' });
              return (
                <div key={ch.index} className={`flex items-center gap-2 p-2.5 rounded-2xl border ${sc.border} ${sc.bg}`}>
                  <span className={`size-2.5 rounded-full ${sc.dot} ${isOn ? 'animate-pulse' : ''}`} />
                  <span className="text-sm font-black text-[#111827]">{ch.label}</span>
                  <Badge variant="outline" className={`ml-auto text-xs font-black uppercase px-1.5 py-0 rounded-full ${sc.text} ${sc.border}`}>
                    {sc.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// DO Module Control Panel
function DOControlPanel({
  slot,
  onTogglePort,
  toggling,
}: {
  slot: ModuleSlotData;
  onTogglePort: (group: number, port: number, currentLevel: 0 | 1) => Promise<void>;
  toggling: boolean;
}) {
  const handleToggle = async (portIndex: number) => {
    const ch = slot.channelList.find((c) => c.index === portIndex);
    if (!ch) return;
    const currentLevel = (ch.value === 'ON' ? 1 : 0) as 0 | 1;
    await onTogglePort(slot.groupIndex, portIndex, currentLevel);
  };

  const leftChannels = slot.channelList.slice(0, 8);
  const rightChannels = slot.channelList.slice(8, 16);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-[32px] border border-[#F3F4F6] shadow-lg p-6"
    >
      <ModulePanelHeader slot={slot} title={`${slot.model} 输出控制`} subtitle={`${slot.channels}路数字量输出 · 点击切换`} />
      <div className="grid grid-cols-2 gap-3">
        {[leftChannels, rightChannels].map((column, columnIndex) => (
          <div key={columnIndex} className="space-y-2">
            {column.map((ch) => {
              const isOn = ch.value === 'ON';
              return (
                <button
                  key={ch.index}
                  onClick={() => handleToggle(ch.index)}
                  disabled={toggling}
                  className={`flex w-full items-center gap-2 p-2.5 rounded-2xl border transition-all duration-200 ${
                    isOn
                      ? 'bg-[#00B894]/10 border-[#00B894]/30'
                      : 'bg-[#F9FAFB] border-[#F3F4F6] hover:border-[#00B894]/20'
                  } ${toggling ? 'opacity-50 cursor-wait' : ''}`}
                >
                  <span className={`size-2.5 rounded-full ${isOn ? 'bg-[#00B894] animate-pulse' : 'bg-[#9CA3AF]'}`} />
                  <span className="text-sm font-black text-[#111827]">{ch.label}</span>
                  <Badge variant="outline" className={`ml-auto text-xs font-black uppercase px-1.5 py-0 rounded-full ${isOn ? 'text-[#00B894] border-[#00B894]/30' : 'text-[#9CA3AF] border-[#F3F4F6]'}`}>
                    {isOn ? '导通' : '截止'}
                  </Badge>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// AI Module Control Panel
function AIControlPanel({
  slot,
  onDetectChannel,
}: {
  slot: ModuleSlotData;
  onDetectChannel: (group: number, channel: number, moduleType: number) => Promise<{ value: number; unit: string } | null>;
}) {
  const [realValues, setRealValues] = useState<Record<number, { value: number; unit: string }>>({});

  const fetchAll = useCallback(async () => {
    const results: Record<number, { value: number; unit: string }> = {};
    for (const ch of slot.channelList) {
      const r = await onDetectChannel(slot.groupIndex, ch.index, slot.moduleType);
      if (r) results[ch.index] = r;
    }
    setRealValues(results);
  }, [slot, onDetectChannel]);

  useEffect(() => {
    fetchAll();
    const timer = setInterval(fetchAll, 1000);
    return () => clearInterval(timer);
  }, [fetchAll]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-[32px] border border-[#F3F4F6] shadow-lg p-6"
    >
      <ModulePanelHeader slot={slot} title={`${slot.model} 实时数值`} subtitle={`${slot.channels}路模拟量输入 · 每1秒刷新`} />
      <div className="space-y-3">
        {slot.channelList.map((ch) => {
          const rv = realValues[ch.index];
          const val = rv ? rv.value : parseFloat(ch.value) || 0;
          const unit = rv ? rv.unit : ch.unit;
          const maxVal = unit === 'mA' ? 20 : 10;
          const pct = Math.min(100, (val / maxVal) * 100);
          const sc = GetAnalogChannelState({ ...ch, value: String(val) }, val);
          return (
            <div key={ch.index} className={`p-3 rounded-2xl border ${sc.border} ${sc.bg}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${sc.dot}`} />
                  <span className="text-sm font-black text-[#111827]">{ch.label}</span>
                </div>
                <span className="text-sm font-black text-[#111827] tabular-nums">
                  {val.toFixed(3)} <span className="text-sm text-[#9CA3AF]">{unit}</span>
                </span>
              </div>
              {sc.lowCurrent && (
                <div className="mb-1.5 text-xs font-black text-[#D97706]">电流输入小于 4mA</div>
              )}
              <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: sc.bar }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// AO Module Control Panel
function AOControlPanel({
  slot,
  onSetAnalogValue,
  onGetAoSetpoints,
}: {
  slot: ModuleSlotData;
  onSetAnalogValue: (group: number, channel: number, moduleType: number, value: number, unit: 'V' | 'mA') => Promise<void>;
  onGetAoSetpoints: (group: number) => Promise<Array<{ channelNum: number; value: number; unit: 'V' | 'mA'; readSuccess: boolean }> | null>;
}) {
  const shouldReadSetpoints = slot.moduleType === 6;
  const [values, setValues] = useState<Record<number, number>>(() =>
    Object.fromEntries(slot.channelList.map((ch) => [ch.index, parseFloat(ch.value) || 0]))
  );
  const [loadingSetpoints, setLoadingSetpoints] = useState(shouldReadSetpoints);
  const [sending, setSending] = useState<Record<number, boolean>>({});
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout); }, []);

  useEffect(() => {
    if (!shouldReadSetpoints) return;

    let active = true;
    async function loadSetpoints() {
      setLoadingSetpoints(true);
      const setpoints = await onGetAoSetpoints(slot.groupIndex);
      if (!active) return;
      if (setpoints) {
        setValues((previous) => ({
          ...previous,
          ...Object.fromEntries(
            setpoints
              .filter((setpoint) => setpoint.readSuccess)
              .map((setpoint) => [setpoint.channelNum, setpoint.value]),
          ),
        }));
      }
      setLoadingSetpoints(false);
    }
    void loadSetpoints();
    return () => {
      active = false;
    };
  }, [onGetAoSetpoints, shouldReadSetpoints, slot.groupIndex]);

  const handleChange = (ch: ChannelData, v: number) => {
    if (loadingSetpoints) return;
    setValues((prev) => ({ ...prev, [ch.index]: v }));
    if (timers.current[ch.index]) clearTimeout(timers.current[ch.index]);
    timers.current[ch.index] = setTimeout(async () => {
      setSending((prev) => ({ ...prev, [ch.index]: true }));
      const unit = (ch.unit === 'V' ? 'V' : 'mA') as 'V' | 'mA';
      await onSetAnalogValue(slot.groupIndex, ch.index, slot.moduleType, v, unit);
      setSending((prev) => ({ ...prev, [ch.index]: false }));
    }, 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-[32px] border border-[#F3F4F6] shadow-lg p-6"
    >
      <ModulePanelHeader
        slot={slot}
        title={`${slot.model} 输出调节`}
        subtitle={loadingSetpoints ? '正在读取当前输出设定值...' : `${slot.channels}路模拟量输出 · 拖动停止300ms后输出`}
      />
      <div className="space-y-4">
        {slot.channelList.map((ch) => {
          const isVoltage = ch.unit === 'V';
          const maxVal = isVoltage ? 10 : 20;
          const val = loadingSetpoints ? 0 : (values[ch.index] ?? (parseFloat(ch.value) || 0));
          const isSending = sending[ch.index];
          const outOfRangeCurrent = !isVoltage && val > maxVal;
          const sc = GetAnalogChannelState({ ...ch, value: String(val) }, val);
          return (
            <div key={ch.index} className={`p-3 rounded-2xl border ${sc.border} ${sc.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${sc.dot}`} />
                  <span className="text-sm font-black text-[#111827]">{ch.label}</span>
                  {loadingSetpoints && <span className="text-xs text-[#6366F1] font-bold animate-pulse">读取中...</span>}
                  {isSending && !loadingSetpoints && <span className="text-xs text-[#6366F1] font-bold animate-pulse">输出中...</span>}
                </div>
                <span className="text-sm font-black text-[#111827] tabular-nums">
                  {val.toFixed(1)} <span className="text-sm text-[#9CA3AF]">{ch.unit}</span>
                </span>
              </div>
              {sc.lowCurrent && (
                <div className="mb-2 text-xs font-black text-[#D97706]">电流输出小于 4mA</div>
              )}
              {outOfRangeCurrent && (
                <div className="mb-2 text-xs font-black text-[#D97706]">超出 20mA 可调范围</div>
              )}
              <Slider
                value={[val]}
                min={0}
                max={maxVal}
                step={0.1}
                onValueChange={([v]) => handleChange(ch, v)}
                disabled={loadingSetpoints || outOfRangeCurrent}
                className="w-full"
              />
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// RS485/RS232 Module Control Panel
function SerialControlPanel({
  slot,
  uartAttrMap,
  onGetUartAttr,
}: {
  slot: ModuleSlotData;
  uartAttrMap: Record<number, Ct16UartAttrDto | null>;
  onGetUartAttr: (group: number, chx: number) => void;
}) {
  const [activeLabel, setActiveLabel] = useState(slot.channelList[0]?.label || '');
  const parityLabels = ['None', 'Odd', 'Even'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-[32px] border border-[#F3F4F6] shadow-lg p-6"
    >
      <ModulePanelHeader slot={slot} title={`${slot.model} 端口状态`} subtitle={slot.spec} />
      <div className="space-y-3">
        <div className="rounded-2xl border border-[#F3F4F6] bg-[#F9FAFB] p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {slot.channelList.map((ch) => {
              const portOccupied = slot.isOnline;
              return (
                <button
                  key={ch.index}
                  onClick={() => {
                    setActiveLabel(ch.label);
                    onGetUartAttr(slot.groupIndex, ch.index - 1);
                  }}
                  className={`rounded-full border px-3 py-1 text-sm font-black transition-colors ${
                    activeLabel === ch.label
                      ? 'border-[#00B894]/40 bg-[#00B894]/10 text-[#00B894]'
                      : 'border-[#E5E7EB] bg-white text-[#9CA3AF]'
                  }`}
                >
                  {ch.label} · {portOccupied ? '使用中' : '未使用'}
                </button>
              );
            })}
          </div>
          {(() => {
            const activeCh = slot.channelList.find((c) => c.label === activeLabel);
            if (!activeCh) return null;
            const portOccupied = slot.isOnline;
            const attr = activeCh ? uartAttrMap[activeCh.index - 1] : null;
            if (portOccupied && attr) {
              return (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: '波特率', value: attr.baudRate },
                    { label: '数据位', value: String(attr.dataBits) },
                    { label: '停止位', value: String(attr.stopBits) },
                    { label: '校验位', value: parityLabels[attr.parity] || 'None' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-white px-3 py-2">
                      <div className="text-sm font-bold text-[#9CA3AF]">{item.label}</div>
                      <div className="mt-1 text-sm font-black text-[#111827] tabular-nums">{item.value}</div>
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white p-6 text-center">
                <div className="text-sm font-black text-[#111827]">{activeLabel} 未使用</div>
                <div className="mt-1 text-sm font-bold text-[#9CA3AF]">当前端口无业务绑定，暂无串口参数。</div>
              </div>
            );
          })()}
        </div>
      </div>
    </motion.div>
  );
}

// NMEA Module Control Panel
function NMEAControlPanel({ slot }: { slot: ModuleSlotData }) {
  const fixed = slot.isOnline && slot.status === 'normal';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-[32px] border border-[#F3F4F6] shadow-lg p-6"
    >
      <ModulePanelHeader slot={slot} title={`${slot.model} 定位状态`} subtitle="1路 RS232 NMEA 定位接口" />
      <div className="rounded-2xl border border-[#F3F4F6] bg-[#F9FAFB] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`size-2.5 rounded-full ${fixed ? 'bg-[#00B894] animate-pulse' : 'bg-[#F97316]'}`} />
            <span className="text-sm font-black text-[#111827]">{fixed ? '定位成功' : '未定位'}</span>
          </div>
          <Badge className={`rounded-full text-xs font-black ${fixed ? 'bg-[#00B894]/10 text-[#00B894] border-[#00B894]/20' : 'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20'}`}>
            {slot.channelList[0]?.label || 'RS232'}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            { label: '波特率', value: slot.channelList[0]?.value || '4800bps' },
            { label: '数据位', value: '8' },
            { label: '停止位', value: '1' },
            { label: '校验位', value: 'None' },
            { label: '纬度', value: fixed ? '28.19409 N' : '--' },
            { label: '经度', value: fixed ? '112.98228 E' : '--' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-white p-3">
              <div className="font-bold text-[#9CA3AF]">{item.label}</div>
              <div className="font-black text-[#111827]">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── 无线模块槽位 ──────────────────────────────────

type WirelessOption = { key: string; label: string; icon: React.ComponentType<{ className?: string }>; color: string };

const SLOT1_OPTIONS: WirelessOption[] = [
  { key: '4g', label: '4G 模块', icon: Radio, color: '#6366F1' },
  { key: 'wifi', label: 'WiFi 模块', icon: Wifi, color: '#00B894' },
];

const SLOT2_OPTIONS: WirelessOption[] = [
  { key: 'ble', label: '蓝牙模块', icon: Bluetooth, color: '#00B894' },
  { key: 'sle', label: '星闪模块', icon: Radio, color: '#6366F1' },
];

function WirelessSlotCard({
  slotLabel,
  options,
  selectedKey,
  details,
  loadFailed,
}: {
  slotLabel: string;
  options: WirelessOption[];
  selectedKey?: string;
  details?: Ct16WirelessSlotTopologyDto;
  loadFailed: boolean;
}) {
  const selected = options.find((o) => o.key === selectedKey) || {
    key: 'pending',
    label: loadFailed ? '配置读取失败' : '正在读取配置',
    icon: loadFailed ? AlertTriangle : Loader2,
    color: loadFailed ? '#F97316' : '#9CA3AF',
  };
  const SelectedIcon = selected.icon;
  const isPending = selected.key === 'pending';
  const detailLabel = selected.key === '4g' || selected.key === 'wifi' ? 'IP 地址' : 'MAC 地址';
  const detailValue = selected.key === '4g' || selected.key === 'wifi'
    ? details?.ipAddress || '--'
    : selected.key === 'ble' || selected.key === 'sle'
      ? details?.macAddress || '--'
      : '--';
  const extraLabel = selected.key === '4g' || selected.key === 'wifi' ? '信号强度' : '广播名称';
  const extraValue = selected.key === '4g' || selected.key === 'wifi'
    ? details?.signalStrength || '--'
    : selected.key === 'ble' || selected.key === 'sle'
      ? details?.broadcastName || '--'
      : '--';

  return (
    <div
      className={`w-full rounded-2xl border p-3 text-left ${
        isPending
          ? 'border-dashed border-[#E5E7EB] bg-[#F9FAFB]/50'
          : 'border-[#F3F4F6] bg-[#F9FAFB]'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <Badge variant="outline" className="rounded-full border-[#E5E7EB] bg-white px-2 py-0 text-xs font-black text-[#6B7280]">
          {slotLabel}
        </Badge>
        {!isPending && <span className="size-2 rounded-full bg-[#00B894] animate-pulse" />}
        {isPending && <span className={`size-2 rounded-full ${loadFailed ? 'bg-[#F97316]' : 'bg-[#9CA3AF]'}`} />}
      </div>
      <div className="mb-3 flex items-center gap-3">
        <div
          className="flex size-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${selected.color}18` }}
        >
          <div style={{ color: selected.color }}>
            <SelectedIcon className={`size-5 ${isPending && !loadFailed ? 'animate-spin' : ''}`} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-black text-[#111827]">{selected.label}</div>
          {details?.version && (
            <div className="mt-0.5 truncate text-xs font-bold text-[#9CA3AF]">版本 {details.version}</div>
          )}
        </div>
      </div>
      {!isPending && (
        <div className="space-y-2 rounded-xl border border-white/80 bg-white px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-xs font-bold text-[#9CA3AF]">{detailLabel}</span>
              <span className="min-w-0 truncate text-sm font-black text-[#111827]">{detailValue}</span>
            </div>
            <Badge
              variant="outline"
              className="shrink-0 rounded-full px-2 py-0"
              style={{ color: selected.color, borderColor: `${selected.color}30`, backgroundColor: `${selected.color}08` }}
            >
              运行中
            </Badge>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-xs font-bold text-[#9CA3AF]">{extraLabel}</span>
            <span className="min-w-0 truncate text-sm font-black text-[#111827]">{extraValue}</span>
          </div>
        </div>
      )}
      {isPending && (
        <div className={`text-xs font-medium ${loadFailed ? 'text-[#F97316]' : 'text-[#9CA3AF]'}`}>
          {loadFailed ? '请检查设备后端服务或模块配置文件' : '正在读取模块配置...'}
        </div>
      )}
    </div>
  );
}

// Main control unit (left side)
function MainControlUnit({
  firmwareVersion,
  uptimeSeconds,
  eth0Enabled,
  eth0Ip,
  eth0Mode,
  eth1Enabled,
  eth1Ip,
  eth1Mode,
  wirelessTopology,
  wirelessTopologyError,
}: {
  firmwareVersion: string;
  uptimeSeconds: number;
  eth0Enabled: boolean;
  eth0Ip: string;
  eth0Mode: string;
  eth1Enabled: boolean;
  eth1Ip: string;
  eth1Mode: string;
  wirelessTopology: Ct16WirelessTopologyDto | null;
  wirelessTopologyError: boolean;
}) {
  const mainModuleInfo = [
    { label: '固件版本', value: firmwareVersion || '--' },
    { label: '处理器', value: 'RK3506J' },
    { label: '主频', value: '1.2GHz' },
    { label: '运行时长', value: formatUptimeShort(uptimeSeconds) },
  ];

  return (
    <Card className="p-6 rounded-[48px] border border-[#F3F4F6] shadow-sm bg-white flex flex-col">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-xl bg-[#1F2937]/5 flex items-center justify-center">
            <Cpu className="size-4 text-[#1F2937]" />
          </div>
          <div>
            <div className="text-base font-black text-[#111827]">主模块</div>
            <div className="text-sm font-bold text-[#9CA3AF] uppercase tracking-wider">CT16 控制器 · 无线扩展</div>
          </div>
        </div>
        <Badge className="text-xs font-black rounded-full bg-[#00B894]/10 text-[#00B894] border-[#00B894]/20">
          在线
        </Badge>
      </div>

      <div className="rounded-[32px] border border-[#F3F4F6] bg-[#F9FAFB] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
          <div className="size-10 rounded-2xl bg-[#00B894]/10 flex items-center justify-center shrink-0">
            <Cpu className="size-5 text-[#00B894]" />
          </div>
            <div className="min-w-0">
            <div className="text-base font-black text-[#111827]">CT16 在鸿控制器</div>
              <div className="mt-0.5 text-sm font-bold text-[#9CA3AF]">主控单元</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {MAIN_MODULE_LEDS.map((led) => {
              const label = led.label === 'BLE' && wirelessTopology?.slot2.type === 'sle' ? 'SLE' : led.label;
              return (
                <div key={led.label} className="flex flex-col items-center gap-1.5">
                  <span className={`size-2.5 rounded-full ${led.dot} ${led.flash ? 'animate-pulse' : ''}`} />
                  <span className="text-xs font-black text-[#9CA3AF]">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-x-5 gap-y-3 rounded-xl bg-white px-3.5 py-3 text-sm sm:grid-cols-2">
          {mainModuleInfo.map((item) => (
            <div key={item.label} className="min-w-0">
              <div className="font-bold text-[#9CA3AF]">{item.label}</div>
              <div className="mt-0.5 break-all font-black leading-5 text-[#111827] tabular-nums" title={item.value}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-[#9CA3AF]">
            <Network className="size-3" />
            <span className="font-bold">ETH0</span>
            <span className="ml-auto flex items-center gap-1.5 font-black">
              {eth0Enabled ? (
                <>
                  <AddressModeBadge mode={(eth0Mode || 'dhcp') as INetworkInterfaceConfig['addressMode']} />
                  <span className="text-[#111827]">{eth0Ip || '--'}</span>
                </>
              ) : (
                <span className="flex items-center gap-1 text-[#9CA3AF]">
                  <span className="size-1.5 rounded-full bg-[#9CA3AF]" />
                  Down
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#9CA3AF]">
            <Network className="size-3" />
            <span className="font-bold">ETH1</span>
            <span className="ml-auto flex items-center gap-1.5 font-black">
              {eth1Enabled ? (
                <>
                  <AddressModeBadge mode={(eth1Mode || 'dhcp') as INetworkInterfaceConfig['addressMode']} />
                  <span className="text-[#111827]">{eth1Ip || '--'}</span>
                </>
              ) : (
                <span className="flex items-center gap-1 text-[#9CA3AF]">
                  <span className="size-1.5 rounded-full bg-[#9CA3AF]" />
                  Down
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-[#F3F4F6] pt-3 text-sm">
          <Power className="size-3 text-[#00B894]" />
          <span className="font-bold text-[#9CA3AF]">DC12-24V/1.0A</span>
          <span className="font-black text-[#00B894] ml-auto">正常</span>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <WirelessSlotCard
          slotLabel="4G/WiFi 模块槽位"
          options={SLOT1_OPTIONS}
          selectedKey={wirelessTopology?.slot1.type}
          details={wirelessTopology?.slot1}
          loadFailed={wirelessTopologyError}
        />
        <WirelessSlotCard
          slotLabel="蓝牙/星闪 模块槽位"
          options={SLOT2_OPTIONS}
          selectedKey={wirelessTopology?.slot2.type}
          details={wirelessTopology?.slot2}
          loadFailed={wirelessTopologyError}
        />
      </div>
    </Card>
  );
}

// IO expansion module card (right side)
function IOModuleCard({
  slot,
  onSelect,
  onGetAoSetpoints,
}: {
  slot: ModuleSlotData;
  onSelect: (s: ModuleSlotData) => void;
  onGetAoSetpoints: (group: number) => Promise<Array<{ channelNum: number; value: number; unit: 'V' | 'mA'; readSuccess: boolean }> | null>;
}) {
  const onlineState = GetModuleOnlineState(slot.isOnline);
  const isMain = slot.slotNumber === 0;
  const isSerial = slot.type === 'RS485 通信' || slot.type === 'RS232 通信' || slot.type === 'NMEA 通信';
  const shouldReadAoSetpoints = slot.moduleType === 6;
  const [aoSetpoints, setAoSetpoints] = useState<Record<number, { value: number; unit: 'V' | 'mA' }>>({});
  const [loadingAoSetpoints, setLoadingAoSetpoints] = useState(shouldReadAoSetpoints);

  useEffect(() => {
    if (!shouldReadAoSetpoints) return;

    let active = true;
    async function loadAoSetpoints() {
      setLoadingAoSetpoints(true);
      const setpoints = await onGetAoSetpoints(slot.groupIndex);
      if (!active) return;
      if (setpoints) {
        setAoSetpoints((previous) => ({
          ...previous,
          ...Object.fromEntries(
            setpoints
              .filter((setpoint) => setpoint.readSuccess)
              .map((setpoint) => [setpoint.channelNum, { value: setpoint.value, unit: setpoint.unit }]),
          ),
        }));
      }
      setLoadingAoSetpoints(false);
    }
    void loadAoSetpoints();
    return () => {
      active = false;
    };
  }, [onGetAoSetpoints, shouldReadAoSetpoints, slot]);

  if (isMain) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: slot.slotNumber * 0.05 }}
    >
      <Card
        className={`p-4 rounded-[28px] border cursor-pointer transition-all duration-300 hover:shadow-md group ${
          slot.status === 'empty'
            ? 'border-dashed border-[#E5E7EB] bg-[#F9FAFB]/50'
            : 'border-[#F3F4F6] bg-white shadow-sm hover:border-[#00B894]/30'
        }`}
        onClick={() => slot.status !== 'empty' && onSelect(slot)}
      >
        {/* Model badge */}
        <div className="flex items-center justify-between mb-3">
          <Badge
            className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
              slot.status === 'empty'
                ? 'bg-[#F3F4F6] text-[#9CA3AF]'
                : 'bg-[#1F2937] text-white'
            }`}
          >
            {slot.model}
          </Badge>
          <div className={`flex items-center gap-1.5 text-[10px] font-black ${onlineState.text}`}>
            <span className={`size-2 rounded-full ${onlineState.dot} ${slot.isOnline ? 'animate-pulse' : ''}`} />
            <span>{onlineState.label}</span>
          </div>
        </div>

        {/* Module name */}
        <div className="text-sm font-black text-[#111827] mb-1">{slot.name}</div>
        <div className="text-[10px] font-bold text-[#9CA3AF] mb-3">{slot.spec}</div>
        {slot.status !== 'empty' && <ModuleMeta slot={slot} />}

        {/* Channel indicators */}
        {slot.status !== 'empty' && slot.channelList.length > 0 && (
          <div className="space-y-1.5 border-t border-[#F3F4F6] pt-3">
            {isSerial
              ? slot.channelList.map((ch) => {
                  const portOccupied = slot.isOnline;
                  return (
                    <div key={ch.index} className="flex items-center gap-1.5">
                      <span className={`size-1.5 rounded-full ${portOccupied ? 'bg-[#00B894]' : 'bg-[#9CA3AF]'}`} />
                      <span className="text-[9px] font-bold text-[#9CA3AF]">{ch.label}</span>
                      <span className={`ml-auto text-[9px] font-black ${portOccupied ? 'text-[#00B894]' : 'text-[#6B7280]'}`}>
                        {portOccupied ? '使用中' : '未使用'}
                      </span>
                    </div>
                  );
                })
              : (
                  <>
                    {slot.channelList.slice(0, 4).map((ch) => {
                      const setpoint = aoSetpoints[ch.index];
                      const valueText = shouldReadAoSetpoints
                        ? (loadingAoSetpoints
                            ? '读取中'
                          : setpoint
                            ? setpoint.value.toFixed(3) + setpoint.unit
                            : '--')
                        : undefined;
                      return <ChannelIndicator key={ch.index} channel={ch} valueText={valueText} />;
                    })}
                    {slot.channelList.length > 4 && (
                      <div className="pt-1 text-center text-[9px] font-bold text-[#9CA3AF]">
                        +{slot.channelList.length - 4} 通道
                      </div>
                    )}
                  </>
                )}
          </div>
        )}

        {/* Empty slot */}
        {slot.status === 'empty' && (
          <div className="flex flex-col items-center gap-2 py-4 text-[#D1D5DB]">
            <Plus className="size-6" />
            <span className="text-[10px] font-bold">可扩展槽位</span>
          </div>
        )}

        {/* Click hint */}
        {slot.status !== 'empty' && (
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-[#F3F4F6] text-[9px] text-[#9CA3AF] group-hover:text-[#00B894] transition-colors">
            <Settings2 className="size-3" />
            <span className="font-bold">点击查看详情</span>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

export default function ModuleTopology() {
  const {
    modules,
    loading,
    error,
    refresh,
    togglePort,
    setAnalogValue,
    getAoSetpoints,
    detectChannel,
    detectDigitalGroup,
    getUartConfig,
  } = useModuleTopology();

  const [selectedSlot, setSelectedSlot] = useState<ModuleSlotData | null>(null);
  const [toggling, setToggling] = useState(false);
  const [uartAttrMap, setUartAttrMap] = useState<Record<number, Ct16UartAttrDto | null>>({});
  const [overview, setOverview] = useState<Ct16SystemOverviewDto | null>(null);
  const [networkSettings, setNetworkSettings] = useState<Ct16NetworkSettingsDto | null>(null);
  const [wirelessTopology, setWirelessTopology] = useState<Ct16WirelessTopologyDto | null>(null);
  const [wirelessTopologyError, setWirelessTopologyError] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetchData() {
      const wirelessRequest = getWirelessModuleTopology().catch(async () => {
        const modules = await getWirelessModules();
        const slot2 = modules.slot2;
        return {
          slot1: { type: modules.slot1 },
          slot2: { type: slot2 },
        } as Ct16WirelessTopologyDto;
      });
      const [ov, ns, wt] = await Promise.allSettled([
        getSystemOverview(),
        getNetworkSettings(),
        wirelessRequest,
      ]);
      if (!active) return;
      if (ov.status === 'fulfilled') {
        setOverview(ov.value);
      }
      if (ns.status === 'fulfilled') {
        setNetworkSettings(ns.value);
      }
      if (wt.status === 'fulfilled') {
        setWirelessTopology(wt.value);
        setWirelessTopologyError(false);
      } else {
        setWirelessTopologyError(true);
      }
    }
    fetchData();
    const timer = setInterval(fetchData, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const mainControlProps = {
    firmwareVersion: overview?.device?.firmwareVersion || '',
    uptimeSeconds: overview?.status?.uptimeSeconds || 0,
    eth0Enabled: networkSettings?.interfaces?.eth0?.enabled ?? true,
    eth0Ip: networkSettings?.interfaces?.eth0?.runtimeIpAddress || networkSettings?.interfaces?.eth0?.ipAddress || '',
    eth0Mode: networkSettings?.interfaces?.eth0?.addressMode || 'dhcp',
    eth1Enabled: networkSettings?.interfaces?.eth1?.enabled ?? true,
    eth1Ip: networkSettings?.interfaces?.eth1?.runtimeIpAddress || networkSettings?.interfaces?.eth1?.ipAddress || '',
    eth1Mode: networkSettings?.interfaces?.eth1?.addressMode || 'dhcp',
    wirelessTopology,
    wirelessTopologyError,
  };

  const handleGetUartAttr = useCallback(
    async (group: number, chx: number) => {
      const attr = await getUartConfig(group, chx);
      setUartAttrMap((prev) => ({ ...prev, [chx]: attr }));
    },
    [getUartConfig],
  );

  const handleTogglePort = useCallback(
    async (group: number, port: number, currentLevel: 0 | 1) => {
      setToggling(true);
      await togglePort(group, port, currentLevel);
      // 同步更新 selectedSlot，避免控制面板显示旧状态
      const newLevel = currentLevel === 0 ? 1 : 0;
      setSelectedSlot((prev) => {
        if (!prev || prev.groupIndex !== group) return prev;
        return {
          ...prev,
          portStatus:
            newLevel === 1
              ? prev.portStatus | (1 << (port - 1))
              : prev.portStatus & ~(1 << (port - 1)),
          channelList: prev.channelList.map((ch) => {
            if (ch.index !== port) return ch;
            return {
              ...ch,
              value: newLevel === 1 ? 'ON' : 'OFF',
              status: (newLevel === 1 ? 'normal' : 'off') as ChannelData['status'],
            };
          }),
        };
      });
      setToggling(false);
    },
    [togglePort],
  );

  const renderControlPanel = () => {
    if (!selectedSlot) return null;

    const type = selectedSlot.type;
    if (type === 'DI 输入' || type === 'DI+DO 混合')
      return <DIControlPanel slot={selectedSlot} onDetectDigitalGroup={detectDigitalGroup} />;
    if (type === 'DO 输出' || type === 'DO 输出')
      return <DOControlPanel slot={selectedSlot} onTogglePort={handleTogglePort} toggling={toggling} />;
    if (type === 'AI 输入')
      return <AIControlPanel slot={selectedSlot} onDetectChannel={detectChannel} />;
    if (type === 'AO 输出' || type === 'AI+AO 混合')
      return (
        <AOControlPanel
          key={selectedSlot.id}
          slot={selectedSlot}
          onSetAnalogValue={setAnalogValue}
          onGetAoSetpoints={getAoSetpoints}
        />
      );
    if (type === 'RS485 通信' || type === 'RS232 通信')
      return <SerialControlPanel slot={selectedSlot} uartAttrMap={uartAttrMap} onGetUartAttr={handleGetUartAttr} />;
    if (type === 'NMEA 通信')
      return <NMEAControlPanel slot={selectedSlot} />;
    return null;
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <MainControlUnit {...mainControlProps} />
          </div>
          <div className="lg:col-span-8">
            <Card className="p-6 rounded-[48px] border border-[#F3F4F6] shadow-sm bg-white">
              <div className="flex items-center gap-3 mb-5">
                <div className="size-8 rounded-xl bg-[#1F2937]/5 flex items-center justify-center">
                  <Loader2 className="size-4 text-[#6366F1] animate-spin" />
                </div>
                <div>
                  <div className="text-sm font-black text-[#111827]">IO 扩展模块组</div>
                  <div className="text-[10px] font-bold text-[#9CA3AF]">正在检测模块...</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 rounded-[28px] bg-[#F9FAFB] animate-pulse" />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Error or empty state
  if (error || modules.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <MainControlUnit {...mainControlProps} />
          </div>
          <div className="lg:col-span-8">
            <Card className="p-6 rounded-[48px] border border-[#F3F4F6] shadow-sm bg-white">
              <div className="flex items-center gap-3 mb-5">
                <div className="size-8 rounded-xl bg-[#F97316]/10 flex items-center justify-center">
                  <AlertTriangle className="size-4 text-[#F97316]" />
                </div>
                <div>
                  <div className="text-sm font-black text-[#111827]">IO 扩展模块组</div>
                  <div className="text-[10px] font-bold text-[#F97316]">
                    {error || '未检测到 IO 扩展模块'}
                  </div>
                </div>
                <button
                  onClick={refresh}
                  className="ml-auto size-8 rounded-xl bg-[#F9FAFB] flex items-center justify-center text-[#6366F1] hover:bg-[#EEF2FF] transition-colors"
                >
                  <RefreshCw className="size-4" />
                </button>
              </div>
              <div className="flex flex-col items-center py-12 text-[#9CA3AF]">
                <Plus className="size-12 mb-3" />
                <span className="text-sm font-bold">未检测到 IO 扩展模块</span>
                <span className="text-[10px] mt-1">点击刷新按钮重试，或检查 CAN 总线连接</span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Device structure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Main control + wireless */}
        <div className="lg:col-span-4">
          <MainControlUnit {...mainControlProps} />
        </div>

        {/* Right: IO expansion modules */}
        <div className="lg:col-span-8">
          <Card className="p-6 rounded-[48px] border border-[#F3F4F6] shadow-sm bg-white">
            <div className="flex items-center gap-3 mb-5">
              <div className="size-8 rounded-xl bg-[#1F2937]/5 flex items-center justify-center">
                <Cable className="size-4 text-[#1F2937]" />
              </div>
              <div>
                <div className="text-sm font-black text-[#111827]">IO 扩展模块组</div>
                <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                  后端反馈 {modules.length} 个模块 · 按 ADC 升序排列
                </div>
              </div>
              <div className="ml-auto">
                <div className="flex items-center gap-3 text-[10px] font-black text-[#9CA3AF]">
                  {Object.values(ONLINE_STATUS).map((status) => (
                    <div key={status.label} className="flex items-center gap-1.5">
                      <span className={`size-2 rounded-full ${status.dot} ${status.label === '在线' ? 'animate-pulse' : ''}`} />
                      <span>{status.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {modules.map((slot) => (
                <IOModuleCard
                  key={slot.id}
                  slot={slot}
                  onSelect={setSelectedSlot}
                  onGetAoSetpoints={getAoSetpoints}
                />
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Module detail dialog */}
      <Dialog open={selectedSlot !== null} onOpenChange={(open) => !open && setSelectedSlot(null)}>
        <DialogContent className="max-w-5xl border-0 bg-transparent p-0 shadow-none" showCloseButton={false}>
          <DialogHeader className="sr-only">
            <DialogTitle>扩展子模块详情</DialogTitle>
          </DialogHeader>
          <AnimatePresence mode="wait">
            {renderControlPanel()}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
