import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CircleAlert, Cpu, FileUp, RefreshCw, RotateCcw, ShieldCheck, Upload, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  CancelPrototypeOtaUpload,
  CompletePrototypeOtaUpload,
  CreatePrototypeOtaUpload,
  GetPrototypeOtaUpload,
  RetryPrototypeOtaUpload,
  UploadPrototypeOtaChunk,
  type PrototypeOtaUpload,
} from '@/services/prototypeRuntime';

const CHUNK_SIZE = 4 * 1024 * 1024;

function FormatBytes(bytes: number): string {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function GetPhaseLabel(upload: PrototypeOtaUpload | null): string {
  if (!upload) return '等待选择升级包';
  if (upload.status === 'uploading') return '正在上传固件包';
  if (upload.status === 'validating') return '正在校验固件完整性';
  if (upload.status === 'upgrading') return '正在写入升级分区';
  if (upload.status === 'succeeded') return '升级任务已完成';
  if (upload.status === 'failed') return '系统升级失败';
  return '上传任务已取消';
}

export default function OtaUpgradePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [upload, setUpload] = useState<PrototypeOtaUpload | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const poll = useCallback(async (id: string) => {
    try {
      const next = await GetPrototypeOtaUpload(id);
      setUpload(next);
      return next;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取升级状态失败');
      return null;
    }
  }, []);

  useEffect(() => {
    if (!upload || (upload.status !== 'validating' && upload.status !== 'upgrading')) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      void poll(upload.id).then((next) => {
        if (next?.status === 'succeeded') {
          toast.success('系统升级已完成，原型未执行真实设备重启');
        }
      });
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [poll, upload]);

  const selectFile = async (file: File) => {
    if (!file.name.endsWith('.img') && !file.name.endsWith('.bin')) {
      toast.error('仅支持 .img 或 .bin 格式的固件包');
      return;
    }
    if (upload?.status === 'uploading' && (file.name !== upload.fileName || file.size !== upload.fileSize)) {
      setReplacementFile(file);
      return;
    }
    setSelectedFile(file);
    if (upload && file.name === upload.fileName && file.size === upload.fileSize && file.lastModified === upload.lastModified) {
      toast.info('检测到未完成的原型上传任务，可继续上传');
    }
  };

  const startUpload = async () => {
    if (!selectedFile || busy) return;
    setBusy(true);
    try {
      let current = await CreatePrototypeOtaUpload({
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        lastModified: selectedFile.lastModified,
      });
      setUpload(current);
      while (current.status === 'uploading' && current.receivedSize < selectedFile.size) {
        current = await UploadPrototypeOtaChunk(current.id, Math.min(CHUNK_SIZE, selectedFile.size - current.receivedSize));
        setUpload(current);
      }
      current = await CompletePrototypeOtaUpload(current.id);
      setUpload(current);
      toast.success('固件上传完成，已提交模拟升级任务');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '固件上传失败');
    } finally {
      setBusy(false);
    }
  };

  const replaceUpload = async () => {
    if (!replacementFile) return;
    setBusy(true);
    try {
      if (upload) {
        await CancelPrototypeOtaUpload(upload.id);
      }
      setUpload(null);
      setSelectedFile(replacementFile);
      setReplacementFile(null);
      toast.success('已清理旧上传任务，请确认上传新固件');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '替换上传任务失败');
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    if (!upload) return;
    try {
      setBusy(true);
      setUpload(await RetryPrototypeOtaUpload(upload.id));
      toast.success('已重新提交模拟升级任务');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '重新执行升级失败');
    } finally {
      setBusy(false);
    }
  };

  const progress = !upload ? 0 : upload.status === 'uploading'
    ? Math.round(upload.receivedSize / Math.max(upload.fileSize, 1) * 70)
    : upload.status === 'validating' ? 78
      : upload.status === 'upgrading' ? 88
        : upload.status === 'succeeded' ? 100 : 0;

  return <div className="space-y-6"><div><h1 className="text-lg font-semibold">OTA 升级</h1><p className="mt-1 text-sm text-muted-foreground">支持分片上传、断点续传、校验与可重试的原型升级流程。</p></div><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"><div className="space-y-6"><Card className="border-border/40 bg-card/60"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Cpu className="size-4 text-primary" />当前系统版本</CardTitle><CardDescription>双分区升级会将新固件写入备用分区，完成后由设备侧决定切换时机。</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">当前版本</p><p className="mt-1 text-lg font-semibold">v2.1.4</p></div><div><p className="text-xs text-muted-foreground">构建日期</p><p className="mt-1 text-sm font-medium">2026-07-28</p></div><div><p className="text-xs text-muted-foreground">活动分区</p><Badge variant="outline" className="mt-1 border-success/30 bg-success/5 text-success">A 分区</Badge></div></CardContent></Card><Card className="border-border/40 bg-card/60"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileUp className="size-4 text-primary" />上传升级包</CardTitle><CardDescription>原型会模拟传输和升级状态，不会写入设备存储或触发重启。</CardDescription></CardHeader><CardContent className="space-y-4"><div role="button" tabIndex={0} onClick={() => !busy && fileInputRef.current?.click()} onKeyDown={(event) => event.key === 'Enter' && fileInputRef.current?.click()} onDrop={(event) => { event.preventDefault(); setDragOver(false); const file = event.dataTransfer.files[0]; if (file) void selectFile(file); }} onDragOver={(event) => { event.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border/70 hover:border-primary/50 hover:bg-muted/30'}`}><Upload className="mx-auto size-7 text-primary" /><p className="mt-3 text-sm font-medium">拖拽固件到此处，或点击选择文件</p><p className="mt-1 text-xs text-muted-foreground">支持 .img 和 .bin 文件，上传会按 4 MiB 分片模拟</p><input ref={fileInputRef} type="file" className="hidden" accept=".img,.bin" onChange={(event) => { const file = event.target.files?.[0]; if (file) void selectFile(file); event.currentTarget.value = ''; }} /></div>{selectedFile && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 p-3"><div><p className="text-sm font-medium">{selectedFile.name}</p><p className="mt-1 text-xs text-muted-foreground">{FormatBytes(selectedFile.size)} · 已通过原型格式校验</p></div><Button size="sm" onClick={() => void startUpload()} disabled={busy || upload?.status === 'validating' || upload?.status === 'upgrading'}>{busy ? <RefreshCw className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}{upload?.status === 'uploading' && upload.receivedSize > 0 ? '继续上传' : '确认上传'}</Button></div>}{upload && <div className="rounded-lg border border-border/60 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{GetPhaseLabel(upload)}</p><p className="mt-1 text-xs text-muted-foreground">{upload.status === 'uploading' ? `${FormatBytes(upload.receivedSize)} / ${FormatBytes(upload.fileSize)}` : '正在使用原型任务状态机推进流程'}</p></div><Badge variant="outline">{upload.status}</Badge></div><Progress value={progress} className="mt-4" /><p className="mt-2 text-right text-xs text-muted-foreground">{progress}%</p>{upload.status === 'failed' && <Button className="mt-3" size="sm" variant="outline" onClick={() => void retry()}><RotateCcw className="size-3.5" />重新执行</Button>}{upload.status === 'succeeded' && <div className="mt-3 flex items-center gap-2 text-xs text-success"><ShieldCheck className="size-4" />升级包已写入模拟备用分区：{upload.finalPath}</div>}</div>}</CardContent></Card></div><aside className="space-y-4"><Card className="border-border/40 bg-card/60"><CardHeader><CardTitle className="text-base">升级安全说明</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />真实设备应确认无关键任务运行后再执行升级。</p><p className="flex gap-2"><CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" />本页面为原型模式，不会触发真实重启、分区写入或回滚。</p><p className="flex gap-2"><XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />替换文件会取消原型中的未完成上传任务。</p></CardContent></Card><Card className="border-border/40 bg-card/60"><CardHeader><CardTitle className="text-base">升级记录</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="border-l-2 border-success pl-3"><p className="font-medium">v2.1.4</p><p className="text-xs text-muted-foreground">2026-07-28 · 当前版本</p></div><div className="border-l-2 border-muted pl-3"><p className="font-medium">v2.1.3</p><p className="text-xs text-muted-foreground">2026-06-10 · 历史升级成功</p></div></CardContent></Card></aside></div><AlertDialog open={!!replacementFile} onOpenChange={(open) => !open && setReplacementFile(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>替换未完成的升级包？</AlertDialogTitle><AlertDialogDescription>当前存在未完成的原型上传任务。确认替换会取消旧任务，不会影响真实设备。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>保留旧文件</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void replaceUpload(); }}>{busy ? '正在替换…' : '确认替换'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>;
}
