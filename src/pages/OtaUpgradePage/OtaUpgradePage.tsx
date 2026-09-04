import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cancelOtaUpload, completeOtaUpload, createOtaUpload, getOtaJob, getOtaUpload, retryOtaUpgrade, uploadOtaChunk } from '@/api/ota'
import type { Ct16OtaUploadDto } from '@/api/types'
import { md5Blob } from '@/lib/md5'
import { readOtaPackageFlag, type OtaPackageFlag } from '@/lib/ota-image'
import { CircleAlert, Cpu, FileUp, RefreshCw, RotateCcw, ShieldCheck, Upload, XCircle } from 'lucide-react'
import { toast } from 'sonner'

const CHUNK_SIZE = 4 * 1024 * 1024
const RESUME_KEY = 'ct16:ota-upload'

type UploadPhase = 'idle' | 'uploading' | 'upgrading' | 'succeeded' | 'failed'

interface ResumeRecord {
  id: string
  fileName: string
  fileSize: number
  lastModified: number
}

function phaseFromStatus(status: Ct16OtaUploadDto['status']): UploadPhase {
  return status === 'validating' || status === 'ready' ? 'upgrading' : status
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function getResumeRecord(): ResumeRecord | null {
  try {
    const record = JSON.parse(localStorage.getItem(RESUME_KEY) || '') as ResumeRecord
    return record?.id ? record : null
  } catch {
    return null
  }
}

function saveResumeRecord(status: Ct16OtaUploadDto): void {
  localStorage.setItem(RESUME_KEY, JSON.stringify({
    id: status.id,
    fileName: status.fileName,
    fileSize: status.fileSize,
    lastModified: status.lastModified,
  } satisfies ResumeRecord))
}

function isSameFile(file: File, record: ResumeRecord | Ct16OtaUploadDto): boolean {
  return file.name === record.fileName && file.size === record.fileSize && file.lastModified === record.lastModified
}

export default function OtaUpgradePage() {
  const [phase, setPhase] = useState<UploadPhase>('idle')
  const [status, setStatus] = useState<Ct16OtaUploadDto | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedOtaFlag, setSelectedOtaFlag] = useState<OtaPackageFlag | null>(null)
  const [replacementFile, setReplacementFile] = useState<File | null>(null)
  const [replacementOtaFlag, setReplacementOtaFlag] = useState<OtaPackageFlag | null>(null)
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [validatingFile, setValidatingFile] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const pollJob = useCallback(async (id: string) => {
    for (;;) {
      await new Promise((resolve) => window.setTimeout(resolve, 1500))
      const next = await getOtaJob(id)
      setStatus(next)
      if (next.status === 'succeeded' || next.status === 'failed') {
        setPhase(phaseFromStatus(next.status))
        localStorage.removeItem(RESUME_KEY)
        if (next.status === 'succeeded') toast.success('系统升级已完成')
        else toast.error(next.error || '系统升级失败')
        return
      }
    }
  }, [])

  useEffect(() => {
    const resume = getResumeRecord()
    if (!resume) return
    void getOtaUpload(resume.id).then((next) => {
      setStatus(next)
      if (next.status === 'uploading') {
        setPhase('idle')
      } else if (next.status === 'upgrading') {
        setPhase(phaseFromStatus(next.status))
        void pollJob(next.id)
      } else {
        setPhase(phaseFromStatus(next.status))
        localStorage.removeItem(RESUME_KEY)
      }
    }).catch(() => localStorage.removeItem(RESUME_KEY))
  }, [pollJob])

  const transferFile = useCallback(async (file: File, current: Ct16OtaUploadDto) => {
    let active = current
    let retryCount = 0
    setPhase('uploading')
    while (active.receivedSize < file.size) {
      const start = active.receivedSize
      const chunk = file.slice(start, Math.min(start + CHUNK_SIZE, file.size))
      const chunkHash = await md5Blob(chunk)
      try {
        active = await uploadOtaChunk(active.id, chunk, start, file.size, chunkHash)
        retryCount = 0
        setStatus(active)
        saveResumeRecord(active)
      } catch (error) {
        retryCount += 1
        if (retryCount > 3) throw error
        await new Promise((resolve) => window.setTimeout(resolve, retryCount * 800))
        active = await getOtaUpload(active.id)
        setStatus(active)
        if (active.receivedSize > file.size || active.status !== 'uploading') {
          throw new Error(active.error || '服务器上传会话状态异常')
        }
      }
    }
    const completed = await completeOtaUpload(active.id)
    setStatus(completed)
    setPhase(phaseFromStatus(completed.status))
    if (completed.status === 'failed') {
      throw new Error(completed.error || '系统升级失败')
    }
    localStorage.removeItem(RESUME_KEY)
    toast.success('固件上传完成，系统升级已提交')
  }, [])

  const confirmUpload = useCallback(async () => {
    if (!selectedFile) return
    try {
      setPhase('uploading')
      const resume = getResumeRecord()
      let active: Ct16OtaUploadDto | null = null
      if (resume && isSameFile(selectedFile, resume)) {
        active = await getOtaUpload(resume.id)
        if (active.status !== 'uploading') active = null
      }
      if (!active) {
        active = await createOtaUpload({ fileName: selectedFile.name, fileSize: selectedFile.size, lastModified: selectedFile.lastModified })
        saveResumeRecord(active)
      }
      setStatus(active)
      if (active.skippedUpload) {
        setPhase('upgrading')
        const completed = await completeOtaUpload(active.id)
        setStatus(completed)
        setPhase(phaseFromStatus(completed.status))
        localStorage.removeItem(RESUME_KEY)
        if (completed.status === 'failed') throw new Error(completed.error || '系统升级失败')
        toast.success('设备已有相同固件，系统升级已提交')
      } else {
        await transferFile(selectedFile, active)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '固件上传失败'
      setPhase('failed')
      toast.error(message)
    }
  }, [selectedFile, transferFile])

  const selectFile = useCallback(async (file: File) => {
    try {
      setValidatingFile(true)
      const otaFlag = await readOtaPackageFlag(file)
      if (otaFlag.product !== 'ct16') throw new Error('文件格式不支持')

      const resume = getResumeRecord()
      const activeUpload = status?.status === 'uploading' ? status : null
      const resumable = resume ?? activeUpload
      if (resumable && !isSameFile(file, resumable)) {
        setReplacementFile(file)
        setReplacementOtaFlag(otaFlag)
        setReplaceDialogOpen(true)
        return
      }
      setSelectedFile(file)
      setSelectedOtaFlag(otaFlag)
    } catch {
      setSelectedFile(null)
      setSelectedOtaFlag(null)
      toast.error('文件格式不支持')
    } finally {
      setValidatingFile(false)
    }
  }, [status])

  const replaceUpload = useCallback(async () => {
    const resume = getResumeRecord()
    const activeUpload = status?.status === 'uploading' ? status : null
    const uploadID = resume?.id ?? activeUpload?.id
    if (!replacementFile || !uploadID) return
    try {
      setReplacing(true)
      await cancelOtaUpload(uploadID)
      localStorage.removeItem(RESUME_KEY)
      setStatus(null)
      setPhase('idle')
      setSelectedFile(replacementFile)
      setSelectedOtaFlag(replacementOtaFlag)
      setReplacementFile(null)
      setReplacementOtaFlag(null)
      setReplaceDialogOpen(false)
      toast.success('未完成的固件上传已清理，请确认上传新文件')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '取消旧固件上传失败')
    } finally {
      setReplacing(false)
    }
  }, [replacementFile, replacementOtaFlag, status])

  const retryUpgrade = useCallback(async () => {
    if (!status) return
    try {
      setPhase('upgrading')
      const retried = await retryOtaUpgrade(status.id)
      setStatus(retried)
      setPhase(phaseFromStatus(retried.status))
      if (retried.status === 'failed') throw new Error(retried.error || '系统升级失败')
      toast.success('系统升级已重新提交，设备即将重启')
    } catch (error) {
      setPhase('failed')
      toast.error(error instanceof Error ? error.message : '重新执行升级失败')
    }
  }, [status])

  const uploadProgress = status ? Math.round(status.receivedSize / status.fileSize * 100) : 0
  const isBusy = phase === 'uploading' || phase === 'upgrading' || validatingFile
  const resumePending = status?.status === 'uploading' && !selectedFile

  const openFilePicker = () => {
    if (!isBusy) fileInputRef.current?.click()
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/40 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Cpu className="size-4 text-primary" />OTA 固件升级</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border/40'} ${isBusy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            onClick={openFilePicker}
            onDragOver={(event) => { if (!isBusy) { event.preventDefault(); setDragOver(true) } }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => { event.preventDefault(); setDragOver(false); if (!isBusy) { const file = event.dataTransfer.files[0]; if (file) void selectFile(file) } }}
          >
            <FileUp className="mx-auto size-10 text-primary" />
            <p className="mt-3 text-sm">拖拽固件到此处，或 <button type="button" className="text-primary hover:underline disabled:cursor-not-allowed disabled:no-underline" disabled={isBusy} onClick={(event) => { event.stopPropagation(); openFilePicker() }}>点击选择</button></p>
            <p className="mt-1 text-xs text-muted-foreground">仅支持 CT16 Rockchip OTA .img 包；选择后将快速检查产品标识</p>
            <input ref={fileInputRef} className="hidden" type="file" accept=".img" onChange={(event) => { const file = event.target.files?.[0]; if (file) void selectFile(file); event.currentTarget.value = '' }} />
          </div>

          {selectedFile && !isBusy && <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><p className="text-sm font-medium">已选择固件</p><p className="mt-1 truncate text-sm text-muted-foreground">{selectedFile.name}</p><p className="mt-1 text-xs text-muted-foreground">{formatBytes(selectedFile.size)} · 版本：{selectedOtaFlag?.version} · 构建日期：{selectedOtaFlag?.buildDate}</p></div>
              <div className="flex shrink-0 gap-2"><Button variant="outline" size="sm" onClick={openFilePicker}>重新选择</Button><Button size="sm" onClick={() => void confirmUpload()}><Upload className="mr-1.5 size-4" />开始升级</Button></div>
            </div>
            {status?.status === 'uploading' && isSameFile(selectedFile, status) && <p className="mt-3 flex items-center gap-2 text-xs text-warning"><Upload className="size-3.5" />确认上传后将从 {formatBytes(status.receivedSize)} 继续传输。</p>}
          </div>}

          {validatingFile && <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary"><RefreshCw className="size-4 animate-spin" />正在检查 OTA 包格式和产品标识...</div>}
          {resumePending && <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning"><CircleAlert className="size-4" />上传已中断。请选择同一文件后确认上传以继续，或选择新文件并确认替换。</div>}
          {status && (phase === 'uploading' || (phase === 'idle' && status.status === 'uploading' && selectedFile)) && <ProgressInfo label={`正在传输 ${status.fileName}（${formatBytes(status.receivedSize)} / ${formatBytes(status.fileSize)}）`} value={uploadProgress} />}
          {phase === 'upgrading' && <ProgressInfo label="固件已接收，正在执行系统升级..." value={100} />}

          {status && <div className="rounded-lg border border-border/30 bg-muted/30 p-3 text-xs text-muted-foreground">
            <div className="flex items-center justify-between"><span>会话：{status.id}</span><Badge variant="outline">{status.status}</Badge></div>
            {status.skippedUpload && <p className="mt-2 text-success">设备已存在相同固件，已跳过文件传输。</p>}
            <p className="mt-2">修改时间：{new Date(status.lastModified).toLocaleString()}</p>
            {status.finalPath && <p className="mt-1 break-all">固件路径：{status.finalPath}</p>}
            {status.error && <p className="mt-2 text-destructive">{status.error}</p>}
            {status.log && <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-xs">{status.log}</pre>}
          </div>}

          {phase === 'succeeded' && <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success"><ShieldCheck className="size-4" />系统升级已完成，设备即将重启。</div>}
          {phase === 'failed' && <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><span className="flex items-center gap-2"><XCircle className="size-4" />系统升级失败</span>{status?.finalPath && <Button variant="outline" size="sm" onClick={() => void retryUpgrade()}><RotateCcw className="mr-1 size-3.5" />重新执行</Button>}</div>}
          {isBusy && <p className="flex items-center gap-2 text-xs text-muted-foreground"><RefreshCw className="size-3 animate-spin" />请勿关闭设备；浏览器刷新后可重新选择同一文件并确认上传以继续。</p>}
        </CardContent>
      </Card>

      <AlertDialog open={replaceDialogOpen} onOpenChange={(open) => { if (!replacing) setReplaceDialogOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>替换未完成的固件上传？</AlertDialogTitle>
            <AlertDialogDescription>当前固件尚未上传完成。继续将删除已上传的临时分片，随后需点击“确认上传”才会开始传输新文件。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={replacing} onClick={() => { setReplacementFile(null); setReplacementOtaFlag(null) }}>保留旧文件</AlertDialogCancel>
            <AlertDialogAction disabled={replacing} onClick={(event) => { event.preventDefault(); void replaceUpload() }}>{replacing ? '正在替换…' : '确认替换'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ProgressInfo({ label, value }: { label: string; value: number }) {
  return <div className="space-y-2"><div className="flex justify-between text-sm"><span>{label}</span><span className="font-mono">{value}%</span></div><Progress value={value} className="h-2" /></div>
}
