import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ChevronRight,
  ChevronDown,
  Folder,
  File,
  Search,
  Download,
  FileText,
  AlertTriangle,
  Info,
  Bug,
  AlertCircle,
  CheckSquare,
  Square,
} from 'lucide-react';
import { toast } from 'sonner';
import { MOCK_FILES, type IFileNode } from '@/data/files';
import { MOCK_LOGS, type ILogEntry } from '@/data/logs';

// ── 文件树节点 ──────────────────────────────────────────────

function FileTreeNode({
  node,
  depth,
  selectedId,
  onSelect,
  expandedIds,
  onToggle,
}: {
  node: IFileNode;
  depth: number;
  selectedId: string | null;
  onSelect: (n: IFileNode) => void;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const isDir = node.type === 'directory';

  return (
    <div>
      <button
        className={`flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg text-left transition-all text-xs ${
          isSelected
            ? 'bg-primary/10 text-primary font-bold'
            : 'text-foreground hover:bg-muted font-medium'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          onSelect(node);
          if (isDir) onToggle(node.id);
        }}
      >
        {isDir ? (
          isExpanded ? (
            <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}
        {isDir ? (
          <Folder className="size-3.5 shrink-0 text-[#00B894]" />
        ) : (
          <File className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {isDir && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── 面包屑 ──────────────────────────────────────────────────

function Breadcrumb({ path }: { path: IFileNode[] }) {
  return (
    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
      {path.map((node, i) => (
        <span key={node.id} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3" />}
          <span className={i === path.length - 1 ? 'text-foreground font-bold' : ''}>
            {node.name}
          </span>
        </span>
      ))}
    </div>
  );
}

// ── 日志级别配置 ────────────────────────────────────────────

const LOG_LEVEL_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  INFO: { icon: Info, color: 'text-[#00B894]', bg: 'bg-[#00B894]/10' },
  WARN: { icon: AlertTriangle, color: 'text-[#F97316]', bg: 'bg-[#F97316]/10' },
  ERROR: { icon: AlertCircle, color: 'text-[#EF4444]', bg: 'bg-[#EF4444]/10' },
  DEBUG: { icon: Bug, color: 'text-[#6366F1]', bg: 'bg-[#6366F1]/10' },
};

// ── 主组件 ──────────────────────────────────────────────────

export default function FileLogPage() {
  // 文件系统状态
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['1']));
  const [selectedDirId, setSelectedDirId] = useState<string>('1');
  const [fileSearch, setFileSearch] = useState('');
  const [previewFile, setPreviewFile] = useState<IFileNode | null>(null);

  // 日志状态
  const [logLevel, setLogLevel] = useState<string>('all');
  const [logSearch, setLogSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<ILogEntry | null>(null);
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());

  // Tab
  const [activeTab, setActiveTab] = useState<'files' | 'logs'>('files');

  // 构建路径
  const buildPath = (targetId: string, nodes: IFileNode[]): IFileNode[] => {
    for (const node of nodes) {
      if (node.id === targetId) return [node];
      if (node.children) {
        const childPath = buildPath(targetId, node.children);
        if (childPath.length) return [node, ...childPath];
      }
    }
    return [];
  };

  const currentPath = buildPath(selectedDirId, MOCK_FILES);
  const selectedDir = currentPath[currentPath.length - 1];

  // 当前目录下的文件列表
  const currentFiles = useMemo(() => {
    if (!selectedDir || !selectedDir.children) return [];
    return selectedDir.children.filter(
      (f) => !fileSearch || f.name.toLowerCase().includes(fileSearch.toLowerCase()),
    );
  }, [selectedDir, fileSearch]);

  // 日志筛选
  const filteredLogs = useMemo(() => {
    return MOCK_LOGS.filter((log) => {
      if (logLevel !== 'all' && log.level !== logLevel) return false;
      if (logSearch && !log.summary.toLowerCase().includes(logSearch.toLowerCase()) && !log.source.toLowerCase().includes(logSearch.toLowerCase())) return false;
      return true;
    });
  }, [logLevel, logSearch]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleLogSelect = (id: string) => {
    setSelectedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllLogs = () => {
    if (selectedLogIds.size === filteredLogs.length) {
      setSelectedLogIds(new Set());
    } else {
      setSelectedLogIds(new Set(filteredLogs.map((l) => l.id)));
    }
  };

  const exportLogs = () => {
    const logsToExport = filteredLogs.filter((l) => selectedLogIds.has(l.id));
    if (logsToExport.length === 0) {
      toast.info('请先选择要导出的日志');
      return;
    }
    const content = logsToExport
      .map((l) => `[${l.timestamp}] [${l.level}] [${l.source}] ${l.summary}\n${l.detail}`)
      .join('\n\n---\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_export_${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${logsToExport.length} 条日志`);
  };

  const downloadFile = (file: IFileNode) => {
    const content = `// Mock content of ${file.name}\n// Size: ${file.size}\n// Modified: ${file.modifiedTime}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已下载 ${file.name}`);
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4">
      {/* ── 左侧：文件目录树 ── */}
      <Card className="w-[240px] shrink-0 rounded-2xl border border-border/60 shadow-sm flex flex-col overflow-hidden">
        <div className="px-3 py-3 border-b border-border/40">
          <div className="text-xs font-black text-muted-foreground uppercase tracking-wider">文件系统</div>
        </div>
        <div className="flex-1 overflow-y-auto px-1 py-2">
          {MOCK_FILES.map((node) => (
            <FileTreeNode
              key={node.id}
              node={node}
              depth={0}
              selectedId={selectedDirId}
              onSelect={(n) => {
                if (n.type === 'directory') setSelectedDirId(n.id);
              }}
              expandedIds={expandedIds}
              onToggle={toggleExpand}
            />
          ))}
        </div>
      </Card>

      {/* ── 右侧：内容区 ── */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Tab 切换 + 搜索 */}
        <Card className="rounded-2xl border border-border/60 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'files' | 'logs')}>
                <TabsList className="h-9">
                  <TabsTrigger value="files" className="text-xs font-bold">文件列表</TabsTrigger>
                  <TabsTrigger value="logs" className="text-xs font-bold">日志列表</TabsTrigger>
                </TabsList>
              </Tabs>
              {activeTab === 'files' && <Breadcrumb path={currentPath} />}
            </div>
            <div className="flex items-center gap-2">
              {activeTab === 'files' ? (
                <div className="relative w-52">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    placeholder="搜索文件..."
                    className="h-8 pl-9 text-xs"
                  />
                </div>
              ) : (
                <>
                  <div className="relative w-52">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      placeholder="搜索日志..."
                      className="h-8 pl-9 text-xs"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={exportLogs}
                    disabled={selectedLogIds.size === 0}
                  >
                    <Download className="size-3 mr-1" />
                    导出 ({selectedLogIds.size})
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* 内容表格 */}
        <Card className="flex-1 rounded-2xl border border-border/60 shadow-sm overflow-hidden flex flex-col min-h-0">
          {activeTab === 'files' ? (
            <>
              {/* 文件列表 */}
              <div className="flex-1 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead className="text-xs font-black">名称</TableHead>
                      <TableHead className="text-xs font-black w-20">大小</TableHead>
                      <TableHead className="text-xs font-black w-40">修改时间</TableHead>
                      <TableHead className="text-xs font-black w-24 text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentFiles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-12 text-xs">
                          暂无文件
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentFiles.map((file) => (
                        <TableRow key={file.id} className="hover:bg-muted/50 cursor-pointer">
                          <TableCell>
                            {file.type === 'directory' ? (
                              <Folder className="size-4 text-[#00B894]" />
                            ) : (
                              <FileText className="size-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell
                            className="text-xs font-bold"
                            onClick={() => {
                              if (file.type === 'directory') setSelectedDirId(file.id);
                              else setPreviewFile(file);
                            }}
                          >
                            <span className={file.type === 'directory' ? 'text-[#00B894] cursor-pointer hover:underline' : 'cursor-pointer hover:text-primary'}>
                              {file.name}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground tabular-nums">
                            {file.size || '--'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{file.modifiedTime}</TableCell>
                          <TableCell className="text-right">
                            {file.type === 'file' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => downloadFile(file)}
                              >
                                <Download className="size-3 mr-1" />
                                下载
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <>
              {/* 日志级别筛选 */}
              <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/40">
                {(['all', 'INFO', 'WARN', 'ERROR', 'DEBUG'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setLogLevel(level)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      logLevel === level
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {level === 'all' ? '全部' : level}
                  </button>
                ))}
                <div className="flex-1" />
                <button
                  onClick={toggleAllLogs}
                  className="text-[10px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {selectedLogIds.size === filteredLogs.length && filteredLogs.length > 0 ? (
                    <CheckSquare className="size-3 text-primary" />
                  ) : (
                    <Square className="size-3" />
                  )}
                  全选
                </button>
              </div>
              {/* 日志列表 */}
              <div className="flex-1 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead className="text-xs font-black w-40">时间</TableHead>
                      <TableHead className="text-xs font-black w-16">级别</TableHead>
                      <TableHead className="text-xs font-black w-24">来源</TableHead>
                      <TableHead className="text-xs font-black">摘要</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-12 text-xs">
                          暂无日志
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => {
                        const cfg = LOG_LEVEL_CONFIG[log.level];
                        const Icon = cfg.icon;
                        const isSelected = selectedLogIds.has(log.id);
                        return (
                          <TableRow
                            key={log.id}
                            className={`hover:bg-muted/50 cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}
                            onClick={() => setSelectedLog(log)}
                          >
                            <TableCell onClick={(e) => { e.stopPropagation(); toggleLogSelect(log.id); }}>
                              {isSelected ? (
                                <CheckSquare className="size-3.5 text-primary" />
                              ) : (
                                <Square className="size-3.5 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono tabular-nums">
                              {log.timestamp}
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] font-black ${cfg.color} ${cfg.bg}`}>
                                <Icon className="size-2.5 mr-0.5" />
                                {log.level}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-medium">{log.source}</TableCell>
                            <TableCell className="text-xs truncate max-w-[300px]">{log.summary}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </Card>

        {/* 底部预览区 */}
        {(previewFile || selectedLog) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="shrink-0"
          >
            <Card className="rounded-2xl border border-border/60 shadow-sm p-4 max-h-[200px] overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                  {previewFile ? '文件预览' : '日志详情'}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => { setPreviewFile(null); setSelectedLog(null); }}
                >
                  关闭
                </Button>
              </div>
              {previewFile && (
                <div className="space-y-2">
                  <div className="text-sm font-bold">{previewFile.name}</div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>大小：{previewFile.size}</span>
                    <span>修改时间：{previewFile.modifiedTime}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50 text-xs font-mono text-muted-foreground">
                    {`// Mock preview of ${previewFile.name}\n// This is a simulated file content preview.\n// In production, this would display the actual file contents.`}
                  </div>
                </div>
              )}
              {selectedLog && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const cfg = LOG_LEVEL_CONFIG[selectedLog.level];
                      const Icon = cfg.icon;
                      return (
                        <Badge className={`text-[10px] font-black ${cfg.color} ${cfg.bg}`}>
                          <Icon className="size-2.5 mr-0.5" />
                          {selectedLog.level}
                        </Badge>
                      );
                    })()}
                    <span className="text-xs text-muted-foreground">{selectedLog.source}</span>
                    <span className="text-xs text-muted-foreground font-mono">{selectedLog.timestamp}</span>
                  </div>
                  <div className="text-sm font-bold">{selectedLog.summary}</div>
                  <div className="p-3 rounded-xl bg-muted/50 text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                    {selectedLog.detail}
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </div>

      {/* ── 文件预览弹窗 ── */}
      <Dialog open={!!previewFile} onOpenChange={(o) => !o && setPreviewFile(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black">{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>大小：{previewFile?.size}</span>
              <span>修改时间：{previewFile?.modifiedTime}</span>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 text-xs font-mono text-muted-foreground whitespace-pre-wrap max-h-96 overflow-y-auto">
              {previewFile && `// Mock preview of ${previewFile.name}\n// Size: ${previewFile.size}\n// Modified: ${previewFile.modifiedTime}\n\n// This is a simulated file content preview.\n// In production, this would display the actual file contents.\n\n{\n  "version": "1.0.0",\n  "timestamp": "${new Date().toISOString()}",\n  "data": {\n    "status": "ok",\n    "records": 128\n  }\n}`}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
