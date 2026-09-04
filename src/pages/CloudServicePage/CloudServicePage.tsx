import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CloudCog,
  CircleCheck,
  CircleDashed,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  MessagesSquare,
  Package,
  Pencil,
  Plus,
  RadioTower,
  RefreshCw,
  Server,
  Save,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  createCloudConnection,
  deleteCloudConnection,
  deleteCloudPlugin,
  getCloudConnection,
  listCloudConnections,
  listCloudPlugins,
  listCloudProviders,
  reconnectCloudConnection,
  setCloudConnectionEnabled,
  uploadCloudPlugin,
  updateCloudConnection,
  type CloudConnection,
  type CloudConnectionMutation,
  type CloudConnectionState,
  type CloudConnectionSummary,
  type CloudEndpointConfig,
  type CloudEndpointUpdate,
  type CloudMQTTConfigUpdate,
  type CloudProvider,
  type CloudProviderDescriptor,
  type CloudZaiohConfigUpdate,
  type ZaiohAuthType,
  type ZaiohPlatformType,
} from '@/api/cloud'
import { getSystemOverview } from '@/api/overview'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import MqttTrafficPanel from './MqttTrafficPanel'

const POLL_INTERVAL_MS = 3000
const ERROR_CONFIRMATION_COUNT = 3
const ZAIOH_CA_FILE = '/etc/zaioh-ca-bundle.pem'
const INVALID_SERIAL_NUMBERS = new Set(['NULL', 'UNKNOWN', '未接入', '未烧录'])

interface EndpointForm {
  host: string
  port: string
  username: string
  password: string
  clearPassword: boolean
  passwordConfigured: boolean
}

interface ConnectionForm {
  id: string
  name: string
  provider: CloudProvider
  enabled: boolean
  clientId: string
  topicPrefix: string
  qos: '0' | '1' | '2'
  authType: ZaiohAuthType
  platformType: ZaiohPlatformType
  profileId: string
  productKey: string
  deviceName: string
  primaryRequestUrl: string
  backupRequestUrl: string
  secret: string
  clearSecret: boolean
  secretConfigured: boolean
  keepaliveSec: string
  reportIntervalSec: string
  primary: EndpointForm
  backup: EndpointForm
  tlsEnabled: boolean
  genericConfig: string
}

const emptyEndpoint = (): EndpointForm => ({
  host: '',
  port: '1883',
  username: '',
  password: '',
  clearPassword: false,
  passwordConfigured: false,
})

const emptyForm = (): ConnectionForm => ({
  id: '',
  name: '',
  provider: 'zaioh',
  enabled: true,
  clientId: '',
  topicPrefix: 'openvalley',
  qos: '1',
  authType: 'machine',
  platformType: 'cloud',
  profileId: 'zaioh-default',
  productKey: '',
  deviceName: '',
  primaryRequestUrl: '',
  backupRequestUrl: '',
  secret: '',
  clearSecret: false,
  secretConfigured: false,
  keepaliveSec: '60',
  reportIntervalSec: '30',
  primary: emptyEndpoint(),
  backup: emptyEndpoint(),
  tlsEnabled: true,
  genericConfig: '{}',
})

function usableSerialNumber(value: string | undefined): string {
  const serialNumber = value?.trim() ?? ''
  const normalized = serialNumber.toUpperCase()
  return serialNumber && normalized.includes('KH') && !INVALID_SERIAL_NUMBERS.has(normalized) ? serialNumber : ''
}

async function getControllerSerialNumber(): Promise<string> {
  try {
    const overview = await getSystemOverview()
    return usableSerialNumber(overview.device.serialNumber)
  } catch {
    return ''
  }
}

const STATUS_META: Record<CloudConnectionState, { label: string; className: string }> = {
  disabled: { label: '已停用', className: 'text-muted-foreground' },
  connecting: { label: '正在连接', className: 'text-warning' },
  connected: { label: '已连接', className: 'text-success' },
  error: { label: '连接异常', className: 'text-destructive' },
}

function parseInteger(value: string, label: string, minimum: number, maximum: number): number {
  if (!/^\d+$/.test(value)) throw new Error(`${label}必须为整数`)
  const parsed = Number(value)
  if (parsed < minimum || parsed > maximum) throw new Error(`${label}必须在 ${minimum} 至 ${maximum} 之间`)
  return parsed
}

function endpointForm(config: CloudEndpointConfig): EndpointForm {
  return {
    host: config.host,
    port: String(config.port || 1883),
    username: config.username,
    password: config.password || '',
    clearPassword: false,
    passwordConfigured: config.passwordConfigured,
  }
}

function formFromConnection(connection: CloudConnection, defaultDeviceName = ''): ConnectionForm {
  const config = connection.config as any
  const base = emptyForm()
  base.id = connection.id
  base.name = connection.name
  base.provider = connection.provider
  base.enabled = config.enabled ?? true
  base.keepaliveSec = String(config.keepaliveSec ?? 60)
  base.reportIntervalSec = String(config.reportIntervalSec ?? 30)
  base.primary = endpointForm(config.primary ?? emptyEndpoint())
  base.backup = endpointForm(config.backup ?? emptyEndpoint())
  base.tlsEnabled = config.tls?.enabled ?? false
  if (connection.provider === 'zaioh') {
    base.authType = config.authType
    base.platformType = config.platformType
    base.profileId = config.profileId
    base.productKey = config.productKey
    base.deviceName = config.deviceName || defaultDeviceName
    base.secret = config.secret || ''
    base.primaryRequestUrl = config.primaryRequestUrl
    base.backupRequestUrl = config.backupRequestUrl
    base.secretConfigured = config.secretConfigured
  } else if (connection.provider === 'standard_mqtt' || connection.provider === 'ct1x-mqtt') {
    base.clientId = config.clientId
    base.topicPrefix = config.topicPrefix
    base.qos = String(config.qos) as ConnectionForm['qos']
  } else {
    base.genericConfig = JSON.stringify(config, null, 2)
  }
  return base
}

function endpointPayload(form: EndpointForm, includePassword: boolean): CloudEndpointUpdate {
  const endpoint: CloudEndpointUpdate = {
    host: form.host.trim(),
    port: parseInteger(form.port || '1883', '服务器端口', 1, 65535),
    username: form.username,
  }
  if (includePassword) {
    if (form.clearPassword) endpoint.password = null
    else if (form.password) endpoint.password = form.password
  }
  return endpoint
}

function mutationFromForm(form: ConnectionForm): CloudConnectionMutation {
  const keepaliveSec = parseInteger(form.keepaliveSec, 'Keep Alive', 10, 3600)
  const reportIntervalSec = parseInteger(form.reportIntervalSec, '上报周期', 5, 3600)
  if (!form.name.trim()) throw new Error('请输入平台名称')
  if (form.provider === 'standard_mqtt' || form.provider === 'ct1x-mqtt') {
    const config: CloudMQTTConfigUpdate = {
      enabled: form.enabled,
      cloudType: form.provider,
      clientId: form.clientId.trim(),
      topicPrefix: form.topicPrefix.trim(),
      keepaliveSec,
      qos: Number(form.qos) as 0 | 1 | 2,
      reportIntervalSec,
      primary: endpointPayload(form.primary, true),
      backup: endpointPayload(form.backup, true),
      tls: { enabled: form.tlsEnabled },
    }
    return { name: form.name.trim(), provider: form.provider, config }
  }
  if (form.provider !== 'zaioh') {
    let config: Record<string, unknown>
    try {
      const parsed: unknown = JSON.parse(form.genericConfig)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
      config = parsed as Record<string, unknown>
    } catch {
      throw new Error('插件配置必须为 JSON 对象')
    }
    return { name: form.name.trim(), provider: form.provider, config }
  }
  const config: CloudZaiohConfigUpdate = {
    enabled: form.enabled,
    authType: form.authType,
    platformType: form.platformType,
    profileId: form.profileId.trim(),
    keepaliveSec,
    reportIntervalSec,
    primary: endpointPayload(form.primary, false),
    backup: endpointPayload(form.backup, false),
    primaryRequestUrl: form.primaryRequestUrl.trim(),
    backupRequestUrl: form.backupRequestUrl.trim(),
    productKey: form.productKey.trim(),
    deviceName: form.deviceName.trim(),
    tls: { enabled: form.tlsEnabled, caFile: ZAIOH_CA_FILE },
  }
  if (form.clearSecret) config.secret = null
  else if (form.secret) config.secret = form.secret
  return { name: form.name.trim(), provider: form.provider, config }
}

function providerLabel(provider: CloudProvider): string {
  if (provider === 'zaioh') return '在鸿云'
  if (provider === 'standard_mqtt') return '标准 MQTT'
  if (provider === 'ct1x-mqtt') return 'CT1x 标准 MQTT'
  return provider
}

function schemaPropertyNames(value: unknown, names = new Set<string>()): Set<string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return names
  const object = value as Record<string, unknown>
  const properties = object.properties
  if (properties && typeof properties === 'object' && !Array.isArray(properties)) {
    for (const [name, definition] of Object.entries(properties as Record<string, unknown>)) {
      names.add(name.toLowerCase())
      schemaPropertyNames(definition, names)
    }
  }
  const definitions = object.$defs
  if (definitions && typeof definitions === 'object' && !Array.isArray(definitions)) {
    for (const definition of Object.values(definitions as Record<string, unknown>)) schemaPropertyNames(definition, names)
  }
  return names
}

function authLabel(connection: CloudConnectionSummary, providers: CloudProviderDescriptor[]): string {
  if (connection.provider === 'zaioh') return '在鸿认证'
  if (connection.provider === 'standard_mqtt') return '账号 / Token'
  const provider = providers.find((item) => item.id === connection.provider)
  const names = schemaPropertyNames(provider?.schema)
  const schemaTitle = typeof provider?.schema?.title === 'string' ? provider.schema.title : ''
  const hasAccount = ['username', 'account', 'user'].some((name) => names.has(name))
  const hasSecret = ['password', 'secret', 'token', 'apikey', 'api_key', 'privatekey', 'private_key', 'certificate'].some((name) => names.has(name))
  if (names.has('authtype')) return '认证方式'
  if (hasAccount && hasSecret) return '账号 / 密钥'
  if (hasSecret) return '密钥认证'
  if (hasAccount) return '账号认证'
  if (names.has('topicprefix') || /\bmqtt\b/i.test(schemaTitle)) return '账号 / Token'
  return '--'
}

function configurableProvider(provider: CloudProvider): boolean {
  return provider.trim().length > 0
}

function formatLastConnectedAt(timestampMs: number): string {
  if (!timestampMs) return '--'
  const date = new Date(timestampMs)
  if (Number.isNaN(date.getTime())) return '--'
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '--'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
}

function pluginStateLabel(plugin: CloudProviderDescriptor): string {
  return plugin.available ? '已加载' : (plugin.reason || '不可用')
}

function ConnectionBadge({ state }: { state: CloudConnectionState }) {
  const meta = STATUS_META[state]
  return (
    <Badge variant="outline" className={`gap-1.5 border-current/20 bg-current/5 font-normal ${meta.className}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {meta.label}
    </Badge>
  )
}

function displayConnectionState(connection: CloudConnectionSummary): CloudConnectionState {
  return connection.enabled ? connection.state : 'disabled'
}

function KpiCard({ label, value, detail, icon, valueClassName = '' }: {
  label: string
  value: string
  detail: string
  icon: React.ReactNode
  valueClassName?: string
}) {
  return (
    <div className="group relative min-h-[116px] overflow-hidden rounded-[8px] border border-border/80 bg-card px-5 py-4 shadow-sm transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">{icon}</span>
      </div>
      <div className={`mt-3 font-mono text-2xl font-semibold tracking-tight ${valueClassName}`}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  )
}

function SecretField({ label, value, configured, clear, required, resetKey, onValue, onClear }: {
  label: string
  value: string
  configured: boolean
  clear: boolean
  required?: boolean
  resetKey?: string
  onValue: (value: string) => void
  onClear: (value: boolean) => void
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setVisible(false)
  }, [resetKey])

  return (
    <div className="space-y-1.5">
      <div className="flex min-h-5 items-center justify-between gap-2">
        <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
        {configured && (
          <button type="button" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => onClear(!clear)}>
            {clear ? '取消清除' : '清除已保存密钥'}
          </button>
        )}
      </div>
      <div className="relative">
        <Input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onValue(event.target.value)}
          placeholder={clear ? '保存后清除' : configured ? '***' : '请输入密码'}
          disabled={clear}
          autoComplete="new-password"
          className="pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 z-10 size-9"
          onClick={() => setVisible((current) => !current)}
          disabled={clear}
          aria-label={visible ? '隐藏密钥' : '显示密钥'}
          aria-pressed={visible}
          title={visible ? '隐藏密钥' : '显示密钥'}
        >
          {visible ? <EyeOff /> : <Eye />}
        </Button>
      </div>
    </div>
  )
}

function EndpointFields({ title, value, required, password, compact = false, secretVisibilityKey, onChange }: {
  title: string
  value: EndpointForm
  required: boolean
  password: boolean
  compact?: boolean
  secretVisibilityKey?: string
  onChange: (value: EndpointForm) => void
}) {
  return (
    <div className="space-y-3 border-t border-border/70 pt-4 first:border-t-0 first:pt-0">
      <div className="text-sm font-medium">{title}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={`space-y-1.5 ${compact ? '' : 'sm:col-span-2'}`}>
          <Label>服务器地址{required && <span className="text-destructive"> *</span>}</Label>
          <Input value={value.host} onChange={(event) => onChange({ ...value, host: event.target.value })} placeholder={required ? 'broker.example.com' : '可选'} autoComplete="off" />
        </div>
        <div className="space-y-1.5"><Label>端口</Label><Input type="number" min={1} max={65535} value={value.port} onChange={(event) => onChange({ ...value, port: event.target.value })} /></div>
        <div className="space-y-1.5"><Label>用户名</Label><Input value={value.username} onChange={(event) => onChange({ ...value, username: event.target.value })} autoComplete="off" /></div>
        {password && (
          <div className={compact ? '' : 'sm:col-span-2'}>
            <SecretField
              label="密码"
              value={value.password}
              configured={value.passwordConfigured}
              clear={value.clearPassword}
              resetKey={secretVisibilityKey}
              onValue={(next) => onChange({ ...value, password: next, clearPassword: false })}
              onClear={(next) => onChange({ ...value, clearPassword: next, password: '' })}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function OptionalEndpointFields({ value, password, compact = false, secretVisibilityKey, open, onOpenChange, onChange }: {
  value: EndpointForm
  password: boolean
  compact?: boolean
  secretVisibilityKey?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onChange: (value: EndpointForm) => void
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="border-t border-border/70 pt-3">
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-8 px-0 text-muted-foreground hover:text-foreground">
          <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          备用服务器（可选）
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1">
        <EndpointFields
          title="备用服务器"
          value={value}
          required={false}
          password={password}
          compact={compact}
          secretVisibilityKey={secretVisibilityKey}
          onChange={onChange}
        />
      </CollapsibleContent>
    </Collapsible>
  )
}

function hasEndpointConfiguration(endpoint: EndpointForm): boolean {
  return Boolean(endpoint.host.trim() || endpoint.username.trim() || endpoint.password.trim() || endpoint.passwordConfigured)
}

export default function CloudServicePage() {
  const [connections, setConnections] = useState<CloudConnectionSummary[]>([])
  const [providers, setProviders] = useState<CloudProviderDescriptor[]>([])
  const [plugins, setPlugins] = useState<CloudProviderDescriptor[]>([])
  const [maxCount, setMaxCount] = useState(8)
  const [form, setForm] = useState<ConnectionForm>(emptyForm)
  const [controllerSerialNumber, setControllerSerialNumber] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [pluginLoadError, setPluginLoadError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [backupEndpointOpen, setBackupEndpointOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<CloudConnectionSummary | null>(null)
  const [pluginDeleteTarget, setPluginDeleteTarget] = useState<CloudProviderDescriptor | null>(null)
  const [pluginAction, setPluginAction] = useState('')
  const [activeTab, setActiveTab] = useState<'platforms' | 'plugins' | 'records'>('platforms')
  const [recordConnectionId, setRecordConnectionId] = useState('')
  const pollingRef = useRef(false)
  const dialogOpenRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const errorStreaksRef = useRef(new Map<string, number>())

  useEffect(() => { dialogOpenRef.current = dialogOpen }, [dialogOpen])

  useEffect(() => {
    let active = true
    void getControllerSerialNumber()
      .then((serialNumber) => {
        if (active && serialNumber) setControllerSerialNumber(serialNumber)
      })
    return () => {
      active = false
    }
  }, [])

  const loadPlugins = useCallback(async () => {
    try {
      const items = await listCloudPlugins()
      setPlugins(items)
      setProviders(items)
      setPluginLoadError('')
    } catch (error) {
      setPluginLoadError(error instanceof Error ? error.message : '插件列表读取失败')
    }
  }, [])

  useEffect(() => {
    void loadPlugins()
  }, [loadPlugins])

  useEffect(() => {
    const controller = new AbortController()
    void listCloudProviders({ signal: controller.signal })
      .then((items) => setProviders(items))
      .catch((error) => {
        if (!controller.signal.aborted) toast.error(error instanceof Error ? error.message : '云平台插件读取失败')
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!controllerSerialNumber || !dialogOpen) return
    setForm((current) => {
      const shouldSetDeviceName = !current.deviceName.trim()
      const shouldSetClientId = (current.provider === 'standard_mqtt' || current.provider === 'ct1x-mqtt') && !current.clientId.trim()
      if (!shouldSetDeviceName && !shouldSetClientId) return current
      return {
        ...current,
        deviceName: shouldSetDeviceName ? controllerSerialNumber : current.deviceName,
        clientId: shouldSetClientId ? controllerSerialNumber : current.clientId,
      }
    })
  }, [controllerSerialNumber, dialogMode, dialogOpen])

  const loadConnections = useCallback(async (signal?: AbortSignal) => {
    if (pollingRef.current || document.visibilityState === 'hidden') return
    pollingRef.current = true
    try {
      const response = await listCloudConnections({ signal })
      if (signal?.aborted) return
      const confirmedConnections = response.connections.map((connection) => {
        if (!connection.enabled || connection.state !== 'error') {
          errorStreaksRef.current.delete(connection.id)
          return connection
        }

        const streak = (errorStreaksRef.current.get(connection.id) ?? 0) + 1
        errorStreaksRef.current.set(connection.id, streak)
        if (streak < ERROR_CONFIRMATION_COUNT) {
          return { ...connection, state: 'connecting' as const, lastError: '' }
        }
        return connection
      })
      const activeIds = new Set(response.connections.map((connection) => connection.id))
      for (const id of errorStreaksRef.current.keys()) {
        if (!activeIds.has(id)) errorStreaksRef.current.delete(id)
      }
      setConnections(confirmedConnections)
      setMaxCount(response.maxCount)
      setLoadError('')
      setRecordConnectionId((current) => response.connections.some((item) => item.id === current) ? current : (response.connections[0]?.id ?? ''))
    } catch (error) {
      if (!signal?.aborted) setLoadError(error instanceof Error ? error.message : '云平台连接读取失败')
    } finally {
      pollingRef.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadConnections(controller.signal)
    const timer = window.setInterval(() => { if (!dialogOpenRef.current) void loadConnections(controller.signal) }, POLL_INTERVAL_MS)
    const handleVisibility = () => { if (document.visibilityState === 'visible') void loadConnections(controller.signal) }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      controller.abort()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [loadConnections])

  const selectedRecordConnection = connections.find((item) => item.id === recordConnectionId)
  const onlineCount = connections.filter((item) => item.enabled && item.state === 'connected').length
  const enabledCount = connections.filter((item) => item.enabled).length

  const openCreate = () => {
    setDialogMode('create')
    setBackupEndpointOpen(false)
    const defaultProviderDescriptor = providers.find((item) => item.available && configurableProvider(item.id))
    const defaultProvider = defaultProviderDescriptor?.id ?? 'zaioh'
    const defaultName = defaultProviderDescriptor?.displayName || providerLabel(defaultProvider)
    const defaultClientId = defaultProvider === 'standard_mqtt' || defaultProvider === 'ct1x-mqtt' ? controllerSerialNumber : ''
    setForm({ ...emptyForm(), provider: defaultProvider, name: defaultName, clientId: defaultClientId, deviceName: controllerSerialNumber })
    setDialogOpen(true)
  }

  const openEdit = async (connection: CloudConnectionSummary) => {
    if (!configurableProvider(connection.provider)) {
      toast.error(`当前 Web 版本不支持编辑 ${connection.provider}`)
      return
    }
    setBusyId(connection.id)
    try {
      const detail = await getCloudConnection(connection.id)
      setDialogMode('edit')
      const nextForm = formFromConnection(detail, controllerSerialNumber)
      setForm(nextForm)
      setBackupEndpointOpen(hasEndpointConfiguration(nextForm.backup))
      setDialogOpen(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '平台配置读取失败')
    } finally {
      setBusyId('')
    }
  }

  const saveConnection = async () => {
    setSaving(true)
    try {
      const mutation = mutationFromForm(form)
      if (dialogMode === 'create') await createCloudConnection(mutation)
      else await updateCloudConnection(form.id, mutation)
      setDialogOpen(false)
      toast.success(dialogMode === 'create' ? '已创建平台连接' : '已保存平台配置')
      await loadConnections()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '平台配置保存失败')
    } finally {
      setSaving(false)
    }
  }

  const toggleConnection = async (summary: CloudConnectionSummary, enabled: boolean) => {
    setBusyId(summary.id)
    try {
      await setCloudConnectionEnabled(summary.id, enabled)
      toast.success(enabled ? '已启用平台连接' : '已停用平台连接')
      await loadConnections()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '平台状态更新失败')
    } finally {
      setBusyId('')
    }
  }

  const reconnect = async (connection: CloudConnectionSummary) => {
    if (!connection.enabled) {
      toast.error('请先启用平台连接')
      return
    }
    setBusyId(connection.id)
    errorStreaksRef.current.delete(connection.id)
    try {
      await reconnectCloudConnection(connection.id)
      toast.success('已发起平台重连')
      await loadConnections()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '平台重连失败')
    } finally {
      setBusyId('')
    }
  }

  const removeConnection = async () => {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)
    try {
      await deleteCloudConnection(deleteTarget.id)
      toast.success('平台连接及配置已删除')
      setDeleteTarget(null)
      await loadConnections()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '平台连接删除失败')
    } finally {
      setBusyId('')
    }
  }

  const importPlugin = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.so')) {
      toast.error('仅支持上传 .so 插件文件')
      return
    }
    if (file.size > 32 * 1024 * 1024) {
      toast.error('插件文件不能超过 32 MiB')
      return
    }
    setPluginAction('upload')
    try {
      const items = await uploadCloudPlugin(file)
      setPlugins(items)
      setProviders(items)
      toast.success(`插件 ${file.name} 已导入并加载`)
    } catch (error) {
      toast.error(error instanceof Error ? `导入失败：${error.message}` : '导入失败')
    } finally {
      setPluginAction('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const unloadPlugin = async () => {
    if (!pluginDeleteTarget) return
    const target = pluginDeleteTarget
    if (target.source !== 'extension' || target.activeInstances > 0) return
    setPluginAction(target.id)
    try {
      await deleteCloudPlugin(target.id)
      toast.success(`插件 ${target.displayName || target.id} 已删除`)
      setPluginDeleteTarget(null)
      await loadPlugins()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '插件删除失败')
    } finally {
      setPluginAction('')
    }
  }

  const refreshPlugins = async () => {
    setPluginAction('refresh')
    try {
      await loadPlugins()
    } finally {
      setPluginAction('')
    }
  }

  if (loading) {
    return <div className="w-full space-y-5"><div className="space-y-2"><Skeleton className="h-3 w-36" /><Skeleton className="h-9 w-64" /><Skeleton className="h-4 w-96 max-w-full" /></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-[116px] rounded-[8px]" />)}</div><Skeleton className="h-[340px] w-full rounded-[8px]" /></div>
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">北向平台对接</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">统一配置平台连接、协议插件，并持续查看设备数据上报状态。</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground md:flex">
            {connections.length > 0 && onlineCount === connections.length ? <CircleCheck className="size-3.5 text-success" /> : <CircleDashed className="size-3.5 text-warning" />}
            <span>{onlineCount}/{connections.length} 路在线</span>
          </div>
          <Button onClick={openCreate} disabled={connections.length >= maxCount}><Plus />新增平台</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="平台连接数" value={String(connections.length)} detail={`已配置连接，最多 ${maxCount} 路`} icon={<CloudCog className="size-4" />} />
        <KpiCard label="插件数量" value={String(plugins.length)} detail="已加载协议插件" icon={<Package className="size-4" />} />
        <KpiCard label="在线连接" value={String(onlineCount)} detail="当前已连接" icon={<RadioTower className="size-4" />} valueClassName={onlineCount > 0 ? 'text-success' : ''} />
        <KpiCard label="启用连接" value={String(enabledCount)} detail="当前启用" icon={<ShieldCheck className="size-4" />} valueClassName={enabledCount > 0 ? 'text-success' : ''} />
      </div>

      {loadError && <div className="flex items-start gap-2 rounded-[8px] border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"><TriangleAlert className="mt-0.5 size-4 shrink-0" /><span className="break-all">{loadError}</span></div>}

      <Tabs value={activeTab} onValueChange={(value) => { const nextTab = value as typeof activeTab; setActiveTab(nextTab); if (nextTab === 'plugins') void loadPlugins() }} className="gap-5">
        <TabsList aria-label="北向平台工作区" className="grid h-10 w-full max-w-[680px] grid-cols-3 overflow-x-auto border border-border bg-card p-1">
          <TabsTrigger value="platforms" className="min-w-[96px] gap-1 px-2 text-sm sm:min-w-[120px]"><RadioTower />平台连接</TabsTrigger>
          <TabsTrigger value="records" className="min-w-[96px] gap-1 px-2 text-sm sm:min-w-[120px]"><MessagesSquare />数据记录</TabsTrigger>
          <TabsTrigger value="plugins" className="min-w-[96px] gap-1 px-2 text-sm sm:min-w-[120px]"><Package />插件管理</TabsTrigger>
        </TabsList>

        <TabsContent value="platforms">
          <section className="overflow-hidden rounded-[8px] border border-border/80 bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 px-5 py-4"><div><h2 className="text-base font-semibold">平台连接配置</h2><p className="mt-1 text-xs text-muted-foreground">启用的连接会按设定周期上报设备数据。</p></div><Button variant="outline" size="sm" onClick={() => void loadConnections()} aria-label="刷新连接状态"><RefreshCw className="size-4" />刷新状态</Button></div>
            <div className="overflow-x-auto">
              <Table className="min-w-[960px]">
                <TableHeader><TableRow className="hover:bg-transparent"><TableHead className="w-[24%] px-5">平台</TableHead><TableHead>类型</TableHead><TableHead>认证</TableHead><TableHead>状态</TableHead><TableHead>最后连接</TableHead><TableHead className="w-[190px] text-right">操作</TableHead></TableRow></TableHeader>
                <TableBody>
                  {connections.length === 0 && <TableRow><TableCell colSpan={6} className="px-5 py-14 text-center"><Server className="mx-auto size-8 text-primary/60" /><div className="mt-3 text-sm font-medium">尚未配置北向平台</div><div className="mt-1 text-xs text-muted-foreground">新增平台并配置服务地址后即可开始数据上报。</div></TableCell></TableRow>}
                  {connections.map((connection) => (
                    <TableRow key={connection.id}>
                      <TableCell className="px-5 py-4"><div className="font-medium">{connection.name}</div><div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{connection.id}</div></TableCell>
                      <TableCell><Badge variant="secondary">{providerLabel(connection.provider)}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{authLabel(connection, providers)}</TableCell>
                      <TableCell>
                        <div className="flex min-w-[220px] flex-col items-start gap-1">
                          <ConnectionBadge state={displayConnectionState(connection)} />
                          {connection.enabled && (connection.lastError || connection.state === 'error') && (
                            <span className="max-w-[300px] break-words text-xs leading-4 text-destructive" title={connection.lastError}>
                              {connection.lastError || '连接失败，服务未返回具体原因'}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{formatLastConnectedAt(connection.lastConnectedAtMs)}</TableCell>
                      <TableCell><div className="flex items-center justify-end gap-1.5">
                        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => void reconnect(connection)} disabled={busyId === connection.id} aria-label="重连平台">{busyId === connection.id ? <Loader2 className="animate-spin" /> : <RadioTower />}</Button></TooltipTrigger><TooltipContent>重连</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => void openEdit(connection)} disabled={busyId === connection.id || !configurableProvider(connection.provider)} aria-label="编辑平台"><Pencil /></Button></TooltipTrigger><TooltipContent>编辑</TooltipContent></Tooltip>
                        <Switch checked={connection.enabled} onCheckedChange={(enabled) => void toggleConnection(connection, enabled)} disabled={busyId === connection.id} aria-label={`启用${connection.name}`} className="data-[state=checked]:bg-success" />
                        <Tooltip><TooltipTrigger asChild><span tabIndex={connection.enabled ? 0 : -1}><Button variant="outline" size="icon" onClick={() => setDeleteTarget(connection)} disabled={connection.enabled || busyId === connection.id} aria-label="删除平台"><Trash2 className="text-destructive" /></Button></span></TooltipTrigger><TooltipContent>{connection.enabled ? '请先停用连接' : '删除'}</TooltipContent></Tooltip>
                      </div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="plugins">
          <section className="overflow-hidden rounded-[8px] border border-border/80 bg-card shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-base font-semibold">CloudService 插件</h2><p className="mt-1 text-xs text-muted-foreground">管理协议插件，导入后立即扫描并加载</p></div>
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept=".so,application/octet-stream" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importPlugin(file) }} />
                <Button variant="outline" size="icon" onClick={() => void refreshPlugins()} disabled={pluginAction !== ''} aria-label="刷新插件列表"><RefreshCw className={pluginAction === 'refresh' ? 'animate-spin' : ''} /></Button>
                <Button onClick={() => fileInputRef.current?.click()} disabled={pluginAction !== ''}>{pluginAction === 'upload' ? <Loader2 className="animate-spin" /> : <Upload />}{pluginAction === 'upload' ? '正在导入' : '导入插件'}</Button>
              </div>
            </div>
            {pluginLoadError && <div className="mx-5 mt-4 flex items-start gap-2 rounded-[8px] border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"><TriangleAlert className="mt-0.5 size-4 shrink-0" /><span className="break-all">{pluginLoadError}</span></div>}
            <div className="overflow-x-auto">
              <Table className="min-w-[820px]">
                <TableHeader><TableRow className="hover:bg-transparent"><TableHead className="w-[28%] px-5">插件</TableHead><TableHead>来源</TableHead><TableHead>状态</TableHead><TableHead>文件信息</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                <TableBody>
                  {plugins.length === 0 && <TableRow><TableCell colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">暂无插件</TableCell></TableRow>}
                  {plugins.map((plugin) => {
                    const builtIn = plugin.source === 'builtin'
                    const extension = plugin.source === 'extension'
                    const inUse = plugin.activeInstances > 0
                    const canDelete = extension && !inUse
                    const sourceLabel = builtIn ? '内置' : extension ? '扩展' : plugin.source || '未知'
                    return <TableRow key={plugin.id}>
                      <TableCell className="px-5 py-4"><div className="font-medium">{plugin.displayName || plugin.id}</div><div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{plugin.id}</div></TableCell>
                      <TableCell><Badge variant={builtIn ? 'secondary' : 'outline'}>{sourceLabel}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={plugin.available ? 'text-success' : 'text-warning'}>{pluginStateLabel(plugin)}</Badge>{inUse && <div className="mt-1 text-xs text-muted-foreground">{plugin.activeInstances} 个实例使用中</div>}</TableCell>
                      <TableCell><div className="max-w-[260px] truncate font-mono text-xs" title={plugin.path || plugin.fileName}>{plugin.fileName || plugin.path || '--'}</div><div className="mt-1 text-xs text-muted-foreground">{formatBytes(plugin.size)}</div></TableCell>
                      <TableCell className="text-right"><Tooltip><TooltipTrigger asChild><span tabIndex={canDelete ? 0 : -1}><Button variant="outline" size="icon" onClick={() => setPluginDeleteTarget(plugin)} disabled={!canDelete || pluginAction !== ''} aria-label={`删除插件 ${plugin.displayName || plugin.id}`}><Trash2 className="text-destructive" /></Button></span></TooltipTrigger><TooltipContent>{builtIn ? '内置插件不可删除' : inUse ? '插件有活动实例，无法删除' : extension ? '删除插件' : '未知来源插件不可删除'}</TooltipContent></Tooltip></TableCell>
                    </TableRow>
                  })}
                </TableBody>
              </Table>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="records">
          {connections.length === 0 ? (
            <section className="rounded-[8px] border border-border/80 bg-card px-5 py-12 text-center text-sm text-muted-foreground">暂无云平台连接</section>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3"><Label className="shrink-0">平台连接</Label><Select value={recordConnectionId} onValueChange={setRecordConnectionId}><SelectTrigger className="w-full max-w-sm"><SelectValue /></SelectTrigger><SelectContent>{connections.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {providerLabel(item.provider)}</SelectItem>)}</SelectContent></Select></div>
              {recordConnectionId && selectedRecordConnection && <MqttTrafficPanel key={recordConnectionId} connectionId={recordConnectionId} provider={selectedRecordConnection.provider} connected={selectedRecordConnection.enabled && selectedRecordConnection.state === 'connected'} />}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-[680px] overflow-y-auto border-border/60 bg-card">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><CloudCog className="size-4 text-primary" />{dialogMode === 'create' ? '新增平台连接' : '编辑平台连接'}</DialogTitle><DialogDescription>{providerLabel(form.provider)}</DialogDescription></DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>平台名称 <span className="text-destructive">*</span></Label><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} readOnly={dialogMode === 'edit'} /></div>
              <div className="space-y-1.5"><Label>平台类型</Label><Select value={form.provider} onValueChange={(provider) => setForm((current) => {
                const previousDescriptor = providers.find((item) => item.id === current.provider)
                const previousDefaultName = previousDescriptor?.displayName || providerLabel(current.provider)
                const nextDescriptor = providers.find((item) => item.id === provider)
                const nextDefaultName = nextDescriptor?.displayName || providerLabel(provider)
                const shouldUpdateName = !current.name.trim() || current.name.trim() === previousDefaultName
                const shouldSetClientId = (provider === 'standard_mqtt' || provider === 'ct1x-mqtt') && !current.clientId.trim()
                return { ...current, provider, name: shouldUpdateName ? nextDefaultName : current.name, clientId: shouldSetClientId ? controllerSerialNumber : current.clientId }
              })} disabled={dialogMode === 'edit'}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{providers.filter((item) => item.available && configurableProvider(item.id)).map((item) => <SelectItem key={item.id} value={item.id}>{item.displayName || providerLabel(item.id)}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Keep Alive（秒）</Label><Input type="number" min={10} max={3600} value={form.keepaliveSec} onChange={(event) => setForm((current) => ({ ...current, keepaliveSec: event.target.value }))} /></div>
              <div className="space-y-1.5"><Label>上报周期（秒）</Label><Input type="number" min={5} max={3600} value={form.reportIntervalSec} onChange={(event) => setForm((current) => ({ ...current, reportIntervalSec: event.target.value }))} /></div>
            </div>

            {form.provider === 'standard_mqtt' || form.provider === 'ct1x-mqtt' ? (
              <>
                <div className="grid gap-4 border-t border-border/70 pt-5 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label>客户端 ID <span className="text-destructive">*</span></Label><Input value={form.clientId} onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))} /></div>
                  <div className="space-y-1.5"><Label>主题前缀 <span className="text-destructive">*</span></Label><Input value={form.topicPrefix} onChange={(event) => setForm((current) => ({ ...current, topicPrefix: event.target.value }))} /></div>
                  <div className="space-y-1.5"><Label>QoS</Label><Select value={form.qos} onValueChange={(qos) => setForm((current) => ({ ...current, qos: qos as ConnectionForm['qos'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">0</SelectItem><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem></SelectContent></Select></div>
                </div>
                <EndpointFields
                  title="主服务器"
                  value={form.primary}
                  required
                  password
                  compact
                  secretVisibilityKey={`${dialogMode}:${dialogOpen}:${form.id}:primary`}
                  onChange={(primary) => setForm((current) => ({ ...current, primary }))}
                />
                <OptionalEndpointFields
                  value={form.backup}
                  password
                  compact
                  secretVisibilityKey={`${dialogMode}:${dialogOpen}:${form.id}:backup`}
                  open={backupEndpointOpen}
                  onOpenChange={setBackupEndpointOpen}
                  onChange={(backup) => setForm((current) => ({ ...current, backup }))}
                />
              </>
            ) : form.provider === 'zaioh' ? (
              <>
                <div className="grid gap-4 border-t border-border/70 pt-5 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label>认证方式</Label><Select value={form.authType} onValueChange={(authType) => setForm((current) => ({ ...current, authType: authType as ZaiohAuthType, clearSecret: false }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="machine">一机一密</SelectItem><SelectItem value="product">一型一密</SelectItem><SelectItem value="private_key">私钥注册</SelectItem></SelectContent></Select></div>
                  <div className="space-y-1.5"><Label>平台类型</Label><Select value={form.platformType} onValueChange={(platformType) => setForm((current) => ({ ...current, platformType: platformType as ZaiohPlatformType }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cloud">云平台</SelectItem><SelectItem value="edge">边缘平台</SelectItem></SelectContent></Select></div>
                  <div className={`space-y-1.5 ${form.authType === 'private_key' ? 'sm:col-span-2' : ''}`}><Label>Profile ID <span className="text-destructive">*</span></Label><Input value={form.profileId} onChange={(event) => setForm((current) => ({ ...current, profileId: event.target.value }))} /></div>
                  {form.authType !== 'private_key' && <div className="space-y-1.5"><Label>DeviceName{form.authType === 'machine' && <span className="text-destructive"> *</span>}</Label><Input value={form.deviceName} onChange={(event) => setForm((current) => ({ ...current, deviceName: event.target.value }))} autoComplete="off" /></div>}
                  {form.authType !== 'private_key' && <div className="space-y-1.5"><Label>ProductKey <span className="text-destructive">*</span></Label><Input value={form.productKey} onChange={(event) => setForm((current) => ({ ...current, productKey: event.target.value }))} autoComplete="off" /></div>}
                  {form.authType !== 'private_key' && (
                    <div className="space-y-1.5">
                      <SecretField
                        label={form.authType === 'machine' ? 'DeviceSecret' : 'ProductSecret'}
                        value={form.secret}
                        configured={form.secretConfigured}
                        clear={form.clearSecret}
                        required={!form.secretConfigured}
                        resetKey={`${dialogMode}:${dialogOpen}:${form.id}:${form.authType}`}
                        onValue={(secret) => setForm((current) => ({ ...current, secret, clearSecret: false }))}
                        onClear={(clearSecret) => setForm((current) => ({ ...current, clearSecret, secret: '' }))}
                      />
                    </div>
                  )}
                </div>
                {form.authType === 'machine' ? (
                  <><EndpointFields title="主服务器" value={form.primary} required password={false} onChange={(primary) => setForm((current) => ({ ...current, primary }))} /><OptionalEndpointFields value={form.backup} password={false} open={backupEndpointOpen} onOpenChange={setBackupEndpointOpen} onChange={(backup) => setForm((current) => ({ ...current, backup }))} /></>
                ) : (
                  <div className="grid gap-4 border-t border-border/70 pt-5">
                    <div className="space-y-1.5"><Label>主注册 URL <span className="text-destructive">*</span></Label><Input value={form.primaryRequestUrl} onChange={(event) => setForm((current) => ({ ...current, primaryRequestUrl: event.target.value }))} placeholder="https://..." /></div>
                    <div className="space-y-1.5"><Label>备用注册 URL</Label><Input value={form.backupRequestUrl} onChange={(event) => setForm((current) => ({ ...current, backupRequestUrl: event.target.value }))} placeholder="https://..." /></div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-1.5 border-t border-border/70 pt-5"><Label>插件配置（JSON）</Label><Textarea value={form.genericConfig} onChange={(event) => setForm((current) => ({ ...current, genericConfig: event.target.value }))} className="min-h-52 font-mono text-xs" /></div>
            )}

            <div className="grid gap-3 border-t border-border/70 pt-5 sm:grid-cols-2">
              <div className="flex min-h-10 items-center justify-between gap-4 rounded-[6px] border border-input px-3"><span className="flex items-center gap-2 text-sm"><ShieldCheck className="size-4 text-primary" />启用 TLS</span><Switch checked={form.tlsEnabled} onCheckedChange={(tlsEnabled) => setForm((current) => ({ ...current, tlsEnabled }))} /></div>
              <div className="flex min-h-10 items-center justify-between gap-4 rounded-[6px] border border-input px-3"><span className="text-sm">保存后启用</span><Switch checked={form.enabled} onCheckedChange={(enabled) => setForm((current) => ({ ...current, enabled }))} /></div>
              {form.provider === 'zaioh' && <div className="space-y-1.5 sm:col-span-2"><Label>CA 证书</Label><Input value={ZAIOH_CA_FILE} readOnly className="font-mono text-xs text-muted-foreground" /></div>}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>取消</Button><Button onClick={() => void saveConnection()} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />}{dialogMode === 'create' ? '创建连接' : '保存配置'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>删除平台连接？</AlertDialogTitle><AlertDialogDescription>将删除该连接的服务器参数和认证凭据。此操作不可撤销。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busyId !== ''}>取消</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(event) => { event.preventDefault(); void removeConnection() }} disabled={busyId !== ''}>{busyId && <Loader2 className="animate-spin" />}删除连接</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pluginDeleteTarget !== null} onOpenChange={(open) => { if (!open) setPluginDeleteTarget(null) }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>删除插件？</AlertDialogTitle><AlertDialogDescription>将删除插件文件并从 CloudService 注册表移除。插件代码会保持映射，重启服务后完全释放。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={pluginAction !== ''}>取消</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(event) => { event.preventDefault(); void unloadPlugin() }} disabled={pluginAction !== ''}>{pluginAction && <Loader2 className="animate-spin" />}删除插件</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
