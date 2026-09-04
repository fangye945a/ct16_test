import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { Search, Trash2, Download, Play, Square, ChevronDown as Expand } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { connectSystemLogStream, disconnectSystemLogStream } from '@/api/systemLog';
import { getSystemOverview } from '@/api/overview';
import { toast } from 'sonner';

// ── ANSI 颜色转义 ──────────────────────────────────────────────────────────

/** ANSI 颜色代码 → CSS 颜色映射（白背景优化，深色加粗） */
const ANSI_COLORS: Record<number, string> = {
  30: '#1a1a2e',  // 黑
  31: '#c0392b',  // 红 (E)
  32: '#16a34a',  // 绿
  33: '#d97706',  // 橙 (W)
  34: '#1d4ed8',  // 蓝
  35: '#6b21a8',  // 紫 (F)
  36: '#0e7490',  // 青 (I)
  37: '#64748b',  // 灰 (D)
};

/** 提取日志级别（I/E/W/D/F）对应的行背景色与文字粗细 */
function getLevelStyle(text: string): { bg: string; weight: number } | null {
  // 匹配 "[36m... I ..." 这种格式
  const m = text.match(/^[A-Z]\s+(\d+)\/[^\s:]+:/);
  if (!m) return null;
  // 找日志级别字母（行内的 I/E/W/D/F，位置在 PID/进程名前面）
  const levelMatch = text.match(/\b([IEWDF])\s+\d+\//);
  if (!levelMatch) return null;
  switch (levelMatch[1]) {
    case 'E': return { bg: '#fef2f2', weight: 600 }; // 浅红
    case 'W': return { bg: '#fffbeb', weight: 500 }; // 浅橙
    case 'F': return { bg: '#faf5ff', weight: 600 }; // 浅紫
    case 'I': return { bg: 'transparent', weight: 400 }; // 默认
    case 'D': return { bg: 'transparent', weight: 400 }; // 默认
    default: return null;
  }
}

/** 从含 ANSI 转义符的文本中提取纯净文本（用于搜索和导出） */
function stripAnsi(text: string): string {
  return text.replace(/\x1b\[\d+m/g, '');
}

/** 将含 ANSI 转义符的文本转为 React 颜色元素 */
function ansiToElements(text: string): React.ReactNode[] {
  const parts = text.split(/(\x1b\[\d+m)/);
  const elements: React.ReactNode[] = [];
  let currentColor: string | null = null;
  let key = 0;

  for (const part of parts) {
    const m = part.match(/^\x1b\[(\d+)m$/);
    if (m) {
      const code = parseInt(m[1], 10);
      if (code === 0) {
        currentColor = null;
      } else if (code >= 30 && code <= 37) {
        currentColor = ANSI_COLORS[code] || null;
      }
    } else if (part) {
      if (currentColor) {
        elements.push(<span key={key++} style={{ color: currentColor, fontWeight: 500 }}>{part}</span>);
      } else {
        elements.push(<span key={key++}>{part}</span>);
      }
    }
  }

  return elements;
}

/** 优化渲染：每行只在其内容变化时重新解析 ANSI */
const AnsiLine = memo(({ text }: { text: string }) => {
  const elements = useMemo(() => ansiToElements(text), [text]);
  return <>{elements}</>;
});

// ── 页面组件 ───────────────────────────────────────────────────────────────

interface SystemLogAnalysisPageProps {
  initialKeyword?: string;
  autoStart?: boolean;
}

export default function SystemLogAnalysisPage({
  initialKeyword = '',
  autoStart = false,
}: SystemLogAnalysisPageProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
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

  // 本地过滤：先剥离 ANSI 转义符再匹配关键词
  const displayLines = useMemo(() => {
    if (!keyword) return allLines;
    try {
      const flags = ignoreCase ? 'gi' : 'g';
      const pattern = useRegex
        ? keyword
        : keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(pattern, flags);
      return allLines.filter((line) => regex.test(stripAnsi(line)));
    } catch {
      return [];
    }
  }, [allLines, keyword, ignoreCase, useRegex]);

  // 加载设备序列号
  useEffect(() => {
    getSystemOverview().then((data) => {
      setDeviceSN(data.device.serialNumber);
    }).catch(() => {});
  }, []);

  // 启动流
  const startStream = useCallback(() => {
    if (esRef.current) {
      disconnectSystemLogStream(esRef.current);
      esRef.current = null;
    }

    setAllLines([]);
    userScrolledUpRef.current = false;
    setShowScrollToBottom(false);
    setIsRunning(true);

    const es = connectSystemLogStream(
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

  useEffect(() => {
    if (autoStart) startStream();
  }, [autoStart, startStream]);

  // 停止流
  const stopStream = useCallback(() => {
    if (esRef.current) {
      disconnectSystemLogStream(esRef.current);
      esRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const toggleRunning = () => {
    if (isRunning) stopStream();
    else startStream();
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

  const handleClear = () => {
    setAllLines([]);
    userScrolledUpRef.current = false;
    setShowScrollToBottom(false);
  };

  // 导出纯净文本（去掉 ANSI 转义符）
  const handleExport = () => {
    if (displayLines.length === 0) {
      toast.info('没有日志内容可导出');
      return;
    }
    const content = displayLines.map(stripAnsi).join('\n');
    const blob = new Blob([content], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const sn = deviceSN || 'UNKNOWN';
    link.download = `${sn}_${ts}_system.log`;
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
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索日志内容"
            className="pl-9"
          />
        </div>

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

        <Button size="sm" onClick={toggleRunning}>
          {isRunning ? (
            <><Square className="mr-1 size-4 fill-current" /> 停止</>
          ) : (
            <><Play className="mr-1 size-4" /> 开始</>
          )}
        </Button>

        {isRunning && (
          <div className="flex items-center gap-1.5 text-xs text-green-600 ml-1">
            <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
            正在监听
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {keyword && (
            <span className="text-xs text-muted-foreground mr-1">
              {displayLines.length} / {allLines.length}
            </span>
          )}
          <Button variant="destructive" size="sm" onClick={handleClear}>
            <Trash2 className="mr-1 size-4" /> 清除
          </Button>
          <Button size="sm" onClick={handleExport}>
            <Download className="mr-1 size-4" /> 导出
          </Button>
        </div>
      </div>

      {/* 日志内容区（ANSI 颜色渲染） */}
      <div className="relative flex-1 min-h-0 overflow-hidden bg-background">
        {displayLines.length === 0 && !isRunning ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-muted-foreground">系统日志分析 - 点击「开始」查看实时系统日志</span>
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
            {displayLines.map((line, i) => {
              const lvl = getLevelStyle(line)
              return (
                <div
                  key={i}
                  className="px-2 py-0.5 rounded hover:bg-muted/50 whitespace-pre"
                  style={lvl ? { backgroundColor: lvl.bg } : undefined}
                >
                  <AnsiLine text={line} />
                </div>
              )
            })}
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
