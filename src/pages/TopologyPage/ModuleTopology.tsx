import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  X,
  Settings2,
  Cable,
  Router,
  BadgeCheck,
  Shuffle,
  Download,
} from 'lucide-react';
import { MOCK_IO_MODULE_COUNT, MOCK_MODULE_SLOTS, type IModuleSlot, type IModuleChannel } from '@/data/topology';
import {
  MOCK_NETWORK_INTERFACE_SETTINGS,
  MOCK_WIRELESS_SLOT_SETTINGS,
  type INetworkInterfaceConfig,
  type INetworkInterfaceSettings,
  type IWirelessSlotSettings,
} from '@/data/settings';

const STATUS_COLORS = {
  normal: { dot: 'bg-[#00B894]', text: 'text-[#00B894]', bg: 'bg-[#00B894]/10', border: 'border-[#00B894]/30' },
  warning: { dot: 'bg-[#F97316]', text: 'text-[#F97316]', bg: 'bg-[#F97316]/10', border: 'border-[#F97316]/30' },
  fault: { dot: 'bg-[#F43F5E]', text: 'text-[#F43F5E]', bg: 'bg-[#F43F5E]/10', border: 'border-[#F43F5E]/30' },
  off: { dot: 'bg-[#9CA3AF]', text: 'text-[#9CA3AF]', bg: 'bg-[#9CA3AF]/10', border: 'border-[#9CA3AF]/30' },
  empty: { dot: 'bg-[#E5E7EB]', text: 'text-[#D1D5DB]', bg: 'bg-[#F9FAFB]', border: 'border-[#E5E7EB]' },
};

const ONLINE_STATUS = {
  online: { dot: 'bg-[#00B894]', text: 'text-[#00B894]', bg: 'bg-[#00B894]/10', border: 'border-[#00B894]/30', label: '在线' },
  offline: { dot: 'bg-[#9CA3AF]', text: 'text-[#6B7280]', bg: 'bg-[#F9FAFB]', border: 'border-[#E5E7EB]', label: '离线' },
};

type SerialDisplayMode = 'hex' | 'text';

type SerialLogEntry = {
  time: string;
  hex: string;
  text: string;
};

type SerialPortState = {
  occupied: boolean;
  params: {
    baudRate: string;
    dataBits: string;
    stopBits: string;
    parity: string;
  } | null;
  uplink: SerialLogEntry[];
  downlink: SerialLogEntry[];
};

const SERIAL_PORT_USAGE: Record<string, Record<string, SerialPortState>> = {
  'RS232-2CH': {
    COM1: {
      occupied: true,
      params: { baudRate: '115200', dataBits: '8', stopBits: '1', parity: 'None' },
      uplink: [
        { time: '10:24:13.128', hex: '41 54 2B 50 49 4E 47 0D 0A', text: 'AT+PING' },
        { time: '10:24:15.342', hex: '01 03 00 00 00 02 C4 0B', text: 'Read holding register 0x0000 length 2' },
      ],
      downlink: [
        { time: '10:24:13.214', hex: '4F 4B 0D 0A', text: 'OK' },
        { time: '10:24:15.410', hex: '01 03 04 00 7B 00 42 8A 31', text: 'Register values: 123, 66' },
      ],
    },
    COM2: {
      occupied: false,
      params: null,
      uplink: [],
      downlink: [],
    },
  },
  'RS485-2CH': {
    COM1: {
      occupied: false,
      params: null,
      uplink: [],
      downlink: [],
    },
    COM2: {
      occupied: true,
      params: { baudRate: '9600', dataBits: '8', stopBits: '1', parity: 'Even' },
      uplink: [
        { time: '11:08:02.036', hex: '02 04 00 10 00 02 70 3C', text: 'Slave 02 read input register 0x0010 length 2' },
        { time: '11:08:06.512', hex: '02 06 00 20 00 01 49 F0', text: 'Slave 02 write register 0x0020 value 1' },
      ],
      downlink: [
        { time: '11:08:02.104', hex: '02 04 04 01 2C 00 64 7B 92', text: 'Input values: 300, 100' },
        { time: '11:08:06.580', hex: '02 06 00 20 00 01 49 F0', text: 'Write acknowledged' },
      ],
    },
  },
};

const NMEA_RAW_MESSAGES = [
  '$GNRMC,024813.00,A,2811.6454,N,11258.9368,E,0.018,,080726,,,A*6C',
  '$GNGGA,024813.00,2811.6454,N,11258.9368,E,1,18,0.8,68.2,M,-12.1,M,,*52',
  '$GNGSA,A,3,03,08,10,14,18,21,24,26,29,31,32,36,1.2,0.8,0.9*33',
];

const WIRELESS_STORAGE_KEY = 'zaihong:wirelessSlots';
const NETWORK_STORAGE_KEY = 'zaihong:networkInterfaces';

function GetModuleOnlineState(status: IModuleSlot['status']) {
  return status === 'normal' || status === 'warning' ? ONLINE_STATUS.online : ONLINE_STATUS.offline;
}

function IsDigitalOn(value: string) {
  return value === 'ON' || value === '导通';
}

function GetDigitalChannelState(channel: IModuleChannel) {
  const isOn = IsDigitalOn(channel.value);
  return {
    label: isOn ? '导通' : '截止',
    dot: isOn ? 'bg-[#00B894]' : 'bg-[#9CA3AF]',
    text: isOn ? 'text-[#00B894]' : 'text-[#6B7280]',
    bg: isOn ? 'bg-[#00B894]/10' : 'bg-[#F9FAFB]',
    border: isOn ? 'border-[#00B894]/30' : 'border-[#E5E7EB]',
  };
}

function IsCurrentChannel(channel: IModuleChannel) {
  return channel.label.startsWith('CI-') || channel.label.startsWith('CO-');
}

function GetAnalogChannelState(channel: IModuleChannel, value = parseFloat(channel.value)) {
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

function GetSerialPortState(model: string, channelLabel: string) {
  return SERIAL_PORT_USAGE[model]?.[channelLabel] || {
    occupied: false,
    params: null,
    uplink: [],
    downlink: [],
  };
}

function DownloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function LoadWirelessSlots(): IWirelessSlotSettings {
  try {
    const stored = localStorage.getItem(WIRELESS_STORAGE_KEY);
    return stored ? { ...MOCK_WIRELESS_SLOT_SETTINGS, ...JSON.parse(stored) } : { ...MOCK_WIRELESS_SLOT_SETTINGS };
  } catch {
    return { ...MOCK_WIRELESS_SLOT_SETTINGS };
  }
}

function LoadNetworkInterfaces(): INetworkInterfaceSettings {
  try {
    const stored = localStorage.getItem(NETWORK_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    return parsed
      ? {
          ...MOCK_NETWORK_INTERFACE_SETTINGS,
          ...parsed,
          interfaces: {
            ...MOCK_NETWORK_INTERFACE_SETTINGS.interfaces,
            ...parsed.interfaces,
          },
        }
      : {
          ...MOCK_NETWORK_INTERFACE_SETTINGS,
          interfaces: { ...MOCK_NETWORK_INTERFACE_SETTINGS.interfaces },
        };
  } catch {
    return {
      ...MOCK_NETWORK_INTERFACE_SETTINGS,
      interfaces: { ...MOCK_NETWORK_INTERFACE_SETTINGS.interfaces },
    };
  }
}

function AddressModeBadge({ mode }: { mode: INetworkInterfaceConfig['addressMode'] }) {
  const isStatic = mode === 'static';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-[8px] font-black ${isStatic ? 'border-[#6366F1]/30 text-[#6366F1]' : 'border-[#00B894]/30 text-[#00B894]'}`}>
      {isStatic ? <BadgeCheck className="size-2.5" /> : <Shuffle className="size-2.5" />}
      {isStatic ? '静态' : 'DHCP'}
    </span>
  );
}

function ModuleMeta({ slot }: { slot: IModuleSlot }) {
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

function ChannelIndicator({ channel }: { channel: IModuleChannel }) {
  const isDigital = channel.label.startsWith('DI-') || channel.label.startsWith('DO-');
  const isSerial = channel.label.startsWith('COM');
  const sc = isDigital ? GetDigitalChannelState(channel) : GetAnalogChannelState(channel);
  return (
    <div className="flex items-center gap-1.5">
      <span className={`size-1.5 rounded-full ${sc.dot}`} />
      <span className="text-[9px] font-bold text-[#9CA3AF]">{channel.label}</span>
      <span className={`text-[9px] font-black tabular-nums ml-auto ${sc.text}`}>
        {isDigital ? sc.label : isSerial ? channel.value : `${channel.value}${channel.unit || ''}`}
      </span>
    </div>
  );
}

function ModulePanelHeader({
  slot,
  title,
  subtitle,
}: {
  slot: IModuleSlot;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-5">
      <div>
        <div className="text-base font-black text-[#111827]">{title}</div>
        <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mt-0.5">{subtitle}</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[9px] font-black rounded-full px-2 py-0.5 border-[#F3F4F6] text-[#111827]">
            槽位 #{slot.slotNumber}
          </Badge>
          <Badge variant="outline" className="text-[9px] font-black rounded-full px-2 py-0.5 border-[#00B894]/30 text-[#00B894]">
            {slot.version}
          </Badge>
          <Badge variant="outline" className="text-[9px] font-black rounded-full px-2 py-0.5 border-[#6366F1]/30 text-[#6366F1]">
            ADC {slot.adcValue}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// DI Module Control Panel
function DIControlPanel({ slot }: { slot: IModuleSlot }) {
  const leftChannels = slot.channelList.slice(0, 8);
  const rightChannels = slot.channelList.slice(8, 16);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-[32px] border border-[#F3F4F6] shadow-lg p-6"
    >
      <ModulePanelHeader slot={slot} title={`${slot.model} 通道状态`} subtitle="16路数字量输入" />
      <div className="grid grid-cols-2 gap-3">
        {[leftChannels, rightChannels].map((column, columnIndex) => (
          <div key={columnIndex} className="space-y-2">
            {column.map((ch) => {
              const sc = GetDigitalChannelState(ch);
              return (
                <div key={ch.index} className={`flex items-center gap-2 p-2.5 rounded-2xl border ${sc.border} ${sc.bg}`}>
                  <span className={`size-2.5 rounded-full ${sc.dot} ${IsDigitalOn(ch.value) ? 'animate-pulse' : ''}`} />
                  <span className="text-[10px] font-black text-[#111827]">{ch.label}</span>
                  <Badge variant="outline" className={`ml-auto text-[8px] font-black uppercase px-1.5 py-0 rounded-full ${sc.text} ${sc.border}`}>
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
function DOControlPanel({ slot }: { slot: IModuleSlot }) {
  const [channels, setChannels] = useState(slot.channelList);
  const leftChannels = channels.slice(0, 8);
  const rightChannels = channels.slice(8, 16);

  const toggleChannel = (index: number) => {
    setChannels((prev) =>
      prev.map((ch) =>
        ch.index === index ? { ...ch, value: ch.value === 'ON' ? 'OFF' : 'ON' } : ch
      )
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-[32px] border border-[#F3F4F6] shadow-lg p-6"
    >
      <ModulePanelHeader slot={slot} title={`${slot.model} 输出控制`} subtitle="16路数字量输出 · 点击切换" />
      <div className="grid grid-cols-2 gap-3">
        {[leftChannels, rightChannels].map((column, columnIndex) => (
          <div key={columnIndex} className="space-y-2">
            {column.map((ch) => {
              const isOn = ch.value === 'ON';
              const stateLabel = isOn ? '导通' : '截止';
              return (
                <button
                  key={ch.index}
                  onClick={() => toggleChannel(ch.index)}
                  className={`flex w-full items-center gap-2 p-2.5 rounded-2xl border transition-all duration-200 ${
                    isOn
                      ? 'bg-[#00B894]/10 border-[#00B894]/30'
                      : 'bg-[#F9FAFB] border-[#F3F4F6] hover:border-[#00B894]/20'
                  }`}
                >
                  <span className={`size-2.5 rounded-full ${isOn ? 'bg-[#00B894] animate-pulse' : 'bg-[#9CA3AF]'}`} />
                  <span className="text-[10px] font-black text-[#111827]">{ch.label}</span>
                  <Badge variant="outline" className={`ml-auto text-[8px] font-black uppercase px-1.5 py-0 rounded-full ${isOn ? 'text-[#00B894] border-[#00B894]/30' : 'text-[#9CA3AF] border-[#F3F4F6]'}`}>
                    {stateLabel}
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
function AIControlPanel({ slot }: { slot: IModuleSlot }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-[32px] border border-[#F3F4F6] shadow-lg p-6"
    >
      <ModulePanelHeader slot={slot} title={`${slot.model} 实时数值`} subtitle="8路电流输入" />
      <div className="space-y-3">
        {slot.channelList.map((ch) => {
          const maxVal = ch.unit === 'mA' ? 20 : 10;
          const value = parseFloat(ch.value);
          const sc = GetAnalogChannelState(ch, value);
          const pct = Math.min(100, (value / maxVal) * 100);
          return (
            <div key={ch.index} className={`p-3 rounded-2xl border ${sc.border} ${sc.bg}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${sc.dot}`} />
                  <span className="text-[10px] font-black text-[#111827]">{ch.label}</span>
                </div>
                <span className="text-sm font-black text-[#111827] tabular-nums">
                  {ch.value} <span className="text-[10px] text-[#9CA3AF]">{ch.unit}</span>
                </span>
              </div>
              {sc.lowCurrent && <div className="mb-1.5 text-[9px] font-black text-[#D97706]">电流输入小于 4mA</div>}
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
function AOControlPanel({ slot }: { slot: IModuleSlot }) {
  const [values, setValues] = useState<Record<number, number>>(() =>
    Object.fromEntries(slot.channelList.map((ch) => [ch.index, parseFloat(ch.value)]))
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-[32px] border border-[#F3F4F6] shadow-lg p-6"
    >
      <ModulePanelHeader slot={slot} title={`${slot.model} 输出调节`} subtitle="4路电压输出 + 4路电流输出 · 拖动滑块调节" />
      <div className="space-y-4">
        {slot.channelList.map((ch) => {
          const isVoltage = ch.unit === 'V';
          const maxVal = isVoltage ? 10 : 20;
          const val = values[ch.index] ?? parseFloat(ch.value);
          const sc = GetAnalogChannelState(ch, val);
          return (
            <div key={ch.index} className={`p-3 rounded-2xl border ${sc.border} ${sc.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${sc.dot}`} />
                  <span className="text-[10px] font-black text-[#111827]">{ch.label}</span>
                </div>
                <span className="text-sm font-black text-[#111827] tabular-nums">
                  {val.toFixed(1)} <span className="text-[10px] text-[#9CA3AF]">{ch.unit}</span>
                </span>
              </div>
              {sc.lowCurrent && <div className="mb-2 text-[9px] font-black text-[#D97706]">电流输出小于 4mA</div>}
              <Slider
                value={[val]}
                min={0}
                max={maxVal}
                step={0.1}
                onValueChange={([v]) => setValues((prev) => ({ ...prev, [ch.index]: v }))}
                className="w-full"
              />
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Serial Module Control Panel
function SerialDataList({
  title,
  entries,
  mode,
}: {
  title: string;
  entries: SerialLogEntry[];
  mode: SerialDisplayMode;
}) {
  return (
    <div className="rounded-2xl border border-[#F3F4F6] bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] font-black text-[#111827]">{title}</div>
        <Badge variant="outline" className="rounded-full border-[#00B894]/20 bg-[#00B894]/10 px-2 py-0 text-[8px] font-black text-[#00B894]">
          {entries.length} 条
        </Badge>
      </div>
      <div className="h-44 overflow-y-auto rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-2 font-mono text-[10px] leading-5">
        {entries.length === 0 ? (
          <div className="flex h-full items-center justify-center font-sans text-[10px] font-bold text-[#9CA3AF]">暂无数据</div>
        ) : (
          entries.map((entry, index) => (
            <div key={`${entry.time}-${index}`} className="mb-1 rounded-lg bg-white px-2 py-1 text-[#111827]">
              <span className="mr-2 text-[#9CA3AF]">{entry.time}</span>
              <span className="text-[#047857]">{mode === 'hex' ? entry.hex : entry.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SerialControlPanel({ slot }: { slot: IModuleSlot }) {
  const [activeChannel, setActiveChannel] = useState(slot.channelList[0]?.label || 'COM1');
  const [displayMode, setDisplayMode] = useState<SerialDisplayMode>('hex');
  const activePort = GetSerialPortState(slot.model, activeChannel);

  const handleExport = () => {
    const lines = [
      `${slot.model} ${activeChannel} 串口数据`,
      `导出时间: ${new Date().toLocaleString('zh-CN', { hour12: false })}`,
      `显示模式: ${displayMode === 'hex' ? 'HEX' : '字符串'}`,
      '',
      '[上行 外部->设备]',
      ...activePort.uplink.map((entry) => `${entry.time} ${displayMode === 'hex' ? entry.hex : entry.text}`),
      '',
      '[下行 设备->外部]',
      ...activePort.downlink.map((entry) => `${entry.time} ${displayMode === 'hex' ? entry.hex : entry.text}`),
      '',
    ];
    DownloadTextFile(`serial_${slot.model}_${activeChannel}_${new Date().toISOString().slice(0, 10)}.log`, lines.join('\n'));
    toast.success('串口数据已导出');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-[32px] border border-[#F3F4F6] shadow-lg p-6"
    >
      <ModulePanelHeader slot={slot} title={`${slot.model} 接口调试`} subtitle={slot.spec} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="rounded-2xl border border-[#F3F4F6] bg-[#F9FAFB] p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {slot.channelList.map((ch) => {
                const port = GetSerialPortState(slot.model, ch.label);
                return (
                  <button
                    key={ch.index}
                    onClick={() => setActiveChannel(ch.label)}
                    className={`rounded-full border px-3 py-1 text-[10px] font-black transition-colors ${
                      activeChannel === ch.label
                        ? 'border-[#00B894]/40 bg-[#00B894]/10 text-[#00B894]'
                        : 'border-[#E5E7EB] bg-white text-[#9CA3AF]'
                    }`}
                  >
                    {ch.label} · {port.occupied ? '占用中' : '未占用'}
                  </button>
                );
              })}
            </div>
            {activePort.occupied && activePort.params ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: '波特率', value: activePort.params.baudRate },
                  { label: '数据位', value: activePort.params.dataBits },
                  { label: '停止位', value: activePort.params.stopBits },
                  { label: '校验位', value: activePort.params.parity },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-white px-3 py-2">
                    <div className="text-[10px] font-bold text-[#9CA3AF]">{item.label}</div>
                    <div className="mt-1 text-sm font-black text-[#111827] tabular-nums">{item.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white p-6 text-center">
                <div className="text-sm font-black text-[#111827]">{activeChannel} 未占用</div>
                <div className="mt-1 text-[10px] font-bold text-[#9CA3AF]">当前端口无业务绑定，暂无串口参数和调试数据。</div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#F3F4F6] bg-[#F9FAFB] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-black text-[#111827]">{activeChannel} 数据监视</div>
              <div className="mt-0.5 text-[10px] font-bold text-[#9CA3AF]">上行/下行数据带时间戳显示</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full border border-[#E5E7EB] bg-white p-0.5">
                {(['hex', 'text'] as SerialDisplayMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setDisplayMode(mode)}
                    className={`rounded-full px-2.5 py-1 text-[9px] font-black transition-colors ${
                      displayMode === mode ? 'bg-[#00B894] text-white' : 'text-[#9CA3AF]'
                    }`}
                  >
                    {mode === 'hex' ? 'HEX' : '字符串'}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExport}
                className="h-8 gap-1.5 rounded-full border-[#00B894]/30 text-[10px] font-black text-[#00B894] hover:bg-[#00B894]/10"
              >
                <Download className="size-3" />
                导出
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <SerialDataList title="上行 外部->设备" entries={activePort.uplink} mode={displayMode} />
            <SerialDataList title="下行 设备->外部" entries={activePort.downlink} mode={displayMode} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function NMEAControlPanel({ slot }: { slot: IModuleSlot }) {
  const fixed = slot.status === 'normal';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-[32px] border border-[#F3F4F6] shadow-lg p-6"
    >
      <ModulePanelHeader slot={slot} title={`${slot.model} 定位状态`} subtitle="1路 RS232 NMEA 定位接口" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#F3F4F6] bg-[#F9FAFB] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${fixed ? 'bg-[#00B894] animate-pulse' : 'bg-[#F97316]'}`} />
              <span className="text-sm font-black text-[#111827]">{fixed ? '定位成功' : '未定位'}</span>
            </div>
            <Badge className={`rounded-full text-[9px] font-black ${fixed ? 'bg-[#00B894]/10 text-[#00B894] border-[#00B894]/20' : 'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20'}`}>
              {slot.channelList[0]?.label || 'RS232'}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded-xl bg-white p-3">
              <div className="font-bold text-[#9CA3AF]">波特率</div>
              <div className="font-black text-[#111827]">{slot.channelList[0]?.value || '4800bps'}</div>
            </div>
            <div className="rounded-xl bg-white p-3">
              <div className="font-bold text-[#9CA3AF]">协议</div>
              <div className="font-black text-[#111827]">NMEA 0183</div>
            </div>
            <div className="rounded-xl bg-white p-3">
              <div className="font-bold text-[#9CA3AF]">纬度</div>
              <div className="font-black text-[#111827]">{fixed ? '28.19409 N' : '--'}</div>
            </div>
            <div className="rounded-xl bg-white p-3">
              <div className="font-bold text-[#9CA3AF]">经度</div>
              <div className="font-black text-[#111827]">{fixed ? '112.98228 E' : '--'}</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[#F3F4F6] bg-[#F9FAFB] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-black text-[#111827]">NMEA 原始报文</div>
            <Badge variant="outline" className="rounded-full border-[#00B894]/20 bg-[#00B894]/10 px-2 py-0 text-[9px] font-black text-[#00B894]">
              实时
            </Badge>
          </div>
          <div className="h-52 overflow-y-auto rounded-xl border border-[#E5E7EB] bg-white p-3 font-mono text-[10px] leading-5 text-[#047857]">
            {NMEA_RAW_MESSAGES.map((message) => (
              <div key={message} className="mb-1 rounded-lg bg-[#F9FAFB] px-2 py-1">{message}</div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── 无线模块槽位（可切换）──────────────────────────────────

type WirelessOption = { key: string; label: string; icon: React.ComponentType<{ className?: string }>; color: string };

const SLOT1_OPTIONS: WirelessOption[] = [
  { key: '4g', label: '4G 模块', icon: Radio, color: '#6366F1' },
  { key: 'wifi', label: 'WiFi 模块', icon: Wifi, color: '#00B894' },
  { key: 'none', label: '未安装', icon: X, color: '#9CA3AF' },
];

const SLOT2_OPTIONS: WirelessOption[] = [
  { key: 'ble', label: '蓝牙模块', icon: Bluetooth, color: '#00B894' },
  { key: 'slb', label: '星闪模块', icon: Radio, color: '#6366F1' },
  { key: 'none', label: '未安装', icon: X, color: '#9CA3AF' },
];

function WirelessSlotCard({
  slotLabel,
  options,
  selectedKey,
  onOpen,
}: {
  slotLabel: string;
  options: WirelessOption[];
  selectedKey: string;
  onOpen: () => void;
}) {
  const selected = options.find((o) => o.key === selectedKey) || options[0];
  const SelectedIcon = selected.icon;
  const isNone = selected.key === 'none';

  return (
    <div>
      <button
        onClick={onOpen}
        className={`w-full p-3 rounded-2xl border transition-all duration-200 text-left ${
          isNone
            ? 'border-dashed border-[#E5E7EB] bg-[#F9FAFB]/50'
            : 'border-[#F3F4F6] bg-[#F9FAFB] hover:border-[#00B894]/30'
        }`}
      >
        <div className="mb-2 flex items-center justify-between">
          <Badge variant="outline" className="rounded-full border-[#E5E7EB] bg-white px-2 py-0 text-[8px] font-black text-[#6B7280]">
            {slotLabel}
          </Badge>
          {!isNone && <span className="size-2 rounded-full bg-[#00B894] animate-pulse" />}
          {isNone && <span className="size-2 rounded-full bg-[#9CA3AF]" />}
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div
            className="size-10 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: `${selected.color}18` }}
          >
            <div style={{ color: selected.color }}>
              <SelectedIcon className="size-5" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black text-[#111827]">{selected.label}</div>
            <div className="mt-0.5 text-[9px] font-bold text-[#9CA3AF]">当前安装模块</div>
          </div>
        </div>
        {!isNone && (
          <div className="flex items-center gap-2 text-[9px]">
            <Badge
              variant="outline"
              className="rounded-full px-2 py-0"
              style={{ color: selected.color, borderColor: `${selected.color}30`, backgroundColor: `${selected.color}08` }}
            >
              已安装 · 正常运行
            </Badge>
            <span className="ml-auto text-[9px] font-bold text-[#9CA3AF]">点击配置</span>
          </div>
        )}
        {isNone && (
          <div className="text-[9px] text-[#9CA3AF] font-medium">未安装模块，点击查看槽位信息</div>
        )}
      </button>
    </div>
  );
}

function WirelessConfigDialog({
  open,
  onOpenChange,
  slotLabel,
  moduleKey,
  networkConfig,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotLabel: string;
  moduleKey: string;
  networkConfig: INetworkInterfaceConfig | null;
}) {
  const moduleName = moduleKey === '4g' ? '4G 扩展模块' : moduleKey === 'wifi' ? 'WiFi 扩展模块' : moduleKey === 'ble' ? '蓝牙扩展模块' : moduleKey === 'slb' ? '星闪扩展模块' : '未安装';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-[#F3F4F6] bg-white text-[#111827]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Router className="size-5 text-[#00B894]" />
            {slotLabel} · {moduleName}
          </DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            模块类型由系统设置中的无线扩展槽配置决定，此处展示运行信息和常用操作参数。
          </DialogDescription>
        </DialogHeader>

        {moduleKey === 'none' ? (
          <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-6 text-center">
            <div className="text-sm font-black text-[#111827]">当前槽位未安装扩展模块</div>
            <div className="mt-1 text-xs font-bold text-[#9CA3AF]">请在系统设置中选择具体模块类型后再配置通信参数。</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-[10px]">
              <div className="rounded-2xl bg-[#F9FAFB] p-3">
                <div className="font-bold text-[#9CA3AF]">模块状态</div>
                <div className="mt-1 font-black text-[#00B894]">已安装 · 正常运行</div>
              </div>
              <div className="rounded-2xl bg-[#F9FAFB] p-3">
                <div className="font-bold text-[#9CA3AF]">信号质量</div>
                <div className="mt-1 font-black text-[#111827]">{moduleKey === '4g' ? '-73 dBm' : moduleKey === 'wifi' ? '-48 dBm' : '近场稳定'}</div>
              </div>
            </div>

            {moduleKey === 'wifi' && networkConfig && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#9CA3AF]">SSID</Label>
                  <Input value={networkConfig.ssid || ''} readOnly className="h-9 bg-[#F9FAFB]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#9CA3AF]">加密方式</Label>
                  <Input value={networkConfig.encryption || 'WPA2-PSK'} readOnly className="h-9 bg-[#F9FAFB]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#9CA3AF]">地址模式</Label>
                  <div className="flex h-9 items-center rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-3"><AddressModeBadge mode={networkConfig.addressMode} /></div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#9CA3AF]">IP 地址</Label>
                  <Input value={networkConfig.ipAddress} readOnly className="h-9 bg-[#F9FAFB]" />
                </div>
                <Button size="sm" className="sm:col-span-2 w-fit bg-[#00B894] text-white hover:bg-[#00A77F]">连接 WiFi</Button>
              </div>
            )}

            {moduleKey === '4g' && networkConfig && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#9CA3AF]">运营商</Label>
                  <Input value="中国移动" readOnly className="h-9 bg-[#F9FAFB]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#9CA3AF]">APN</Label>
                  <Input value={networkConfig.apn || ''} readOnly className="h-9 bg-[#F9FAFB]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#9CA3AF]">拨号状态</Label>
                  <Input value="已拨号" readOnly className="h-9 bg-[#F9FAFB]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#9CA3AF]">IP 地址</Label>
                  <Input value={networkConfig.ipAddress} readOnly className="h-9 bg-[#F9FAFB]" />
                </div>
                <Button size="sm" variant="outline" className="sm:col-span-2 w-fit">重新拨号</Button>
              </div>
            )}

            {(moduleKey === 'ble' || moduleKey === 'slb') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#9CA3AF]">广播名称</Label>
                  <Input value={moduleKey === 'ble' ? 'CT16-BLE-Gateway' : 'CT16-SLB-Gateway'} readOnly className="h-9 bg-[#F9FAFB]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#9CA3AF]">配对状态</Label>
                  <Input value="允许配对" readOnly className="h-9 bg-[#F9FAFB]" />
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-[#F3F4F6] bg-[#F9FAFB] p-3 sm:col-span-2">
                  <Switch checked />
                  <span className="text-xs font-bold text-[#111827]">启用近场通信</span>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Main control unit (left side)
function MainControlUnit() {
  const [wirelessSlots, setWirelessSlots] = useState<IWirelessSlotSettings>(() => LoadWirelessSlots());
  const [networkInterfaces, setNetworkInterfaces] = useState<INetworkInterfaceSettings>(() => LoadNetworkInterfaces());
  const [activeWirelessSlot, setActiveWirelessSlot] = useState<'slot1' | 'slot2' | null>(null);

  useEffect(() => {
    const reloadConfig = () => {
      setWirelessSlots(LoadWirelessSlots());
      setNetworkInterfaces(LoadNetworkInterfaces());
    };
    window.addEventListener('zaihong:wireless-config-changed', reloadConfig);
    window.addEventListener('zaihong:network-config-changed', reloadConfig);
    return () => {
      window.removeEventListener('zaihong:wireless-config-changed', reloadConfig);
      window.removeEventListener('zaihong:network-config-changed', reloadConfig);
    };
  }, []);

  const ethConfig = networkInterfaces.ethernetMode === 'bridge'
    ? [
        { label: 'ETH1', config: networkInterfaces.interfaces.bridge },
        { label: 'ETH2', config: networkInterfaces.interfaces.bridge },
      ]
    : [
        { label: 'ETH1', config: networkInterfaces.interfaces.eth1 },
        { label: 'ETH2', config: networkInterfaces.interfaces.eth2 },
      ];
  const activeModuleKey = activeWirelessSlot ? wirelessSlots[activeWirelessSlot] : 'none';
  const activeNetworkConfig = activeModuleKey === 'wifi'
    ? networkInterfaces.interfaces.wifi
    : activeModuleKey === '4g'
      ? networkInterfaces.interfaces['4g']
      : null;

  return (
    <Card className="h-[680px] p-6 rounded-[48px] border border-[#F3F4F6] shadow-sm bg-white flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-xl bg-[#1F2937]/5 flex items-center justify-center">
            <Cpu className="size-4 text-[#1F2937]" />
          </div>
          <div>
            <div className="text-sm font-black text-[#111827]">主模块</div>
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">CT16 控制器 · 无线扩展</div>
          </div>
        </div>
        <Badge className="text-[9px] font-black rounded-full bg-[#00B894]/10 text-[#00B894] border-[#00B894]/20">
          在线
        </Badge>
      </div>

      <div className="rounded-[32px] border border-[#F3F4F6] bg-[#F9FAFB] p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-2xl bg-[#00B894]/10 flex items-center justify-center shrink-0">
            <Cpu className="size-5 text-[#00B894]" />
          </div>
          <div>
            <div className="text-sm font-black text-[#111827]">CT16 在鸿控制器</div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-3">
          {[
            { label: 'POW', status: 'normal' as const },
            { label: 'SYS', status: 'normal' as const },
            { label: 'NET', status: 'normal' as const },
            { label: 'BLE', status: 'normal' as const },
            { label: 'ERR', status: 'off' as const },
          ].map((led) => {
            const sc = STATUS_COLORS[led.status];
            return (
              <div key={led.label} className="flex flex-col items-center gap-1">
                <span className={`size-2.5 rounded-full ${sc.dot} ${led.status === 'normal' ? 'animate-pulse' : ''}`} />
                <span className="text-[8px] font-black text-[#9CA3AF]">{led.label}</span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3 text-[10px]">
          <div className="rounded-xl bg-white px-2.5 py-2">
            <div className="font-bold text-[#9CA3AF]">固件版本</div>
            <div className="font-black text-[#111827] tabular-nums">V3.2.1</div>
          </div>
          <div className="rounded-xl bg-white px-2.5 py-2">
            <div className="font-bold text-[#9CA3AF]">处理器</div>
            <div className="font-black text-[#111827]">RK3506J</div>
          </div>
          <div className="rounded-xl bg-white px-2.5 py-2">
            <div className="font-bold text-[#9CA3AF]">主频</div>
            <div className="font-black text-[#111827]">1.2GHz</div>
          </div>
          <div className="rounded-xl bg-white px-2.5 py-2">
            <div className="font-bold text-[#9CA3AF]">运行时长</div>
            <div className="font-black text-[#111827]">45天</div>
          </div>
        </div>

        <div className="space-y-1.5">
          {ethConfig.map(({ label, config }) => (
            <div key={label} className="flex items-center gap-2 text-[10px] text-[#9CA3AF]">
              <Network className="size-3" />
              <span className="font-bold">{label}</span>
              {networkInterfaces.ethernetMode === 'bridge' && <Badge variant="outline" className="rounded-full px-1.5 py-0 text-[8px] text-[#6366F1] border-[#6366F1]/30">桥接</Badge>}
              <span className="ml-auto flex items-center gap-1.5 font-black text-[#111827]">
                <AddressModeBadge mode={config.addressMode} />
                {config.ipAddress}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F3F4F6] text-[10px]">
          <Power className="size-3 text-[#00B894]" />
          <span className="font-bold text-[#9CA3AF]">DC12-24V/1.0A</span>
          <span className="font-black text-[#00B894] ml-auto">正常</span>
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">无线扩展槽</div>
          <div className="text-[9px] font-bold text-[#9CA3AF]">2 个槽位</div>
        </div>
        <div className="space-y-3">
          <WirelessSlotCard
            slotLabel="4G/WiFi 模块槽位"
            options={SLOT1_OPTIONS}
            selectedKey={wirelessSlots.slot1}
            onOpen={() => setActiveWirelessSlot('slot1')}
          />
          <WirelessSlotCard
            slotLabel="蓝牙/星闪 模块槽位"
            options={SLOT2_OPTIONS}
            selectedKey={wirelessSlots.slot2}
            onOpen={() => setActiveWirelessSlot('slot2')}
          />
        </div>
      </div>
      <WirelessConfigDialog
        open={activeWirelessSlot !== null}
        onOpenChange={(open) => !open && setActiveWirelessSlot(null)}
        slotLabel={activeWirelessSlot === 'slot2' ? '蓝牙/星闪 模块槽位' : '4G/WiFi 模块槽位'}
        moduleKey={activeModuleKey}
        networkConfig={activeNetworkConfig}
      />
    </Card>
  );
}

// IO expansion module card (right side)
function IOModuleCard({
  slot,
  onSelect,
}: {
  slot: IModuleSlot;
  onSelect: (s: IModuleSlot) => void;
}) {
  const moduleState = GetModuleOnlineState(slot.status);
  const isMain = slot.slotNumber === 0;
  const isSerial = slot.type === 'RS232 通信' || slot.type === 'RS485 通信';

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
          {slot.status !== 'empty' && (
            <span className={`size-2 rounded-full ${moduleState.dot} ${moduleState.label === '在线' ? 'animate-pulse' : ''}`} />
          )}
        </div>

        {/* Module name */}
        <div className="text-sm font-black text-[#111827] mb-1">{slot.name}</div>
        <div className="text-[10px] font-bold text-[#9CA3AF] mb-3">{slot.spec}</div>
        {slot.status !== 'empty' && <ModuleMeta slot={slot} />}

        {/* Channel indicators */}
        {slot.status !== 'empty' && slot.channelList.length > 0 && (
          <div className="space-y-1 pt-3 border-t border-[#F3F4F6]">
            {isSerial
              ? slot.channelList.map((ch) => {
                  const port = GetSerialPortState(slot.model, ch.label);
                  return (
                    <div key={ch.index} className="flex items-center gap-1.5">
                      <span className={`size-1.5 rounded-full ${port.occupied ? 'bg-[#00B894]' : 'bg-[#9CA3AF]'}`} />
                      <span className="text-[9px] font-bold text-[#9CA3AF]">{ch.label}</span>
                      <span className={`ml-auto text-[9px] font-black ${port.occupied ? 'text-[#00B894]' : 'text-[#6B7280]'}`}>
                        {port.occupied ? '占用中' : '未占用'}
                      </span>
                    </div>
                  );
                })
              : (
                  <>
                    {slot.channelList.slice(0, 4).map((ch) => (
                      <ChannelIndicator key={ch.index} channel={ch} />
                    ))}
                    {slot.channelList.length > 4 && (
                      <div className="text-[9px] font-bold text-[#9CA3AF] text-center pt-1">
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
  const [selectedSlot, setSelectedSlot] = useState<IModuleSlot | null>(null);

  const rightSlots = MOCK_MODULE_SLOTS
    .filter((s) => s.position === 'right')
    .sort((a, b) => a.adcValue - b.adcValue)
    .slice(0, MOCK_IO_MODULE_COUNT)
    .map((slot, index) => ({
      ...slot,
      slotNumber: index + 1,
    }));

  const handleSlotSelect = (slot: IModuleSlot) => setSelectedSlot(slot);

  const renderControlPanel = () => {
    if (!selectedSlot) return null;

    if (selectedSlot.type === 'DI 输入') return <DIControlPanel slot={selectedSlot} />;
    if (selectedSlot.type === 'DO 输出') return <DOControlPanel slot={selectedSlot} />;
    if (selectedSlot.type === 'AI 输入') return <AIControlPanel slot={selectedSlot} />;
    if (selectedSlot.type === 'AO 输出') return <AOControlPanel slot={selectedSlot} />;
    if (selectedSlot.type === 'RS485 通信') return <SerialControlPanel slot={selectedSlot} />;
    if (selectedSlot.type === 'RS232 通信') return <SerialControlPanel slot={selectedSlot} />;
    if (selectedSlot.type === 'NMEA 通信') return <NMEAControlPanel slot={selectedSlot} />;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Device structure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Main control + wireless */}
        <div className="lg:col-span-4">
          <MainControlUnit />
        </div>

        {/* Right: IO expansion modules */}
        <div className="lg:col-span-8">
          <Card className="h-[680px] p-6 rounded-[48px] border border-[#F3F4F6] shadow-sm bg-white flex flex-col">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-[#1F2937]/5 flex items-center justify-center">
                  <Cable className="size-4 text-[#1F2937]" />
                </div>
                <div>
                  <div className="text-sm font-black text-[#111827]">扩展子模块</div>
                  <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                    后端反馈 {MOCK_IO_MODULE_COUNT} 个模块 · 可视 6 个 · 按 ADC 升序排列
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {Object.entries(ONLINE_STATUS).map(([key, sc]) => (
                  <div key={key} className="flex items-center gap-1">
                    <span className={`size-2 rounded-full ${sc.dot} ${key === 'online' ? 'animate-pulse' : ''}`} />
                    <span className="text-[9px] font-black text-[#9CA3AF]">{sc.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {rightSlots.map((slot) => (
                  <IOModuleCard key={slot.id} slot={slot} onSelect={handleSlotSelect} />
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={selectedSlot !== null} onOpenChange={(open) => !open && setSelectedSlot(null)}>
        <DialogContent className="max-w-5xl border-0 bg-transparent p-0 shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>扩展子模块详情</DialogTitle>
          </DialogHeader>
          {renderControlPanel()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
