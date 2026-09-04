import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, Trash2, Download, Play, Square, ChevronDown as Expand } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { connectKernelLogStream, disconnectKernelLogStream } from '@/api/kernelLog';
import { getSystemOverview } from '@/api/overview';
import { toast } from 'sonner';

export default function KernelLogAnalysisPage() {
  const [keyword, setKeyword] = useState('');
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [useRegex, setUseRegex] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [allLines, setAllLines] = useState<string[]>([]);
  const [deviceSN, setDeviceSN] = useState('');
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const isRunningRef = useRef(false);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  // 本地过滤：从完整日志中根据搜索条件过滤出显示内容
  const displayLines = useMemo(() => {
    if (!keyword) return allLines;
    try {
      const flags = ignoreCase ? 'gi' : 'g';
      const pattern = useRegex
        ? keyword
        : keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(pattern, flags);
      return allLines.filter((line) => regex.test(line));
    } catch {
      return [];
    }
  }, [allLines, keyword, ignoreCase, useRegex]);

  // 加载设备序列号（用于导出文件名）
  useEffect(() => {
    getSystemOverview().then((data) => {
      setDeviceSN(data.device.serialNumber);
    }).catch(() => {});
  }, []);

  // 启动流
  const startStream = useCallback(() => {
    if (esRef.current) {
      disconnectKernelLogStream(esRef.current);
      esRef.current = null;
    }

    setAllLines([]);
    userScrolledUpRef.current = false;
    setShowScrollToBottom(false);
    setIsRunning(true);

    const es = connectKernelLogStream(
      (line) => {
        setAllLines((prev) => [...prev, line]);
      },
    );

    esRef.current = es;

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED && isRunningRef.current) {
        setIsRunning(false);
        esRef.current = null;
      }
    };
  }, []);

  // 停止流
  const stopStream = useCallback(() => {
    if (esRef.current) {
      disconnectKernelLogStream(esRef.current);
      esRef.current = null;
    }
    setIsRunning(false);
  }, []);

  // 开始/停止切换
  const toggleRunning = () => {
    if (isRunning) {
      stopStream();
    } else {
      startStream();
    }
  };

  // 自动滚动
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || userScrolledUpRef.current) return;
    const raf = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
      setShowScrollToBottom(false);
    });
    return () => cancelAnimationFrame(raf);
  }, [displayLines]);

  // 检测用户手动滚动
  const updateScrollPosition = () => {
    const el = scrollRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    userScrolledUpRef.current = !isAtBottom;
    setShowScrollToBottom(!isAtBottom);
  };

  // 向上滚动时立即暂停自动跟随，避免实时日志刷新抢回滚动位置。
  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (event.deltaY < 0 && !userScrolledUpRef.current) {
      userScrolledUpRef.current = true;
      setShowScrollToBottom(true);
    }
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    userScrolledUpRef.current = false;
    el.scrollTop = el.scrollHeight;
    setShowScrollToBottom(false);
  };

  // 清除（清空全部日志，不影响正在运行的流）
  const handleClear = () => {
    setAllLines([]);
    userScrolledUpRef.current = false;
    setShowScrollToBottom(false);
  };

  // 导出当前显示内容
  const handleExport = () => {
    if (displayLines.length === 0) {
      toast.info('没有日志内容可导出');
      return;
    }
    const content = displayLines.join('\n');
    const blob = new Blob([content], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const sn = deviceSN || 'UNKNOWN';
    link.download = `${sn}_${ts}_kernel.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${displayLines.length} 行日志`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-border/40 bg-card/60">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/40 px-4 py-3">
        {/* 搜索输入框 */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索日志内容"
            className="pl-9"
          />
        </div>

        {/* Cc 切换：忽略大小写 */}
        <Toggle
          pressed={ignoreCase}
          onPressedChange={setIgnoreCase}
          variant="outline"
          size="sm"
          title={ignoreCase ? '已启用：过滤条件忽略大小写' : '点击启用：过滤条件将忽略大小写'}
          className="font-mono text-xs min-w-[44px]
            data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 data-[state=on]:border-blue-300
            dark:data-[state=on]:bg-blue-900/30 dark:data-[state=on]:text-blue-300 dark:data-[state=on]:border-blue-700"
          aria-label="切换大小写敏感"
        >
          Cc
        </Toggle>

        {/* .* 切换：正则表达式 */}
        <Toggle
          pressed={useRegex}
          onPressedChange={setUseRegex}
          variant="outline"
          size="sm"
          title={useRegex ? '已启用：使用正则表达式匹配' : '点击启用：使用正则表达式进行匹配'}
          className="font-mono text-xs min-w-[44px]
            data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 data-[state=on]:border-blue-300
            dark:data-[state=on]:bg-blue-900/30 dark:data-[state=on]:text-blue-300 dark:data-[state=on]:border-blue-700"
          aria-label="切换正则匹配"
        >
          .*
        </Toggle>

        {/* 开始/停止按钮 */}
        <Button size="sm" onClick={toggleRunning}>
          {isRunning ? (
            <>
              <Square className="mr-1 size-4 fill-current" />
              停止
            </>
          ) : (
            <>
              <Play className="mr-1 size-4" />
              开始
            </>
          )}
        </Button>

        {/* 运行状态指示器 + 日志行数统计 */}
        {isRunning && (
          <div className="flex items-center gap-1.5 text-xs text-green-600 ml-1">
            <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
            正在监听
          </div>
        )}

        {/* 右侧操作按钮 */}
        <div className="ml-auto flex items-center gap-2">
          {keyword && (
            <span className="text-xs text-muted-foreground mr-1">
              {displayLines.length} / {allLines.length}
            </span>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClear}
          >
            <Trash2 className="mr-1 size-4" />
            清除
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
          >
            <Download className="mr-1 size-4" />
            导出
          </Button>
        </div>
      </div>

      {/* 日志内容区 */}
      <div className="relative flex-1 min-h-0 overflow-hidden bg-background">
        {displayLines.length === 0 && !isRunning ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-muted-foreground">内核日志分析 - 点击「开始」查看实时内核日志</span>
          </div>
        ) : (
          <div
            ref={scrollRef}
            onScroll={updateScrollPosition}
            onWheel={handleWheel}
            className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain p-3 pr-2 font-mono text-xs leading-6 text-foreground
              [scrollbar-color:var(--muted-foreground)_var(--muted)] [scrollbar-width:thin]
              [&::-webkit-scrollbar]:w-3
              [&::-webkit-scrollbar-track]:rounded-full
              [&::-webkit-scrollbar-track]:bg-muted
              [&::-webkit-scrollbar-thumb]:rounded-full
              [&::-webkit-scrollbar-thumb]:bg-muted-foreground/70
              [&::-webkit-scrollbar-thumb]:hover:bg-foreground"
          >
            {displayLines.map((line, i) => (
              <div
                key={i}
                className="px-2 py-0.5 rounded hover:bg-muted/50 whitespace-pre"
              >
                {line}
              </div>
            ))}
          </div>
        )}

        {showScrollToBottom && displayLines.length > 0 && (
          <button
            type="button"
            aria-label="回到最新日志"
            title="回到最新日志"
            onClick={scrollToBottom}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex size-8 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
          >
            <Expand className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
