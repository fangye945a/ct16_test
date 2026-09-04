import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Bluetooth, Link2, Loader2, Play, Radio, RotateCcw, Save, Wifi } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  applyNetworkSettings,
  applyWirelessSettings,
  getNetworkSettings,
  getWirelessInterface,
  getWirelessModules,
  resetNetworkSettings,
  updateNetworkSettings,
  updateWirelessInterface,
  updateWirelessModules,
  type Ct16NetworkIfaceDto,
  type Ct16NetworkSettingsDto,
  type Ct16WirelessInterfaceDto,
  type Ct16WirelessModulesDto,
} from '@/api'
import { NetworkInterfaceCard, dtoToSettings, ToggleIconButton } from '@/components/settings/shared'
import {
  MOCK_NETWORK_INTERFACE_SETTINGS,
  type INetworkInterfaceConfig,
  type INetworkInterfaceSettings,
  type NetworkInterfaceId,
  type NetworkWorkMode,
} from '@/data/settings'

const wirelessRequestTimeoutMs = 5_000
const defaultConfigPollIntervalMs = 1_000
const defaultConfigWaitTimeoutMs = 15_000

interface DefaultConfigSnapshot {
  networkSettings: Ct16NetworkSettingsDto
  modules?: Ct16WirelessModulesDto
  wirelessSettings?: Ct16WirelessInterfaceDto
}

async function withWirelessRequestTimeout<T>(request: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), wirelessRequestTimeoutMs)
  try {
    return await request(controller.signal)
  } catch (err) {
    if (controller.signal.aborted) throw new Error('无线网络请求超时，请检查设备连接后重试')
    throw err
  } finally {
    window.clearTimeout(timeout)
  }
}

function waitForDefaultConfigPoll(timeoutMs: number, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false)

  return new Promise((resolve) => {
    let timer = 0
    const finish = (shouldContinue: boolean) => {
      window.clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      resolve(shouldContinue)
    }
    const onAbort = () => finish(false)
    timer = window.setTimeout(() => finish(true), timeoutMs)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function dtoToConfig(dto: Ct16NetworkIfaceDto): INetworkInterfaceConfig {
  return {
    id: dto.id as NetworkInterfaceId,
    name: dto.name,
    enabled: dto.enabled,
    addressMode: (dto.addressMode === 'static' ? 'static' : 'dhcp'),
    ipAddress: dto.ipAddress || '',
    runtimeIpAddress: dto.runtimeIpAddress || '',
    subnetMask: dto.subnetMask || '',
    gateway: dto.gateway || '',
    runtimeGateway: dto.runtimeGateway || '',
    dnsPrimary: dto.dnsPrimary || '',
    dnsSecondary: dto.dnsSecondary || '',
    effectiveDns: dto.effectiveDns || [],
    metric: dto.metric || '',
    defaultRoute: dto.defaultRoute,
    ssid: dto.ssid,
    password: dto.password || dto.apnPassword,
    encryption: dto.encryption,
    apn: dto.apn,
    username: dto.username,
  }
}

function configToDto(config: INetworkInterfaceConfig): Ct16NetworkIfaceDto {
  return {
    id: config.id,
    name: config.name,
    enabled: config.enabled,
    addressMode: config.addressMode,
    ipAddress: config.ipAddress,
    subnetMask: config.subnetMask,
    gateway: config.gateway,
    dnsPrimary: config.dnsPrimary,
    dnsSecondary: config.dnsSecondary,
    metric: config.metric,
    defaultRoute: config.defaultRoute,
    ssid: config.ssid,
    password: config.password,
    encryption: config.encryption,
    apn: config.apn,
    username: config.username,
    apnPassword: config.password,
  }
}

function hasWiredConfigChanged(current: INetworkInterfaceConfig, loaded?: Ct16NetworkIfaceDto): boolean {
  if (!loaded) return true
  const next = configToDto(current)
  return next.enabled !== loaded.enabled
    || next.addressMode !== loaded.addressMode
    || next.ipAddress !== loaded.ipAddress
    || next.subnetMask !== loaded.subnetMask
    || next.gateway !== loaded.gateway
    || next.dnsPrimary !== loaded.dnsPrimary
    || next.dnsSecondary !== loaded.dnsSecondary
    || next.metric !== loaded.metric
    || next.defaultRoute !== loaded.defaultRoute
}

function wasOnlyWiredInterfaceEnabled(current: INetworkInterfaceConfig, loaded?: Ct16NetworkIfaceDto): boolean {
  if (!loaded || loaded.enabled || !current.enabled) return false
  const next = configToDto(current)
  return next.addressMode === loaded.addressMode
    && next.ipAddress === loaded.ipAddress
    && next.subnetMask === loaded.subnetMask
    && next.gateway === loaded.gateway
    && next.dnsPrimary === loaded.dnsPrimary
    && next.dnsSecondary === loaded.dnsSecondary
    && next.metric === loaded.metric
    && next.defaultRoute === loaded.defaultRoute
}

function hasWirelessCredentialsChanged(current: INetworkInterfaceConfig, loaded: INetworkInterfaceConfig | null): boolean {
  if (!loaded || current.id !== loaded.id) return false
  if (current.id === 'wifi') {
    return current.ssid !== loaded.ssid || current.password !== loaded.password
  }
  return current.username !== loaded.username || current.password !== loaded.password
}

function hasWirelessConfigChanged(current: INetworkInterfaceConfig, loaded: INetworkInterfaceConfig | null): boolean {
  if (!loaded || current.id !== loaded.id) return true
  if (current.enabled !== loaded.enabled
    || current.dnsPrimary !== loaded.dnsPrimary
    || current.dnsSecondary !== loaded.dnsSecondary
    || current.metric !== loaded.metric
    || current.defaultRoute !== loaded.defaultRoute) return true
  if (current.id === 'wifi') {
    return current.ssid !== loaded.ssid
      || current.password !== loaded.password
      || current.encryption !== loaded.encryption
  }
  return current.apn !== loaded.apn
    || current.username !== loaded.username
    || current.password !== loaded.password
}

export default function NetworkSettingsPage() {
  const [wired, setWired] = useState<INetworkInterfaceSettings>(MOCK_NETWORK_INTERFACE_SETTINGS)
  const [modules, setModules] = useState<Ct16WirelessModulesDto>({ slot1: '4g', slot2: 'ble' })
  const [wirelessConfig, setWirelessConfig] = useState<INetworkInterfaceConfig | null>(null)
  const [loadedEthernetMode, setLoadedEthernetMode] = useState<NetworkWorkMode>('independent')
  const loadedWiredInterfaces = useRef<Partial<Record<NetworkInterfaceId, Ct16NetworkIfaceDto>>>({})
  const loadedWirelessConfig = useRef<INetworkInterfaceConfig | null>(null)
  const resetPollingController = useRef<AbortController | null>(null)
  const resetInProgress = useRef(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [showWirelessRebootDialog, setShowWirelessRebootDialog] = useState(false)
  const [wiredError, setWiredError] = useState<string | null>(null)
  const [wirelessError, setWirelessError] = useState<string | null>(null)

  const loadWired = useCallback(async () => {
    const dto = await getNetworkSettings()
    const settings = dtoToSettings(dto)
    const ethernetMode = (settings.ethernetMode || 'independent') as NetworkWorkMode
    const interfaces = { ...MOCK_NETWORK_INTERFACE_SETTINGS.interfaces, ...settings.interfaces }
    setWired({
      ethernetMode,
      interfaces,
    })
    loadedWiredInterfaces.current = {
      eth0: configToDto(interfaces.eth0),
      eth1: configToDto(interfaces.eth1),
      bridge: configToDto(interfaces.bridge),
    }
    setLoadedEthernetMode(ethernetMode)
  }, [])

  const loadWireless = useCallback(async () => {
    const nextModules = await getWirelessModules()
    setModules(nextModules)
    const iface = await getWirelessInterface(nextModules.slot1)
    const config = dtoToConfig(iface)
    loadedWirelessConfig.current = config
    setWirelessConfig(config)
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [wiredResult, wirelessResult] = await Promise.allSettled([loadWired(), loadWireless()])
    setWiredError(wiredResult.status === 'rejected' ? (wiredResult.reason instanceof Error ? wiredResult.reason.message : '加载有线网络配置失败') : null)
    setWirelessError(wirelessResult.status === 'rejected' ? (wirelessResult.reason instanceof Error ? wirelessResult.reason.message : '加载无线网络配置失败') : null)
    setLoading(false)
  }, [loadWired, loadWireless])

  useEffect(() => {
    loadAll()
    return () => {
      resetPollingController.current?.abort()
      resetPollingController.current = null
      resetInProgress.current = false
    }
  }, [loadAll])

  const waitForDefaultConfig = useCallback(async (signal: AbortSignal): Promise<DefaultConfigSnapshot | null> => {
    const deadline = Date.now() + defaultConfigWaitTimeoutMs
    const requestOptions: RequestInit = { signal, cache: 'no-store' }

    while (!signal.aborted) {
      try {
        const networkSettings = await getNetworkSettings(requestOptions)
        if (signal.aborted) return null

        const wiredReady = ['eth0', 'eth1', 'bridge'].every((id) => Boolean(networkSettings.interfaces[id]))
        if (wiredReady) {
          try {
            const nextModules = await getWirelessModules(requestOptions)
            const wirelessSettings = await getWirelessInterface(nextModules.slot1, requestOptions)
            if (!signal.aborted && wirelessSettings.id === nextModules.slot1) {
              return { networkSettings, modules: nextModules, wirelessSettings }
            }
          } catch {
            // 无线模块未接入时不会生成对应配置，不能阻塞有线默认配置恢复。
          }
          return { networkSettings }
        }
      } catch {
        // 有线默认配置尚未生成完成时继续等待，不展示接口或脚本错误。
      }

      const remainingMs = deadline - Date.now()
      if (remainingMs <= 0) return null
      if (!await waitForDefaultConfigPoll(Math.min(defaultConfigPollIntervalMs, remainingMs), signal)) return null
    }

    return null
  }, [])

  const applyDefaultConfigSnapshot = useCallback((snapshot: DefaultConfigSnapshot) => {
    const settings = dtoToSettings(snapshot.networkSettings)
    const ethernetMode = (settings.ethernetMode || 'independent') as NetworkWorkMode
    const interfaces = { ...MOCK_NETWORK_INTERFACE_SETTINGS.interfaces, ...settings.interfaces }

    setWired({ ethernetMode, interfaces })
    loadedWiredInterfaces.current = {
      eth0: configToDto(interfaces.eth0),
      eth1: configToDto(interfaces.eth1),
      bridge: configToDto(interfaces.bridge),
    }
    setLoadedEthernetMode(ethernetMode)
    if (snapshot.modules && snapshot.wirelessSettings) {
      const config = dtoToConfig(snapshot.wirelessSettings)
      setModules(snapshot.modules)
      loadedWirelessConfig.current = config
      setWirelessConfig(config)
    } else {
      loadedWirelessConfig.current = null
      setWirelessConfig(null)
    }
    setWiredError(null)
    setWirelessError(null)
  }, [])

  const updateWired = (id: NetworkInterfaceId, patch: Partial<INetworkInterfaceConfig>) => {
    setWired((current) => ({ ...current, interfaces: { ...current.interfaces, [id]: { ...current.interfaces[id], ...patch } } }))
  }

  const updateWireless = (patch: Partial<INetworkInterfaceConfig>) => {
    setWirelessConfig((current) => current ? { ...current, ...patch } : current)
  }

  const saveModules = async () => {
    setSaving(true)
    try {
      await updateWirelessModules(modules)
      await loadWireless()
      toast.success('无线扩展槽配置已保存')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存无线扩展槽失败')
    } finally {
      setSaving(false)
    }
  }

  const saveWired = async () => {
    setSaving(true)
    try {
      const active = wired.ethernetMode === 'bridge' ? ['bridge'] : ['eth0', 'eth1']
      const modeChanged = wired.ethernetMode !== loadedEthernetMode
      const changedIfaces = modeChanged
        ? active
        : active.filter((id) => hasWiredConfigChanged(wired.interfaces[id as NetworkInterfaceId], loadedWiredInterfaces.current[id as NetworkInterfaceId]))
      const startIfaces = modeChanged
        ? []
        : changedIfaces.filter((id) => wasOnlyWiredInterfaceEnabled(wired.interfaces[id as NetworkInterfaceId], loadedWiredInterfaces.current[id as NetworkInterfaceId]))
      if (!modeChanged && changedIfaces.length === 0) {
        toast.info('有线网络配置未发生变化')
        return
      }
      const interfaces: Record<string, Ct16NetworkIfaceDto> = {}
      for (const id of changedIfaces) interfaces[id] = configToDto(wired.interfaces[id as NetworkInterfaceId])
      await updateNetworkSettings({ ethernetMode: wired.ethernetMode, interfaces })
      await applyNetworkSettings({ changedIfaces, startIfaces, modeChanged })
      await loadWired()
      toast.success('有线网络配置已应用')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '应用有线网络配置失败')
    } finally {
      setSaving(false)
    }
  }

  const resetAll = async () => {
    if (resetInProgress.current) return

    const controller = new AbortController()
    resetPollingController.current = controller
    resetInProgress.current = true
    setSaving(true)
    try {
      try {
        await resetNetworkSettings({ signal: controller.signal })
      } catch {
        // 重置脚本可能在配置文件生成后返回失败，配置是否就绪由后续轮询决定。
      }

      if (controller.signal.aborted) return
      const snapshot = await waitForDefaultConfig(controller.signal)
      if (controller.signal.aborted) return
      if (!snapshot) {
        toast.error('默认网络配置生成超时，请稍后重试')
        return
      }

      applyDefaultConfigSnapshot(snapshot)
      toast.success('已恢复默认配置')
    } finally {
      if (resetPollingController.current === controller) {
        resetPollingController.current = null
        resetInProgress.current = false
        setSaving(false)
      }
    }
  }

  const saveWireless = async () => {
    if (!wirelessConfig) return
    if (!hasWirelessConfigChanged(wirelessConfig, loadedWirelessConfig.current)) {
      toast.info('无线网络配置未发生变化')
      return
    }
    const credentialsChanged = hasWirelessCredentialsChanged(wirelessConfig, loadedWirelessConfig.current)
    setSaving(true)
    try {
      await withWirelessRequestTimeout((signal) => updateWirelessInterface(modules.slot1, { ...configToDto(wirelessConfig), addressMode: 'auto' }, signal))
      await withWirelessRequestTimeout((signal) => applyWirelessSettings(signal))
      // Do not re-read the interface here. A WiFi reload can change DHCP/routes;
      // the page only waits for network.sh to exit, not for connectivity to settle.
      loadedWirelessConfig.current = { ...wirelessConfig }
      if (credentialsChanged) setShowWirelessRebootDialog(true)
      else toast.success('无线网络配置已应用')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '应用无线网络配置失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 animate-spin" />正在加载网络配置...</div>
  const wiredVisible = wired.ethernetMode === 'bridge' ? ['bridge'] : ['eth0', 'eth1']
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-lg font-semibold">网络设置</h1><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)} disabled={saving}><RotateCcw className="mr-1 size-3.5" />恢复默认设置</Button></div></div>

      <Card className="border-border/40 bg-card/60">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bluetooth className="size-4 text-primary" />无线扩展槽设置</CardTitle><CardDescription>选择实际安装的 4G/WiFi 与蓝牙/星闪模块</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          {wirelessError ? <SectionLoadError message={wirelessError} onRetry={loadAll} disabled={saving} /> : <><div className="w-full space-y-1.5"><Label>4G/WiFi 模块槽位</Label><Select value={modules.slot1} onValueChange={(slot1) => setModules((current) => ({ ...current, slot1: slot1 as 'wifi' | '4g' }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="4g">4G 模块</SelectItem><SelectItem value="wifi">WiFi 模块</SelectItem></SelectContent></Select></div>
          <div className="w-full space-y-1.5"><Label>蓝牙/星闪模块槽位</Label><Select value={modules.slot2} onValueChange={(slot2) => setModules((current) => ({ ...current, slot2: slot2 as 'ble' | 'sle' }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ble">蓝牙模块</SelectItem><SelectItem value="sle">星闪模块</SelectItem></SelectContent></Select></div>
          <Button onClick={saveModules} disabled={saving}><Save className="mr-1 size-4" />设置</Button></>}
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/60">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Link2 className="size-4 text-primary" />有线网卡设置</CardTitle><CardDescription>ETH0、ETH1 与网桥由 dhcpcd 管理</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {wiredError ? <SectionLoadError message={wiredError} onRetry={loadAll} disabled={saving} /> : <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[{ value: 'independent', title: '独立网卡模式', desc: 'ETH0 与 ETH1 独立配置' }, { value: 'bridge', title: '网桥模式', desc: '两路网口使用 BR0' }].map((mode) => <button key={mode.value} type="button" onClick={() => setWired((current) => ({ ...current, ethernetMode: mode.value as NetworkWorkMode }))} className={`rounded-md border p-4 text-left ${wired.ethernetMode === mode.value ? 'border-primary bg-primary/10' : 'border-border/40'}`}><div className="text-sm font-semibold">{mode.title}</div><div className="mt-1 text-xs text-muted-foreground">{mode.desc}</div></button>)}
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{wiredVisible.map((id) => <NetworkInterfaceCard key={id} config={wired.interfaces[id as NetworkInterfaceId]} onChange={(patch) => updateWired(id as NetworkInterfaceId, patch)} />)}</div>
          <div className="flex justify-end"><Button onClick={saveWired} disabled={saving}><Play className="mr-1 size-4" />应用配置</Button></div>
          </>}
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/60">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wifi className="size-4 text-primary" />无线网卡设置</CardTitle><CardDescription>{modules.slot1 === 'wifi' ? 'WiFi 地址由系统 WiFi 服务自动获取' : '4G 地址由底层拨号服务自动获取'}</CardDescription></CardHeader>
        <CardContent>{wirelessError ? <SectionLoadError message={wirelessError} onRetry={loadAll} disabled={saving} /> : wirelessConfig && <WirelessInterfaceForm config={wirelessConfig} onChange={updateWireless} onApply={saveWireless} saving={saving} />}</CardContent>
      </Card>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>恢复默认网络配置？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作会清除当前有线和无线网络配置，并重新生成默认配置。已保存的网络参数将无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={resetAll} disabled={saving}>确认恢复</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showWirelessRebootDialog} onOpenChange={setShowWirelessRebootDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>无线凭据已保存</AlertDialogTitle>
            <AlertDialogDescription>
              WiFi/4G 的用户名或密码修改将在重启设备后生效。配置已保存到设备的持久化存储中。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>我知道了</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SectionLoadError({ message, onRetry, disabled }: { message: string; onRetry: () => void; disabled: boolean }) {
  return <div className="flex w-full items-center justify-between gap-3 text-sm text-destructive"><span className="flex items-center gap-2"><AlertCircle className="size-4" />{message}</span><Button variant="outline" size="sm" onClick={onRetry} disabled={disabled}><RotateCcw className="mr-1 size-3.5" />重试</Button></div>
}

function WirelessInterfaceForm({ config, onChange, onApply, saving }: { config: INetworkInterfaceConfig; onChange: (patch: Partial<INetworkInterfaceConfig>) => void; onApply: () => void; saving: boolean }) {
  const wifi = config.id === 'wifi'
  const isDisabled = !config.enabled
  const runtimeGateway = config.runtimeGateway || ''
  const gatewayDns = config.defaultRoute ? runtimeGateway : ''
  return <div className="space-y-4">
    <div className="flex items-center justify-between"><div><div className="text-sm font-semibold">{config.name}</div><div className="text-xs text-muted-foreground">地址方式：自动获取</div></div><ToggleIconButton checked={config.enabled} onClick={() => onChange({ enabled: !config.enabled })} /></div>
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 ${isDisabled ? 'opacity-55' : ''}`}>
      <Field label="当前 IP 地址" value={config.runtimeIpAddress || '等待 DHCP'} disabled />
      <Field label="当前网关" value={runtimeGateway || '等待 DHCP'} disabled />
      {wifi ? <><Field label="SSID" value={config.ssid || ''} onChange={(ssid) => onChange({ ssid })} disabled={isDisabled} /><Field label="密码" type="password" value={config.password || ''} onChange={(password) => onChange({ password })} disabled={isDisabled} /><Field label="加密方式" value={config.encryption || ''} onChange={(encryption) => onChange({ encryption })} disabled={isDisabled} /></> : <><Field label="APN" value={config.apn || ''} onChange={(apn) => onChange({ apn })} disabled={isDisabled} /><Field label="用户名" value={config.username || ''} onChange={(username) => onChange({ username })} disabled={isDisabled} /><Field label="密码" type="password" value={config.password || ''} onChange={(password) => onChange({ password })} disabled={isDisabled} /></>}
      <Field label="首选 DNS" value={gatewayDns || config.dnsPrimary} disabled />
      <Field label="备用 DNS" value={config.dnsPrimary} onChange={(dnsPrimary) => onChange({ dnsPrimary })} disabled={isDisabled} />
      <Field label="路由优先级" value={config.metric} onChange={(metric) => onChange({ metric })} disabled={isDisabled} />
      <label className="flex items-end gap-2 pb-2 text-sm"><ToggleIconButton checked={config.defaultRoute && !isDisabled} onClick={() => !isDisabled && onChange({ defaultRoute: !config.defaultRoute })} />设为默认路由</label>
    </div>
    <div className="flex justify-end"><Button onClick={onApply} disabled={saving}><Play className="mr-1 size-4" />应用配置</Button></div>
  </div>
}

function Field({ label, value, onChange, type = 'text', disabled = false }: { label: string; value: string; onChange?: (value: string) => void; type?: string; disabled?: boolean }) {
  return <div className="space-y-1.5"><Label>{label}</Label><Input type={type} value={value} onChange={(event) => onChange?.(event.target.value)} disabled={disabled} /></div>
}
