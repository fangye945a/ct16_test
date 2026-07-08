import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const WIRELESS_STORAGE_KEY = 'zaihong:wirelessSlots';
const NETWORK_STORAGE_KEY = 'zaihong:networkInterfaces';

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
  const sc = STATUS_COLORS[channel.status];
  return (
    <div className="flex items-center gap-1.5">
      <span className={`size-1.5 rounded-full ${sc.dot}`} />
      <span className="text-[9px] font-bold text-[#9CA3AF]">{channel.label}</span>
      <span className="text-[9px] font-black text-[#111827] tabular-nums ml-auto">{channel.value}</span>
      {channel.unit && <span className="text-[8px] text-[#9CA3AF]">{channel.unit}</span>}
    </div>
  );
}

function ModulePanelHeader({
  slot,
  title,
  subtitle,
  onClose,
}: {
  slot: IModuleSlot;
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between mb-5">
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
      <button onClick={onClose} className="size-8 rounded-xl bg-[#F9FAFB] flex items-center justify-center text-[#9CA3AF] hover:text-[#111827] transition-colors">
        <X className="size-4" />
      </button>
    </div>
  );
}

// DI Module Control Panel
function DIControlPanel({ slot, onClose }: { slot: IModuleSlot; onClose: () => void }) {
  const leftChannels = slot.channelList.slice(0, 8);
  const rightChannels = slot.channelList.slice(8, 16);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-[32px] border border-[#F3F4F6] shadow-lg p-6"
    >
      <ModulePanelHeader slot={slot} title={`${slot.model} 通道状态`} subtitle="16路数字量输入" onClose={onClose} />
      <div className="grid grid-cols-2 gap-3">
        {[leftChannels, rightChannels].map((column, columnIndex) => (
          <div key={columnIndex} className="space-y-2">
            {column.map((ch) => {
              const sc = STATUS_COLORS[ch.status];
              return (
                <div key={ch.index} className={`flex items-center gap-2 p-2.5 rounded-2xl border ${sc.border} ${sc.bg}`}>
                  <span className={`size-2.5 rounded-full ${sc.dot} ${ch.status === 'normal' && ch.value === 'ON' ? 'animate-pulse' : ''}`} />
                  <span className="text-[10px] font-black text-[#111827]">{ch.label}</span>
                  <Badge variant="outline" className={`ml-auto text-[8px] font-black uppercase px-1.5 py-0 rounded-full ${sc.text} ${sc.border}`}>
                    {ch.value}
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
function DOControlPanel({ slot, onClose }: { slot: IModuleSlot; onClose: () => void }) {
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
      <ModulePanelHeader slot={slot} title={`${slot.model} 输出控制`} subtitle="16路数字量输出 · 点击切换" onClose={onClose} />
      <div className="grid grid-cols-2 gap-3">
        {[leftChannels, rightChannels].map((column, columnIndex) => (
          <div key={columnIndex} className="space-y-2">
            {column.map((ch) => {
              const isOn = ch.value === 'ON';
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
                    {ch.value}
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
function AIControlPanel({ slot, onClose }: { slot: IModuleSlot; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-[32px] border border-[#F3F4F6] shadow-lg p-6"
    >
      <ModulePanelHeader slot={slot} title={`${slot.model} 实时数值`} subtitle="8路电流输入" onClose={onClose} />
      <div className="space-y-3">
        {slot.channelList.map((ch) => {
          const sc = STATUS_COLORS[ch.status];
          const maxVal = ch.unit === 'mA' ? 20 : 10;
          const pct = Math.min(100, (parseFloat(ch.value) / maxVal) * 100);
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
              <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: sc.dot === 'bg-[#00B894]' ? '#00B894' : sc.dot === 'bg-[#F97316]' ? '#F97316' : '#F43F5E' }}
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
function AOControlPanel({ slot, onClose }: { slot: IModuleSlot; onClose: () => void }) {
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
      <ModulePanelHeader slot={slot} title={`${slot.model} 输出调节`} subtitle="4路电压输出 + 4路电流输出 · 拖动滑块调节" onClose={onClose} />
      <div className="space-y-4">
        {slot.channelList.map((ch) => {
          const isVoltage = ch.unit === 'V';
          const maxVal = isVoltage ? 10 : 20;
          const val = values[ch.index] ?? parseFloat(ch.value);
          return (
            <div key={ch.index} className="p-3 rounded-2xl border border-[#F3F4F6] bg-[#F9FAFB]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-[#111827]">{ch.label}</span>
                <span className="text-sm font-black text-[#111827] tabular-nums">
                  {val.toFixed(1)} <span className="text-[10px] text-[#9CA3AF]">{ch.unit}</span>
                </span>
              </div>
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
function SerialControlPanel({ slot, onClose }: { slot: IModuleSlot; onClose: () => void }) {
  const [activeChannel, setActiveChannel] = useState(slot.channelList[0]?.label || 'COM1');
  const [sendText, setSendText] = useState('');
  const [logs, setLogs] = useState([
    '[RX] 10:24:13 01 03 00 00 00 02 C4 0B',
    '[TX] 10:24:13 01 03 04 00 7B 00 42 8A 31',
    '[RX] 10:24:15 AT+PING',
    '[TX] 10:24:15 OK',
  ]);

  const handleSend = () => {
    if (!sendText.trim()) {
      return;
    }
    setLogs((prev) => [...prev, `[TX] ${new Date().toLocaleTimeString('zh-CN', { hour12: false })} ${sendText.trim()}`]);
    setSendText('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-[32px] border border-[#F3F4F6] shadow-lg p-6"
    >
      <ModulePanelHeader slot={slot} title={`${slot.model} 接口配置`} subtitle={slot.spec} onClose={onClose} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="rounded-2xl border border-[#F3F4F6] bg-[#F9FAFB] p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {slot.channelList.map((ch) => (
                <button
                  key={ch.index}
                  onClick={() => setActiveChannel(ch.label)}
                  className={`rounded-full border px-3 py-1 text-[10px] font-black transition-colors ${
                    activeChannel === ch.label
                      ? 'border-[#00B894]/40 bg-[#00B894]/10 text-[#00B894]'
                      : 'border-[#E5E7EB] bg-white text-[#9CA3AF]'
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-[#9CA3AF]">波特率</Label>
                <Select defaultValue={slot.channelList.find((ch) => ch.label === activeChannel)?.value.replace('bps', '') || '115200'}>
                  <SelectTrigger className="h-9 bg-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4800">4800</SelectItem>
                    <SelectItem value="9600">9600</SelectItem>
                    <SelectItem value="57600">57600</SelectItem>
                    <SelectItem value="115200">115200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-[#9CA3AF]">数据位</Label>
                <Select defaultValue="8">
                  <SelectTrigger className="h-9 bg-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-[#9CA3AF]">校验位</Label>
                <Select defaultValue="none">
                  <SelectTrigger className="h-9 bg-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="odd">Odd</SelectItem>
                    <SelectItem value="even">Even</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-[#9CA3AF]">停止位</Label>
                <Select defaultValue="1">
                  <SelectTrigger className="h-9 bg-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button size="sm" className="mt-4 bg-[#00B894] text-white hover:bg-[#00A77F]">应用配置</Button>
          </div>
        </div>

        <div className="rounded-2xl border border-[#F3F4F6] bg-[#111827] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-black text-white">{activeChannel} 串口调试助手</div>
            <Badge className="rounded-full border-[#00B894]/30 bg-[#00B894]/10 text-[9px] font-black text-[#00B894]">监听中</Badge>
          </div>
          <div className="h-48 overflow-y-auto rounded-xl bg-black/40 p-3 font-mono text-[10px] leading-5 text-[#D1FAE5]">
            {logs.map((line, index) => (
              <div key={`${line}-${index}`}>{line}</div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Textarea
              value={sendText}
              onChange={(event) => setSendText(event.target.value)}
              placeholder="输入要发送的数据，如 AT 或 HEX 字符串"
              className="min-h-16 flex-1 border-white/10 bg-white/10 text-xs text-white placeholder:text-white/40"
            />
            <Button onClick={handleSend} className="self-stretch bg-[#00B894] text-white hover:bg-[#00A77F]">发送</Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function NMEAControlPanel({ slot, onClose }: { slot: IModuleSlot; onClose: () => void }) {
  const fixed = slot.status === 'normal';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-[32px] border border-[#F3F4F6] shadow-lg p-6"
    >
      <ModulePanelHeader slot={slot} title={`${slot.model} 定位状态`} subtitle="1路 RS232 NMEA 定位接口" onClose={onClose} />
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
        <div className="rounded-2xl border border-[#F3F4F6] bg-[#111827] p-4">
          <div className="mb-3 text-xs font-black text-white">NMEA 原始报文</div>
          <div className="h-52 overflow-y-auto rounded-xl bg-black/40 p-3 font-mono text-[10px] leading-5 text-[#D1FAE5]">
            <div>$GNRMC,024813.00,A,2811.6454,N,11258.9368,E,0.018,,080726,,,A*6C</div>
            <div>$GNGGA,024813.00,2811.6454,N,11258.9368,E,1,18,0.8,68.2,M,-12.1,M,,*52</div>
            <div>$GNGSA,A,3,03,08,10,14,18,21,24,26,29,31,32,36,1.2,0.8,0.9*33</div>
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
    <Card className="h-[640px] p-5 rounded-[48px] border border-[#F3F4F6] shadow-sm bg-white flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">主控与无线扩展</div>
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

      <div className="mt-4 flex-1 rounded-[32px] border border-[#F3F4F6] bg-white p-4">
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
  const sc = STATUS_COLORS[slot.status];
  const isMain = slot.slotNumber === 0;

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
            <span className={`size-2 rounded-full ${sc.dot} ${slot.status === 'normal' ? 'animate-pulse' : ''}`} />
          )}
        </div>

        {/* Module name */}
        <div className="text-sm font-black text-[#111827] mb-1">{slot.name}</div>
        <div className="text-[10px] font-bold text-[#9CA3AF] mb-3">{slot.spec}</div>
        {slot.status !== 'empty' && <ModuleMeta slot={slot} />}

        {/* Channel indicators */}
        {slot.status !== 'empty' && slot.channelList.length > 0 && (
          <div className="space-y-1 pt-3 border-t border-[#F3F4F6]">
            {slot.channelList.slice(0, 4).map((ch) => (
              <ChannelIndicator key={ch.index} channel={ch} />
            ))}
            {slot.channelList.length > 4 && (
              <div className="text-[9px] font-bold text-[#9CA3AF] text-center pt-1">
                +{slot.channelList.length - 4} 通道
              </div>
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
    const onClose = () => setSelectedSlot(null);

    if (selectedSlot.type === 'DI 输入') return <DIControlPanel slot={selectedSlot} onClose={onClose} />;
    if (selectedSlot.type === 'DO 输出') return <DOControlPanel slot={selectedSlot} onClose={onClose} />;
    if (selectedSlot.type === 'AI 输入') return <AIControlPanel slot={selectedSlot} onClose={onClose} />;
    if (selectedSlot.type === 'AO 输出') return <AOControlPanel slot={selectedSlot} onClose={onClose} />;
    if (selectedSlot.type === 'RS485 通信') return <SerialControlPanel slot={selectedSlot} onClose={onClose} />;
    if (selectedSlot.type === 'RS232 通信') return <SerialControlPanel slot={selectedSlot} onClose={onClose} />;
    if (selectedSlot.type === 'NMEA 通信') return <NMEAControlPanel slot={selectedSlot} onClose={onClose} />;
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
          <Card className="h-[640px] p-6 rounded-[48px] border border-[#F3F4F6] shadow-sm bg-white flex flex-col">
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
                {Object.entries(STATUS_COLORS).map(([key, sc]) => (
                  <div key={key} className="flex items-center gap-1">
                    <span className={`size-2 rounded-full ${sc.dot} ${key === 'normal' ? 'animate-pulse' : ''}`} />
                    <span className="text-[9px] font-black text-[#9CA3AF]">
                      {key === 'normal' ? '正常' : key === 'warning' ? '告警' : key === 'fault' ? '故障' : key === 'off' ? '关闭' : '空槽'}
                    </span>
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
