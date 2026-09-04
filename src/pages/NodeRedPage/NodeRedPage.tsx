import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  LoaderCircle,
  Paperclip,
  RefreshCw,
  Send,
  Settings2,
  Square,
  Unplug,
  Workflow,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DeviceNodesWorkspace } from './device-nodes';
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENT_SIZE_LABEL,
  MAX_ATTACHMENTS,
  buildChatAttachmentsFromFiles,
} from './device-nodes/chat/attachments';
import { NodeEditorMessagesList } from './device-nodes/chat/ChatMessages';
import { startNodeChatRuntime, newChatSession, sendChatMessage, sendStopSignal } from './device-nodes/chat/controller';
import { useChatStore } from './device-nodes/chat/useChatStore';
import type { ChatAttachment } from './device-nodes/chat/types';

const EDITOR_PATH = import.meta.env.VITE_NODE_RED_PATH || '/node-red/';
const HEALTH_INTERVAL_MS = 15000;
const HEALTH_TIMEOUT_MS = 5000;
const HEALTH_FAILURE_THRESHOLD = 3;
const LOAD_TIMEOUT_MS = 20000;
const FLOW_SKILL_PREFIX = '使用 nodered-flow-generator技能生成nodered流程';

type SheetMode = 'flow' | 'nodes';

function EnsureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function getAttachmentExtension(attachment: ChatAttachment): string {
  const fromName = attachment.filename?.split('.').pop()?.toLowerCase();
  if (fromName) return fromName;
  const fromType = attachment.contentType?.split('/').pop()?.toLowerCase();
  return fromType || 'file';
}

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: ChatAttachment;
  onRemove: () => void;
}) {
  const extension = getAttachmentExtension(attachment);

  return (
    <div
      className="relative h-16 w-16 overflow-hidden rounded-md border border-border/60 bg-background"
      title={attachment.filename || '附件'}
    >
      {attachment.type === 'image' ? (
        <img src={attachment.url} alt={attachment.filename || '附件'} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-muted-foreground">
          <FileText className="size-5 shrink-0" />
          <span className="w-full truncate text-center text-[10px] font-medium uppercase leading-tight">
            {extension}
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-0.5 top-0.5 inline-flex size-5 items-center justify-center rounded-full border border-border/60 bg-background/90 text-foreground shadow-sm transition hover:bg-accent"
        aria-label="移除附件"
        title="移除附件"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

function FlowAssistant({ onApplied, onCollapse }: { onApplied: () => void; onCollapse: () => void }) {
  const { messages, isTyping, connectionState } = useChatStore();

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [genStatus, setGenStatus] = useState<'idle' | 'generating' | 'completed'>('idle');
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevIsTypingRef = useRef(false);
  const stoppedByUserRef = useRef(false);
  const dragDepthRef = useRef(0);

  useEffect(() => {
    const stopRuntime = startNodeChatRuntime();
    void newChatSession();
    return () => {
      stopRuntime();
    };
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const prev = prevIsTypingRef.current;
    if (isTyping && !prev) {
      setGenStatus('generating');
    } else if (!isTyping && prev) {
      setGenStatus('completed');
      if (!stoppedByUserRef.current) onApplied();
      stoppedByUserRef.current = false;
      setTimeout(() => setGenStatus('idle'), 2500);
    }
    prevIsTypingRef.current = isTyping;
  }, [isTyping, onApplied]);

  const handleStop = () => {
    stoppedByUserRef.current = true;
    sendStopSignal();
  };

  const processAttachmentFiles = async (files: File[]) => {
    const { attachments: nextAttachments, errors } = await buildChatAttachmentsFromFiles({
      files,
      existingCount: attachments.length,
    });

    for (const error of errors) {
      if (error.kind === 'limitReached') {
        toast.error(`最多只能添加 ${MAX_ATTACHMENTS} 个附件`);
      } else if (error.kind === 'tooLarge') {
        toast.error(`「${error.name}」超过 ${MAX_ATTACHMENT_SIZE_LABEL} 限制`);
      } else {
        toast.error(`不支持的附件类型：${error.name}`);
      }
    }

    if (nextAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...nextAttachments].slice(0, MAX_ATTACHMENTS));
    }
  };

  const handleSubmit = () => {
    const userText = input.trim();
    const hasAttachments = attachments.length > 0;
    if ((!userText && !hasAttachments) || isTyping) return;
    if (connectionState !== 'connected') return;

    const content = userText ? `${FLOW_SKILL_PREFIX}\n\n${userText}` : FLOW_SKILL_PREFIX;
    const nextAttachments = attachments;

    if (sendChatMessage({ content, attachments: nextAttachments })) {
      setInput('');
      setAttachments([]);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isInputDisabled = isTyping || connectionState !== 'connected';
  const canSubmit = !isInputDisabled && (Boolean(input.trim()) || attachments.length > 0);

  const handleAttachClick = () => {
    if (isInputDisabled) return;
    fileInputRef.current?.click();
  };

  const handleAttachmentSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    await processAttachmentFiles(files);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const resetDragState = () => {
    dragDepthRef.current = 0;
    setIsDragActive(false);
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (isInputDisabled) return;
    if (![...event.dataTransfer.types].includes('Files')) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (isInputDisabled) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (isInputDisabled) return;
    if (![...event.dataTransfer.types].includes('Files')) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (isInputDisabled) return;
    event.preventDefault();
    event.stopPropagation();
    resetDragState();
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length > 0) {
      void processAttachmentFiles(files);
    }
  };

  return (
    <aside className="flex h-full min-h-0 flex-col bg-card">
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Bot className="size-4 text-primary" />
          <span className="truncate text-sm font-semibold">AI 编程助手</span>
          {genStatus === 'generating' && (
            <span className="flex items-center gap-1 text-[12px] text-primary">
              <LoaderCircle className="size-3 animate-spin" />
              生成中
            </span>
          )}
          {genStatus === 'completed' && <span className="text-[12px] text-success">生成完成</span>}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`shrink-0 text-[12px] ${
              connectionState === 'connected' ? 'text-success' : 'text-warning'
            }`}
          >
            {connectionState === 'connected' ? '已连接' : '连接中...'}
          </span>
          <Button variant="ghost" size="icon" className="size-8" onClick={onCollapse} aria-label="收起 AI 编程助手">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-background/40 p-3">
        <NodeEditorMessagesList
          messages={messages}
          isTyping={isTyping}
          mode="flow"
          onSelectExample={(prompt) => setInput(prompt)}
        />
      </div>

      <div
        className={cn(
          'relative shrink-0 border-t border-border/60 bg-card p-3 transition-[box-shadow,border-color,background-color]',
          isDragActive && 'ring-1 ring-primary/30',
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={ATTACHMENT_ACCEPT}
          multiple
          onChange={(event) => {
            void handleAttachmentSelection(event);
          }}
        />

        <div
          className={cn(
            'relative flex flex-col rounded-md border border-border/60 bg-background p-2.5 shadow-sm transition-[box-shadow,border-color,background-color]',
            isDragActive && 'border-primary bg-primary/5 ring-2 ring-primary/30',
          )}
        >
          {isDragActive ? (
            <div className="pointer-events-none absolute inset-1.5 z-20 flex items-center justify-center rounded-md border-2 border-dashed border-primary/50 bg-primary/5 text-xs font-medium text-primary">
              松开以添加附件
            </div>
          ) : null}

          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2 px-0.5">
              {attachments.map((attachment, index) => (
                <AttachmentChip
                  key={`${attachment.url}-${index}`}
                  attachment={attachment}
                  onRemove={() => handleRemoveAttachment(index)}
                />
              ))}
            </div>
          )}

          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="在对话中描述你的流程目标，例如：每 5 分钟采集湿度传感器设备的状态并写入日志"
            className="min-h-[72px] flex-1 resize-none border-0 bg-transparent px-1.5 py-1 text-sm leading-5 shadow-none placeholder:text-xs focus-visible:ring-0"
            disabled={isInputDisabled}
          />

          <div className="mt-1.5 flex items-center justify-between gap-2 px-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              onClick={handleAttachClick}
              aria-label="添加附件"
              title="添加附件"
              disabled={isInputDisabled}
            >
              <Paperclip className="size-4" />
            </Button>

            <div className="flex shrink-0 items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      size="icon"
                      className="size-8 rounded-full"
                      onClick={() => void handleSubmit()}
                      disabled={!canSubmit}
                      aria-label="提交"
                    >
                      {isTyping ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">提交</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      size="icon"
                      variant={isTyping ? 'destructive' : 'secondary'}
                      className="size-8 rounded-full"
                      onClick={handleStop}
                      disabled={!isTyping}
                      aria-label="停止"
                    >
                      <Square className="size-3 fill-current" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">停止生成</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <p className="mt-2 text-[12px] leading-4 text-muted-foreground">Enter 提交 · Shift+Enter 换行</p>
      </div>
    </aside>
  );
}

export default function NodeRedPage() {
  const { setOpenMobile } = useSidebar();
  const [searchParams, setSearchParams] = useSearchParams();
  const editorUrl = useMemo(() => EnsureTrailingSlash(EDITOR_PATH), []);
  const apiUrl = useMemo(() => EnsureTrailingSlash(EDITOR_PATH), []);
  const currentSheet: SheetMode = searchParams.get('sheet') === 'nodes' ? 'nodes' : 'flow';
  const [loadKey, setLoadKey] = useState(0);
  const [isEditorLoading, setIsEditorLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [isAssistantCollapsed, setIsAssistantCollapsed] = useState(false);
  const healthFailureCountRef = useRef(0);

  useEffect(() => { setOpenMobile(false); }, [setOpenMobile]);
  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
      try {
        const response = await fetch(`${apiUrl}health`, { cache: 'no-store', credentials: 'same-origin', signal: controller.signal });
        if (!response.ok) throw new Error('健康检查失败。');
        healthFailureCountRef.current = 0;
        if (isMounted) setConnectionState('connected');
      } catch {
        healthFailureCountRef.current += 1;
        if (isMounted && healthFailureCountRef.current >= HEALTH_FAILURE_THRESHOLD) setConnectionState('disconnected');
      } finally {
        window.clearTimeout(timeoutId);
      }
    };
    void checkHealth();
    const intervalId = window.setInterval(() => void checkHealth(), HEALTH_INTERVAL_MS);
    return () => { isMounted = false; window.clearInterval(intervalId); };
  }, [apiUrl]);
  useEffect(() => { setIsEditorLoading(true); const timeoutId = window.setTimeout(() => setIsEditorLoading(false), LOAD_TIMEOUT_MS); return () => window.clearTimeout(timeoutId); }, [loadKey]);
  const reloadEditor = () => { healthFailureCountRef.current = 0; setConnectionState('connecting'); setLoadKey((key) => key + 1); };
  const selectSheet = (sheet: SheetMode) => { const next = new URLSearchParams(searchParams); if (sheet === 'flow') next.delete('sheet'); else next.set('sheet', sheet); setSearchParams(next, { replace: true }); };

  return <section className="flex h-[calc(100dvh-5.25rem)] min-h-[620px] flex-col gap-1">
    <header className="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-border px-1"><div className="flex items-center gap-1"><Button variant={currentSheet === 'flow' ? 'default' : 'ghost'} size="sm" onClick={() => selectSheet('flow')}><Workflow className="size-3.5" />流式编程</Button><Button variant={currentSheet === 'nodes' ? 'default' : 'ghost'} size="sm" onClick={() => selectSheet('nodes')}><Settings2 className="size-3.5" />节点创建</Button></div>{currentSheet === 'flow' && <div className="flex items-center gap-2"><Badge variant="outline" className={connectionState === 'connected' ? 'border-success/30 bg-success/5 text-success' : connectionState === 'disconnected' ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'text-muted-foreground'}>{connectionState === 'connected' ? '服务已连接' : connectionState === 'disconnected' ? '服务已断开' : '正在连接'}</Badge><Button variant="outline" size="sm" asChild><a href={editorUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" />单独打开流式编程</a></Button></div>}</header>
    <div className="min-h-0 flex-1">{currentSheet === 'flow' ? <div className="relative flex h-full overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm"><div className="relative min-w-0 flex-1">{isEditorLoading && <div className="absolute inset-0 z-10 grid place-items-center bg-card"><div className="text-center"><LoaderCircle className="mx-auto size-5 animate-spin text-primary" /><p className="mt-2 text-xs text-muted-foreground">正在加载工作台</p></div></div>}<iframe key={loadKey} title="可视化流程编辑器" src={editorUrl} className="h-full w-full border-0 bg-card" onLoad={() => setIsEditorLoading(false)} onError={() => { setIsEditorLoading(false); setConnectionState('disconnected'); }} />{connectionState === 'disconnected' && !isEditorLoading && <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-md border border-destructive/20 bg-card p-2 shadow-sm"><Unplug className="size-4 text-destructive" /><span className="text-xs">连接已断开</span><Button size="sm" variant="outline" className="h-7" onClick={reloadEditor}><RefreshCw className="size-3" />重连</Button></div>}</div>{!isAssistantCollapsed ? <div className="w-[360px] min-w-72 max-w-[45%] resize-x overflow-auto border-l border-border/60"><FlowAssistant onApplied={reloadEditor} onCollapse={() => setIsAssistantCollapsed(true)} /></div> : <Tooltip><TooltipTrigger asChild><Button variant="secondary" size="icon" className="absolute right-3 top-3 z-20 size-8 shadow-sm" onClick={() => setIsAssistantCollapsed(false)} aria-label="展开 AI 编程助手"><ChevronLeft className="size-4" /></Button></TooltipTrigger><TooltipContent side="left">展开 AI 编程助手</TooltipContent></Tooltip>}</div> : <DeviceNodesWorkspace />}</div>
  </section>;
}
