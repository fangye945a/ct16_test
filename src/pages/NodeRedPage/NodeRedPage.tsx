import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  ExternalLink,
  LoaderCircle,
  Mic,
  Paperclip,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trash2,
  Unplug,
  Workflow,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const EDITOR_PATH = import.meta.env.VITE_NODE_RED_PATH || '/node-red/';
const WORKFLOW_AI_API_PATH = import.meta.env.VITE_WORKFLOW_AI_API_PATH || '/api/workflow-ai';
const HEALTH_INTERVAL_MS = 15000;
const HEALTH_TIMEOUT_MS = 5000;
const HEALTH_FAILURE_THRESHOLD = 3;
const LOAD_TIMEOUT_MS = 20000;

type SheetMode = 'flow' | 'nodes';
type ProposalMode = 'flow' | 'node-instance' | 'node-module';
type MessageRole = 'assistant' | 'user';

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
}

interface WorkflowProposal {
  id: string;
  mode: ProposalMode;
  summary: string;
  assistantMessage?: string;
  nodeCount?: number;
  connectionCount?: number;
  warnings?: string[];
  targetDirectory?: string;
  files?: string[];
}

interface DevicePin {
  id: string;
  label: string;
  capabilities: string[];
}

interface BoardProfile {
  id: string;
  name: string;
  pins: DevicePin[];
}

interface DeviceNode {
  id: string;
  name: string;
  description: string;
  boardId: string;
  pinId: string;
  mode: string;
  parameters: Record<string, string>;
  updatedAt: string;
  lastTest?: { status: 'success' | 'error' | 'unsupported'; message: string; testedAt: string };
}

interface DeviceNodeDraft {
  name: string;
  description: string;
  boardId: string;
  pinId: string;
  mode: string;
  parameters: Record<string, string>;
}

interface DeviceNodeProposal {
  id: string;
  assistantMessage?: string;
  draft: DeviceNodeDraft;
}

interface AssistantAttachment {
  id: string;
  name: string;
  mimeType: string;
  content: string;
}

function EnsureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function CreateMessage(role: MessageRole, content: string): ChatMessage {
  return { id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`, role, content };
}

function GetApiUrl(path: string): string {
  return `${EnsureTrailingSlash(WORKFLOW_AI_API_PATH)}${path}`;
}

function GetErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败，请稍后重试。';
}

async function GetJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error((await response.text()) || '服务请求失败。');
  }
  return response.json() as Promise<T>;
}

function FlowAssistant({ onApplied, onCollapse }: { onApplied: () => void; onCollapse: () => void }) {
  const promptExamples = ['读取温湿度并在超阈值时告警', '每 5 分钟采集设备状态并写入日志', '接收 MQTT 指令后控制 GPIO 输出'];
  const [messages, setMessages] = useState<ChatMessage[]>([CreateMessage('assistant', '描述你的自动化目标，我会先生成可确认的流程提案。')]);
  const [input, setInput] = useState('');
  const [proposal, setProposal] = useState<WorkflowProposal | null>(null);
  const [attachments, setAttachments] = useState<AssistantAttachment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const addAttachment = (name: string, mimeType: string, content: string) => {
    setAttachments((current) => [...current, { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, name, mimeType, content }]);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const selectedFiles = Array.from(files).slice(0, 3);
    try {
      const nextAttachments = await Promise.all(selectedFiles.map(async (file) => ({ id: `${Date.now()}-${file.name}`, name: file.name, mimeType: file.type || 'application/octet-stream', content: await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error(`无法读取文件：${file.name}`)); reader.readAsDataURL(file); }) })));
      setAttachments((current) => [...current, ...nextAttachments]);
    } catch (attachmentError) {
      setError(GetErrorMessage(attachmentError));
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const audio = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => addAttachment(`语音输入-${new Date().toLocaleTimeString('zh-CN')}.webm`, audio.type, String(reader.result));
        reader.readAsDataURL(audio);
        setIsRecording(false);
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setError('无法启用麦克风，请检查浏览器权限。');
    }
  };

  useEffect(() => () => { recorderRef.current?.stop(); }, []);

  const generate = async () => {
    const prompt = input.trim();
    if ((!prompt && attachments.length === 0) || isGenerating) return;
    const nextMessages = [...messages, CreateMessage('user', prompt)];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setProposal(null);
    setIsGenerating(true);
    try {
      const response = await fetch(GetApiUrl('proposals'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ mode: 'flow', messages: nextMessages.map(({ role, content }) => ({ role, content })), attachments }),
      });
      if (!response.ok) throw new Error((await response.text()) || '生成提案失败。');
      const payload = await response.json() as { proposal: WorkflowProposal };
      if (!payload.proposal?.id) throw new Error('服务未返回有效提案。');
      setProposal(payload.proposal);
      setMessages((current) => [...current, CreateMessage('assistant', payload.proposal.assistantMessage || '提案已生成，请确认后应用。')]);
      setAttachments([]);
    } catch (requestError) {
      setError(GetErrorMessage(requestError));
    } finally {
      setIsGenerating(false);
    }
  };

  const apply = async () => {
    if (!proposal || isApplying) return;
    setIsApplying(true);
    setError('');
    try {
      const response = await fetch(GetApiUrl(`proposals/${proposal.id}/apply`), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error((await response.text()) || '应用提案失败。');
      setMessages((current) => [...current, CreateMessage('assistant', '提案已应用，编辑器正在刷新。')]);
      setProposal(null);
      onApplied();
    } catch (requestError) {
      setError(GetErrorMessage(requestError));
    } finally {
      setIsApplying(false);
    }
  };

  return <aside className="flex h-full min-h-0 flex-col bg-card">
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 px-3">
      <div className="flex min-w-0 items-center gap-2"><Bot className="size-4 text-primary" /><span className="truncate text-sm font-semibold">AI 编程助手</span></div>
      <div className="flex items-center gap-1">{isGenerating && <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" />}<Button variant="ghost" size="icon" className="size-8" onClick={onCollapse} aria-label="收起 AI 编程助手"><ChevronRight className="size-4" /></Button></div>
    </div>
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
      {messages.map((message) => <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}><p className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-5 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>{message.content}</p></div>)}
      {error && <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">{error}</p>}
      {proposal && <div className="rounded-lg border border-border bg-muted/30 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold">待确认流程</span><Badge variant="outline" className="text-[10px]">流程提案</Badge></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{proposal.summary}</p><p className="mt-2 text-[11px] text-muted-foreground">{proposal.nodeCount || 0} 个节点 · {proposal.connectionCount || 0} 条连接</p><Button className="mt-3 w-full" size="sm" onClick={() => void apply()} disabled={isApplying}>{isApplying ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}应用到 Node-RED</Button></div>}
    </div>
    <div className="shrink-0 border-t border-border/60 p-3" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void handleFiles(event.dataTransfer.files); }}><div className="mb-2 flex flex-wrap items-center gap-1.5"><span className="mr-1 text-[11px] text-muted-foreground">快捷提示</span>{promptExamples.map((example) => <button key={example} type="button" className="rounded-md border border-border bg-muted/30 px-2 py-1 text-[11px] text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary" onClick={() => setInput(example)}>{example}</button>)}</div>{attachments.length > 0 && <div className="mb-2 flex flex-wrap gap-1">{attachments.map((attachment) => <span key={attachment.id} className="flex max-w-full items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-[11px]"><Paperclip className="size-3 text-muted-foreground" /><span className="max-w-36 truncate">{attachment.name}</span><button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))} aria-label={`移除 ${attachment.name}`}><X className="size-3" /></button></span>)}</div>}<div className="flex items-end gap-1"><Button variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => fileInputRef.current?.click()} aria-label="添加图片或文件"><Paperclip className="size-4" /></Button><input ref={fileInputRef} type="file" className="hidden" accept="image/*,.txt,.md,.json,.csv" multiple onChange={(event) => { void handleFiles(event.target.files); event.currentTarget.value = ''; }} /><Textarea value={input} onChange={(event) => setInput(event.target.value)} onPaste={(event) => { if (event.clipboardData.files.length > 0) { event.preventDefault(); void handleFiles(event.clipboardData.files); } }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void generate(); } }} placeholder="描述流程，或拖入/粘贴图片和文件" className="min-h-10 h-10 resize-none text-sm placeholder:text-xs" disabled={isGenerating} /><Button variant={isRecording ? 'destructive' : 'ghost'} size="icon" className="size-9 shrink-0" onClick={() => void toggleRecording()} aria-label={isRecording ? '停止语音输入' : '语音输入'}>{isRecording ? <Square className="size-3.5" /> : <Mic className="size-4" />}</Button><Button size="icon" className="size-9 shrink-0" onClick={() => void generate()} disabled={(!input.trim() && attachments.length === 0) || isGenerating} aria-label="生成流程提案"><Send className="size-4" /></Button></div></div>
  </aside>;
}

function BuildDeviceScript(draft: DeviceNodeDraft): string {
  const operation = draft.mode === 'output' ? 'WritePin' : draft.mode === 'analog' ? 'ReadAnalog' : 'ReadPin';
  return [
    `const deviceNode = ${JSON.stringify({ boardId: draft.boardId, pinId: draft.pinId, mode: draft.mode, parameters: draft.parameters }, null, 2)};`,
    '',
    'async function ExecuteDeviceNode(gateway) {',
    `  return gateway.${operation}(deviceNode.boardId, deviceNode.pinId, deviceNode.parameters);`,
    '}',
  ].join('\n');
}

function DeviceNodeEditorPage({ node, boards, onBack, onSave, onDelete, onTest }: {
  node: DeviceNode | null;
  boards: BoardProfile[];
  onBack: () => void;
  onSave: (draft: DeviceNodeDraft) => Promise<void>;
  onDelete: (node: DeviceNode) => Promise<void>;
  onTest: (node: DeviceNode) => Promise<DeviceNode | undefined>;
}) {
  const promptExamples = ['创建用于控制告警灯的数字输出节点', '配置一个采集温湿度的模拟量输入节点', '创建接收门磁状态的输入节点'];
  const [draft, setDraft] = useState<DeviceNodeDraft>({ name: '', description: '', boardId: '', pinId: '', mode: 'input', parameters: {} });
  const [messages, setMessages] = useState<ChatMessage[]>([CreateMessage('assistant', '描述设备用途，我会生成节点配置并回填到表单。')]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<AssistantAttachment[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [testResult, setTestResult] = useState<DeviceNode['lastTest']>();
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const board = boards.find((item) => item.id === draft.boardId);

  useEffect(() => {
    setDraft(node ? { name: node.name, description: node.description, boardId: node.boardId, pinId: node.pinId, mode: node.mode, parameters: node.parameters } : { name: '', description: '', boardId: boards[0]?.id || '', pinId: '', mode: 'input', parameters: {} });
    setTestResult(node?.lastTest);
    setError('');
  }, [node, boards]);
  useEffect(() => () => { recorderRef.current?.stop(); }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    try {
      const nextAttachments = await Promise.all(Array.from(files).slice(0, 3).map(async (file) => ({ id: `${Date.now()}-${file.name}`, name: file.name, mimeType: file.type || 'application/octet-stream', content: await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error(`无法读取文件：${file.name}`)); reader.readAsDataURL(file); }) })));
      setAttachments((current) => [...current, ...nextAttachments]);
    } catch (attachmentError) { setError(GetErrorMessage(attachmentError)); }
  };
  const toggleRecording = async () => {
    if (isRecording) { recorderRef.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
      recorder.onstop = () => { stream.getTracks().forEach((track) => track.stop()); const audio = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }); const reader = new FileReader(); reader.onload = () => setAttachments((current) => [...current, { id: `${Date.now()}-voice`, name: `语音输入-${new Date().toLocaleTimeString('zh-CN')}.webm`, mimeType: audio.type, content: String(reader.result) }]); reader.readAsDataURL(audio); setIsRecording(false); };
      recorder.start(); recorderRef.current = recorder; setIsRecording(true);
    } catch { setError('无法启用麦克风，请检查浏览器权限。'); }
  };
  const generate = async () => {
    const prompt = input.trim();
    if ((!prompt && attachments.length === 0) || isGenerating) return;
    const nextMessages = [...messages, CreateMessage('user', prompt)];
    setMessages(nextMessages); setInput(''); setError(''); setIsGenerating(true);
    try {
      const response = await fetch(GetApiUrl('device-node-proposals'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ prompt, nodeId: node?.id, boards, messages: nextMessages.map(({ role, content }) => ({ role, content })), attachments }) });
      if (!response.ok) throw new Error((await response.text()) || '生成节点配置失败。');
      const payload = await response.json() as { proposal: DeviceNodeProposal };
      if (!payload.proposal?.draft) throw new Error('服务未返回有效节点配置。');
      setDraft((current) => ({ ...current, ...payload.proposal.draft, parameters: payload.proposal.draft.parameters || current.parameters }));
      setMessages((current) => [...current, CreateMessage('assistant', payload.proposal.assistantMessage || '节点配置已回填，请确认后保存。')]);
      setAttachments([]);
    } catch (requestError) { setError(GetErrorMessage(requestError)); } finally { setIsGenerating(false); }
  };
  const save = async () => { setIsSaving(true); setError(''); try { await onSave(draft); } catch (saveError) { setError(GetErrorMessage(saveError)); } finally { setIsSaving(false); } };
  const test = async () => { if (!node) { setError('请先保存节点，再执行单节点测试。'); return; } setIsTesting(true); setError(''); try { const updatedNode = await onTest(node); setTestResult(updatedNode?.lastTest); } catch (testError) { setError(GetErrorMessage(testError)); } finally { setIsTesting(false); } };

  return <div className="grid h-full min-h-0 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
    <main className="min-h-0 overflow-y-auto pr-1"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3"><Button variant="ghost" size="sm" onClick={onBack}><ChevronLeft className="size-4" />返回节点列表</Button><div className="flex items-center gap-2">{node && <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => { if (window.confirm(`确认删除节点“${node.name}”？`)) void onDelete(node); }}><Trash2 className="size-3.5" />删除</Button>}<Button size="sm" onClick={() => void save()} disabled={isSaving || !draft.name || !draft.boardId || !draft.pinId}>{isSaving && <LoaderCircle className="size-3.5 animate-spin" />}{node ? '保存节点' : '创建节点'}</Button></div></div>
      {error && <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{error}</div>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Label htmlFor="device-node-name">节点名称</Label><Input id="device-node-name" className="mt-1.5" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></div><div className="sm:col-span-2"><Label htmlFor="device-node-description">节点说明</Label><Textarea id="device-node-description" className="mt-1.5 min-h-20" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></div><div><Label>板卡</Label><Select value={draft.boardId} onValueChange={(boardId) => setDraft({ ...draft, boardId, pinId: '' })}><SelectTrigger className="mt-1.5"><SelectValue placeholder="选择板卡" /></SelectTrigger><SelectContent>{boards.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div><div><Label>引脚</Label><Select value={draft.pinId} onValueChange={(pinId) => setDraft({ ...draft, pinId })}><SelectTrigger className="mt-1.5"><SelectValue placeholder="选择引脚" /></SelectTrigger><SelectContent>{board?.pins.map((pin) => <SelectItem key={pin.id} value={pin.id}>{pin.label} ({pin.capabilities.join('、')})</SelectItem>)}</SelectContent></Select></div><div><Label>工作模式</Label><Select value={draft.mode} onValueChange={(mode) => setDraft({ ...draft, mode })}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="input">输入</SelectItem><SelectItem value="output">输出</SelectItem><SelectItem value="analog">模拟量</SelectItem></SelectContent></Select></div></div>
      <section className="mt-6 border-t border-border/60 pt-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Code2 className="size-4 text-primary" /><h3 className="text-sm font-semibold">节点执行脚本</h3></div><span className="text-[11px] text-muted-foreground">根据当前配置生成</span></div><Textarea readOnly value={BuildDeviceScript(draft)} className="mt-3 min-h-52 resize-y bg-muted/30 font-mono text-xs leading-5" /></section>
      <section className="mt-6 border-t border-border/60 pt-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">单节点测试</h3><p className="mt-1 text-xs text-muted-foreground">验证当前已保存节点的引脚操作和执行环境。</p></div><Button variant="outline" size="sm" onClick={() => void test()} disabled={isTesting || !node}>{isTesting ? <LoaderCircle className="size-3.5 animate-spin" /> : <Activity className="size-3.5" />}{node?.mode === 'output' ? '执行写入测试' : '执行读取测试'}</Button></div>{!node && <p className="mt-3 text-xs text-muted-foreground">保存节点后可执行测试。</p>}{testResult && <div className={`mt-3 rounded-md border p-3 text-xs ${testResult.status === 'success' ? 'border-success/30 bg-success/5 text-success' : 'border-warning/30 bg-warning/5 text-warning'}`}><p>{testResult.message}</p><p className="mt-1 opacity-80">{new Date(testResult.testedAt).toLocaleString('zh-CN')}</p></div>}</section>
    </main>
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/60 bg-card"><div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/60 px-3"><Bot className="size-4 text-primary" /><span className="text-sm font-semibold">节点 AI 编程助手</span>{isGenerating && <LoaderCircle className="ml-auto size-4 animate-spin text-primary" />}</div><div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">{messages.map((message) => <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}><p className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-5 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>{message.content}</p></div>)}</div><div className="shrink-0 border-t border-border/60 p-3" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void handleFiles(event.dataTransfer.files); }}><div className="mb-2 flex flex-wrap gap-1.5">{promptExamples.map((example) => <button key={example} type="button" className="rounded-md border border-border bg-muted/30 px-2 py-1 text-[11px] text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary" onClick={() => setInput(example)}>{example}</button>)}</div>{attachments.length > 0 && <div className="mb-2 flex flex-wrap gap-1">{attachments.map((attachment) => <span key={attachment.id} className="flex max-w-full items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-[11px]"><Paperclip className="size-3 text-muted-foreground" /><span className="max-w-32 truncate">{attachment.name}</span><button type="button" onClick={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))} aria-label={`移除 ${attachment.name}`}><X className="size-3" /></button></span>)}</div>}<div className="flex items-end gap-1"><Button variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => fileInputRef.current?.click()} aria-label="添加图片或文件"><Paperclip className="size-4" /></Button><input ref={fileInputRef} type="file" className="hidden" accept="image/*,.txt,.md,.json,.csv" multiple onChange={(event) => { void handleFiles(event.target.files); event.currentTarget.value = ''; }} /><Textarea value={input} onChange={(event) => setInput(event.target.value)} onPaste={(event) => { if (event.clipboardData.files.length > 0) { event.preventDefault(); void handleFiles(event.clipboardData.files); } }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void generate(); } }} placeholder="描述节点用途，或拖入/粘贴图片和文件" className="h-10 min-h-10 resize-none text-sm placeholder:text-xs" disabled={isGenerating} /><Button variant={isRecording ? 'destructive' : 'ghost'} size="icon" className="size-9 shrink-0" onClick={() => void toggleRecording()} aria-label={isRecording ? '停止语音输入' : '语音输入'}>{isRecording ? <Square className="size-3.5" /> : <Mic className="size-4" />}</Button><Button size="icon" className="size-9 shrink-0" onClick={() => void generate()} disabled={(!input.trim() && attachments.length === 0) || isGenerating} aria-label="生成节点配置"><Send className="size-4" /></Button></div></div></aside>
  </div>;
}

function DeviceNodeWorkspace({ apiUrl }: { apiUrl: string }) {
  const [nodes, setNodes] = useState<DeviceNode[]>([]);
  const [boards, setBoards] = useState<BoardProfile[]>([]);
  const [selectedNode, setSelectedNode] = useState<DeviceNode | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const [nodeData, boardData] = await Promise.all([GetJson<{ nodes: DeviceNode[] }>(`${apiUrl}device-nodes`), GetJson<{ boards: BoardProfile[] }>(`${apiUrl}device-nodes/boards`)]);
      setNodes(nodeData.nodes);
      setBoards(boardData.boards);
      setError('');
    } catch (requestError) { setError(GetErrorMessage(requestError)); } finally { setIsLoading(false); }
  };

  useEffect(() => { void load(); }, [apiUrl]);
  const filteredNodes = nodes.filter((node) => `${node.name} ${node.id} ${node.description}`.toLowerCase().includes(query.toLowerCase()));
  const selectedBoard = boards.find((board) => board.id === selectedNode?.boardId);

  const save = async (draft: DeviceNodeDraft) => {
    const isNew = !selectedNode;
    const response = await fetch(isNew ? `${apiUrl}device-nodes` : `${apiUrl}device-nodes/${selectedNode.id}`, { method: isNew ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(draft) });
    if (!response.ok) throw new Error((await response.text()) || '保存设备节点失败。');
    const payload = await response.json() as { node: DeviceNode };
    setSelectedNode(payload.node);
    setIsCreating(false);
    await load();
  };

  const remove = async (node: DeviceNode) => {
    const response = await fetch(`${apiUrl}device-nodes/${node.id}`, { method: 'DELETE', credentials: 'same-origin' });
    if (!response.ok) throw new Error((await response.text()) || '删除设备节点失败。');
    setNodes((current) => current.filter((item) => item.id !== node.id));
    setSelectedNode(null);
  };

  const test = async (node: DeviceNode) => {
    try {
      const response = await fetch(`${apiUrl}device-nodes/${node.id}/test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ operation: node.mode === 'output' ? 'write' : 'read' }) });
      const payload = await response.json() as { node?: DeviceNode; message?: string };
      if (!response.ok) throw new Error(payload.message || '设备调试失败。');
      if (payload.node) setSelectedNode(payload.node);
      await load();
      return payload.node;
    } catch (requestError) { setError(GetErrorMessage(requestError)); throw requestError; }
  };

  if (selectedNode || isCreating) {
    return <DeviceNodeEditorPage node={selectedNode} boards={boards} onBack={() => { setSelectedNode(null); setIsCreating(false); }} onSave={save} onDelete={remove} onTest={test} />;
  }

  if (selectedNode) {
    return <div className="h-full min-h-0 overflow-y-auto"><div className="mx-auto max-w-5xl py-1">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3"><Button variant="ghost" size="sm" onClick={() => setSelectedNode(null)}><ChevronLeft className="size-4" />返回节点列表</Button><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="size-3.5" />刷新信息</Button><Button size="sm" onClick={() => setIsEditorOpen(true)}><Settings2 className="size-3.5" />编辑节点</Button></div></div>
      {error && <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{error}</div>}
      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]"><main><div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10"><Settings2 className="size-5 text-primary" /></div><div className="min-w-0"><h2 className="truncate text-lg font-semibold">{selectedNode.name}</h2><p className="mt-1 text-sm text-muted-foreground">{selectedNode.description || '未填写节点说明'}</p></div></div><section className="mt-6 border-y border-border/60 py-5"><h3 className="text-sm font-semibold">节点配置</h3><dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-3"><div><dt className="text-xs text-muted-foreground">目标板卡</dt><dd className="mt-1 text-sm font-medium">{selectedBoard?.name || selectedNode.boardId}</dd></div><div><dt className="text-xs text-muted-foreground">硬件引脚</dt><dd className="mt-1 text-sm font-medium">{selectedNode.pinId}</dd></div><div><dt className="text-xs text-muted-foreground">工作模式</dt><dd className="mt-1 text-sm font-medium">{selectedNode.mode}</dd></div></dl></section><section className="pt-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">设备调试</h3><p className="mt-1 text-xs text-muted-foreground">直接对当前引脚执行手动操作，不会修改已有流程。</p></div><Button size="sm" onClick={() => void test(selectedNode!)} disabled={isTesting}>{isTesting ? <LoaderCircle className="size-3.5 animate-spin" /> : <Activity className="size-3.5" />}{selectedNode.mode === 'output' ? '写入测试' : '读取测试'}</Button></div>{selectedNode.lastTest && <div className={`mt-4 rounded-md border p-3 text-xs ${selectedNode.lastTest.status === 'success' ? 'border-success/30 bg-success/5 text-success' : 'border-warning/30 bg-warning/5 text-warning'}`}><p>{selectedNode.lastTest.message}</p><p className="mt-1 opacity-80">{new Date(selectedNode.lastTest.testedAt).toLocaleString('zh-CN')}</p></div>}</section></main><aside className="border-t border-border/60 pt-5 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0"><h3 className="text-sm font-semibold">节点信息</h3><dl className="mt-4 space-y-4 text-xs"><div><dt className="text-muted-foreground">节点标识</dt><dd className="mt-1 font-medium text-foreground">{selectedNode.id}</dd></div><div><dt className="text-muted-foreground">最近更新</dt><dd className="mt-1 font-medium text-foreground">{new Date(selectedNode.updatedAt).toLocaleString('zh-CN')}</dd></div></dl></aside></div>
    </div></div>;
  }

  return <div className="flex h-full min-h-0 flex-col"><div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3"><div><h2 className="text-base font-semibold">设备节点</h2><p className="mt-1 text-xs text-muted-foreground">选择节点进入引脚配置和设备调试。</p></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => void load()} disabled={isLoading}><RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />刷新</Button><Button size="sm" onClick={() => setIsCreating(true)}><Plus className="size-3.5" />新建节点</Button></div></div>{error && <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{error}</div>}<div className="shrink-0 py-3"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="按节点名称、标识或说明搜索" className="h-9 max-w-md text-sm" /></div><div className="min-h-0 flex-1 overflow-y-auto pb-2">{isLoading ? <div className="grid h-full min-h-52 place-items-center"><LoaderCircle className="size-5 animate-spin text-primary" /></div> : filteredNodes.length === 0 ? <div className="grid h-full min-h-52 place-items-center border border-dashed border-border/70 text-center"><div><SlidersHorizontal className="mx-auto size-7 text-muted-foreground/50" /><p className="mt-3 text-sm font-medium">{query ? '未找到匹配的设备节点' : '暂无设备节点'}</p><p className="mt-1 text-xs text-muted-foreground">点击新建节点，添加设备模块下的节点。</p></div></div> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filteredNodes.map((node) => <Card key={node.id} className="group min-h-36 rounded-lg border-border/60 p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/[0.02]"><button type="button" className="block w-full text-left" onClick={() => setSelectedNode(node)} aria-label={`编辑 ${node.name}`}><div className="flex items-start justify-between gap-3"><div className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"><Settings2 className="size-4" /></div><Badge variant="outline" className="shrink-0 text-[10px]">{node.mode}</Badge></div><h3 className="mt-4 truncate text-sm font-semibold">{node.name}</h3><p className="mt-1 line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground">{node.description || '未填写节点说明'}</p><div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3 text-[11px] text-muted-foreground"><span>{node.pinId}</span><span>编辑节点</span></div></button></Card>)}</div>}</div></div>;
}

function DeviceNodeEditor({ open, node, boards, onOpenChange, onSave }: { open: boolean; node: DeviceNode | null; boards: BoardProfile[]; onOpenChange: (open: boolean) => void; onSave: (draft: DeviceNodeDraft) => Promise<void> }) {
  const [draft, setDraft] = useState<DeviceNodeDraft>({ name: '', description: '', boardId: '', pinId: '', mode: 'input', parameters: {} });
  const [isSaving, setIsSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setDraft(node ? { name: node.name, description: node.description, boardId: node.boardId, pinId: node.pinId, mode: node.mode, parameters: node.parameters } : { name: '', description: '', boardId: boards[0]?.id || '', pinId: '', mode: 'input', parameters: {} }); setError(''); setAssistantMessage(''); setAiPrompt(''); }, [node, boards, open]);
  const board = boards.find((item) => item.id === draft.boardId);
  const save = async () => { setIsSaving(true); setError(''); try { await onSave(draft); onOpenChange(false); } catch (requestError) { setError(GetErrorMessage(requestError)); } finally { setIsSaving(false); } };
  const generateDraft = async () => { if (!aiPrompt.trim() || isGenerating) return; setIsGenerating(true); setError(''); try { const response = await fetch(GetApiUrl('device-node-proposals'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ prompt: aiPrompt.trim(), nodeId: node?.id, boards }) }); if (!response.ok) throw new Error((await response.text()) || '生成设备节点提案失败。'); const payload = await response.json() as { proposal: DeviceNodeProposal }; if (!payload.proposal?.draft) throw new Error('服务未返回有效设备节点提案。'); setDraft((current) => ({ ...current, ...payload.proposal.draft, parameters: payload.proposal.draft.parameters || current.parameters })); setAssistantMessage(payload.proposal.assistantMessage || '配置草稿已回填，请检查后保存。'); } catch (requestError) { setError(GetErrorMessage(requestError)); } finally { setIsGenerating(false); } };
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="w-full overflow-y-auto p-0 sm:max-w-2xl"><SheetHeader className="border-b border-border p-5"><SheetTitle>{node ? '编辑设备节点' : '创建设备节点'}</SheetTitle><SheetDescription>AI 生成的配置需要人工确认，保存后可在调试页面手动验证设备引脚。</SheetDescription></SheetHeader><div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_250px]"><div className="space-y-4 p-5">{error && <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">{error}</p>}<div><Label htmlFor="device-node-name">节点名称</Label><Input id="device-node-name" className="mt-1.5" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></div><div><Label htmlFor="device-node-description">节点说明</Label><Textarea id="device-node-description" className="mt-1.5" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></div><div><Label>板卡</Label><Select value={draft.boardId} onValueChange={(boardId) => setDraft({ ...draft, boardId, pinId: '' })}><SelectTrigger className="mt-1.5"><SelectValue placeholder="选择板卡" /></SelectTrigger><SelectContent>{boards.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div><div><Label>引脚</Label><Select value={draft.pinId} onValueChange={(pinId) => setDraft({ ...draft, pinId })}><SelectTrigger className="mt-1.5"><SelectValue placeholder="选择引脚" /></SelectTrigger><SelectContent>{board?.pins.map((pin) => <SelectItem key={pin.id} value={pin.id}>{pin.label} ({pin.capabilities.join('、')})</SelectItem>)}</SelectContent></Select></div><div><Label>工作模式</Label><Select value={draft.mode} onValueChange={(mode) => setDraft({ ...draft, mode })}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="input">输入</SelectItem><SelectItem value="output">输出</SelectItem><SelectItem value="analog">模拟量</SelectItem></SelectContent></Select></div><Button className="w-full" onClick={() => void save()} disabled={isSaving || !draft.name || !draft.boardId || !draft.pinId}>{isSaving && <LoaderCircle className="size-4 animate-spin" />}{node ? '保存节点' : '创建节点'}</Button></div><aside className="border-t border-border bg-muted/20 p-5 md:border-t-0 md:border-l"><div className="flex items-center gap-2"><Bot className="size-4 text-primary" /><h3 className="text-sm font-semibold">节点配置助手</h3></div><p className="mt-2 text-xs leading-5 text-muted-foreground">描述设备用途，生成的配置会回填到左侧表单。</p><Textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="例如：创建用于控制告警灯的数字输出节点" className="mt-3 min-h-28 text-xs" /><Button className="mt-3 w-full" size="sm" variant="outline" onClick={() => void generateDraft()} disabled={!aiPrompt.trim() || isGenerating}>{isGenerating ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}生成配置</Button>{assistantMessage && <p className="mt-3 rounded-md border border-success/30 bg-success/5 p-2 text-xs leading-5 text-success">{assistantMessage}</p>}</aside></div></SheetContent></Sheet>;
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
    <div className="min-h-0 flex-1">{currentSheet === 'flow' ? <div className="relative flex h-full overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm"><div className="relative min-w-0 flex-1">{isEditorLoading && <div className="absolute inset-0 z-10 grid place-items-center bg-card"><div className="text-center"><LoaderCircle className="mx-auto size-5 animate-spin text-primary" /><p className="mt-2 text-xs text-muted-foreground">正在加载工作台</p></div></div>}<iframe key={loadKey} title="可视化流程编辑器" src={editorUrl} className="h-full w-full border-0 bg-card" onLoad={() => setIsEditorLoading(false)} onError={() => { setIsEditorLoading(false); setConnectionState('disconnected'); }} />{connectionState === 'disconnected' && !isEditorLoading && <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-md border border-destructive/20 bg-card p-2 shadow-sm"><Unplug className="size-4 text-destructive" /><span className="text-xs">连接已断开</span><Button size="sm" variant="outline" className="h-7" onClick={reloadEditor}><RefreshCw className="size-3" />重连</Button></div>}</div>{!isAssistantCollapsed ? <div className="w-[360px] min-w-72 max-w-[45%] resize-x overflow-auto border-l border-border/60"><FlowAssistant onApplied={reloadEditor} onCollapse={() => setIsAssistantCollapsed(true)} /></div> : <Tooltip><TooltipTrigger asChild><Button variant="secondary" size="icon" className="absolute right-3 top-3 z-20 size-8 shadow-sm" onClick={() => setIsAssistantCollapsed(false)} aria-label="展开 AI 编程助手"><ChevronLeft className="size-4" /></Button></TooltipTrigger><TooltipContent side="left">展开 AI 编程助手</TooltipContent></Tooltip>}</div> : <DeviceNodeWorkspace apiUrl={apiUrl} />}</div>
  </section>;
}
