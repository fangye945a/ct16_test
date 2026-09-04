import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Folder, File, Download, Eye, RefreshCw, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { listFiles, downloadFile, exportLogFiles, type FileEntryDto } from '@/api/filelog';
import { getSystemOverview } from '@/api/overview';
import { toast } from 'sonner';
import { LogPreviewDialog } from './LogPreviewDialog';

const LOG_DIR = '/storage/data/log';
const PAGE_SIZE = 10;
const ZIP_NAME = 'hilog';

function formatModifiedAt(value: string): { date: string; time: string } {
  const date = new Date(value);
  const pad = (number: number) => String(number).padStart(2, '0');
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  };
}

export default function LogFileQueryPage() {
  const [entries, setEntries] = useState<FileEntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [deviceSN, setDeviceSN] = useState('');
  const [previewPath, setPreviewPath] = useState<string | null>(null);

  useEffect(() => {
    getSystemOverview().then((data) => {
      setDeviceSN(data.device.serialNumber);
    }).catch(() => {});
  }, []);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listFiles(LOG_DIR);
      setEntries(data.entries);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '加载失败';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const pageEntries = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleAll = () => {
    if (selected.size === entries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(entries.map((e) => e.path)));
    }
  };

  const toggle = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleExportFile = async (path: string) => {
    const isLog = path.toLowerCase().endsWith('.log');
    try {
      await downloadFile(path, isLog, deviceSN);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '导出失败';
      toast.error(msg);
    }
  };

  const handleExportAll = async () => {
    if (selected.size === 0) {
      toast.info('请先勾选要导出的文件', { duration: 2000 });
      return;
    }

    const targets = entries.filter((e) => e.type === 'file' && selected.has(e.path));
    if (targets.length === 0) {
      toast.info('选中的文件中没有可导出的文件');
      return;
    }

    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const prefix = `${deviceSN || 'UNKNOWN'}_${ts}`;

    // 只选1个文件 → 单文件下载；2个及以上 → 打包 zip
    if (targets.length === 1) {
      const isLog = targets[0].path.toLowerCase().endsWith('.log');
      await downloadFile(targets[0].path, isLog, deviceSN);
    } else {
      setExporting(true);
      try {
        await exportLogFiles(targets.map((e) => e.path), `${prefix}_${ZIP_NAME}.zip`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '导出失败';
        toast.error(msg);
      } finally {
        setExporting(false);
      }
    }
  };

  const paginationButtons = [];
  for (let i = 1; i <= totalPages; i++) {
    paginationButtons.push(
      <PaginationItem key={i}>
        <PaginationLink href="#" isActive={i === page} onClick={(e) => { e.preventDefault(); setPage(i); }}>
          {i}
        </PaginationLink>
      </PaginationItem>,
    );
  }

  return (
    <Card className="border-border/40 bg-card/60 h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Folder className="size-4 shrink-0 text-warning" />
          <span>日志存储路径: {LOG_DIR}</span>
          <span className="text-border/60">·</span>
          <span>共 {entries.length} 项</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadFiles} disabled={loading}>
            {loading ? <Loader2 className="mr-1 size-4 animate-spin" /> : <RefreshCw className="mr-1 size-4" />}
            刷新
          </Button>
          <Button size="sm" onClick={handleExportAll} disabled={exporting || loading}>
            {exporting ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Download className="mr-1 size-4" />}
            导出
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="mb-2 text-sm">加载失败</p>
            <p className="mb-4 text-xs">{error}</p>
            <Button variant="outline" size="sm" onClick={loadFiles}>
              <RefreshCw className="mr-1 size-4" />
              重试
            </Button>
          </div>
        ) : loading && entries.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="rounded-md border border-border/40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 p-0">
                      <div className="flex h-full items-center justify-center px-4 py-3">
                        <Checkbox
                          checked={entries.length > 0 && selected.size === entries.length}
                          onCheckedChange={toggleAll}
                          aria-label="select all"
                          className="border-2 border-foreground/40 data-[state=checked]:border-primary"
                        />
                      </div>
                    </TableHead>
                    <TableHead>文件名称</TableHead>
                    <TableHead>路径</TableHead>
                    <TableHead>最新写入时间</TableHead>
                    <TableHead className="w-36 text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        该目录下暂无文件
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageEntries.map((entry) => {
                      const isDir = entry.type === 'directory';
                      const modifiedAt = formatModifiedAt(entry.modifiedAt);
                      return (
                        <TableRow key={entry.path}>
                          <TableCell className="p-0">
                            <div className="flex h-full items-center justify-center px-4 py-3">
                              <Checkbox
                                checked={selected.has(entry.path)}
                                onCheckedChange={() => toggle(entry.path)}
                                aria-label={`select ${entry.name}`}
                                className="border-2 border-foreground/40 data-[state=checked]:border-primary"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-2 text-primary">
                              {isDir ? (
                                <Folder className="size-4 shrink-0 text-warning" />
                              ) : (
                                <File className="size-4 shrink-0 text-info" />
                              )}
                              {entry.name}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate text-muted-foreground">
                            {entry.path}
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span>{modifiedAt.date}</span>
                              <span className="border-l border-border/60 pl-2">{modifiedAt.time}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {!isDir && (
                              <div className="flex items-center justify-center gap-3 text-sm">
                                <button
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                  onClick={() => setPreviewPath(entry.path)}
                                >
                                  <Eye className="size-3.5" />
                                  预览
                                </button>
                                <button
                                  className="text-primary hover:underline"
                                  onClick={() => handleExportFile(entry.path)}
                                >
                                  导出
                                </button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {entries.length > 0 && (
              <div className="mt-4 flex items-center justify-end gap-4 text-sm text-muted-foreground">
                <span>共 {entries.length} 条</span>
                <span className="rounded border border-border/40 px-2 py-1">{PAGE_SIZE}条/页</span>
                <Pagination className="mx-0 w-auto justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => { e.preventDefault(); setPage(Math.max(1, page - 1)); }}
                      />
                    </PaginationItem>
                    {paginationButtons}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, page + 1)); }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </CardContent>
      <LogPreviewDialog
        open={previewPath !== null}
        path={previewPath}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewPath(null);
          }
        }}
      />
    </Card>
  );
}
