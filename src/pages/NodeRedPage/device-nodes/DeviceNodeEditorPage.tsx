import { Bot, FileText, LoaderCircle, Paperclip, Send, Square, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import type { NodeMeta } from './api';
import { getNode, getNodes } from './api';
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENT_SIZE_LABEL,
  MAX_ATTACHMENTS,
  buildChatAttachmentsFromFiles,
} from './chat/attachments';
import { NodeEditorMessagesList } from './chat/ChatMessages';
import {
  newChatSession,
  sendChatMessage,
  sendStopSignal,
  startNodeChatRuntime,
} from './chat/controller';
import type { ChatAttachment } from './chat/types';
import { useChatStore } from './chat/useChatStore';
import './device-iframe.css';

type PendingChatPayload = {
  content: string;
  attachments: ChatAttachment[];
};

interface DeviceNodeEditorPageProps {
  mode: 'create' | 'edit';
  nodeCode?: string;
  onBack: () => void;
  onSimulate?: (code: string) => void;
}

export function DeviceNodeEditorPage({ mode, nodeCode, onBack, onSimulate }: DeviceNodeEditorPageProps) {
  const [node, setNode] = useState<NodeMeta | null>(null);
  const [, setHtmlContent] = useState('');
  const [, setJsContent] = useState('');
  const [loading, setLoading] = useState(Boolean(nodeCode));
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [selectedCmd, setSelectedCmd] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { messages, isTyping, activeSessionId, connectionState } = useChatStore();
  const [genStatus, setGenStatus] = useState<'idle' | 'generating' | 'completed'>('idle');
  const prevIsTypingRef = useRef(isTyping);
  const genCompletedRef = useRef(false);
  const refreshRunIdRef = useRef(0);
  const prevNodeCodesRef = useRef<string[]>([]);
  const pendingMsgRef = useRef<PendingChatPayload | null>(null);
  const stoppedByUserRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nodeCodeRef = useRef(node?.code || '');
  nodeCodeRef.current = node?.code || '';
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const isTypingRef = useRef(isTyping);
  isTypingRef.current = isTyping;
  const genStatusRef = useRef(genStatus);
  genStatusRef.current = genStatus;

  const effectiveDeviceCode = (node?.code || nodeCode || '').trim();
  const effectiveDialogueType: 'create' | 'update' = effectiveDeviceCode ? 'update' : 'create';
  const isSessionBusy = genStatus === 'generating';
  const SETTLE_MS = 1800;

  useEffect(() => {
    const stopRuntime = startNodeChatRuntime();
    void newChatSession();
    return () => {
      stopRuntime();
    };
  }, []);

  const clearSettleTimer = () => {
    if (settleTimerRef.current != null) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  };

  const markComplete = () => {
    clearSettleTimer();
    genCompletedRef.current = true;
    setGenStatus('completed');
    setTimeout(() => setGenStatus('idle'), 2500);
  };

  /** 刷新左侧设备信息：按 code 拉取详情；新建首次无 code 时通过节点列表差分发现。新建/编辑共用。 */
  const refreshLeftPanel = async (opts?: { code?: string; showLoading?: boolean }) => {
    const runId = ++refreshRunIdRef.current;
    const knownCode = (opts?.code || nodeCodeRef.current || nodeCode || '').trim();
    if (opts?.showLoading) setLoading(true);
    try {
      if (knownCode) {
        const detail = await getNode(knownCode);
        if (runId !== refreshRunIdRef.current || stoppedByUserRef.current) return;
        setNode(detail.node);
        setHtmlContent(detail.files.html);
        setJsContent(detail.files.js);
        return;
      }

      // 新建与编辑统一：尚无 code 时用列表差分找新节点（编辑进页通常已有 code）
      const allNodes = await getNodes();
      if (runId !== refreshRunIdRef.current || stoppedByUserRef.current) return;

      const currentCodes = allNodes.map((n) => n.code);
      const diff = currentCodes.filter((c) => !prevNodeCodesRef.current.includes(c));
      const newCode = diff[0] || '';
      if (!newCode) return;

      const detail = await getNode(newCode);
      if (runId !== refreshRunIdRef.current || stoppedByUserRef.current) return;
      setNode(detail.node);
      setHtmlContent(detail.files.html);
      setJsContent(detail.files.js);
    } catch (err) {
      console.error('[NodeEditor] refreshLeftPanel failed:', err);
      if (opts?.showLoading) setNode(null);
    } finally {
      if (opts?.showLoading && runId === refreshRunIdRef.current) {
        setLoading(false);
      }
    }
  };

  const isTerminalAssistantMsg = (msg: (typeof messages)[number] | undefined) => {
    if (!msg || msg.role !== 'assistant' || msg.id.startsWith('hist-')) return false;
    const kind = msg.kind ?? 'normal';
    return kind === 'normal';
  };

  const beginGenerating = () => {
    clearSettleTimer();
    genCompletedRef.current = false;
    stoppedByUserRef.current = false;
    refreshRunIdRef.current += 1;
    setGenStatus('generating');
  };

  const scheduleSettle = () => {
    if (genCompletedRef.current || stoppedByUserRef.current) return;
    if (genStatusRef.current !== 'generating') return;

    const latestMessages = messagesRef.current;
    const lastMsg = latestMessages[latestMessages.length - 1];
    if (isTypingRef.current || !isTerminalAssistantMsg(lastMsg)) {
      clearSettleTimer();
      return;
    }

    clearSettleTimer();
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      if (genCompletedRef.current || stoppedByUserRef.current) return;

      const msgs = messagesRef.current;
      const last = msgs[msgs.length - 1];
      if (isTypingRef.current || !isTerminalAssistantMsg(last)) {
        scheduleSettle();
        return;
      }

      const content = last.content || '';
      const successHint =
        /已生成|创建成功|写入成功|已写入|已保存|更新成功|部署成功|已完成节点|节点文件|html\+|已更新|同步成功/i;
      const needsUserInput =
        /请提供|请补充|请确认|还缺|需要您|信息不完整|无法继续|缺少必要|请先告诉我|还需要哪些/i;
      const matchedSuccess = content.match(successHint)?.[0] || '';
      const matchedNeedInput = content.match(needsUserInput)?.[0] || '';
      if (!matchedSuccess && matchedNeedInput) {
        markComplete();
        return;
      }

      void refreshLeftPanel().finally(() => {
        if (stoppedByUserRef.current) {
          stoppedByUserRef.current = false;
          return;
        }
        markComplete();
      });
    }, SETTLE_MS);
  };

  // 点击编辑进入（或创建页带 resumeCode）时，与对话完成后同一套刷新逻辑
  useEffect(() => {
    if (!nodeCode) {
      setLoading(false);
      return;
    }
    void refreshLeftPanel({ code: nodeCode, showLoading: true });
  }, [nodeCode]);

  useEffect(() => {
    const cmds = node?.commands ?? [];
    if (cmds.length === 0) {
      if (selectedCmd) setSelectedCmd('');
      return;
    }
    if (!selectedCmd || !cmds.includes(selectedCmd)) {
      setSelectedCmd(cmds[0]);
    }
  }, [node, selectedCmd]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const prev = prevIsTypingRef.current;
    if (isTyping && !prev) {
      beginGenerating();
    }
    prevIsTypingRef.current = isTyping;
  }, [isTyping]);

  useEffect(() => {
    if (genStatus !== 'generating' || genCompletedRef.current) return;
    scheduleSettle();
  }, [messages, isTyping, genStatus]);

  useEffect(() => () => clearSettleTimer(), []);

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

  const handleSubmit = async () => {
    const msg = input.trim();
    const hasAttachments = attachments.length > 0;
    if (!msg && !hasAttachments) return;

    if (msg.startsWith('/')) {
      pendingMsgRef.current = null;
      if (connectionState === 'connected') {
        sendChatMessage({ content: msg, attachments: [] });
      }
      setInput('');
      setAttachments([]);
      return;
    }

    if (effectiveDialogueType === 'create') {
      try {
        const nodes = await getNodes();
        prevNodeCodesRef.current = nodes.map((n) => n.code);
      } catch {
        prevNodeCodesRef.current = [];
      }
    }

    const contextJson = JSON.stringify({
      dialogue_type: effectiveDialogueType,
      current_deviceCode: effectiveDeviceCode,
    });
    // 仅有附件时也带上技能前缀与上下文，保证后端收到非空 content
    const enrichedContent = msg
      ? `使用 nodered-pipeline技能生成nodered节点\n\n${contextJson}\n\n${msg}`
      : `使用 nodered-pipeline技能生成nodered节点\n\n${contextJson}`;
    const payloadAttachments = [...attachments];

    if (connectionState !== 'connected') {
      pendingMsgRef.current = {
        content: enrichedContent,
        attachments: payloadAttachments,
      };
      setInput('');
      setAttachments([]);
      return;
    }

    if (
      sendChatMessage({
        content: enrichedContent,
        attachments: payloadAttachments,
      })
    ) {
      setInput('');
      setAttachments([]);
    }
  };

  useEffect(() => {
    if (connectionState === 'connected' && pendingMsgRef.current) {
      const pending = pendingMsgRef.current;
      pendingMsgRef.current = null;
      sendChatMessage({
        content: pending.content,
        attachments: pending.attachments,
      });
    }
  }, [connectionState]);

  const handleStop = () => {
    pendingMsgRef.current = null;
    stoppedByUserRef.current = true;
    refreshRunIdRef.current += 1;
    clearSettleTimer();
    markComplete();
    sendStopSignal();
  };

  const canSubmit = !isSessionBusy && (Boolean(input.trim()) || attachments.length > 0);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit) {
        void handleSubmit();
      }
    }
  };

  const handleAttachClick = () => {
    if (isSessionBusy) return;
    fileInputRef.current?.click();
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleAttachmentSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    await processAttachmentFiles(files);
  };

  const extractShellScript = (funcBody: string): string => {
    const match = funcBody.match(/`([\s\S]*?)`/);
    return match ? match[1].trim() : funcBody;
  };

  const extractJSDocLines = (funcBody: string): string[] => {
    const match = funcBody.match(/\/\*\*([\s\S]*?)\*\//);
    if (!match) return [];
    return match[1]
      .split('\n')
      .map((line) => line.replace(/^\s*\*\s?/, '').trim())
      .filter((line) => line.length > 0 && !line.startsWith('/'));
  };

  if (loading) {
    return (
      <div className="device-page">
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-dim)' }}>
          ⏳ 加载节点信息...
        </div>
      </div>
    );
  }

  const allPins = [
    ...(node?.inputPins || []).map((p) => ({ ...p, dir: 'IN' })),
    ...(node?.outputPins || []).map((p) => ({ ...p, dir: 'OUT' })),
  ];
  const isSerial = (node?.deviceKind ?? '').toLowerCase() === 'serial';
  const kindLabel = isSerial ? '串口类型' : '引脚类型';

  return (
    <div className="device-page" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            width: '45%',
            borderRight: '1px solid var(--border)',
            overflow: 'auto',
            padding: '20px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, position: 'relative' }}>
            <button type="button" onClick={onBack} className="btn-panel" style={{ position: 'absolute', left: 0 }}>
              ← 返回
            </button>
            <h2
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--text)',
                letterSpacing: 0.5,
                margin: 0,
              }}
            >
              📋 设备信息
            </h2>
            {node && onSimulate ? (
              <button
                type="button"
                className="btn-panel primary"
                style={{ position: 'absolute', right: 0 }}
                onClick={() => onSimulate(node.code)}
              >
                ▶ 模拟
              </button>
            ) : null}
          </div>

          {!node ? (
            <div
              style={{
                textAlign: 'center',
                padding: 60,
                color: 'var(--text-dim)',
                border: '2px dashed var(--border)',
                borderRadius: 16,
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 8 }}>📡</div>
              <p style={{ fontSize: 13 }}>等待创建...</p>
              <p style={{ fontSize: 12, marginTop: 6 }}>
                在右侧对话框中描述设备需求，提交后将在此处显示节点信息
              </p>
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--text)',
                  marginBottom: 4,
                  letterSpacing: 0.3,
                }}
              >
                <span>
                  {node.name}
                  <span style={{ color: 'var(--text-dim)', fontWeight: 400, marginLeft: 6 }}>
                    （{node.code}）
                  </span>
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--accent)',
                    background: 'rgba(0, 184, 148, 0.1)',
                    border: '1px solid rgba(0, 184, 148, 0.25)',
                  }}
                >
                  类型：{kindLabel}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-dim)',
                  marginBottom: 20,
                }}
              >
                {node.description || ''}
              </div>

              {!isSerial && (
                <>
                  <h3
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-dim)',
                      marginBottom: 8,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    📌 引脚
                  </h3>
                  <div className="pin-strip" style={{ marginBottom: 20 }}>
                    {allPins.length === 0 && (
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>无引脚定义</span>
                    )}
                    {allPins.map((pin, i) => (
                      <span key={i} className="pin-module">
                        {pin.name}({pin.type})
                      </span>
                    ))}
                  </div>
                </>
              )}

              <h3
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-dim)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                ⚡ 指令
              </h3>
              {(node.commands || []).length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>无指令定义</span>
              ) : (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 2,
                      borderBottom: '1px solid var(--border)',
                      marginBottom: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    {(node.commands || []).map((cmd) => (
                      <button
                        key={cmd}
                        type="button"
                        onClick={() => setSelectedCmd(cmd)}
                        style={{
                          padding: '6px 14px',
                          background: selectedCmd === cmd ? 'var(--accent)' : 'transparent',
                          color: selectedCmd === cmd ? 'var(--accent-fg, #fff)' : 'var(--text-dim)',
                          border: 'none',
                          borderRadius: selectedCmd === cmd ? '8px 8px 0 0' : 0,
                          borderBottom:
                            selectedCmd === cmd ? '2px solid var(--accent)' : '2px solid transparent',
                          fontSize: 12,
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                          fontWeight: selectedCmd === cmd ? 600 : 400,
                        }}
                      >
                        {cmd}
                      </button>
                    ))}
                  </div>

                  {selectedCmd && node.scripts?.[selectedCmd] && (() => {
                    const scriptBody = node.scripts[selectedCmd];
                    // 串口：展示完整 action JS 方法；引脚：仍展示说明 + shell 片段
                    const jsDocLines = isSerial ? [] : extractJSDocLines(scriptBody);
                    const commandContent = isSerial ? scriptBody : extractShellScript(scriptBody);
                    return (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                        {jsDocLines.length > 0 && (
                          <div
                            style={{
                              flex: 1,
                              background: 'rgba(0, 184, 148, 0.08)',
                              border: '1px solid rgba(0, 184, 148, 0.2)',
                              borderRadius: 12,
                              padding: '10px 14px',
                              fontSize: 12,
                              lineHeight: 1.7,
                              color: '#8ab4f8',
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                                marginBottom: 6,
                                opacity: 0.7,
                              }}
                            >
                              指令说明
                            </div>
                            {jsDocLines.map((line, i) => (
                              <div key={i}>
                                {i === 0 ? (
                                  <span style={{ fontWeight: 600 }}>{line}</span>
                                ) : (
                                  <span style={{ opacity: 0.9 }}>{line}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <pre
                          style={{
                            flex: 1,
                            background: 'var(--input)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '12px 14px',
                            fontSize: 12,
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                            color: 'var(--accent)',
                            maxHeight: 500,
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            lineHeight: 1.6,
                            margin: 0,
                          }}
                        >
                          {commandContent}
                        </pre>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="flex min-w-0 flex-1 flex-col overflow-hidden border-l border-border/60 bg-card">
          <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3">
            <div className="flex min-w-0 items-center gap-2">
              <Bot className="size-4 shrink-0 text-primary" />
              <span className="truncate text-sm font-semibold text-foreground">AI 对话编辑</span>
              {genStatus === 'generating' && (
                <span className="flex items-center gap-1 text-[12px] text-primary">
                  <LoaderCircle className="size-3 animate-spin" />
                  生成中
                </span>
              )}
              {genStatus === 'completed' && (
                <span className="text-[12px] text-success">生成完成</span>
              )}
            </div>
            <span
              className={`shrink-0 text-[12px] ${
                connectionState === 'connected' ? 'text-success' : 'text-warning'
              }`}
            >
              {connectionState === 'connected' ? '已连接' : '连接中...'}
            </span>
          </div>

          <div
            ref={scrollRef}
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-background/40 p-3"
          >
            <NodeEditorMessagesList
              messages={messages}
              isTyping={isSessionBusy}
              mode={mode}
              nodeCode={nodeCode}
              onSelectExample={(prompt) => setInput(prompt)}
            />
          </div>

          <div className="shrink-0 border-t border-border/60 bg-card p-3">
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

            <div className="relative flex flex-col rounded-md border border-border/60 bg-background p-2.5 shadow-sm">
              {attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2 px-0.5">
                  {attachments.map((attachment, index) => (
                    <div
                      key={`${attachment.filename}-${index}`}
                      className="relative h-16 w-16 overflow-hidden rounded-md border border-border/60 bg-card"
                      title={attachment.filename || '附件'}
                    >
                      {attachment.type === 'image' ? (
                        <img
                          src={attachment.url}
                          alt={attachment.filename || '附件'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-muted-foreground">
                          <FileText className="size-5 shrink-0" />
                          <span className="w-full truncate text-center text-[10px] font-medium uppercase leading-tight">
                            {attachment.filename?.split('.').pop() || 'file'}
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(index)}
                        disabled={isSessionBusy}
                        className="absolute right-0.5 top-0.5 inline-flex size-5 items-center justify-center rounded-full border border-border/60 bg-background/90 text-foreground shadow-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="移除附件"
                        title="移除附件"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  effectiveDialogueType === 'create'
                    ? '描述节点名称、引脚与指令，例如：灯 light，引脚 red/yellow/green（DO），闪烁动作…'
                    : '描述需要调整的内容，例如：增加一个闪烁动作…'
                }
                className="min-h-[72px] flex-1 resize-none border-0 bg-transparent px-1.5 py-1 text-sm leading-5 shadow-none placeholder:text-xs focus-visible:ring-0"
                disabled={isSessionBusy}
              />

              <div className="mt-1.5 flex items-center justify-between gap-2 px-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={handleAttachClick}
                  disabled={isSessionBusy}
                  aria-label="添加附件"
                  title="添加附件"
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
                          {isSessionBusy ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <Send className="size-4" />
                          )}
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
                          variant={isSessionBusy ? 'destructive' : 'secondary'}
                          className="size-8 rounded-full"
                          onClick={handleStop}
                          disabled={!isSessionBusy}
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
      </div>
    </div>
  );
}
