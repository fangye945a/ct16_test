import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Cpu,
  Wifi,
  Bluetooth,
  Radio,
  Network,
  Power,
  Plus,
  X,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Settings2,
  Cable,
} from 'lucide-react';
import { MOCK_MODULE_SLOTS, type IModuleSlot, type IModuleChannel } from '@/data/topology';

const STATUS_COLORS = {
  normal: { dot: 'bg-[#00B894]', text: 'text-[#00B894]', bg: 'bg-[#00B894]/10', border: 'border-[#00B894]/30' },
  warning: { dot: 'bg-[#F97316]', text: 'text-[#F97316]', bg: 'bg-[#F97316]/10', border: 'border-[#F97316]/30' },
  fault: { dot: 'bg-[#F43F5E]', text: 'text-[#F43F5E]', bg: 'bg-[#F43F5E]/10', border: 'border-[#F43F5E]/30' },
  off: { dot: 'bg-[#9CA3AF]', text: 'text-[#9CA3AF]', bg: 'bg-[#9CA3AF]/10', border: 'border-[#9CA3AF]/30' },
  empty: { dot: 'bg-[#E5E7EB]', text: 'text-[#D1D5DB]', bg: 'bg-[#F9FAFB]', border: 'border-[#E5E7EB]' },
};

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

// DI Module Control Panel
function DIControlPanel({ slot, onClose }: { slot: IModuleSlot; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-[32px] border border-[#F3F4F6] shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-base font-black text-[#111827]">{slot.model} 通道状�?/div>
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mt-0.5">16路数字量输入</div>
        </div>
        <button onClick={onClose} className="size-8 rounded-xl bg-[#F9FAFB] flex items-center justify-center text-[#9CA3AF] hover:text-[#111827] transition-colors">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {slot.channelList.map((ch) => {
          const sc = STATUS_COLORS[ch.status];
          return (
            <div key={ch.index} className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border ${sc.border} ${sc.bg}`}>
              <span className={`size-2.5 rounded-full ${sc.dot} ${ch.status === 'normal' && ch.value === 'ON' ? 'animate-pulse' : ''}`} />
              <span className="text-[9px] font-black text-[#111827]">{ch.label}</span>
              <Badge variant="outline" className={`text-[8px] font-black uppercase px-1.5 py-0 rounded-full ${sc.text} ${sc.border}`}>
                {ch.value}
              </Badge>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// DO Module Control Panel
function DOControlPanel({ slot, onClose }: { slot: IModuleSlot; onClose: () => void }) {
  const [channels, setChannels] = useState(slot.channelList);

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
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-base font-black text-[#111827]">{slot.model} 输出控制</div>
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mt-0.5">16路数字量输出 · 点击切换</div>
        </div>
        <button onClick={onClose} className="size-8 rounded-xl bg-[#F9FAFB] flex items-center justify-center text-[#9CA3AF] hover:text-[#111827] transition-colors">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {channels.map((ch) => {
          const isOn = ch.value === 'ON';
          return (
            <button
              key={ch.index}
              onClick={() => toggleChannel(ch.index)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border transition-all duration-200 ${
                isOn
                  ? 'bg-[#00B894]/10 border-[#00B894]/30'
                  : 'bg-[#F9FAFB] border-[#F3F4F6] hover:border-[#00B894]/20'
              }`}
            >
              <span className={`size-2.5 rounded-full ${isOn ? 'bg-[#00B894] animate-pulse' : 'bg-[#9CA3AF]'}`} />
              <span className="text-[9px] font-black text-[#111827]">{ch.label}</span>
              <Badge variant="outline" className={`text-[8px] font-black uppercase px-1.5 py-0 rounded-full ${isOn ? 'text-[#00B894] border-[#00B894]/30' : 'text-[#9CA3AF] border-[#F3F4F6]'}`}>
                {ch.value}
              </Badge>
            </button>
          );
        })}
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
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-base font-black text-[#111827]">{slot.model} 实时数�?/div>
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mt-0.5">8路模拟量输入</div>
        </div>
        <button onClick={onClose} className="size-8 rounded-xl bg-[#F9FAFB] flex items-center justify-center text-[#9CA3AF] hover:text-[#111827] transition-colors">
          <X className="size-4" />
        </button>
      </div>
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
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-base font-black text-[#111827]">{slot.model} 输出调节</div>
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mt-0.5">8路模拟量输出 · 拖动滑块调节</div>
        </div>
        <button onClick={onClose} className="size-8 rounded-xl bg-[#F9FAFB] flex items-center justify-center text-[#9CA3AF] hover:text-[#111827] transition-colors">
          <X className="size-4" />
        </button>
      </div>
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

// RS485 Module Control Panel
function RS485ControlPanel({ slot, onClose }: { slot: IModuleSlot; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white rounded-[32px] border border-[#F3F4F6] shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-base font-black text-[#111827]">{slot.model} 接口配置</div>
          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mt-0.5">2�?RS485 隔离通信</div>
        </div>
        <button onClick={onClose} className="size-8 rounded-xl bg-[#F9FAFB] flex items-center justify-center text-[#9CA3AF] hover:text-[#111827] transition-colors">
          <X className="size-4" />
        </button>
      </div>
      <div className="space-y-3">
        {slot.channelList.map((ch) => (
          <div key={ch.index} className="p-4 rounded-2xl border border-[#F3F4F6] bg-[#F9FAFB]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#00B894] animate-pulse" />
                <span className="text-sm font-black text-[#111827]">{ch.label}</span>
              </div>
              <Badge className="text-[9px] font-black bg-[#00B894]/10 text-[#00B894] border-[#00B894]/20 rounded-full px-2 py-0.5">
                已连�?              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex justify-between p-2 rounded-xl bg-white">
                <span className="text-[#9CA3AF] font-bold">波特�?/span>
                <span className="font-black text-[#111827]">{ch.value}</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-white">
                <span className="text-[#9CA3AF] font-bold">数据�?/span>
                <span className="font-black text-[#111827]">8</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-white">
                <span className="text-[#9CA3AF] font-bold">校验�?/span>
                <span className="font-black text-[#111827]">None</span>
              </div>
              <div className="flex justify-between p-2 rounded-xl bg-white">
                <span className="text-[#9CA3AF] font-bold">停止�?/span>
                <span className="font-black text-[#111827]">1</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── 无线模块槽位（可切换）──────────────────────────────────

type WirelessOption = { key: string; label: string; icon: React.ComponentType<{ className?: string }>; color: string };

const SLOT1_OPTIONS: WirelessOption[] = [
  { key: '4g', label: '4G 模块', icon: Radio, color: '#6366F1' },
  { key: 'wifi', label: 'WiFi 模块', icon: Wifi, color: '#00B894' },
  { key: 'none', label: '未安�?, icon: X, color: '#9CA3AF' },
];

const SLOT2_OPTIONS: WirelessOption[] = [
  { key: 'ble', label: '蓝牙模块', icon: Bluetooth, color: '#00B894' },
  { key: 'slb', label: '星闪模块', icon: Radio, color: '#6366F1' },
  { key: 'none', label: '未安�?, icon: X, color: '#9CA3AF' },
];

function WirelessSlotCard({
  slotLabel,
  options,
  selectedKey,
  onSelect,
}: {
  slotLabel: string;
  options: WirelessOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const selected = options.find((o) => o.key === selectedKey) || options[0];
  const SelectedIcon = selected.icon;
  const isNone = selected.key === 'none';

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className={`w-full p-3 rounded-2xl border transition-all duration-200 text-left ${
          isNone
            ? 'border-dashed border-[#E5E7EB] bg-[#F9FAFB]/50'
            : 'border-[#F3F4F6] bg-[#F9FAFB] hover:border-[#00B894]/30'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className="size-7 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${selected.color}18` }}
          >
            <div style={{ color: selected.color }}>
              <SelectedIcon className="size-3.5" />
            </div>
          </div>
          <div>
            <div className="text-[10px] font-black text-[#111827]">{slotLabel}</div>
            <div className="text-[8px] text-[#9CA3AF]">{selected.label}</div>
          </div>
          {!isNone && <span className="size-2 rounded-full bg-[#00B894] ml-auto animate-pulse" />}
          {isNone && <span className="size-2 rounded-full bg-[#9CA3AF] ml-auto" />}
        </div>
        {!isNone && (
          <div className="flex gap-2 text-[9px]">
            <Badge
              variant="outline"
              className="rounded-full px-2 py-0"
              style={{ color: selected.color, borderColor: `${selected.color}30`, backgroundColor: `${selected.color}08` }}
            >
              已安�?· 正常运行
            </Badge>
          </div>
        )}
        {isNone && (
          <div className="text-[9px] text-[#9CA3AF] font-medium">点击选择模块</div>
        )}
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-0 right-0 top-full mt-1 z-20 bg-white rounded-2xl border border-[#F3F4F6] shadow-lg p-1.5 space-y-0.5"
          >
            {options.map((opt) => {
              const OptIcon = opt.icon;
              const isActive = opt.key === selectedKey;
              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    onSelect(opt.key);
                    setMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[10px] font-bold transition-colors ${
                    isActive
                      ? 'bg-[#00B894]/10 text-[#00B894]'
                      : 'text-[#111827] hover:bg-[#F9FAFB]'
                  }`}
                >
                  <div
                    className="size-6 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${opt.color}18` }}
                  >
                    <div style={{ color: opt.color }}>
                      <OptIcon className="size-3" />
                    </div>
                  </div>
                  {opt.label}
                  {isActive && (
                    <div className="ml-auto text-[#00B894]">
                      <CheckCircle2 className="size-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </motion.div>
        </>
      )}
    </div>
  );
}

// Main control unit (left side)
function MainControlUnit() {
  const [wireless1, setWireless1] = useState('wifi');
  const [wireless2, setWireless2] = useState('ble');

  return (
    <div className="space-y-3">
      {/* Brand header */}
      <Card className="p-5 rounded-[32px] border border-[#F3F4F6] shadow-sm bg-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-2xl bg-[#00B894]/10 flex items-center justify-center shrink-0">
            <Cpu className="size-5 text-[#00B894]" />
          </div>
          <div>
            <div className="text-sm font-black text-[#111827]">CT16 在鸿控制�?/div>
            <div className="text-[10px] font-bold text-[#9CA3AF]">开鸿智�?· OpenHarmony</div>
          </div>
        </div>
        {/* Status LEDs */}
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
        {/* Console + ETH */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] text-[#9CA3AF]">
            <Network className="size-3" />
            <span className="font-bold">CONSOLE</span>
            <span className="font-black text-[#111827] ml-auto">RJ45</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[#9CA3AF]">
            <Network className="size-3" />
            <span className="font-bold">ETH1</span>
            <span className="font-black text-[#111827] ml-auto">10/100 Mbps</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[#9CA3AF]">
            <Network className="size-3" />
            <span className="font-bold">ETH2</span>
            <span className="font-black text-[#111827] ml-auto">10/100 Mbps</span>
          </div>
        </div>
        {/* Power terminal */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F3F4F6] text-[10px]">
          <Power className="size-3 text-[#00B894]" />
          <span className="font-bold text-[#9CA3AF]">DC 24V</span>
          <span className="font-black text-[#00B894] ml-auto">正常</span>
        </div>
      </Card>

      {/* Wireless slots - 可切�?*/}
      <Card className="p-4 rounded-[32px] border border-[#F3F4F6] shadow-sm bg-white">
        <div className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest mb-3">无线扩展�?/div>
        <div className="space-y-3">
          <WirelessSlotCard
            slotLabel="4G/WiFi 模块槽位"
            options={SLOT1_OPTIONS}
            selectedKey={wireless1}
            onSelect={setWireless1}
          />
          <WirelessSlotCard
            slotLabel="蓝牙/星闪 模块槽位"
            options={SLOT2_OPTIONS}
            selectedKey={wireless2}
            onSelect={setWireless2}
          />
        </div>
      </Card>
    </div>
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
            <span className="text-[10px] font-bold">可扩展槽�?/span>
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

  const mainSlot = MOCK_MODULE_SLOTS.find((s) => s.slotNumber === 0);
  const leftSlots = MOCK_MODULE_SLOTS.filter((s) => s.position === 'left' && s.slotNumber > 0);
  const rightSlots = MOCK_MODULE_SLOTS.filter((s) => s.position === 'right');

  const renderControlPanel = () => {
    if (!selectedSlot) return null;
    const onClose = () => setSelectedSlot(null);

    if (selectedSlot.type === 'DI 输入') return <DIControlPanel slot={selectedSlot} onClose={onClose} />;
    if (selectedSlot.type === 'DO 输出') return <DOControlPanel slot={selectedSlot} onClose={onClose} />;
    if (selectedSlot.type === 'AI 输入') return <AIControlPanel slot={selectedSlot} onClose={onClose} />;
    if (selectedSlot.type === 'AO 输出') return <AOControlPanel slot={selectedSlot} onClose={onClose} />;
    if (selectedSlot.type === 'RS485 通信') return <RS485ControlPanel slot={selectedSlot} onClose={onClose} />;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Device structure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Main control + wireless */}
        <div className="lg:col-span-4 space-y-4">
          <MainControlUnit />
        </div>

        {/* Right: IO expansion modules */}
        <div className="lg:col-span-8">
          <Card className="p-6 rounded-[48px] border border-[#F3F4F6] shadow-sm bg-white">
            <div className="flex items-center gap-3 mb-5">
              <div className="size-8 rounded-xl bg-[#1F2937]/5 flex items-center justify-center">
                <Cable className="size-4 text-[#1F2937]" />
              </div>
              <div>
                <div className="text-sm font-black text-[#111827]">IO 扩展模块�?/div>
                <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">刀片式模块化扩�?/div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {rightSlots.map((slot) => (
                <IOModuleCard key={slot.id} slot={slot} onSelect={setSelectedSlot} />
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Control panel */}
      <AnimatePresence mode="wait">
        {selectedSlot && (
          <div className="w-full">{renderControlPanel()}</div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2.5 bg-white rounded-2xl border border-[#F3F4F6] shadow-sm w-fit">
        {Object.entries(STATUS_COLORS).map(([key, sc]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${sc.dot} ${key === 'normal' ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-black text-[#9CA3AF] uppercase">
              {key === 'normal' ? '正常' : key === 'warning' ? '告警' : key === 'fault' ? '故障' : key === 'off' ? '关闭' : '空槽'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
