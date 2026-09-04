import { useState, useEffect, useCallback, useMemo, useRef, type ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Clock,
  Shield,
  Save,
  ToggleRight,
  ToggleLeft,
  Palette,
  Key,
  Eye,
  EyeOff,
  Upload,
  Loader2,
  Search,
  Power,
  TriangleAlert,
  Network,
} from 'lucide-react';
import {
  MOCK_TIME_SETTINGS,
  MOCK_SECURITY_SETTINGS,
  type ITimeSettings,
  type ISecuritySettings,
} from '@/data/settings';
import { toast } from 'sonner';
import {
  CT16_DEFAULT_LOGO_TYPE,
  CT16_DEFAULT_SYSTEM_NAME,
  CT16_LOGO_IMAGE_KEY,
  CT16_LOGO_TYPE_KEY,
  CT16_SYSTEM_NAME_KEY,
  applyCt16Appearance,
  getCt16Appearance,
} from '@/lib/appearance';
import { BrandLogo } from '@/components/BrandLogo';
import type { Ct16LogoType } from '@/lib/appearance';
import {
  getTimezones,
  getTimeSettings,
  updateTimeSettings,
  updateSystemTime,
  probeSystemHealth,
  requestSystemReboot,
  getEsoftbusSettings,
  updateEsoftbusSettings,
  restartEsoftbusService,
} from '@/api';
import { changePassword, clearSessionToken } from '@/api';
import { verifyPassword, startService, stopService, getServicesStatus } from '@/api';
import { updateSystemAppearance, uploadSystemLogo } from '@/api/appearance';
import { useNavigate } from 'react-router-dom';

const PRESET_LOGOS: Array<{ key: Ct16LogoType; label: string }> = [
  { key: 'chip', label: '芯片' },
  { key: 'gear', label: '齿轮' },
  { key: 'shield', label: '盾牌' },
  { key: 'hexagon', label: '六边形' },
];

type RebootPhase =
  | 'idle'
  | 'requesting'
  | 'waiting-offline'
  | 'waiting-online'
  | 'offline-timeout'
  | 'recovery-timeout';

const REBOOT_POLL_INTERVAL_MS = 1500;
const REBOOT_HEALTH_TIMEOUT_MS = 3000;
const REBOOT_OFFLINE_TIMEOUT_MS = 30_000;
const REBOOT_RECOVERY_TIMEOUT_MS = 180_000;

function formatTimezoneOffset(offset?: number): string {
  const hours = offset ?? 0;
  return `${hours >= 0 ? '+' : ''}${hours} 小时`;
}

type EsoftbusForm = {
  master: 0 | 1;
  deviceId: string;
  deviceName: string;
  plugCfgDir: string;
  hardwareCfgFile: string;
  dbRootPath: string;
  regionName: string;
  interfaces: { eth0: string; eth1: string };
  configPath: string;
  hardwareConfigPath: string;
};

const DEFAULT_ESOFTBUS: EsoftbusForm = {
  master: 1,
  deviceId: 'TEST_ESB_DEV_9234567890',
  deviceName: 'test_client_dev_9234567890',
  plugCfgDir: '/userdata/esoftbus/plug/',
  hardwareCfgFile: '/userdata/esoftbus/hw.cfg',
  dbRootPath: '/niobe470/devDB',
  regionName: 'region0',
  interfaces: { eth0: 'eth0', eth1: 'eth1' },
  configPath: '/userdata/esoftbus/esoftbus/esoftbus.cfg',
  hardwareConfigPath: '/userdata/esoftbus/hw.cfg',
};

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const finish = () => {
      window.clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const timer = window.setTimeout(finish, ms);
    signal.addEventListener('abort', finish, { once: true });
  });
}

async function probeDeviceHealth(signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return false;

  const requestController = new AbortController();
  const abortRequest = () => requestController.abort();
  const timer = window.setTimeout(abortRequest, REBOOT_HEALTH_TIMEOUT_MS);
  signal.addEventListener('abort', abortRequest, { once: true });
  try {
    return await probeSystemHealth(requestController.signal);
  } finally {
    window.clearTimeout(timer);
    signal.removeEventListener('abort', abortRequest);
  }
}

async function waitForDeviceState(
  expectedOnline: boolean,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (!signal.aborted && Date.now() < deadline) {
    const online = await probeDeviceHealth(signal);
    if (!signal.aborted && online === expectedOnline) return true;
    await delay(REBOOT_POLL_INTERVAL_MS, signal);
  }
  return false;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [time, setTime] = useState<ITimeSettings>({ ...MOCK_TIME_SETTINGS });
  const [timeLoading, setTimeLoading] = useState(true);
  const [timeSaving, setTimeSaving] = useState(false);
  const [systemTime, setSystemTime] = useState('');
  const [timezoneList, setTimezoneList] = useState<string[]>([]);
  const [timezoneOffsets, setTimezoneOffsets] = useState<Record<string, number>>({});
  const [timezoneSearch, setTimezoneSearch] = useState('');
  const [security, setSecurity] = useState<ISecuritySettings>({ ...MOCK_SECURITY_SETTINGS });
  const [esoftbus, setEsoftbus] = useState<EsoftbusForm>({ ...DEFAULT_ESOFTBUS, interfaces: { ...DEFAULT_ESOFTBUS.interfaces } });
  const [selectedEsoftbusInterface, setSelectedEsoftbusInterface] = useState<'eth0' | 'eth1'>('eth0');
  const [esoftbusLoading, setEsoftbusLoading] = useState(true);
  const [esoftbusSaving, setEsoftbusSaving] = useState(false);
  const [showEsoftbusConfirm, setShowEsoftbusConfirm] = useState(false);
  const esoftbusInitialRef = useRef<EsoftbusForm | null>(null);

  // 密码验证弹窗状态
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingService, setPendingService] = useState<string | null>(null);
  const [pendingEnable, setPendingEnable] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [systemName, setSystemName] = useState(() => localStorage.getItem(CT16_SYSTEM_NAME_KEY) || CT16_DEFAULT_SYSTEM_NAME);
  const [logoType, setLogoType] = useState<Ct16LogoType>(() => getCt16Appearance().logoType);
  const [logoImage, setLogoImage] = useState(() => localStorage.getItem(CT16_LOGO_IMAGE_KEY) || '');
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const logoUploadRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showRebootConfirm, setShowRebootConfirm] = useState(false);
  const [rebootPhase, setRebootPhase] = useState<RebootPhase>('idle');
  const rebootRecoveryRef = useRef<AbortController | null>(null);

  // 从后端加载当前时区
  const fetchTimeSettings = useCallback(async () => {
    try {
      setTimeLoading(true);
      const dto = await getTimeSettings();
      setTime((prev) => ({
        ...prev,
        timezone: dto.timezone,
        ntpServer: dto.ntpServer,
        ntpEnabled: dto.ntpEnabled,
      }));
      if (dto.systemTime) setSystemTime(dto.systemTime);
    } catch {
      // 后端不可用时保持默认值
    } finally {
      setTimeLoading(false);
    }
  }, []);

  // 从后端加载时区列表
  const fetchTimezoneList = useCallback(async () => {
    try {
      const dto = await getTimezones();
      setTimezoneList(dto.timezones ?? []);
      setTimezoneOffsets(dto.offsets ?? {});
    } catch {
      // 加载失败保持空列表
    }
  }, []);

  const fetchEsoftbusSettings = useCallback(async () => {
    try {
      setEsoftbusLoading(true);
      const dto = await getEsoftbusSettings();
      const loaded: EsoftbusForm = {
        ...DEFAULT_ESOFTBUS,
        ...dto,
        master: dto.master === 0 ? 0 : 1,
        interfaces: { ...DEFAULT_ESOFTBUS.interfaces, ...dto.interfaces },
      };
      const selectedInterface = loaded.interfaces.eth0 ? 'eth0' : 'eth1';
      loaded.interfaces = {
        eth0: selectedInterface === 'eth0' ? 'eth0' : '',
        eth1: selectedInterface === 'eth1' ? 'eth1' : '',
      };
      setEsoftbus(loaded);
      setSelectedEsoftbusInterface(selectedInterface);
      esoftbusInitialRef.current = loaded;
    } catch {
      // 配置文件不存在时使用默认值，首次保存会创建目录和文件。
    } finally {
      setEsoftbusLoading(false);
    }
  }, []);

  // 进入页面时获取服务运行状态
  useEffect(() => {
    getServicesStatus()
      .then((status) => {
        setSecurity({ sshEnabled: status.sshd, hdcEnabled: status.hdcd });
      })
      .catch(() => {
        // 获取失败时保持默认值
      });
  }, []);

  useEffect(() => {
    fetchTimeSettings();
    fetchTimezoneList();
    fetchEsoftbusSettings();
  }, [fetchTimeSettings, fetchTimezoneList, fetchEsoftbusSettings]);

  useEffect(() => () => rebootRecoveryRef.current?.abort(), []);

  // 按大洲分组的时区列表，支持搜索过滤
  const groupedTimezones = useMemo(() => {
    const search = timezoneSearch.toLowerCase().trim();
    const filtered = search ? timezoneList.filter((tz) => tz.toLowerCase().includes(search)) : timezoneList;

    const groups: Record<string, string[]> = {};
    for (const tz of filtered) {
      const parts = tz.split('/');
      const continent = parts.length >= 2 ? parts[0] : 'Other';
      if (!groups[continent]) groups[continent] = [];
      groups[continent].push(tz);
    }
    return groups;
  }, [timezoneList, timezoneSearch]);

  // 保存时区设置
  const applyTimeSettings = async () => {
    setTimeSaving(true);
    try {
      await updateTimeSettings({
        timezone: time.timezone,
        ntpServer: time.ntpServer,
        ntpEnabled: time.ntpEnabled,
      });
      await updateSystemTime(systemTime);
      toast.success('时间设置已保存并生效');
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存时区失败';
      toast.error(message);
    } finally {
      setTimeSaving(false);
    }
  };

  const getEsoftbusPayload = () => ({
    master: esoftbus.master,
    deviceId: esoftbus.deviceId,
    deviceName: esoftbus.deviceName,
    plugCfgDir: esoftbus.plugCfgDir,
    dbRootPath: esoftbus.dbRootPath,
    regionName: esoftbus.regionName,
    interfaces: {
      eth0: selectedEsoftbusInterface === 'eth0' ? 'eth0' : '',
      eth1: selectedEsoftbusInterface === 'eth1' ? 'eth1' : '',
    },
  });

  const requestSaveEsoftbusSettings = () => {
    const initial = esoftbusInitialRef.current;
    if (initial && JSON.stringify(getEsoftbusPayload()) === JSON.stringify({
      master: initial.master,
      deviceId: initial.deviceId,
      deviceName: initial.deviceName,
      plugCfgDir: initial.plugCfgDir,
      dbRootPath: initial.dbRootPath,
      regionName: initial.regionName,
      interfaces: initial.interfaces,
    })) {
      toast.info('配置未发生变化');
      return;
    }
    setShowEsoftbusConfirm(true);
  };

  const saveEsoftbusSettings = async () => {
    setShowEsoftbusConfirm(false);
    setEsoftbusSaving(true);
    let configSaved = false;
    try {
      await updateEsoftbusSettings(getEsoftbusPayload());
      configSaved = true;
      await restartEsoftbusService();
      esoftbusInitialRef.current = { ...esoftbus, interfaces: { ...esoftbus.interfaces } };
      toast.success('配置已保存，服务已重启');
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存配置失败';
      toast.error(configSaved ? `配置已写入，但软总线服务重启失败：${message}` : message);
    } finally {
      setEsoftbusSaving(false);
    }
  };

  // 点击服务开关，打开密码弹窗
  const handleToggleService = (serviceName: string, enable: boolean) => {
    setPendingService(serviceName);
    setPendingEnable(enable);
    setPasswordInput('');
    setPasswordError('');
    setShowPasswordDialog(true);
  };

  // 密码确认
  const handlePasswordConfirm = async () => {
    if (!passwordInput) {
      setPasswordError('请输入管理员密码');
      return;
    }
    if (!pendingService) return;

    setPasswordLoading(true);
    setPasswordError('');
    try {
      await verifyPassword(passwordInput);
      // 密码验证通过，执行服务启停
      if (pendingEnable) {
        await startService(pendingService);
        setSecurity((prev) => ({ ...prev, [pendingService === 'sshd' ? 'sshEnabled' : 'hdcEnabled']: true }));
        toast.success(`${pendingService === 'sshd' ? 'SSH' : 'HDC'} 服务已启动`);
      } else {
        await stopService(pendingService);
        setSecurity((prev) => ({ ...prev, [pendingService === 'sshd' ? 'sshEnabled' : 'hdcEnabled']: false }));
        toast.success(`${pendingService === 'sshd' ? 'SSH' : 'HDC'} 服务已停止`);
      }
      setShowPasswordDialog(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失败';
      setPasswordError(message);
    } finally {
      setPasswordLoading(false);
    }
  };

  // 取消密码弹窗
  const handlePasswordCancel = () => {
    setShowPasswordDialog(false);
    setPendingService(null);
    setPasswordInput('');
    setPasswordError('');
  };

  const handleSaveAppearance = async () => {
    try {
      if (logoType === 'custom' && pendingLogoFile) {
        await uploadSystemLogo(pendingLogoFile);
      } else if (logoType === 'custom' && logoImage.startsWith('data:')) {
        const response = await fetch(logoImage)
        const imageBlob = await response.blob()
        await uploadSystemLogo(new File([imageBlob], 'system-logo', { type: imageBlob.type }))
      }
      const appearance = await updateSystemAppearance({ systemName, logoType });
      applyCt16Appearance(appearance);
      setSystemName(appearance.systemName);
      setLogoType(appearance.logoType);
      setLogoImage(appearance.logoImage);
      setPendingLogoFile(null);
      toast.success('系统外观已更新');
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存系统外观失败';
      toast.error(message);
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
      setPendingLogoFile(file);
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
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      toast.success('密码已修改成功，请重新登录');
      // 清除旧 session，跳转登录页
      clearSessionToken();
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '密码修改失败';
      toast.error(msg);
    }
  };

  const finishRebootRecovery = () => {
    rebootRecoveryRef.current?.abort();
    clearSessionToken();
    navigate('/login', { replace: true });
  };

  const waitForDeviceRecovery = async () => {
    rebootRecoveryRef.current?.abort();
    const controller = new AbortController();
    rebootRecoveryRef.current = controller;
    setRebootPhase('waiting-online');

    const recovered = await waitForDeviceState(true, REBOOT_RECOVERY_TIMEOUT_MS, controller.signal);
    if (controller.signal.aborted) return;
    if (recovered) {
      finishRebootRecovery();
      return;
    }
    setRebootPhase('recovery-timeout');
  };

  const beginRebootRecovery = async () => {
    rebootRecoveryRef.current?.abort();
    const controller = new AbortController();
    rebootRecoveryRef.current = controller;
    setRebootPhase('waiting-offline');

    const wentOffline = await waitForDeviceState(false, REBOOT_OFFLINE_TIMEOUT_MS, controller.signal);
    if (controller.signal.aborted) return;
    if (!wentOffline) {
      setRebootPhase('offline-timeout');
      return;
    }
    await waitForDeviceRecovery();
  };

  const handleRequestReboot = async () => {
    setRebootPhase('requesting');
    try {
      await requestSystemReboot();
      void beginRebootRecovery();
    } catch (err) {
      setRebootPhase('idle');
      const message = err instanceof Error ? err.message : '重启请求失败';
      toast.error(message);
    }
  };

  const closeRebootStatus = () => {
    rebootRecoveryRef.current?.abort();
    rebootRecoveryRef.current = null;
    setRebootPhase('idle');
  };

  const retryReboot = () => {
    closeRebootStatus();
    setShowRebootConfirm(true);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">系统设置</h1>
      </div>

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
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="size-5 mr-2 animate-spin" />
              正在加载时间设置...
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="w-full space-y-1.5 lg:w-1/4">
                  <Label htmlFor="system-time" className="text-sm">设备时间</Label>
                  <Input
                    id="system-time"
                    type="datetime-local"
                    step="1"
                    value={systemTime}
                    onChange={(event) => setSystemTime(event.target.value)}
                    className="h-9 text-base"
                    disabled={timeSaving}
                  />
                </div>
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end lg:w-1/4">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Label className="text-sm">时间服务器</Label>
                    <Input
                      value={time.ntpServer}
                      onChange={(e) => setTime((prev) => ({ ...prev, ntpServer: e.target.value }))}
                      className="h-9 text-base"
                      placeholder={MOCK_TIME_SETTINGS.ntpServer}
                      disabled={!time.ntpEnabled || timeSaving}
                    />
                  </div>
                  <label className="flex h-9 shrink-0 items-center gap-2 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => setTime((prev) => ({ ...prev, ntpEnabled: !prev.ntpEnabled }))}
                      disabled={timeSaving}
                      aria-label="启用网络时间同步"
                    >
                      {time.ntpEnabled ? <ToggleRight className="size-5 text-success" /> : <ToggleLeft className="size-5 text-muted-foreground" />}
                    </button>
                    <span className="text-sm">启用网络时间同步</span>
                  </label>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">时区</Label>
                  <Select
                    value={time.timezone}
                    onValueChange={(v) => setTime((prev) => ({ ...prev, timezone: v }))}
                  >
                    <SelectTrigger className="h-9 text-base min-w-[240px]">
                      <SelectValue placeholder="选择时区..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[340px]">
                      <div className="sticky top-0 z-10 bg-popover px-2 pt-2 pb-1">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                          <input
                            className="flex h-8 w-full rounded-md border border-input bg-background px-8 text-sm
                              ring-offset-background placeholder:text-muted-foreground
                              focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            placeholder="搜索时区..."
                            value={timezoneSearch}
                            onChange={(e) => setTimezoneSearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      {timezoneList.length === 0 ? (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                          时区列表为空
                        </div>
                      ) : Object.keys(groupedTimezones).length === 0 ? (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                          无匹配时区
                        </div>
                      ) : (
                        <div className="overflow-auto max-h-[260px]">
                          {Object.entries(groupedTimezones).map(([continent, zones]) => (
                            <div key={continent}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                {continent}
                              </div>
                              {zones.map((tz) => (
                                <SelectItem key={tz} value={tz} className="text-sm pl-4">
                                  {tz.replace(/_/g, ' ')} ({formatTimezoneOffset(timezoneOffsets[tz])})
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-start border-t border-border/30 pt-4">
                  <Button size="sm" onClick={applyTimeSettings} disabled={!systemTime.trim() || timeSaving}>
                    {timeSaving ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <Save className="size-3.5 mr-1" />}
                    {timeSaving ? '保存中...' : '保存时间设置'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ESoftBus network interface selection */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Network className="size-4 text-primary" />
            软总线设置
          </CardTitle>
          <CardDescription>配置网络接口、运行模式和区域</CardDescription>
        </CardHeader>
        <CardContent>
          {esoftbusLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="size-5 mr-2 animate-spin" />正在加载配置...
            </div>
          ) : (
            <div className="max-w-2xl space-y-4">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">网卡配置</Label>
                  <Select
                    value={selectedEsoftbusInterface}
                    onValueChange={(value: 'eth0' | 'eth1') => {
                      setSelectedEsoftbusInterface(value);
                      setEsoftbus((current) => ({
                        ...current,
                        interfaces: { eth0: value === 'eth0' ? 'eth0' : '', eth1: value === 'eth1' ? 'eth1' : '' },
                      }));
                    }}
                  >
                    <SelectTrigger className="h-9 w-full text-base"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="eth0">eth0</SelectItem><SelectItem value="eth1">eth1</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">主从模式</Label>
                  <Select value={String(esoftbus.master)} onValueChange={(value) => setEsoftbus((current) => ({ ...current, master: value === '0' ? 0 : 1 }))}>
                    <SelectTrigger className="h-9 w-full text-base"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="1">主模式</SelectItem><SelectItem value="0">从模式</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">区域配置</Label>
                  <Input value={esoftbus.regionName} onChange={(event) => setEsoftbus((current) => ({ ...current, regionName: event.target.value }))} className="h-9 text-base" placeholder="region0" />
                </div>
              </div>
              <div className="flex justify-start"><Button size="sm" onClick={requestSaveEsoftbusSettings} disabled={esoftbusSaving}>{esoftbusSaving ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <Save className="size-3.5 mr-1" />}{esoftbusSaving ? '保存中...' : '保存设置'}</Button></div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showEsoftbusConfirm} onOpenChange={setShowEsoftbusConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认应用配置？</AlertDialogTitle>
            <AlertDialogDescription>确认后将写入配置并重启软总线服务，相关连接会短暂中断。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={esoftbusSaving}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void saveEsoftbusSettings()} disabled={esoftbusSaving}>确认并重启服务</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Security Settings - SSH & HDC */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            安全设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                onClick={() => handleToggleService('sshd', !security.sshEnabled)}
              >
                {security.sshEnabled ? (
                  <ToggleRight className="size-5 text-success" />
                ) : (
                  <ToggleLeft className="size-5 text-muted-foreground" />
                )}
              </button>
              <span className="text-sm">启用 SSH</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                onClick={() => handleToggleService('hdcd', !security.hdcEnabled)}
              >
                {security.hdcEnabled ? (
                  <ToggleRight className="size-5 text-success" />
                ) : (
                  <ToggleLeft className="size-5 text-muted-foreground" />
                )}
              </button>
              <span className="text-sm">启用 HDC</span>
            </label>
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
                  onClick={() => {
                    setLogoType(item.key);
                    setPendingLogoFile(null);
                  }}
                  className={`size-12 rounded-xl flex items-center justify-center border-2 transition-all ${
                    logoType === item.key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/40 bg-card text-muted-foreground hover:border-primary/40'
                  }`}
                  title={item.label}
                >
                  <BrandLogo logoType={item.key} className="size-6" />
                </button>
              ))}
              <button
                className={`size-12 rounded-xl flex flex-col items-center justify-center gap-0.5 border-2 border-dashed transition-all ${
                  logoType === 'custom'
                    ? 'border-primary bg-transparent text-primary'
                    : 'border-border/40 bg-transparent text-muted-foreground hover:border-primary/40'
                }`}
                title="上传自定义图标"
                onClick={() => logoUploadRef.current?.click()}
              >
                {logoType === 'custom' && logoImage ? (
                  <BrandLogo logoType="custom" logoImage={logoImage} className="size-7" />
                ) : (
                  <>
                    <Upload className="size-4" />
                    <span className="text-[8px]">上传</span>
                  </>
                )}
              </button>
              <input
                ref={logoUploadRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
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
        <CardContent>
          <div className="max-w-md space-y-4">
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
            <div className="space-y-4">
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
              <Button size="sm" onClick={handleChangePassword}>
                <Key className="size-3.5 mr-1" />
                修改密码
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Operations */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Power className="size-4 text-primary" />
            设备操作
          </CardTitle>
          <CardDescription>以下操作会中断设备服务，请确认当前没有关键任务正在运行</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <div className="text-sm font-medium">重启设备</div>
            <p className="text-sm text-muted-foreground">重启期间 Web、网络连接和设备业务将暂时不可用</p>
          </div>
          <Button
            size="sm"
            disabled={rebootPhase !== 'idle'}
            onClick={() => setShowRebootConfirm(true)}
          >
            <Power className="size-3.5" />
            重启设备
          </Button>
        </CardContent>
      </Card>

      {/* Reboot Confirmation */}
      <AlertDialog open={showRebootConfirm} onOpenChange={setShowRebootConfirm}>
        <AlertDialogContent className="border-destructive/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="size-5" />
              确认重启设备
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">设备将立即重启，当前 Web 会话、网络连接和正在运行的设备业务会暂时中断。</span>
              <span className="block font-medium text-foreground">请确认已保存配置，并且当前没有关键任务正在运行。</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rebootPhase !== 'idle'}>取消</AlertDialogCancel>
            <AlertDialogAction
              className="border-destructive-border bg-destructive text-destructive-foreground"
              disabled={rebootPhase !== 'idle'}
              onClick={() => void handleRequestReboot()}
            >
              确认重启
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reboot Progress */}
      <Dialog open={rebootPhase !== 'idle'}>
        <DialogContent
          showCloseButton={false}
          className="border-border/40 bg-card/95"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          {rebootPhase === 'offline-timeout' ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-warning">
                  <TriangleAlert className="size-5" />
                  未检测到设备重启
                </DialogTitle>
                <DialogDescription>
                  设备在 30 秒内仍可访问，可能尚未开始重启。请检查设备状态后关闭提示或重新发起重启。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={closeRebootStatus}>关闭</Button>
                <Button variant="destructive" onClick={retryReboot}>重新发起重启</Button>
              </DialogFooter>
            </>
          ) : rebootPhase === 'recovery-timeout' ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-warning">
                  <TriangleAlert className="size-5" />
                  设备尚未恢复
                </DialogTitle>
                <DialogDescription>
                  设备重启后长时间没有恢复 Web 服务，请检查设备供电和网络连接，也可以继续等待。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={closeRebootStatus}>关闭</Button>
                <Button onClick={() => void waitForDeviceRecovery()}>继续等待</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Loader2 className="size-5 animate-spin text-primary" />
                  {rebootPhase === 'requesting' ? '正在提交重启请求' : '设备正在重启'}
                </DialogTitle>
                <DialogDescription>
                  {rebootPhase === 'requesting'
                    ? '正在通知设备执行重启，请勿关闭页面。'
                    : rebootPhase === 'waiting-offline'
                      ? '重启请求已受理，正在等待设备断开连接。'
                      : '已检测到设备离线，正在等待 Web 服务恢复。'}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-md border border-border/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                恢复后将自动跳转到登录页面，无需手动刷新。
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Password Verification Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={(open) => { if (!open) handlePasswordCancel(); }}>
        <DialogContent className="border-border/40 bg-card/95">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="size-5 text-primary" />
              验证管理员密码
            </DialogTitle>
            <DialogDescription>
              修改 {pendingService === 'sshd' ? 'SSH' : 'HDC'} 服务状态需要验证管理员密码
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label className="text-sm">管理员密码</Label>
              <Input
                type="password"
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }}
                placeholder="请输入管理员密码"
                className="h-9 text-base"
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordConfirm()}
              />
            </div>
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handlePasswordCancel} disabled={passwordLoading}>
              取消
            </Button>
            <Button onClick={handlePasswordConfirm} disabled={passwordLoading}>
              {passwordLoading ? (
                <Loader2 className="size-3.5 mr-1 animate-spin" />
              ) : (
                <Key className="size-3.5 mr-1" />
              )}
              {passwordLoading ? '验证中...' : '确认'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
