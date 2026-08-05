import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Clock,
  Shield,
  Save,
  RotateCcw,
  Plus,
  X,
  ToggleRight,
  ToggleLeft,
  Wifi,
  Radio,
  Network,
  Link2,
  Palette,
  Key,
  Eye,
  EyeOff,
  Upload,
  LoaderCircle,
} from 'lucide-react';
import {
  MOCK_TIME_SETTINGS,
  MOCK_SECURITY_SETTINGS,
  MOCK_WIRELESS_SLOT_SETTINGS,
  MOCK_NETWORK_INTERFACE_SETTINGS,
  type ITimeSettings,
  type ISecuritySettings,
  type IWirelessSlotSettings,
  type INetworkInterfaceConfig,
  type INetworkInterfaceSettings,
  type NetworkInterfaceId,
} from '@/data/settings';
import { toast } from 'sonner';
import {
  ChangePrototypeAdminPassword,
  GetPrototypeAppearance,
  GetPrototypeServiceStatus,
  GetPrototypeTimeSettings,
  GetPrototypeTimezones,
  SavePrototypeAppearance,
  SavePrototypeTimeSettings,
  SetPrototypeServiceStatus,
  VerifyPrototypeAdminPassword,
  type PrototypeServiceStatus,
} from '@/services/prototypeRuntime';

const PRESET_LOGOS = [
  { key: 'chip', label: '芯片' },
  { key: 'gear', label: '齿轮' },
  { key: 'shield', label: '盾牌' },
  { key: 'hexagon', label: '六边形' },
];

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

function LogoIcon({ type, className }: { type: string; className?: string }) {
  if (type === 'chip') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      </svg>
    );
  }
  if (type === 'gear') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
  }
  if (type === 'shield') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
}

function ToggleIconButton({ checked, onClick }: { checked: boolean; onClick: () => void }) {
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

function NetworkInterfaceCard({
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

  return (
    <div className={`rounded-xl border border-border/40 bg-card/70 p-4 ${disabled ? 'opacity-55' : ''}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Network className="size-4 text-primary" />
            {config.name}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {disabled ? disabledReason : `${isStatic ? '静态IP' : 'DHCP'} · metric ${config.metric}`}
          </div>
        </div>
        <ToggleIconButton checked={config.enabled && !disabled} onClick={() => !disabled && onChange({ enabled: !config.enabled })} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm">地址方式</Label>
          <Select value={config.addressMode} onValueChange={(value) => onChange({ addressMode: value as INetworkInterfaceConfig['addressMode'] })} disabled={disabled}>
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
          <Input value={config.ipAddress} onChange={(e) => onChange({ ipAddress: e.target.value })} disabled={disabled || !isStatic} className="h-9 text-base" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">子网掩码</Label>
          <Input value={config.subnetMask} onChange={(e) => onChange({ subnetMask: e.target.value })} disabled={disabled || !isStatic} className="h-9 text-base" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">网关</Label>
          <Input value={config.gateway} onChange={(e) => onChange({ gateway: e.target.value })} disabled={disabled || !isStatic} className="h-9 text-base" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">首选 DNS</Label>
          <Input value={config.dnsPrimary} onChange={(e) => onChange({ dnsPrimary: e.target.value })} disabled={disabled} className="h-9 text-base" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">备用 DNS</Label>
          <Input value={config.dnsSecondary} onChange={(e) => onChange({ dnsSecondary: e.target.value })} disabled={disabled} className="h-9 text-base" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">路由优先级</Label>
          <Input value={config.metric} onChange={(e) => onChange({ metric: e.target.value })} disabled={disabled} className="h-9 text-base" />
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <ToggleIconButton checked={config.defaultRoute && !disabled} onClick={() => !disabled && onChange({ defaultRoute: !config.defaultRoute })} />
          默认路由
        </label>
      </div>

      {config.id === 'wifi' && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border/30 pt-3">
          <div className="space-y-1.5">
            <Label className="text-sm">SSID</Label>
            <Input value={config.ssid || ''} onChange={(e) => onChange({ ssid: e.target.value })} disabled={disabled} className="h-9 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">密码</Label>
            <Input type="password" value={config.password || ''} onChange={(e) => onChange({ password: e.target.value })} disabled={disabled} className="h-9 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">加密方式</Label>
            <Input value={config.encryption || ''} onChange={(e) => onChange({ encryption: e.target.value })} disabled={disabled} className="h-9 text-base" />
          </div>
        </div>
      )}

      {config.id === '4g' && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border/30 pt-3">
          <div className="space-y-1.5">
            <Label className="text-sm">APN</Label>
            <Input value={config.apn || ''} onChange={(e) => onChange({ apn: e.target.value })} disabled={disabled} className="h-9 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">用户名</Label>
            <Input value={config.username || ''} onChange={(e) => onChange({ username: e.target.value })} disabled={disabled} className="h-9 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">密码</Label>
            <Input type="password" value={config.password || ''} onChange={(e) => onChange({ password: e.target.value })} disabled={disabled} className="h-9 text-base" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [wirelessSlots, setWirelessSlots] = useState<IWirelessSlotSettings>(() => LoadWirelessSlots());
  const [networkInterfaces, setNetworkInterfaces] = useState<INetworkInterfaceSettings>(() => LoadNetworkInterfaces());
  const [time, setTime] = useState<ITimeSettings>({ ...MOCK_TIME_SETTINGS });
  const [timezones, setTimezones] = useState<string[]>([]);
  const [timezoneSearch, setTimezoneSearch] = useState('');
  const [timeLoading, setTimeLoading] = useState(true);
  const [timeSaving, setTimeSaving] = useState(false);
  const [security, setSecurity] = useState<ISecuritySettings>({ ...MOCK_SECURITY_SETTINGS });
  const [serviceStatus, setServiceStatus] = useState<PrototypeServiceStatus>({ sshd: true, hdcd: true });
  const [pendingService, setPendingService] = useState<keyof PrototypeServiceStatus | null>(null);
  const [pendingServiceEnabled, setPendingServiceEnabled] = useState(false);
  const [servicePassword, setServicePassword] = useState('');
  const [serviceError, setServiceError] = useState('');
  const [serviceBusy, setServiceBusy] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const [systemName, setSystemName] = useState(() => localStorage.getItem('zaihong:systemName') || '在鸿设备管理系统');
  const [logoType, setLogoType] = useState(() => localStorage.getItem('zaihong:logoType') || 'chip');
  const [logoImage, setLogoImage] = useState(() => localStorage.getItem('zaihong:logoImage') || '');
  const logoUploadRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      GetPrototypeTimeSettings(),
      GetPrototypeTimezones(),
      GetPrototypeServiceStatus(),
      GetPrototypeAppearance(),
    ]).then(([timeSettings, availableTimezones, services, appearance]) => {
      if (!active) {
        return;
      }
      setTime((current) => ({ ...current, ...timeSettings }));
      setTimezones(availableTimezones);
      setServiceStatus(services);
      setSecurity((current) => ({ ...current, sshEnabled: services.sshd }));
      setSystemName(appearance.systemName);
      setLogoType(appearance.logoType);
      setLogoImage(appearance.logoImage);
    }).catch(() => {
      if (active) {
        toast.error('系统设置模拟数据加载失败');
      }
    }).finally(() => {
      if (active) {
        setTimeLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const visibleTimezones = useMemo(() => {
    const query = timezoneSearch.trim().toLowerCase();
    return query ? timezones.filter((timezone) => timezone.toLowerCase().includes(query)) : timezones;
  }, [timezoneSearch, timezones]);

  const saveAll = async () => {
    try {
      localStorage.setItem(WIRELESS_STORAGE_KEY, JSON.stringify(wirelessSlots));
      localStorage.setItem(NETWORK_STORAGE_KEY, JSON.stringify(networkInterfaces));
      await SavePrototypeTimeSettings({ timezone: time.timezone, ntpServer: time.ntpServer });
      window.dispatchEvent(new Event('zaihong:wireless-config-changed'));
      window.dispatchEvent(new Event('zaihong:network-config-changed'));
      setShowSaveDialog(false);
      toast.success('所有配置已保存，部分更改将在重启服务后生效。');
    } catch {
      toast.error('配置保存失败，请检查浏览器存储权限后重试。');
    }
  };

  const resetAll = () => {
    setWirelessSlots({ ...MOCK_WIRELESS_SLOT_SETTINGS });
    setNetworkInterfaces({
      ...MOCK_NETWORK_INTERFACE_SETTINGS,
      interfaces: { ...MOCK_NETWORK_INTERFACE_SETTINGS.interfaces },
    });
    localStorage.setItem(WIRELESS_STORAGE_KEY, JSON.stringify(MOCK_WIRELESS_SLOT_SETTINGS));
    localStorage.setItem(NETWORK_STORAGE_KEY, JSON.stringify(MOCK_NETWORK_INTERFACE_SETTINGS));
    window.dispatchEvent(new Event('zaihong:wireless-config-changed'));
    window.dispatchEvent(new Event('zaihong:network-config-changed'));
    setTime({ ...MOCK_TIME_SETTINGS });
    setSecurity({ ...MOCK_SECURITY_SETTINGS });
    setShowResetDialog(false);
    toast.success('已恢复默认配置');
  };

  const updateInterface = (id: NetworkInterfaceId, patch: Partial<INetworkInterfaceConfig>) => {
    setNetworkInterfaces((prev) => ({
      ...prev,
      interfaces: {
        ...prev.interfaces,
        [id]: {
          ...prev.interfaces[id],
          ...patch,
        },
      },
    }));
  };

  const addAllowedIp = () => {
    if (!newIp.trim()) return;
    if (security.allowedIps.includes(newIp.trim())) {
      toast.info('该 IP 已在白名单中');
      return;
    }
    setSecurity((prev) => ({ ...prev, allowedIps: [...prev.allowedIps, newIp.trim()] }));
    setNewIp('');
  };

  const removeAllowedIp = (ip: string) => {
    setSecurity((prev) => ({ ...prev, allowedIps: prev.allowedIps.filter((i) => i !== ip) }));
  };

  const saveTimeSettings = async () => {
    setTimeSaving(true);
    try {
      await SavePrototypeTimeSettings({ timezone: time.timezone, ntpServer: time.ntpServer });
      toast.success('时间和 NTP 设置已保存');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存时间设置失败');
    } finally {
      setTimeSaving(false);
    }
  };

  const handleServiceToggle = (service: keyof PrototypeServiceStatus, enabled: boolean) => {
    setPendingService(service);
    setPendingServiceEnabled(enabled);
    setServicePassword('');
    setServiceError('');
  };

  const confirmServiceToggle = async () => {
    if (!pendingService) {
      return;
    }
    setServiceBusy(true);
    setServiceError('');
    try {
      await VerifyPrototypeAdminPassword(servicePassword);
      const next = await SetPrototypeServiceStatus(pendingService, pendingServiceEnabled);
      setServiceStatus(next);
      setSecurity((current) => ({ ...current, sshEnabled: next.sshd }));
      toast.success(`${pendingService === 'sshd' ? 'SSH' : 'HDC'} 服务已${pendingServiceEnabled ? '启动' : '停止'}`);
      setPendingService(null);
    } catch (error) {
      setServiceError(error instanceof Error ? error.message : '服务操作失败');
    } finally {
      setServiceBusy(false);
    }
  };

  const handleSaveAppearance = async () => {
    try {
      const appearance = await SavePrototypeAppearance({ systemName, logoType, logoImage });
      setSystemName(appearance.systemName);
      setLogoType(appearance.logoType);
      setLogoImage(appearance.logoImage);
      toast.success('系统外观已更新');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存系统外观失败');
    }
  };

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('仅支持 PNG、JPEG 或 WebP 格式的图片');
      return;
    }
    if (file.size > 512 * 1024) {
      toast.error('图标文件不能超过 512 KiB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        toast.error('读取图标文件失败');
        return;
      }
      setLogoImage(reader.result);
      setLogoType('custom');
    };
    reader.onerror = () => toast.error('读取图标文件失败');
    reader.readAsDataURL(file);
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error('请输入当前密码');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      toast.error('新密码至少 4 个字符');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }

    try {
      await ChangePrototypeAdminPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      toast.success('密码已修改成功');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '密码修改失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">系统设置</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)}>
            <RotateCcw className="size-3.5 mr-1" />
            恢复默认
          </Button>
          <Button size="sm" onClick={() => setShowSaveDialog(true)}>
            <Save className="size-3.5 mr-1" />
            保存配置
          </Button>
        </div>
      </div>

      {/* Wireless Slot Settings */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wifi className="size-4 text-primary" />
            无线扩展槽设置
          </CardTitle>
          <CardDescription>确定两个无线扩展槽安装的具体模块类型</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">4G/WiFi 模块槽位</Label>
              <Select value={wirelessSlots.slot1} onValueChange={(value) => setWirelessSlots((prev) => ({ ...prev, slot1: value as IWirelessSlotSettings['slot1'] }))}>
                <SelectTrigger className="h-9 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wifi">WiFi 模块</SelectItem>
                  <SelectItem value="4g">4G 模块</SelectItem>
                  <SelectItem value="none">未安装</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">蓝牙/星闪 模块槽位</Label>
              <Select value={wirelessSlots.slot2} onValueChange={(value) => setWirelessSlots((prev) => ({ ...prev, slot2: value as IWirelessSlotSettings['slot2'] }))}>
                <SelectTrigger className="h-9 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ble">蓝牙模块</SelectItem>
                  <SelectItem value="slb">星闪模块</SelectItem>
                  <SelectItem value="none">未安装</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Network Interface Settings */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="size-4 text-primary" />
            网卡网络配置
          </CardTitle>
          <CardDescription>统一管理两路以太网、4G 和 WiFi 网卡参数，作为系统唯一网络配置入口</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { value: 'independent', title: '独立网卡模式', desc: 'ETH1/ETH2 分别配置独立 IP' },
              { value: 'bridge', title: '网桥模式', desc: '两路网口共用 BR0 网卡，支持手拉手连接' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setNetworkInterfaces((prev) => ({ ...prev, ethernetMode: item.value as INetworkInterfaceSettings['ethernetMode'] }))}
                className={`rounded-xl border p-4 text-left transition-all ${
                  networkInterfaces.ethernetMode === item.value
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-border/40 bg-card hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Link2 className="size-4 text-primary" />
                  {item.title}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{item.desc}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {networkInterfaces.ethernetMode === 'bridge' ? (
              <NetworkInterfaceCard
                config={networkInterfaces.interfaces.bridge}
                onChange={(patch) => updateInterface('bridge', patch)}
              />
            ) : (
              <>
                <NetworkInterfaceCard
                  config={networkInterfaces.interfaces.eth1}
                  onChange={(patch) => updateInterface('eth1', patch)}
                />
                <NetworkInterfaceCard
                  config={networkInterfaces.interfaces.eth2}
                  onChange={(patch) => updateInterface('eth2', patch)}
                />
              </>
            )}
            <NetworkInterfaceCard
              config={networkInterfaces.interfaces['4g']}
              disabled={wirelessSlots.slot1 !== '4g'}
              disabledReason="4G 模块未安装"
              onChange={(patch) => updateInterface('4g', patch)}
            />
            <NetworkInterfaceCard
              config={networkInterfaces.interfaces.wifi}
              disabled={wirelessSlots.slot1 !== 'wifi'}
              disabledReason="WiFi 模块未安装"
              onChange={(patch) => updateInterface('wifi', patch)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Time Settings */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            时间设置
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeLoading ? (
            <div className="flex h-20 items-center justify-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />正在加载时间设置
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="timezone-search" className="text-sm">时区</Label>
                <Input
                  id="timezone-search"
                  value={timezoneSearch}
                  onChange={(event) => setTimezoneSearch(event.target.value)}
                  placeholder="搜索时区"
                  className="h-9 text-base"
                />
                <Select value={time.timezone} onValueChange={(timezone) => setTime((current) => ({ ...current, timezone }))}>
                  <SelectTrigger className="h-9 text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {visibleTimezones.length > 0 ? visibleTimezones.map((timezone) => (
                      <SelectItem key={timezone} value={timezone}>{timezone}</SelectItem>
                    )) : <SelectItem value={time.timezone}>{time.timezone}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ntp-server" className="text-sm">NTP 服务器</Label>
                <Input
                  id="ntp-server"
                  value={time.ntpServer}
                  onChange={(event) => setTime((current) => ({ ...current, ntpServer: event.target.value }))}
                  className="h-9 text-base"
                />
                <Button size="sm" onClick={() => void saveTimeSettings()} disabled={timeSaving}>
                  {timeSaving && <LoaderCircle className="size-3.5 animate-spin" />}保存时间设置
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            安全设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">管理员密码</Label>
              <Input
                type="password"
                value={security.adminPassword}
                onChange={(e) =>
                  setSecurity((prev) => ({ ...prev, adminPassword: e.target.value }))
                }
                className="h-9 text-base"
              />
            </div>
            <div className="flex flex-wrap items-end gap-4 pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  onClick={() => handleServiceToggle('sshd', !serviceStatus.sshd)}
                >
                  {serviceStatus.sshd ? (
                    <ToggleRight className="size-5 text-success" />
                  ) : (
                    <ToggleLeft className="size-5 text-muted-foreground" />
                  )}
                </button>
                <span className="text-sm">启用 SSH</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <button type="button" onClick={() => handleServiceToggle('hdcd', !serviceStatus.hdcd)}>
                  {serviceStatus.hdcd ? <ToggleRight className="size-5 text-success" /> : <ToggleLeft className="size-5 text-muted-foreground" />}
                </button>
                <span className="text-sm">启用 HDC</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  type="button"
                  onClick={() =>
                    setSecurity((prev) => ({ ...prev, httpsOnly: !prev.httpsOnly }))
                  }
                >
                  {security.httpsOnly ? (
                    <ToggleRight className="size-5 text-success" />
                  ) : (
                    <ToggleLeft className="size-5 text-muted-foreground" />
                  )}
                </button>
                <span className="text-sm">仅 HTTPS</span>
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">IP 访问白名单</Label>
            <div className="flex items-center gap-2">
              <Input
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                placeholder="输入 IP 地址"
                className="h-9 text-base max-w-[240px]"
                onKeyDown={(e) => e.key === 'Enter' && addAllowedIp()}
              />
              <Button variant="outline" size="sm" className="h-9" onClick={addAllowedIp}>
                <Plus className="size-3.5 mr-1" />
                添加
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {security.allowedIps.map((ip) => (
                <Badge key={ip} variant="secondary" className="gap-1 text-xs">
                  {ip}
                  <button onClick={() => removeAllowedIp(ip)}>
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Appearance */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="size-4 text-primary" />
            系统外观
          </CardTitle>
          <CardDescription>自定义系统名称和 Logo 图标</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">系统名称</Label>
            <Input
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              className="h-9 text-base max-w-md"
              placeholder="在鸿设备管理系统"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">系统 Logo</Label>
            <div className="flex items-center gap-3 flex-wrap">
              {PRESET_LOGOS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setLogoType(item.key)}
                  className={`size-12 rounded-xl flex items-center justify-center border-2 transition-all ${
                    logoType === item.key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/40 bg-card text-muted-foreground hover:border-primary/40'
                  }`}
                  title={item.label}
                >
                  <LogoIcon type={item.key} className="size-6" />
                </button>
              ))}
              <button
                type="button"
                className="size-12 rounded-xl flex flex-col items-center justify-center gap-0.5 border-2 border-dashed border-border/40 bg-card text-muted-foreground hover:border-primary/40 transition-all"
                title="上传自定义图标"
                onClick={() => logoUploadRef.current?.click()}
              >
                <Upload className="size-4" />
                <span className="text-[8px]">上传</span>
              </button>
              <input ref={logoUploadRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} />
              {logoType === 'custom' && logoImage ? <img src={logoImage} alt="自定义系统图标预览" className="size-12 rounded-xl border border-border/60 object-contain p-1" /> : null}
            </div>
          </div>
          <Button size="sm" onClick={handleSaveAppearance}>
            <Save className="size-3.5 mr-1" />
            保存外观设置
          </Button>
        </CardContent>
      </Card>

      {/* Account Security */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="size-4 text-primary" />
            账号安全
          </CardTitle>
          <CardDescription>修改管理员登录密码</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div className="space-y-2">
              <Label className="text-sm">当前密码</Label>
              <div className="relative">
                <Input
                  type={showCurrentPwd ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="输入当前密码"
                  className="h-9 text-base pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPwd ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">新密码</Label>
              <div className="relative">
                <Input
                  type={showNewPwd ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="输入新密码（至少4位）"
                  className="h-9 text-base pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPwd ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">确认新密码</Label>
              <Input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="再次输入新密码"
                className="h-9 text-base"
              />
            </div>
          </div>
          <Button size="sm" onClick={handleChangePassword}>
            <Key className="size-3.5 mr-1" />
            修改密码
          </Button>
        </CardContent>
      </Card>

      <Dialog open={pendingService !== null} onOpenChange={(open) => !open && setPendingService(null)}>
        <DialogContent className="border-border/40 bg-card/95">
          <DialogHeader>
            <DialogTitle>{pendingService === 'sshd' ? 'SSH' : 'HDC'} 服务确认</DialogTitle>
            <DialogDescription>
              原型模式会仅更新当前浏览器中的服务状态，不会操作真实设备服务。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="service-password">管理员密码</Label>
            <Input
              id="service-password"
              type="password"
              value={servicePassword}
              onChange={(event) => setServicePassword(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && void confirmServiceToggle()}
              autoComplete="current-password"
            />
            {serviceError ? <p className="text-xs text-destructive">{serviceError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingService(null)} disabled={serviceBusy}>取消</Button>
            <Button onClick={() => void confirmServiceToggle()} disabled={serviceBusy || !servicePassword}>
              {serviceBusy && <LoaderCircle className="size-3.5 animate-spin" />}
              确认{pendingServiceEnabled ? '启动' : '停止'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Confirm Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="border-border/40 bg-card/95">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="size-5 text-primary" />
              保存配置
            </DialogTitle>
            <DialogDescription>
              确认保存当前所有配置？保存后部分更改将在重启服务后生效。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              取消
            </Button>
            <Button onClick={saveAll}>
              确认保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="border-border/40 bg-card/95">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="size-5 text-warning" />
              恢复默认配置
            </DialogTitle>
            <DialogDescription>
              此操作将把所有设置恢复为出厂默认值。已保存的配置将丢失。是否继续？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={resetAll}>
              确认恢复
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
