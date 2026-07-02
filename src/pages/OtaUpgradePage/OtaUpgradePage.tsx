import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Upload,
  Package,
  CheckCircle,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Clock,
  HardDrive,
  Cpu,
  FileUp,
  Shield,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { MOCK_OTA_RECORDS, type IOtaUpgradeRecord } from '@/data/ota';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  success: { icon: CheckCircle, color: 'text-success', label: '升级成功' },
  failed: { icon: XCircle, color: 'text-destructive', label: '升级失败' },
  rolled_back: { icon: RotateCcw, color: 'text-warning', label: '已回滚' },
  in_progress: { icon: RefreshCw, color: 'text-info', label: '进行中' },
};

const UPGRADE_STAGES = [
  '正在备份当前分区...',
  '正在校验升级包完整性...',
  '正在写入新固件到备用分区...',
  '正在验证固件签名...',
  '切换启动分区...',
  '升级完成',
];

export default function OtaUpgradePage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<'pending' | 'pass' | 'fail'>('pending');
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeProgress, setUpgradeProgress] = useState(0);
  const [upgradeStage, setUpgradeStage] = useState(0);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.bin') && !file.name.endsWith('.img')) {
      toast.error('仅支持 .bin 或 .img 格式的固件文件');
      return;
    }
    setUploadedFile(file);
    setValidationResult('pending');
    setValidating(true);
    setTimeout(() => {
      setValidating(false);
      setValidationResult('pass');
      toast.success('升级包校验通过');
    }, 2000);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const startUpgrade = useCallback(() => {
    setUpgrading(true);
    setUpgradeProgress(0);
    setUpgradeStage(0);

    const totalDuration = 10000;
    const steps = UPGRADE_STAGES.length;
    const stepDuration = totalDuration / steps;
    const updateInterval = 100;

    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += updateInterval;
      const progress = Math.min(100, Math.round((elapsed / totalDuration) * 100));
      const stage = Math.min(steps - 1, Math.floor(elapsed / stepDuration));
      setUpgradeProgress(progress);
      setUpgradeStage(stage);

      if (elapsed >= totalDuration) {
        clearInterval(timer);
        setUpgrading(false);
        toast.success('固件升级完成！设备将自动重启以应用新固件。');
      }
    }, updateInterval);
  }, []);

  const startRollback = useCallback(() => {
    setRollingBack(true);
    setShowRollbackDialog(false);
    let progress = 0;
    const timer = setInterval(() => {
      progress += 5;
      if (progress >= 100) {
        clearInterval(timer);
        setRollingBack(false);
        toast.success('回滚完成，已恢复到上一版本固件。');
      }
    }, 200);
  }, []);

  return (
    <div className="space-y-6">
      {/* Current Version */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border/40 bg-card/60 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="size-4 text-primary" />
              当前固件信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Package, label: '固件版本', value: 'v3.2.1' },
                { icon: Clock, label: '构建日期', value: '2025-01-15' },
                { icon: HardDrive, label: '主分区', value: 'A (v3.2.1)' },
                { icon: HardDrive, label: '备用分区', value: 'B (v3.1.5)' },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-lg bg-muted/40 border border-border/30">
                  <div className="flex items-center gap-1.5 mb-1">
                    <item.icon className="size-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                  <div className="text-sm font-semibold">{item.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dual Partition Info */}
        <Card className="border-border/40 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              双分区升级
            </CardTitle>
            <CardDescription className="text-xs">
              系统采用 A/B 双分区架构，升级时新固件写入备用分区，验证通过后切换启动分区。如遇问题可一键回滚至上一版本。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-3 text-xs">
              <div className="px-3 py-2 rounded-lg bg-success/10 border border-success/30 text-success font-medium">
                主分区 A<br />v3.2.1 (运行中)
              </div>
              <Zap className="size-4 text-primary" />
              <div className="px-3 py-2 rounded-lg bg-muted/40 border border-border/30 text-muted-foreground font-medium">
                备用分区 B<br />v3.1.5 (待机)
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Zone */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="size-4 text-primary" />
            固件升级包上传
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver
                ? 'border-primary bg-primary/5'
                : uploadedFile
                  ? 'border-success/50 bg-success/5'
                  : 'border-border/40 hover:border-primary/30'
            }`}
          >
            {uploadedFile ? (
              <div className="space-y-3">
                <FileUp className="size-10 text-success mx-auto" />
                <div>
                  <p className="text-sm font-medium">{uploadedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUploadedFile(null);
                    setValidationResult('pending');
                  }}
                >
                  重新选择
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="size-10 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    拖拽固件文件到此处，或
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary hover:underline mx-1"
                    >
                      点击选择
                    </button>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    支持 .bin / .img 格式，最大 500MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".bin,.img"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </div>
            )}
          </div>

          {/* Validation */}
          {validating && (
            <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-info/10 border border-info/30">
              <RefreshCw className="size-4 text-info animate-spin" />
              <span className="text-sm text-info">正在校验升级包...</span>
            </div>
          )}
          {validationResult === 'pass' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-3"
            >
              <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/30">
                <CheckCircle className="size-4 text-success" />
                <span className="text-sm text-success">校验通过</span>
              </div>
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-2">
                <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-warning">升级风险提示</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    升级过程将重启设备，请确保无关键任务运行。建议在业务低峰期执行升级操作。
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/40 border border-border/30">
                  <span className="text-muted-foreground">升级包版本: </span>
                  <span className="font-medium">v3.3.0</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border/30">
                  <span className="text-muted-foreground">兼容型号: </span>
                  <span className="font-medium">EG-8000 / EG-7000</span>
                </div>
              </div>
              <Button
                onClick={startUpgrade}
                disabled={upgrading}
                className="w-full"
              >
                {upgrading ? (
                  <>
                    <RefreshCw className="size-4 mr-2 animate-spin" />
                    升级中...
                  </>
                ) : (
                  <>
                    <Zap className="size-4 mr-2" />
                    开始升级
                  </>
                )}
              </Button>
            </motion.div>
          )}
          {validationResult === 'fail' && (
            <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <XCircle className="size-4 text-destructive" />
              <span className="text-sm text-destructive">校验失败：固件签名不匹配</span>
            </div>
          )}

          {/* Upgrade Progress */}
          {upgrading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-3"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{UPGRADE_STAGES[upgradeStage]}</span>
                <span className="font-mono font-medium">{upgradeProgress}%</span>
              </div>
              <Progress value={upgradeProgress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                {UPGRADE_STAGES.map((_, i) => (
                  <span
                    key={i}
                    className={i <= upgradeStage ? 'text-primary' : ''}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Rollback */}
      {!upgrading && (
        <Card className="border-border/40 bg-card/60">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="size-4 text-warning" />
              <span className="text-sm">需要回滚到上一版本？</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRollbackDialog(true)}
              disabled={rollingBack}
            >
              {rollingBack ? (
                <>
                  <RefreshCw className="size-3.5 mr-1 animate-spin" />
                  回滚中...
                </>
              ) : (
                '执行回滚'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Rollback Dialog */}
      <Dialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <DialogContent className="border-border/40 bg-card/95">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-warning" />
              确认回滚
            </DialogTitle>
            <DialogDescription>
              回滚操作将把系统恢复到 v3.1.5 版本。回滚过程约需 2 分钟，期间设备将重启。是否继续？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRollbackDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={startRollback}>
              确认回滚
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            升级历史记录
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">版本号</TableHead>
                  <TableHead className="whitespace-nowrap">构建日期</TableHead>
                  <TableHead className="whitespace-nowrap">状态</TableHead>
                  <TableHead className="whitespace-nowrap">操作人</TableHead>
                  <TableHead className="whitespace-nowrap">升级时间</TableHead>
                  <TableHead className="whitespace-nowrap">说明</TableHead>
                  <TableHead className="whitespace-nowrap">分区信息</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_OTA_RECORDS.map((record, i) => {
                  const cfg = STATUS_CONFIG[record.status];
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-sm font-medium">
                        {record.version}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {record.buildDate}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className={`text-xs gap-1 ${cfg.color}`}>
                          <Icon className="size-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {record.operator}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {record.upgradeTime}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm truncate block max-w-[200px]">
                          {record.description}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {record.partitionInfo}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
