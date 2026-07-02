import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
} from '@/components/ui/dialog';
import {
  ScrollText,
  Download,
  Eye,
  ArrowUpDown,
  Info,
  AlertTriangle,
  AlertCircle,
  Bug,
  FileText,
} from 'lucide-react';
import { MOCK_LOGS, type ILogEntry } from '@/data/logs';
import { toast } from 'sonner';

const LEVEL_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
  INFO: { icon: Info, color: 'text-info', bgColor: 'bg-info/10 border-info/30' },
  WARN: { icon: AlertTriangle, color: 'text-warning', bgColor: 'bg-warning/10 border-warning/30' },
  ERROR: { icon: AlertCircle, color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/30' },
  DEBUG: { icon: Bug, color: 'text-muted-foreground', bgColor: 'bg-muted/40 border-border/30' },
};

const LEVEL_TABS = ['全部', 'INFO', 'WARN', 'ERROR', 'DEBUG'] as const;

export default function LogViewerPage() {
  const [levelFilter, setLevelFilter] = useState<string>('全部');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortAsc, setSortAsc] = useState(false);
  const [previewLog, setPreviewLog] = useState<ILogEntry | null>(null);

  const filteredLogs = useMemo(() => {
    let logs = [...MOCK_LOGS];
    if (levelFilter !== '全部') {
      logs = logs.filter((l) => l.level === levelFilter);
    }
    logs.sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      return sortAsc ? ta - tb : tb - ta;
    });
    return logs;
  }, [levelFilter, sortAsc]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLogs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLogs.map((l) => l.id)));
    }
  };

  const handleExport = (logs: ILogEntry[]) => {
    const content = logs
      .map((l) => `[${l.timestamp}] [${l.level}] [${l.source}] ${l.summary}\n${l.detail}\n${'─'.repeat(60)}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_export_${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${logs.length} 条日志`);
  };

  const handleBatchExport = () => {
    const selected = filteredLogs.filter((l) => selectedIds.has(l.id));
    if (selected.length === 0) {
      toast.info('请先选择要导出的日志');
      return;
    }
    handleExport(selected);
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <Card className="border-border/40 bg-card/60">
        <CardContent className="flex items-center justify-between p-3 flex-wrap gap-3">
          <div className="flex items-center gap-1.5 bg-muted/40 rounded-lg p-1">
            {LEVEL_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setLevelFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  levelFilter === tab
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortAsc(!sortAsc)}
            >
              <ArrowUpDown className="size-3.5 mr-1" />
              {sortAsc ? '正序' : '倒序'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleBatchExport}>
              <Download className="size-3.5 mr-1" />
              批量导出 ({selectedIds.size})
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport(filteredLogs)}>
              <FileText className="size-3.5 mr-1" />
              导出全部
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Log Table */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="size-4 text-primary" />
            日志列表
            <span className="text-xs text-muted-foreground font-normal">
              ({filteredLogs.length} 条)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap w-10">
                    <Checkbox
                      checked={filteredLogs.length > 0 && selectedIds.size === filteredLogs.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="whitespace-nowrap w-[160px]">时间</TableHead>
                  <TableHead className="whitespace-nowrap w-[80px]">级别</TableHead>
                  <TableHead className="whitespace-nowrap w-[120px]">来源</TableHead>
                  <TableHead className="whitespace-nowrap">摘要</TableHead>
                  <TableHead className="whitespace-nowrap text-right w-[80px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      暂无匹配的日志记录
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log, i) => {
                    const cfg = LEVEL_CONFIG[log.level];
                    const Icon = cfg.icon;
                    return (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.02 }}
                        className="border-b border-border/30"
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(log.id)}
                            onCheckedChange={() => toggleSelect(log.id)}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm font-mono text-muted-foreground">
                          {log.timestamp}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className={`text-xs gap-1 ${cfg.bgColor}`}>
                            <Icon className="size-3" />
                            <span className={cfg.color}>{log.level}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {log.source}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm truncate block max-w-[300px]">
                            {log.summary}
                          </span>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setPreviewLog(log)}
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </TableCell>
                      </motion.tr>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewLog} onOpenChange={() => setPreviewLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] border-border/40 bg-card/95">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {previewLog && (() => {
                const cfg = LEVEL_CONFIG[previewLog.level];
                const Icon = cfg.icon;
                return (
                  <>
                    <Icon className={`size-4 ${cfg.color}`} />
                    <span>日志详情</span>
                    <Badge variant="outline" className={`text-xs ${cfg.bgColor}`}>
                      <span className={cfg.color}>{previewLog.level}</span>
                    </Badge>
                  </>
                );
              })()}
            </DialogTitle>
          </DialogHeader>
          {previewLog && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">时间: </span>
                  <span className="font-mono">{previewLog.timestamp}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">来源: </span>
                  <span>{previewLog.source}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border/30">
                <p className="text-sm font-medium mb-2">{previewLog.summary}</p>
                <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {previewLog.detail}
                </pre>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => handleExport([previewLog])}>
                  <Download className="size-3.5 mr-1" />
                  导出此条
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
