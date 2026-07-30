/*
 * Copyright (c) 2026 Hunan OpenValley Digital Industry Development Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Download,
  FileSpreadsheet,
  Loader2,
  RadioTower,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LOCAL_CONTROLLER_SERIAL_NUMBER, MOCK_DEVICE_CONTROLLERS } from '@/data/device-controllers';
import type { IDeviceInstance } from '@/data/device-instances';
import type { IDeviceModel } from '@/data/device-models';
import {
  BuildDeviceBatchImportResult,
  DownloadDeviceImportTemplate,
  ParseDeviceImportWorkbook,
  type IDeviceBatchImportResult,
  type IDeviceBatchImportRow,
} from '../deviceBatchImport';

type BatchImportStep = 'upload' | 'preview' | 'running' | 'report';

interface BatchDeviceImportDialogProps {
  open: boolean
  devices: IDeviceInstance[]
  models: IDeviceModel[]
  onAddLocalDevices: (rows: IDeviceBatchImportRow[]) => void
  onClose: () => void
}

function GetRouteLabel(row: IDeviceBatchImportRow): string {
  if (row.route === 'local') {
    return '本机添加';
  }
  if (row.route === 'softbus') {
    return '软总线通知';
  }
  return '无法分发';
}

function GetRouteClassName(row: IDeviceBatchImportRow): string {
  if (row.route === 'local') {
    return 'bg-primary/10 text-primary';
  }
  if (row.route === 'softbus') {
    return 'bg-info/10 text-info';
  }
  return 'bg-destructive/10 text-destructive';
}

function GetControllerLabel(row: IDeviceBatchImportRow): string {
  return row.targetController ? `${row.targetController.name} · ${row.controllerSerialNumber}` : row.controllerSerialNumber || '未填写';
}

function ImportStepIndicator({ currentStep }: { currentStep: BatchImportStep }) {
  const steps: Array<{ key: BatchImportStep; label: string }> = [
    { key: 'upload', label: '上传模板' },
    { key: 'preview', label: '预览校验' },
    { key: 'running', label: '执行添加' },
    { key: 'report', label: '查看报告' },
  ];
  const currentIndex = steps.findIndex((step) => step.key === currentStep);
  return (
    <div className="grid grid-cols-4 gap-2 rounded-xl border border-border/50 bg-muted/20 p-3">
      {steps.map((step, index) => {
        const isCurrent = index === currentIndex;
        const isFinished = index < currentIndex;
        return (
          <div key={step.key} className="flex items-center gap-2 text-xs">
            <div className={`grid size-6 shrink-0 place-items-center rounded-full ${isCurrent ? 'bg-primary text-primary-foreground' : isFinished ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
              {isFinished ? <CheckCircle2 className="size-3.5" /> : index + 1}
            </div>
            <span className={isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'}>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function PreviewTable({ rows }: { rows: IDeviceBatchImportRow[] }) {
  return (
    <div className="max-h-[360px] overflow-auto rounded-xl border border-border/50">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>行号</TableHead>
            <TableHead>设备</TableHead>
            <TableHead>设备模型</TableHead>
            <TableHead>设备 SN</TableHead>
            <TableHead>目标控制器</TableHead>
            <TableHead>处理路径</TableHead>
            <TableHead>校验结果</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.rowNumber}>
              <TableCell className="text-muted-foreground">{row.rowNumber}</TableCell>
              <TableCell className="font-medium">{row.name || '未填写'}</TableCell>
              <TableCell>{row.modelName || '未填写'}</TableCell>
              <TableCell><span className="font-mono text-xs">{row.serialNumber || '未填写'}</span></TableCell>
              <TableCell className="max-w-[220px] truncate text-xs">{GetControllerLabel(row)}</TableCell>
              <TableCell><Badge className={GetRouteClassName(row)}>{GetRouteLabel(row)}</Badge></TableCell>
              <TableCell>
                {row.errors.length === 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 className="size-3.5" />可添加</span>
                ) : (
                  <span className="inline-flex max-w-[250px] items-start gap-1 text-xs text-destructive"><CircleAlert className="mt-0.5 size-3.5 shrink-0" /><span className="truncate" title={row.errors.join('；')}>{row.errors.join('；')}</span></span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ResultTable({ results }: { results: IDeviceBatchImportResult[] }) {
  return (
    <div className="max-h-[360px] overflow-auto rounded-xl border border-border/50">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>行号</TableHead>
            <TableHead>设备 SN</TableHead>
            <TableHead>目标控制器</TableHead>
            <TableHead>处理路径</TableHead>
            <TableHead>结果</TableHead>
            <TableHead>说明</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => (
            <TableRow key={result.row.rowNumber}>
              <TableCell>{result.row.rowNumber}</TableCell>
              <TableCell><span className="font-mono text-xs">{result.row.serialNumber || '未填写'}</span></TableCell>
              <TableCell className="max-w-[220px] truncate text-xs">{GetControllerLabel(result.row)}</TableCell>
              <TableCell><Badge className={GetRouteClassName(result.row)}>{GetRouteLabel(result.row)}</Badge></TableCell>
              <TableCell>
                {result.status === 'success' ? (
                  <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 className="size-3.5" />成功</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-destructive"><CircleAlert className="size-3.5" />失败</span>
                )}
              </TableCell>
              <TableCell className={result.status === 'success' ? 'text-xs text-muted-foreground' : 'max-w-[280px] text-xs text-destructive'}>{result.message}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * 设备实例批量添加对话框。
 */
export default function BatchDeviceImportDialog({
  open,
  devices,
  models,
  onAddLocalDevices,
  onClose,
}: BatchDeviceImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<BatchImportStep>('upload');
  const [fileName, setFileName] = useState('');
  const [previewRows, setPreviewRows] = useState<IDeviceBatchImportRow[]>([]);
  const [results, setResults] = useState<IDeviceBatchImportResult[]>([]);
  const [processedRows, setProcessedRows] = useState(0);
  const [isParsing, setIsParsing] = useState(false);

  const resetState = () => {
    setStep('upload');
    setFileName('');
    setPreviewRows([]);
    setResults([]);
    setProcessedRows(0);
    setIsParsing(false);
  };

  useEffect(() => {
    if (open) {
      resetState();
    }
  }, [open]);

  useEffect(() => {
    if (step !== 'running' || processedRows >= previewRows.length) {
      return;
    }
    const timerId = window.setTimeout(() => {
      const result = BuildDeviceBatchImportResult(previewRows[processedRows]);
      setResults((current) => [...current, result]);
      setProcessedRows((current) => current + 1);
    }, 360);
    return () => window.clearTimeout(timerId);
  }, [previewRows, processedRows, step]);

  useEffect(() => {
    if (step !== 'running' || processedRows < previewRows.length) {
      return;
    }
    const localRows = results
      .filter((result) => result.status === 'success' && result.row.route === 'local')
      .map((result) => result.row);
    onAddLocalDevices(localRows);
    setStep('report');
  }, [onAddLocalDevices, previewRows.length, processedRows, results, step]);

  const validRows = previewRows.filter((row) => row.errors.length === 0);
  const invalidRows = previewRows.length - validRows.length;
  const successfulResults = results.filter((result) => result.status === 'success');
  const failedResults = results.filter((result) => result.status === 'failed');
  const localResults = successfulResults.filter((result) => result.row.route === 'local');
  const softbusResults = successfulResults.filter((result) => result.row.route === 'softbus');
  const progressValue = previewRows.length > 0 ? (processedRows / previewRows.length) * 100 : 0;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    if (!/\.xlsx$/i.test(file.name)) {
      toast.error('请选择 .xlsx 格式的 Excel 文件');
      return;
    }
    setIsParsing(true);
    try {
      const rows = await ParseDeviceImportWorkbook(
        file,
        models,
        devices,
        MOCK_DEVICE_CONTROLLERS,
        LOCAL_CONTROLLER_SERIAL_NUMBER,
      );
      if (rows.length === 0) {
        toast.error('Excel 中没有可导入的设备记录');
        return;
      }
      setFileName(file.name);
      setPreviewRows(rows);
      setStep('preview');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Excel 文件解析失败');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen && step !== 'running') {
      onClose();
    }
  };

  const handleRestart = () => {
    resetState();
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col overflow-hidden border-border/40 bg-card/95" showCloseButton={step !== 'running'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="size-5 text-primary" />批量添加设备</DialogTitle>
          <DialogDescription>上传 Excel 模板后，系统按控制器 SN 号分发设备，并生成逐行添加报告。</DialogDescription>
        </DialogHeader>

        <ImportStepIndicator currentStep={step} />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {step === 'upload' && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><FileSpreadsheet className="size-5" /></div>
                  <div>
                    <div className="font-semibold">使用批量添加模板</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">模板包含控制器 SN、设备模型、设备 SN、通信信息等字段。上传后会先校验并预览，确认后才开始添加。</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="outline" className="h-auto justify-start gap-3 p-4" onClick={DownloadDeviceImportTemplate}>
                  <Download className="size-5 text-primary" />
                  <span className="text-left"><span className="block font-semibold">下载 Excel 模板</span><span className="mt-1 block text-xs font-normal text-muted-foreground">包含设备实例和填写说明</span></span>
                </Button>
                <Button className="h-auto justify-start gap-3 p-4" onClick={() => fileInputRef.current?.click()} disabled={isParsing}>
                  {isParsing ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
                  <span className="text-left"><span className="block font-semibold">上传 Excel 文件</span><span className="mt-1 block text-xs font-normal opacity-80">仅支持 .xlsx 格式</span></span>
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground"><RadioTower className="size-3.5 text-primary" />本机控制器 SN：<span className="font-mono text-foreground">{LOCAL_CONTROLLER_SERIAL_NUMBER}</span></div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4 py-2">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 p-4">
                <div><div className="flex items-center gap-2 font-semibold"><FileSpreadsheet className="size-4 text-primary" />{fileName}</div><div className="mt-1 text-xs text-muted-foreground">共解析 {previewRows.length} 条设备记录</div></div>
                <div className="flex flex-wrap gap-2 text-xs"><Badge className="bg-success/10 text-success">{validRows.length} 条可添加</Badge><Badge className={invalidRows > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}>{invalidRows} 条待修正</Badge></div>
              </div>
              <PreviewTable rows={previewRows} />
            </div>
          )}

          {step === 'running' && (
            <div className="space-y-5 py-4">
              <div className="text-center"><div className="text-lg font-semibold">正在添加设备</div><p className="mt-1 text-sm text-muted-foreground">本机设备直接添加，其它控制器通过软总线通知</p></div>
              <div className="space-y-2"><div className="flex items-center justify-between text-sm"><span>处理进度</span><span className="font-mono text-primary">{processedRows} / {previewRows.length}</span></div><Progress value={progressValue} className="h-2.5" /></div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-xl border border-border/50 bg-muted/20 p-3"><div className="text-xs text-muted-foreground">已处理</div><div className="mt-1 text-xl font-bold">{processedRows}</div></div><div className="rounded-xl border border-border/50 bg-muted/20 p-3"><div className="text-xs text-muted-foreground">本机添加</div><div className="mt-1 text-xl font-bold text-primary">{localResults.length}</div></div><div className="rounded-xl border border-border/50 bg-muted/20 p-3"><div className="text-xs text-muted-foreground">软总线通知</div><div className="mt-1 text-xl font-bold text-info">{softbusResults.length}</div></div><div className="rounded-xl border border-border/50 bg-muted/20 p-3"><div className="text-xs text-muted-foreground">失败</div><div className="mt-1 text-xl font-bold text-destructive">{failedResults.length}</div></div></div>
              {results.length > 0 && <ResultTable results={results.slice(-5)} />}
            </div>
          )}

          {step === 'report' && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-success/20 bg-success/[0.03] p-4"><div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-5 text-success" />批量添加完成</div><p className="mt-1 text-sm text-muted-foreground">共处理 {results.length} 条记录，详细结果如下。</p></div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-xl border border-border/50 bg-muted/20 p-3"><div className="text-xs text-muted-foreground">总记录</div><div className="mt-1 text-xl font-bold">{results.length}</div></div><div className="rounded-xl border border-border/50 bg-muted/20 p-3"><div className="text-xs text-muted-foreground">本机成功</div><div className="mt-1 text-xl font-bold text-primary">{localResults.length}</div></div><div className="rounded-xl border border-border/50 bg-muted/20 p-3"><div className="text-xs text-muted-foreground">软总线成功</div><div className="mt-1 text-xl font-bold text-info">{softbusResults.length}</div></div><div className="rounded-xl border border-border/50 bg-muted/20 p-3"><div className="text-xs text-muted-foreground">失败</div><div className="mt-1 text-xl font-bold text-destructive">{failedResults.length}</div></div></div>
              <ResultTable results={results} />
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'upload' && <Button variant="outline" onClick={onClose}>取消</Button>}
          {step === 'preview' && <><Button variant="outline" onClick={handleRestart}><ArrowLeft className="mr-1.5 size-4" />重新上传</Button><Button onClick={() => { setResults([]); setProcessedRows(0); setStep('running'); }} disabled={validRows.length === 0}>开始添加（{validRows.length} 条）</Button></>}
          {step === 'report' && <><Button variant="outline" onClick={handleRestart}><RotateCcw className="mr-1.5 size-4" />再次导入</Button><Button onClick={onClose}>关闭报告</Button></>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
