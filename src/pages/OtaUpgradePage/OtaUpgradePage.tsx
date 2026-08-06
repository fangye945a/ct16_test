import { useCallback, useEffect, useRef, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  CircleAlert,
  Cpu,
  FileUp,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react';
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
const RESUME_KEY = 'zaihong:ota-upload-resume';

type UploadPhase = 'idle' | 'uploading' | 'upgrading' | 'succeeded' | 'failed';

interface ResumeRecord {
  id: string;
  fileName: string;
  fileSize: number;
  lastModified: number;
}

function GetPhaseFromStatus(status: PrototypeOtaUpload['status']): UploadPhase {
  if (status === 'uploading') {
    return 'uploading';
  }
  if (status === 'validating' || status === 'upgrading') {
    return 'upgrading';
  }
  if (status === 'succeeded') {
    return 'succeeded';
  }
  if (status === 'failed') {
    return 'failed';
  }
  return 'idle';
}

function FormatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function GetResumeRecord(): ResumeRecord | null {
  try {
    const record = JSON.parse(localStorage.getItem(RESUME_KEY) || '') as ResumeRecord;
    return record?.id ? record : null;
  } catch {
    return null;
  }
}

function SaveResumeRecord(upload: PrototypeOtaUpload): void {
  const record: ResumeRecord = {
    id: upload.id,
    fileName: upload.fileName,
    fileSize: upload.fileSize,
    lastModified: upload.lastModified,
  };
  localStorage.setItem(RESUME_KEY, JSON.stringify(record));
}

function ClearResumeRecord(): void {
  localStorage.removeItem(RESUME_KEY);
}

function IsSameFile(file: File, upload: ResumeRecord | PrototypeOtaUpload): boolean {
  return file.name === upload.fileName && file.size === upload.fileSize && file.lastModified === upload.lastModified;
}

export default function OtaUpgradePage() {
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [upload, setUpload] = useState<PrototypeOtaUpload | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [validatingFile, setValidatingFile] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const completedNoticeRef = useRef<string | null>(null);

  const UpdateUploadStatus = useCallback((next: PrototypeOtaUpload) => {
    setUpload(next);
    setPhase(GetPhaseFromStatus(next.status));
    if (next.status === 'uploading' || next.status === 'validating' || next.status === 'upgrading') {
      SaveResumeRecord(next);
      return;
    }
    ClearResumeRecord();
  }, []);

  const PollUpload = useCallback(async (id: string) => {
    try {
      const next = await GetPrototypeOtaUpload(id);
      UpdateUploadStatus(next);
      if (next.status === 'succeeded' && completedNoticeRef.current !== next.id) {
        completedNoticeRef.current = next.id;
        toast.success('系统升级已完成，原型未执行真实设备重启');
      }
      return next;
    } catch (error) {
      ClearResumeRecord();
      setUpload(null);
      setPhase('idle');
      toast.error(error instanceof Error ? error.message : '获取升级状态失败');
      return null;
    }
  }, [UpdateUploadStatus]);

  useEffect(() => {
    const resume = GetResumeRecord();
    if (resume) {
      void PollUpload(resume.id);
    }
  }, [PollUpload]);

  useEffect(() => {
    if (!upload || (upload.status !== 'validating' && upload.status !== 'upgrading')) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      void PollUpload(upload.id);
    }, 1_500);
    return () => window.clearInterval(timer);
  }, [PollUpload, upload]);

  const TransferFile = useCallback(async (file: File, current: PrototypeOtaUpload) => {
    let active = current;
    while (active.receivedSize < file.size) {
      const remainingSize = file.size - active.receivedSize;
      active = await UploadPrototypeOtaChunk(active.id, Math.min(CHUNK_SIZE, remainingSize));
      UpdateUploadStatus(active);
    }
    const completed = await CompletePrototypeOtaUpload(active.id);
    UpdateUploadStatus(completed);
    toast.success('固件上传完成，已提交模拟升级任务');
  }, [UpdateUploadStatus]);

  const ConfirmUpload = useCallback(async () => {
    if (!selectedFile || transferring || validatingFile) {
      return;
    }
    try {
      setTransferring(true);
      const active = await CreatePrototypeOtaUpload({
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        lastModified: selectedFile.lastModified,
      });
      completedNoticeRef.current = null;
      UpdateUploadStatus(active);
      await TransferFile(selectedFile, active);
    } catch (error) {
      setPhase('failed');
      toast.error(error instanceof Error ? error.message : '固件上传失败');
    } finally {
      setTransferring(false);
    }
  }, [TransferFile, UpdateUploadStatus, selectedFile, transferring, validatingFile]);

  const SelectFile = useCallback(async (file: File) => {
    if (!file.name.toLocaleLowerCase().endsWith('.img')) {
      toast.error('仅支持 CT16 Rockchip OTA .img 包');
      return;
    }
    try {
      setValidatingFile(true);
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      const resume = GetResumeRecord();
      const resumableUpload = upload?.status === 'uploading' ? upload : resume;
      if (resumableUpload && !IsSameFile(file, resumableUpload)) {
        setReplacementFile(file);
        setReplaceDialogOpen(true);
        return;
      }
      setSelectedFile(file);
    } finally {
      setValidatingFile(false);
    }
  }, [upload]);

  const ReplaceUpload = useCallback(async () => {
    const resume = GetResumeRecord();
    const resumableUpload = upload?.status === 'uploading' ? upload : resume;
    if (!replacementFile || !resumableUpload) {
      return;
    }
    try {
      setReplacing(true);
      await CancelPrototypeOtaUpload(resumableUpload.id);
      ClearResumeRecord();
      setUpload(null);
      setPhase('idle');
      setSelectedFile(replacementFile);
      setReplacementFile(null);
      setReplaceDialogOpen(false);
      toast.success('未完成的固件上传已清理，请确认上传新文件');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '取消旧固件上传失败');
    } finally {
      setReplacing(false);
    }
  }, [replacementFile, upload]);

  const RetryUpgrade = useCallback(async () => {
    if (!upload) {
      return;
    }
    try {
      const retried = await RetryPrototypeOtaUpload(upload.id);
      completedNoticeRef.current = null;
      UpdateUploadStatus(retried);
      toast.success('系统升级已重新提交，原型不会重启设备');
    } catch (error) {
      setPhase('failed');
      toast.error(error instanceof Error ? error.message : '重新执行升级失败');
    }
  }, [UpdateUploadStatus, upload]);

  const uploadProgress = upload ? Math.round(upload.receivedSize / Math.max(upload.fileSize, 1) * 100) : 0;
  const isBusy = transferring || replacing || validatingFile || phase === 'upgrading';
  const resumePending = upload?.status === 'uploading' && !selectedFile;

  const OpenFilePicker = () => {
    if (!isBusy) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/40 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cpu className="size-4 text-primary" />
            OTA 固件升级
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragOver ? 'border-primary bg-primary/5' : 'border-border/40'
            } ${isBusy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            onClick={OpenFilePicker}
            onDragOver={(event) => {
              if (!isBusy) {
                event.preventDefault();
                setDragOver(true);
              }
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              if (!isBusy) {
                const file = event.dataTransfer.files[0];
                if (file) {
                  void SelectFile(file);
                }
              }
            }}
          >
            <FileUp className="mx-auto size-10 text-primary" />
            <p className="mt-3 text-sm">
              拖拽固件到此处，或{' '}
              <button
                type="button"
                className="text-primary hover:underline disabled:cursor-not-allowed disabled:no-underline"
                disabled={isBusy}
                onClick={(event) => {
                  event.stopPropagation();
                  OpenFilePicker();
                }}
              >
                点击选择
              </button>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">仅支持 CT16 Rockchip OTA .img 包，选择后将进行原型格式检查</p>
            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept=".img"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void SelectFile(file);
                }
                event.currentTarget.value = '';
              }}
            />
          </div>

          {selectedFile && !isBusy && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">已选择固件</p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{selectedFile.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{FormatBytes(selectedFile.size)} · 已通过原型格式检查</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={OpenFilePicker}>重新选择</Button>
                  <Button size="sm" onClick={() => void ConfirmUpload()}>
                    <Upload className="mr-1.5 size-4" />
                    确认上传
                  </Button>
                </div>
              </div>
              {upload?.status === 'uploading' && IsSameFile(selectedFile, upload) && (
                <p className="mt-3 flex items-center gap-2 text-xs text-warning">
                  <Upload className="size-3.5" />
                  确认上传后将从 {FormatBytes(upload.receivedSize)} 继续传输。
                </p>
              )}
            </div>
          )}

          {validatingFile && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
              <RefreshCw className="size-4 animate-spin" />
              正在检查 OTA 包格式和产品标识...
            </div>
          )}
          {resumePending && (
            <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
              <CircleAlert className="size-4" />
              上传已中断。请选择同一文件后确认上传以继续，或选择新文件并确认替换。
            </div>
          )}
          {upload && (phase === 'uploading' || (phase === 'idle' && upload.status === 'uploading' && selectedFile)) && (
            <ProgressInfo
              label={`正在传输 ${upload.fileName}（${FormatBytes(upload.receivedSize)} / ${FormatBytes(upload.fileSize)}）`}
              value={uploadProgress}
            />
          )}
          {phase === 'upgrading' && <ProgressInfo label="固件已接收，正在执行模拟系统升级..." value={100} />}

          {upload && (
            <div className="rounded-lg border border-border/30 bg-muted/30 p-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate">会话：{upload.id}</span>
                <Badge variant="outline">{upload.status}</Badge>
              </div>
              <p className="mt-2">修改时间：{new Date(upload.lastModified).toLocaleString()}</p>
              {upload.finalPath && <p className="mt-1 break-all">模拟固件路径：{upload.finalPath}</p>}
              {upload.error && <p className="mt-2 text-destructive">{upload.error}</p>}
            </div>
          )}

          {phase === 'succeeded' && (
            <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
              <ShieldCheck className="size-4" />
              系统升级已完成，原型未执行真实设备重启。
            </div>
          )}
          {phase === 'failed' && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <span className="flex items-center gap-2">
                <XCircle className="size-4" />
                系统升级失败
              </span>
              {upload && (
                <Button variant="outline" size="sm" onClick={() => void RetryUpgrade()}>
                  <RotateCcw className="mr-1 size-3.5" />
                  重新执行
                </Button>
              )}
            </div>
          )}
          {isBusy && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="size-3 animate-spin" />
              请勿关闭页面；刷新后可重新选择同一文件并确认上传以继续。
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={replaceDialogOpen} onOpenChange={(open) => !replacing && setReplaceDialogOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>替换未完成的固件上传？</AlertDialogTitle>
            <AlertDialogDescription>
              当前固件尚未上传完成。继续将删除已上传的模拟分片，随后需点击“确认上传”才会开始传输新文件。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={replacing}
              onClick={() => setReplacementFile(null)}
            >
              保留旧文件
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={replacing}
              onClick={(event) => {
                event.preventDefault();
                void ReplaceUpload();
              }}
            >
              {replacing ? '正在替换…' : '确认替换'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProgressInfo({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between gap-3 text-sm">
        <span className="min-w-0 truncate">{label}</span>
        <span className="font-mono">{value}%</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}
