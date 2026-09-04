import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleLeft, ToggleRight, Network } from 'lucide-react';
import {
  MOCK_WIRELESS_SLOT_SETTINGS,
  type IWirelessSlotSettings,
  type INetworkInterfaceConfig,
  type NetworkAddressMode,
} from '@/data/settings';
import type { Ct16NetworkSettingsDto, Ct16NetworkIfaceDto } from '@/api';

export const WIRELESS_STORAGE_KEY = 'zaihong:wirelessSlots';

export function LoadWirelessSlots(): IWirelessSlotSettings {
  try {
    const stored = localStorage.getItem(WIRELESS_STORAGE_KEY);
    return stored ? { ...MOCK_WIRELESS_SLOT_SETTINGS, ...JSON.parse(stored) } : { ...MOCK_WIRELESS_SLOT_SETTINGS };
  } catch {
    return { ...MOCK_WIRELESS_SLOT_SETTINGS };
  }
}

export function ToggleIconButton({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0">
      {checked ? (
        <ToggleRight className="size-5 text-success" />
      ) : (
        <ToggleLeft className="size-5 text-muted-foreground" />
      )}
    </button>
  );
}

/** 将后端 DTO 转为前端 INetworkInterfaceSettings */
export function dtoToSettings(dto: Ct16NetworkSettingsDto) {
  const interfaces: Record<string, INetworkInterfaceConfig> = {};
  for (const [id, iface] of Object.entries(dto.interfaces)) {
    interfaces[id] = {
      id: id as any,
      name: iface.name,
      enabled: iface.enabled,
      addressMode: (iface.addressMode as NetworkAddressMode) || 'dhcp',
      ipAddress: iface.ipAddress || '',
      runtimeIpAddress: iface.runtimeIpAddress || '',
      subnetMask: iface.subnetMask || '',
      gateway: iface.gateway || '',
      runtimeGateway: iface.runtimeGateway || '',
      dnsPrimary: iface.dnsPrimary || '',
      dnsSecondary: iface.dnsSecondary || '',
      effectiveDns: iface.effectiveDns || [],
      metric: iface.metric || '',
      defaultRoute: iface.defaultRoute,
      ssid: iface.ssid,
      password: iface.password,
      encryption: iface.encryption,
      apn: iface.apn,
      username: iface.username,
    };
  }
  return {
    ethernetMode: dto.ethernetMode as any,
    interfaces: interfaces as any,
  };
}

export function NetworkInterfaceCard({
  config,
  disabled,
  disabledReason,
  onChange,
}: {
  config: INetworkInterfaceConfig;
  disabled?: boolean;
  disabledReason?: string;
  onChange: (patch: Partial<INetworkInterfaceConfig>) => void;
}) {
  const isStatic = config.addressMode === 'static';
  const isDisabled = disabled || !config.enabled;
  const runtimeIpAddress = config.runtimeIpAddress || config.ipAddress;
  const runtimeGateway = config.runtimeGateway || '';
  const gatewayDns = !isStatic && config.defaultRoute ? runtimeGateway : '';

  return (
    <div className={`rounded-xl border border-border/40 bg-card/70 p-4 ${isDisabled ? 'opacity-55' : ''}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Network className="size-4 text-primary" />
            {config.name}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {disabled ? disabledReason : !config.enabled ? '网卡已禁用' : `${isStatic ? '静态IP' : 'DHCP'} · metric ${config.metric}`}
          </div>
        </div>
        <ToggleIconButton checked={config.enabled && !disabled} onClick={() => !disabled && onChange({ enabled: !config.enabled })} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm">地址方式</Label>
          <Select value={config.addressMode} onValueChange={(value) => onChange({ addressMode: value as any })} disabled={isDisabled}>
            <SelectTrigger className="h-9 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="static">静态 IP</SelectItem>
              <SelectItem value="dhcp">DHCP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">IP 地址</Label>
          <Input value={isStatic ? config.ipAddress : runtimeIpAddress} onChange={(e) => onChange({ ipAddress: e.target.value })} disabled={isDisabled || !isStatic} className="h-9 text-base" placeholder={isStatic ? '' : '等待 DHCP'} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">子网掩码</Label>
          <Input value={config.subnetMask} onChange={(e) => onChange({ subnetMask: e.target.value })} disabled={isDisabled || !isStatic} className="h-9 text-base" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">网关</Label>
          <Input value={isStatic ? config.gateway : runtimeGateway} onChange={(e) => onChange({ gateway: e.target.value })} disabled={isDisabled || !isStatic} className="h-9 text-base" placeholder={isStatic ? '' : 'DHCP 自动获取'} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">首选 DNS</Label>
          <Input value={isStatic ? config.dnsPrimary : (gatewayDns || config.dnsPrimary)} onChange={(e) => onChange({ dnsPrimary: e.target.value })} disabled={isDisabled || !isStatic} className="h-9 text-base" placeholder={isStatic ? '' : '等待 DHCP 网关'} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">备用 DNS</Label>
          <Input value={isStatic ? config.dnsSecondary : config.dnsPrimary} onChange={(e) => onChange(isStatic ? { dnsSecondary: e.target.value } : { dnsPrimary: e.target.value })} disabled={isDisabled} className="h-9 text-base" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">路由优先级</Label>
          <Input value={config.metric} onChange={(e) => onChange({ metric: e.target.value })} disabled={isDisabled} className="h-9 text-base" />
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <ToggleIconButton checked={config.defaultRoute && !isDisabled} onClick={() => !isDisabled && onChange({ defaultRoute: !config.defaultRoute })} />
          默认路由
        </label>
      </div>

      {config.id === 'wifi' && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border/30 pt-3">
          <div className="space-y-1.5">
            <Label className="text-sm">SSID</Label>
            <Input value={config.ssid || ''} onChange={(e) => onChange({ ssid: e.target.value })} disabled={isDisabled} className="h-9 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">密码</Label>
            <Input type="password" value={config.password || ''} onChange={(e) => onChange({ password: e.target.value })} disabled={isDisabled} className="h-9 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">加密方式</Label>
            <Input value={config.encryption || ''} onChange={(e) => onChange({ encryption: e.target.value })} disabled={isDisabled} className="h-9 text-base" />
          </div>
        </div>
      )}

      {config.id === '4g' && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border/30 pt-3">
          <div className="space-y-1.5">
            <Label className="text-sm">APN</Label>
            <Input value={config.apn || ''} onChange={(e) => onChange({ apn: e.target.value })} disabled={isDisabled} className="h-9 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">用户名</Label>
            <Input value={config.username || ''} onChange={(e) => onChange({ username: e.target.value })} disabled={isDisabled} className="h-9 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">密码</Label>
            <Input type="password" value={config.password || ''} onChange={(e) => onChange({ password: e.target.value })} disabled={isDisabled} className="h-9 text-base" />
          </div>
        </div>
      )}
    </div>
  );
}
