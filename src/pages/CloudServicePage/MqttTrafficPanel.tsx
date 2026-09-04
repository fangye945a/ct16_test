import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronLeft,
  ChevronRight,
  FileJson,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  clearCloudMqttTraffic,
  getCloudMqttTraffic,
  type CloudMqttTrafficRecord,
  type CloudProvider,
  type CloudTrafficDirection,
} from '@/api/cloud'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const PAGE_SIZE = 20
const REFRESH_INTERVAL_MS = 5000

function formatTime(timestampMs: number): string {
  if (!timestampMs) return '—'
  return new Date(timestampMs).toLocaleString('zh-CN', { hour12: false })
}

function directionMeta(direction: CloudTrafficDirection): { label: string; className: string } {
  if (direction === 'uplink') return { label: '上行', className: 'text-success' }
  return { label: '下行', className: 'text-primary' }
}

function statusMeta(record: CloudMqttTrafficRecord): { label: string; className: string } {
  if (record.status === 'published') return { label: '已发布', className: 'text-success' }
  if (record.status === 'submitted') return { label: '处理中', className: 'text-warning' }
  if (record.status === 'mqtt_acked') return { label: 'MQTT 已确认', className: 'text-primary' }
  if (record.status === 'cloud_acked') return { label: '云端已确认', className: 'text-success' }
  if (record.status === 'received') return { label: '已接收', className: 'text-success' }
  if (record.status === 'ignored') return { label: '已忽略', className: 'text-muted-foreground' }
  if (record.status === 'timeout') return { label: '云端超时', className: 'text-warning' }
  if (record.status === 'cloud_rejected') return { label: '云端拒绝', className: 'text-destructive' }
  if (record.status === 'dropped') return { label: '已丢弃', className: 'text-destructive' }
  return { label: '发布失败', className: 'text-destructive' }
}

const STANDARD_MESSAGE_TYPES = ['report', 'ctrl', 'query', 'ctrlAck', 'queryAck']
const ZAIOH_MESSAGE_TYPES = ['topoGet', 'topoReply', 'subRegister', 'subReply', 'subLogin', 'subLogout', 'propertyReport', 'propertyReply', 'command', 'commandReply']

function payloadPreview(payload: string): string {
  return payload.replace(/\s+/g, ' ').slice(0, 180) || '—'
}

function prettyPayload(payload: string): string {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2)
  } catch {
    return payload
  }
}

type TrafficPageState = {
  records: CloudMqttTrafficRecord[]
  nextCursor: number
  hasMore: boolean
  total: number
  droppedCount: number
}

const EMPTY_PAGE: TrafficPageState = {
  records: [],
  nextCursor: 0,
  hasMore: false,
  total: 0,
  droppedCount: 0,
}

function pageFromResponse(response: Awaited<ReturnType<typeof getCloudMqttTraffic>>): TrafficPageState {
  return {
    records: response.records,
    nextCursor: response.nextCursor,
    hasMore: response.hasMore,
    total: response.total,
    droppedCount: response.droppedCount,
  }
}

export default function MqttTrafficPanel({ connectionId, provider, connected }: { connectionId: string; provider: CloudProvider; connected: boolean }) {
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [direction, setDirection] = useState<CloudTrafficDirection>('')
  const [messageType, setMessageType] = useState('')
  const [sn, setSN] = useState('')
  const [pages, setPages] = useState<TrafficPageState[]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingPage, setLoadingPage] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [selectedSequence, setSelectedSequence] = useState<number | null>(null)
  const [selectedSnapshot, setSelectedSnapshot] = useState<CloudMqttTrafficRecord | null>(null)
  const requestVersionRef = useRef(0)

  useEffect(() => {
    const timer = window.setTimeout(() => setKeyword(keywordInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [keywordInput])

  const query = useMemo(() => ({ keyword, direction, messageType, sn: sn.trim(), limit: PAGE_SIZE }), [direction, keyword, messageType, sn])
  const currentPage = pages[pageIndex] ?? EMPTY_PAGE
  const records = currentPage.records
  const totalPages = Math.max(1, Math.ceil(currentPage.total / PAGE_SIZE))
  const hasNextPage = pageIndex + 1 < totalPages && currentPage.hasMore
  const selectedRecord = selectedSequence === null
    ? null
    : pages.flatMap((page) => page.records).find((record) => record.sequence === selectedSequence) ?? selectedSnapshot
  const messageTypes = provider === 'zaioh' ? ZAIOH_MESSAGE_TYPES : STANDARD_MESSAGE_TYPES

  useEffect(() => {
    setMessageType('')
  }, [provider])

  const loadLatest = useCallback(async () => {
    const requestVersion = ++requestVersionRef.current
    setLoadingPage(false)
    setLoading(true)
    try {
      const response = await getCloudMqttTraffic(connectionId, query)
      if (requestVersion !== requestVersionRef.current) return
      setPages([pageFromResponse(response)])
      setPageIndex(0)
      setLoadError('')
    } catch (error) {
      if (requestVersion !== requestVersionRef.current) return
      setLoadError(error instanceof Error ? error.message : 'MQTT 通信记录读取失败')
    } finally {
      if (requestVersion === requestVersionRef.current) setLoading(false)
    }
  }, [connectionId, query])

  const loadNextPage = useCallback(async () => {
    if (!hasNextPage || currentPage.nextCursor === 0 || loadingPage) return
    const cachedPage = pages[pageIndex + 1]
    if (cachedPage) {
      setPageIndex((current) => current + 1)
      return
    }

    const requestVersion = ++requestVersionRef.current
    setLoadingPage(true)
    try {
      const loadedSequences = new Set(
        pages.slice(0, pageIndex + 1).flatMap((page) => page.records.map((record) => record.sequence)),
      )
      let beforeSequence = currentPage.nextCursor
      let response: Awaited<ReturnType<typeof getCloudMqttTraffic>> | null = null
      for (let attempt = 0; attempt < 2; attempt += 1) {
        response = await getCloudMqttTraffic(connectionId, { ...query, beforeSequence })
        const duplicateSequences = response.records
          .map((record) => record.sequence)
          .filter((sequence) => loadedSequences.has(sequence))
        if (duplicateSequences.length === 0 || beforeSequence <= 1) break
        const oldestDuplicate = Math.min(...duplicateSequences)
        const retryCursor = oldestDuplicate - 1
        if (retryCursor === 0 || retryCursor >= beforeSequence) break
        beforeSequence = retryCursor
      }
      if (requestVersion !== requestVersionRef.current) return
      if (!response) return
      const nextPage = pageFromResponse(response)
      setPages((current) => [...current.slice(0, pageIndex + 1), nextPage])
      setPageIndex(pageIndex + 1)
      setLoadError('')
    } catch (error) {
      if (requestVersion === requestVersionRef.current) {
        setLoadError(error instanceof Error ? error.message : 'MQTT 通信记录读取失败')
      }
    } finally {
      setLoadingPage(false)
    }
  }, [connectionId, currentPage, hasNextPage, loadingPage, pageIndex, pages, query])

  useEffect(() => {
    void loadLatest()
  }, [loadLatest])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && pageIndex === 0) void loadLatest()
    }, REFRESH_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [loadLatest, pageIndex])

  const goPreviousPage = () => {
    if (pageIndex > 0 && !loadingPage) setPageIndex((current) => current - 1)
  }

  const goLatestPage = () => {
    if (pageIndex > 0 && !loadingPage) setPageIndex(0)
  }

  const clearRecords = async () => {
    if (!window.confirm('确认清空当前 cloud_service 的全部内存通信记录？')) return
    try {
      await clearCloudMqttTraffic(connectionId)
      ++requestVersionRef.current
      setPages([EMPTY_PAGE])
      setPageIndex(0)
      setLoading(false)
      setLoadingPage(false)
      toast.success('通信记录已清空')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '清空通信记录失败')
    }
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[8px] border border-border/80 bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border/80 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">数据记录</h2>
              <Badge variant="outline" className={connected ? 'text-success' : 'text-muted-foreground'}>{connected ? '已连接' : '未连接'}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">匹配 {currentPage.total} 条</span>
            <Button variant="outline" size="icon" onClick={() => void loadLatest()} aria-label="刷新通信记录" title="刷新通信记录"><RefreshCw /></Button>
            <Button variant="outline" size="sm" onClick={() => void clearRecords()}><Trash2 />清空</Button>
          </div>
        </div>

        <div className="grid gap-2 border-b border-border/80 bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_150px_150px_minmax(150px,220px)]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} placeholder="搜索 topic、SN、payload、错误信息" className="pl-9" />
          </div>
          <Select value={direction || 'all'} onValueChange={(value) => setDirection(value === 'all' ? '' : value as CloudTrafficDirection)}>
            <SelectTrigger><SelectValue placeholder="全部方向" /></SelectTrigger>
            <SelectContent><SelectItem value="all">全部方向</SelectItem><SelectItem value="uplink">上行</SelectItem><SelectItem value="downlink">下行</SelectItem></SelectContent>
          </Select>
          <Input value={sn} onChange={(event) => setSN(event.target.value)} placeholder="按设备 SN 筛选" />
          <Select value={messageType || 'all'} onValueChange={(value) => setMessageType(value === 'all' ? '' : value)}>
            <SelectTrigger><SelectValue placeholder="全部类型" /></SelectTrigger>
            <SelectContent><SelectItem value="all">全部类型</SelectItem>{messageTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {loadError && <div className="flex items-start gap-2 border-b border-destructive/20 bg-destructive/5 px-5 py-3 text-sm text-destructive"><TriangleAlert className="mt-0.5 size-4 shrink-0" /><span className="break-all">{loadError}</span></div>}

        <div className="overflow-x-auto">
          <Table className="min-w-[1120px]">
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead className="w-[170px] px-5">时间</TableHead><TableHead className="w-[120px]">方向 / 类型</TableHead><TableHead className="w-[170px]">设备 SN</TableHead><TableHead className="w-[360px]">Topic</TableHead><TableHead>payload 摘要</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading && records.length === 0 && <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 size-5 animate-spin" />正在读取通信记录…</TableCell></TableRow>}
              {!loading && records.length === 0 && <TableRow><TableCell colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">当前筛选条件下暂无通信记录</TableCell></TableRow>}
              {records.map((record) => {
                const directionInfo = directionMeta(record.direction)
                return <TableRow key={record.sequence} className="cursor-pointer" onClick={() => { setSelectedSequence(record.sequence); setSelectedSnapshot(record) }}>
                  <TableCell className="px-5 align-top text-xs text-muted-foreground">{formatTime(record.timestampMs)}<div className="mt-1 font-mono text-[10px]">#{record.sequence}{record.updatedAtMs > record.timestampMs ? ` · 更新 ${formatTime(record.updatedAtMs)}` : ''}</div></TableCell>
                  <TableCell className={`align-top ${directionInfo.className}`}><div className="flex items-center gap-1.5 font-medium">{record.direction === 'uplink' ? <ArrowUpFromLine className="size-3.5" /> : <ArrowDownToLine className="size-3.5" />}{directionInfo.label}</div><div className="mt-1 font-mono text-xs text-foreground/70">{record.messageType || 'unknown'}</div></TableCell>
                  <TableCell className="align-top"><div className="break-all font-mono text-xs">{record.sn || '—'}</div></TableCell>
                  <TableCell className="align-top"><div className="truncate font-mono text-[11px] text-muted-foreground" title={record.topic}>{record.topic || '—'}</div>{record.mqttMessageId > 0 && <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">mid={record.mqttMessageId}</div>}</TableCell>
                  <TableCell className="max-w-[420px] align-top"><div className="truncate font-mono text-xs text-muted-foreground" title={record.payload}>{payloadPreview(record.payload)}</div><div className="mt-1 text-[10px] text-muted-foreground">QoS {record.qos} · retain {record.retain ? '是' : '否'}{record.payloadTruncated ? ' · payload 已截断' : ''}</div></TableCell>
                </TableRow>
              })}
            </TableBody>
          </Table>
        </div>
        {pages.length > 0 && <div className="flex flex-col gap-3 border-t border-border/70 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">第 {pageIndex + 1} 页 / 共 {totalPages} 页 · 本页 {records.length} 条 / 匹配 {currentPage.total} 条</span>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={goPreviousPage} disabled={pageIndex === 0 || loadingPage}><ChevronLeft />上一页</Button>
            <Button variant="outline" size="sm" onClick={() => void loadNextPage()} disabled={!hasNextPage || loadingPage}>{loadingPage ? <Loader2 className="animate-spin" /> : <ChevronRight />}下一页</Button>
            <Button variant="ghost" size="sm" onClick={goLatestPage} disabled={pageIndex === 0 || loadingPage}>回到最新</Button>
          </div>
        </div>}
      </section>

      <Dialog open={selectedRecord !== null} onOpenChange={(open) => { if (!open) { setSelectedSequence(null); setSelectedSnapshot(null) } }}>
        <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto border-border/60 bg-card">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><FileJson className="size-4 text-primary" />MQTT报文详情</DialogTitle><DialogDescription>{selectedRecord ? `${formatTime(selectedRecord.timestampMs)} · ${selectedRecord.direction === 'uplink' ? '上行' : '下行'} · ${selectedRecord.messageType}` : ''}</DialogDescription></DialogHeader>
          {selectedRecord && <div className="space-y-4 text-sm">
            <div className="grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-4"><div><div className="text-xs text-muted-foreground">设备 SN</div><div className="mt-1 break-all font-mono">{selectedRecord.sn || '—'}</div></div><div className="lg:col-span-2"><div className="text-xs text-muted-foreground">Topic</div><div className="mt-1 break-all font-mono text-xs">{selectedRecord.topic || '—'}</div></div><div><div className="text-xs text-muted-foreground">处理结果</div><div className="mt-1">{statusMeta(selectedRecord).label} · code={selectedRecord.result}</div></div><div><div className="text-xs text-muted-foreground">更新时间</div><div className="mt-1 text-xs">{formatTime(selectedRecord.updatedAtMs)}</div></div><div><div className="text-xs text-muted-foreground">QoS / retain</div><div className="mt-1 font-mono">{selectedRecord.qos} / {selectedRecord.retain ? 'true' : 'false'}</div></div></div>
            {selectedRecord.error && <div className="rounded-[6px] border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{selectedRecord.error}</div>}
            <div><div className="mb-2 text-xs font-semibold text-muted-foreground">Payload</div><pre className="max-h-[52vh] overflow-auto rounded-[6px] border border-border/70 bg-background/70 p-4 text-xs leading-5">{prettyPayload(selectedRecord.payload)}</pre></div>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  )
}
