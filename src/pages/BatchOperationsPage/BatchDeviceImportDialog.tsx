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
import { ArrowLeft, CheckCircle2, CircleAlert, Download, FileSpreadsheet, Loader2, RotateCcw, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { batchAddDeviceInstances } from '@/api/deviceInstances';
import { getModules } from '@/api/topology';
import {
  BuildDeviceBatchImportResult,
  DownloadDeviceImportTemplate,
  ParseDeviceImportWorkbook,
  type IDeviceBatchImportDevice,
  type IDeviceBatchImportModel,
  type IDeviceBatchImportModule,
  type IDeviceBatchImportResult,
  type IDeviceBatchImportRow,
} from './deviceBatchImport';

type BatchImportStep = 'upload' | 'preview' | 'running' | 'report';

interface BatchDeviceImportDialogProps {
  open: boolean;
  devices: IDeviceBatchImportDevice[];
  models: IDeviceBatchImportModel[];
  localControllerSN?: string;
  onAddLocalDevices?: (rows: IDeviceBatchImportRow[]) => void;
  onComplete: (results: IDeviceBatchImportResult[]) => Promise<void>;
  onClose: () => void;
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
            <div
              className={`grid size-6 shrink-0 place-items-center rounded-full ${
                isCurrent ? 'bg-primary text-primary-foreground' : isFinished ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
              }`}
            >
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
            <TableHead>目标控制器 SN</TableHead>
            <TableHead>设备</TableHead>
            <TableHead>设备模型</TableHead>
            <TableHead>设备 SN</TableHead>
            <TableHead>校验结果</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.rowNumber}>
              <TableCell className="text-muted-foreground">{row.rowNumber}</TableCell>
              <TableCell className="font-mono text-xs">{row.targetControllerSN || '未填写'}</TableCell>
              <TableCell className="font-medium">{row.deviceType || '未填写'}</TableCell>
              <TableCell>{row.deviceModel || '未填写'}</TableCell>
              <TableCell>
                <span className="font-mono text-xs">{row.serialNumber || '未填写'}</span>
              </TableCell>
              <TableCell>
                {row.targetControllerSN && !row.targetMatched ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <CircleAlert className="size-3.5" />
                    目标 SN 不匹配，已跳过
                  </span>
                ) : row.errors.length === 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs text-success">
                    <CheckCircle2 className="size-3.5" />
                    可添加
                  </span>
                ) : (
                  <span className="inline-flex max-w-[250px] items-start gap-1 text-xs text-destructive">
                    <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
                    <span className="truncate" title={row.errors.join('；')}>
                      {row.errors.join('；')}
                    </span>
                  </span>
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
            <TableHead>目标控制器 SN</TableHead>
            <TableHead>设备 SN</TableHead>
            <TableHead>结果</TableHead>
            <TableHead>说明</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => (
            <TableRow key={result.row.rowNumber}>
              <TableCell>{result.row.rowNumber}</TableCell>
              <TableCell className="font-mono text-xs">{result.row.targetControllerSN || '未填写'}</TableCell>
              <TableCell>
                <span className="font-mono text-xs">{result.row.serialNumber || '未填写'}</span>
              </TableCell>
              <TableCell>
                {result.status === 'success' ? (
                  <span className="inline-flex items-center gap-1 text-xs text-success">
                    <CheckCircle2 className="size-3.5" />
                    成功
                  </span>
                ) : result.status === 'skipped' ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <CircleAlert className="size-3.5" />
                    已跳过
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-destructive">
                    <CircleAlert className="size-3.5" />
                    失败
                  </span>
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
  localControllerSN = '',
  onAddLocalDevices,
  onComplete,
  onClose,
}: BatchDeviceImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<BatchImportStep>('upload');
  const [fileName, setFileName] = useState('');
  const [previewRows, setPreviewRows] = useState<IDeviceBatchImportRow[]>([]);
  const [results, setResults] = useState<IDeviceBatchImportResult[]>([]);
  const [processedRows, setProcessedRows] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const processingRef = useRef(false);
  const completedRef = useRef(false);

  const resetState = () => {
    setStep('upload');
    setFileName('');
    setPreviewRows([]);
    setResults([]);
    setProcessedRows(0);
    setIsParsing(false);
    processingRef.current = false;
    completedRef.current = false;
  };

  useEffect(() => {
    if (open) {
      resetState();
    }
  }, [open]);

  useEffect(() => {
    if (step !== 'running' || processingRef.current) {
      return;
    }
    processingRef.current = true;
    const validRows = previewRows.filter((row) => row.errors.length === 0);
    void (async () => {
      const invalidResults = previewRows.filter((row) => row.errors.length > 0).map(BuildDeviceBatchImportResult);
      try {
        const response = validRows.length === 0 ? { results: [] } : await batchAddDeviceInstances(validRows.map((row) => ({
          name: row.serialNumber,
          sn: row.serialNumber,
          type: row.deviceType,
          vendor: row.vendor,
          model: row.deviceModel,
          index: row.index,
          devPoint: row.devPoint,
          groupName: row.groupName,
          info: row.info,
          remark: '',
        })));
        const resultBySN = new Map(response.results.map((result) => [result.sn, result]));
        const validResults = validRows.map((row) => {
          const responseResult = resultBySN.get(row.serialNumber);
          return responseResult
            ? { row, status: responseResult.status, message: responseResult.message }
            : { row, status: 'failed' as const, message: '未收到设备导入结果' };
        });
        setResults([...invalidResults, ...validResults].sort((left, right) => left.row.rowNumber - right.row.rowNumber));
      } catch (error) {
        const message = error instanceof Error ? error.message : '批量添加设备失败';
        setResults([...invalidResults, ...validRows.map((row) => ({ row, status: 'failed' as const, message }))]);
      } finally {
        processingRef.current = false;
        setProcessedRows(previewRows.length);
      }
    })();
  }, [previewRows, step]);

  useEffect(() => {
    if (step !== 'running' || processedRows < previewRows.length) {
      return;
    }
    if (completedRef.current) {
      return;
    }
    completedRef.current = true;
    if (onAddLocalDevices) {
      const localRows = results
        .filter((result) => result.status === 'success' && result.row.targetMatched)
        .map((result) => result.row);
      onAddLocalDevices(localRows);
    }
    void onComplete(results).finally(() => setStep('report'));
  }, [onAddLocalDevices, onComplete, previewRows.length, processedRows, results, step]);

  const validRows = previewRows.filter((row) => row.errors.length === 0);
  const invalidRows = previewRows.length - validRows.length;
  const successfulResults = results.filter((result) => result.status === 'success');
  const failedResults = results.filter((result) => result.status === 'failed');
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
      if (!localControllerSN) {
        throw new Error('未读取到本机控制器 SN，暂时无法校验目标控制器');
      }
      let modules: IDeviceBatchImportModule[];
      try {
        const response = await getModules();
        modules = response.modules
          .filter((module) => module.groupIndex > 0 && module.channelCount > 0)
          .sort((left, right) => left.groupIndex - right.groupIndex)
          .filter((module, index, items) => index === 0 || items[index - 1].groupIndex !== module.groupIndex)
          .map((module) => ({
            groupIndex: module.groupIndex,
            moduleType: module.moduleType,
            channelCount: module.channelCount,
            funcMask: module.funcMask,
            ports: module.ports.map((port) => ({ index: port.index, direction: port.direction })),
          }));
      } catch {
        throw new Error('读取控制器硬件资源失败，无法校验 info，请稍后重试');
      }
      const rows = await ParseDeviceImportWorkbook(file, models, devices, localControllerSN, modules);
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

  const handleDownloadTemplate = () => {
    if (models.length === 0) {
      toast.error('未检测到设备模型，请先导入或同步设备模型');
      return;
    }
    DownloadDeviceImportTemplate(models, localControllerSN);
  };

  const handleRestart = () => {
    resetState();
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col overflow-hidden border-border/40 bg-card/95" showCloseButton={step !== 'running'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-primary" />
            批量添加设备
          </DialogTitle>
          <DialogDescription>仅导入目标控制器 SN 与本机 SN 一致的行，其他行会自动跳过。</DialogDescription>
        </DialogHeader>

        <ImportStepIndicator currentStep={step} />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {step === 'upload' && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <FileSpreadsheet className="size-5" />
                  </div>
                  <div>
                    <div className="font-semibold">使用批量添加模板</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      模板按控制器已加载的设备模型生成，填写设备 SN、目标控制器 SN 与现场参数后可导入。
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant="outline"
                  className="h-auto justify-start gap-3 p-4"
                  onClick={handleDownloadTemplate}
                  disabled={!localControllerSN || models.length === 0}
                >
                  <Download className="size-5 text-primary" />
                  <span className="text-left">
                    <span className="block font-semibold">下载 Excel 模板</span>
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">按控制器实际模型生成配置示例</span>
                  </span>
                </Button>
                <Button className="h-auto justify-start gap-3 p-4" onClick={() => fileInputRef.current?.click()} disabled={isParsing}>
                  {isParsing ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
                  <span className="text-left">
                    <span className="block font-semibold">上传 Excel 文件</span>
                    <span className="mt-1 block text-xs font-normal opacity-80">仅支持 .xlsx 格式</span>
                  </span>
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4 py-2">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 p-4">
                <div>
                  <div className="flex items-center gap-2 font-semibold">
                    <FileSpreadsheet className="size-4 text-primary" />
                    {fileName}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">共解析 {previewRows.length} 条设备记录</div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge className="bg-success/10 text-success">{validRows.length} 条可添加</Badge>
                  <Badge className={invalidRows > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}>{invalidRows} 条待修正</Badge>
                </div>
              </div>
              <PreviewTable rows={previewRows} />
            </div>
          )}

          {step === 'running' && (
            <div className="space-y-5 py-4">
              <div className="text-center">
                <div className="text-lg font-semibold">正在添加设备</div>
                <p className="mt-1 text-sm text-muted-foreground">正在向当前控制器添加设备</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>处理进度</span>
                  <span className="font-mono text-primary">
                    {processedRows} / {previewRows.length}
                  </span>
                </div>
                <Progress value={progressValue} className="h-2.5" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">已处理</div>
                  <div className="mt-1 text-xl font-bold">{processedRows}</div>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">成功</div>
                  <div className="mt-1 text-xl font-bold text-primary">{successfulResults.length}</div>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">失败</div>
                  <div className="mt-1 text-xl font-bold text-destructive">{failedResults.length}</div>
                </div>
              </div>
              {results.length > 0 && <ResultTable results={results.slice(-5)} />}
            </div>
          )}

          {step === 'report' && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-success/20 bg-success/[0.03] p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="size-5 text-success" />
                  批量添加完成
                </div>
                <p className="mt-1 text-sm text-muted-foreground">共处理 {results.length} 条记录，详细结果如下。</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">总记录</div>
                  <div className="mt-1 text-xl font-bold">{results.length}</div>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">成功</div>
                  <div className="mt-1 text-xl font-bold text-primary">{successfulResults.length}</div>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">失败</div>
                  <div className="mt-1 text-xl font-bold text-destructive">{failedResults.length}</div>
                </div>
              </div>
              <ResultTable results={results} />
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={handleRestart}>
                <ArrowLeft className="mr-1.5 size-4" />
                重新上传
              </Button>
              <Button
                onClick={() => {
                  setResults([]);
                  setProcessedRows(0);
                  completedRef.current = false;
                  setStep('running');
                }}
                disabled={validRows.length === 0}
              >
                开始添加（{validRows.length} 条）
              </Button>
            </>
          )}
          {step === 'report' && (
            <>
              <Button variant="outline" onClick={handleRestart}>
                <RotateCcw className="mr-1.5 size-4" />
                再次导入
              </Button>
              <Button onClick={onClose}>关闭报告</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
