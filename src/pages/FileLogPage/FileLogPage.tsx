import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, Download, FileSearch, FileText, Pause, Play, RefreshCw, Search, Terminal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CreatePrototypeLogLine,
  GetPrototypeLogFiles,
  GetPrototypeLogPreview,
  type PrototypeLogFile,
  type PrototypeLogKind,
} from '@/services/prototypeRuntime';

const PAGE_SIZE = 5;

function FormatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function DownloadText(fileName: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function LevelBadge({ level }: { level: PrototypeLogFile['level'] }) {
  const className = {
    INFO: 'border-primary/30 bg-primary/5 text-primary',
    WARN: 'border-warning/30 bg-warning/10 text-warning',
    ERROR: 'border-destructive/30 bg-destructive/5 text-destructive',
    DEBUG: 'border-muted-foreground/30 bg-muted text-muted-foreground',
  }[level];
  return <Badge variant="outline" className={`text-[10px] ${className}`}>{level}</Badge>;
}

function FileQueryPanel({ kind, title, description }: { kind: PrototypeLogKind; title: string; description: string }) {
  const [files, setFiles] = useState<PrototypeLogFile[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      setFiles(await GetPrototypeLogFiles(kind));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载日志文件失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [kind]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (!previewPath) {
      setPreview('');
      return;
    }
    void GetPrototypeLogPreview(previewPath)
      .then(setPreview)
      .catch(() => setPreview('日志预览加载失败'));
  }, [previewPath]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return files;
    }
    return files.filter((file) => `${file.name} ${file.source} ${file.level}`.toLowerCase().includes(normalized));
  }, [files, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleFiles = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelection = (path: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const exportSelected = async () => {
    const paths = selected.size > 0 ? [...selected] : visibleFiles.map((file) => file.path);
    if (paths.length === 0) {
      toast.info('没有可导出的日志文件');
      return;
    }
    const content = await Promise.all(paths.map(async (path) => `# ${path}\n${await GetPrototypeLogPreview(path)}`));
    DownloadText(`CT16_日志导出_${Date.now()}.log`, content.join('\n\n'));
    toast.success(`已导出 ${paths.length} 个日志文件`);
  };

  return (
    <Card className="h-full border-border/40 bg-card/60">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base"><FileSearch className="size-4 text-primary" />{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />刷新
          </Button>
          <Button size="sm" onClick={() => void exportSelected()}><Download className="size-3.5" />导出</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 pl-9" placeholder="搜索文件名、来源或级别" />
        </div>
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <Table>
            <TableHeader><TableRow><TableHead className="w-10" /><TableHead>日志文件</TableHead><TableHead>级别</TableHead><TableHead>来源</TableHead><TableHead>大小</TableHead><TableHead>更新时间</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">正在加载日志文件…</TableCell></TableRow> : null}
              {!loading && visibleFiles.length === 0 ? <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">未找到匹配的日志文件</TableCell></TableRow> : null}
              {!loading && visibleFiles.map((file) => <TableRow key={file.path}>
                <TableCell><input type="checkbox" checked={selected.has(file.path)} onChange={() => toggleSelection(file.path)} aria-label={`选择 ${file.name}`} /></TableCell>
                <TableCell className="font-medium"><span className="flex items-center gap-2"><FileText className="size-3.5 text-primary" />{file.name}</span></TableCell>
                <TableCell><LevelBadge level={file.level} /></TableCell>
                <TableCell className="text-muted-foreground">{file.source}</TableCell>
                <TableCell className="text-muted-foreground">{FormatBytes(file.size)}</TableCell>
                <TableCell className="text-muted-foreground">{file.modifiedAt}</TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setPreviewPath(file.path)}>预览</Button></TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>共 {filtered.length} 个文件，已选择 {selected.size} 个</span>
          <div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>上一页</Button><span>{page} / {pageCount}</span><Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>下一页</Button></div>
        </div>
      </CardContent>
      <Dialog open={!!previewPath} onOpenChange={(open) => !open && setPreviewPath(null)}>
        <DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>日志预览</DialogTitle></DialogHeader><pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-4 text-xs leading-6 text-foreground">{preview || '正在加载…'}</pre></DialogContent>
      </Dialog>
    </Card>
  );
}

function StreamPanel({ kind, title, description }: { kind: 'kernel' | 'system'; title: string; description: string }) {
  const [running, setRunning] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [lines, setLines] = useState<string[]>(() => Array.from({ length: 8 }, (_, index) => CreatePrototypeLogLine(kind, index)));
  const sequenceRef = useRef(lines.length);

  useEffect(() => {
    if (!running) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setLines((current) => [...current.slice(-199), CreatePrototypeLogLine(kind, sequenceRef.current++)]);
    }, 1_300);
    return () => window.clearInterval(timer);
  }, [kind, running]);

  const displayLines = useMemo(() => lines.filter((line) => line.toLowerCase().includes(keyword.trim().toLowerCase())), [keyword, lines]);
  const exportLines = () => {
    if (displayLines.length === 0) {
      toast.info('没有可导出的日志内容');
      return;
    }
    DownloadText(`CT16_${kind}_日志_${Date.now()}.log`, displayLines.join('\n'));
    toast.success(`已导出 ${displayLines.length} 行日志`);
  };

  return <Card className="h-full border-border/40 bg-card/60"><CardHeader className="flex-row items-start justify-between gap-4 space-y-0"><div><CardTitle className="flex items-center gap-2 text-base"><Terminal className="size-4 text-primary" />{title}</CardTitle><CardDescription className="mt-1">{description}</CardDescription></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setRunning((value) => !value)}>{running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}{running ? '暂停' : '继续'}</Button><Button variant="outline" size="sm" onClick={() => setLines([])}><Trash2 className="size-3.5" />清空</Button><Button size="sm" onClick={exportLines}><Download className="size-3.5" />导出</Button></div></CardHeader><CardContent className="space-y-4"><div className="relative max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={keyword} onChange={(event) => setKeyword(event.target.value)} className="h-9 pl-9" placeholder="过滤实时日志内容" /></div><div className="h-[430px] overflow-auto rounded-lg border border-border/60 bg-muted/30 p-4 font-mono text-xs leading-6"><div className="mb-3 flex items-center gap-2 font-sans text-muted-foreground"><span className={`size-2 rounded-full ${running ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />{running ? '正在接收模拟实时日志' : '日志流已暂停'} · {displayLines.length} 行</div>{displayLines.length === 0 ? <p className="text-muted-foreground">暂无匹配日志</p> : displayLines.map((line, index) => <p key={`${line}-${index}`} className="border-b border-border/30 py-0.5 last:border-0">{line}</p>)}</div></CardContent></Card>;
}

export default function FileLogPage() {
  return <div className="flex h-full min-h-[620px] flex-col gap-6"><div><h1 className="text-lg font-semibold">文件日志</h1><p className="mt-1 text-sm text-muted-foreground">查询、预览、导出设备日志，并模拟内核与系统实时日志分析。</p></div><Tabs defaultValue="file-query" className="flex min-h-0 flex-1 flex-col gap-4"><TabsList className="h-auto w-full max-w-3xl justify-start rounded-2xl bg-muted/60 p-1"><TabsTrigger value="file-query" className="flex-1 gap-1.5 rounded-xl py-2.5 text-xs"><FileSearch className="size-3.5" />日志文件查询</TabsTrigger><TabsTrigger value="exception-query" className="flex-1 gap-1.5 rounded-xl py-2.5 text-xs"><AlertTriangle className="size-3.5" />异常日志查询</TabsTrigger><TabsTrigger value="kernel" className="flex-1 gap-1.5 rounded-xl py-2.5 text-xs"><Terminal className="size-3.5" />内核日志分析</TabsTrigger><TabsTrigger value="system" className="flex-1 gap-1.5 rounded-xl py-2.5 text-xs"><Activity className="size-3.5" />系统日志分析</TabsTrigger></TabsList><TabsContent value="file-query" className="mt-0 flex-1"><FileQueryPanel kind="file" title="日志文件查询" description="浏览设备日志文件，支持批量导出与内容预览。" /></TabsContent><TabsContent value="exception-query" className="mt-0 flex-1"><FileQueryPanel kind="exception" title="异常日志查询" description="聚焦告警和异常文件，便于快速定位问题。" /></TabsContent><TabsContent value="kernel" className="mt-0 flex-1"><StreamPanel kind="kernel" title="内核日志分析" description="以原型数据模拟内核日志持续输出与过滤。" /></TabsContent><TabsContent value="system" className="mt-0 flex-1"><StreamPanel kind="system" title="系统日志分析" description="以原型数据模拟系统服务日志持续输出与过滤。" /></TabsContent></Tabs></div>;
}
