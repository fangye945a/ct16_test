import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  GripVertical,
  GripHorizontal,
  Zap,
  Cable,
  Radio,
  Globe,
  Bug,
  Code2,
  Pencil,
  FileCode,
  Braces,
  Table,
  Server,
  Wifi,
  Cpu,
  Microchip,
  Building2,
  X,
  Send,
  Workflow,
  MousePointer2,
  Upload,
  Download,
  Play,
  Maximize2,
  Minimize2,
  Trash2,
  Settings,
  Terminal,
  PanelRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { MOCK_NODE_PALETTE, MOCK_FLOWS, type INodeRedNode, type INodeRedConnection, type INodeRedFlow } from '@/data/nodered';

// ── 自定义节点类型 ──────────────────────────────────────────

interface ICustomNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  inputs: string[];
  outputs: string[];
  configParams: { name: string; label: string; defaultValue: string }[];
}

// ── 对话消息类型 ────────────────────────────────────────────

interface IChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
}

// ── 调试消息类型 ────────────────────────────────────────────

interface IDebugMessage {
  id: string;
  timestamp: string;
  source: string;
  payload: string;
}

// ── 节点面板 ────────────────────────────────────────────────

function NodePanel({
  customNodes,
  onDragStart,
}: {
  customNodes: ICustomNode[];
  onDragStart: (node: { type: string; label: string; icon: string; color: string }) => void;
}) {
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(['输入', '工业协议']));
  const [search, setSearch] = useState('');

  const allCategories = [
    ...MOCK_NODE_PALETTE,
    {
      name: '我的节点',
      icon: 'Star',
      nodes: customNodes.map((n) => ({
        type: n.id,
        label: n.name,
        icon: n.icon,
        color: n.color,
      })),
    },
  ];

  const filtered = allCategories
    .map((cat) => ({
      ...cat,
      nodes: cat.nodes.filter(
        (n) => !search || n.label.toLowerCase().includes(search.toLowerCase()),
      ),
    }))
    .filter((cat) => cat.nodes.length > 0);

  return (
    <Card className="h-full rounded-2xl border border-border/60 shadow-sm flex flex-col overflow-hidden">
      <div className="px-3 py-3 border-b border-border/40">
        <div className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">节点库</div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索节点..."
            className="h-7 pl-8 text-[10px]"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map((cat) => {
          const isExpanded = expandedCats.has(cat.name);
          return (
            <div key={cat.name}>
              <button
                onClick={() =>
                  setExpandedCats((prev) => {
                    const next = new Set(prev);
                    if (next.has(cat.name)) next.delete(cat.name);
                    else next.add(cat.name);
                    return next;
                  })
                }
                className="flex items-center gap-1.5 w-full px-3 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-wider hover:bg-muted/50 transition-colors"
              >
                {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                {cat.name}
                <span className="ml-auto text-[9px] font-medium normal-case">{cat.nodes.length}</span>
              </button>
              {isExpanded && (
                <div className="px-2 pb-1 space-y-0.5">
                  {cat.nodes.map((node) => (
                    <div
                      key={node.type}
                      draggable
                      onDragStart={(e: React.DragEvent) => {
                        e.dataTransfer.setData('text/plain', JSON.stringify(node));
                        onDragStart(node);
                      }}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing hover:bg-muted transition-colors group"
                    >
                      <div
                        className="size-5 rounded-md flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${node.color}18` }}
                      >
                        <GripVertical className="size-2.5" style={{ color: node.color }} />
                      </div>
                      <span className="text-[10px] font-bold truncate flex-1">{node.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── 流程画布 ────────────────────────────────────────────────

function FlowCanvas({
  flow,
  selectedNodeIds,
  onSelectNode,
  highlightedNodeId,
  onDropNode,
}: {
  flow: INodeRedFlow | null;
  selectedNodeIds: Set<string>;
  onSelectNode: (id: string, multi: boolean) => void;
  highlightedNodeId: string | null;
  onDropNode: (type: string, label: string, icon: string, color: string, x: number, y: number) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (!data || !canvasRef.current) return;
    const node = JSON.parse(data);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 40;
    const y = e.clientY - rect.top - 20;
    onDropNode(node.type, node.label, node.icon, node.color, Math.max(0, x), Math.max(0, y));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  if (!flow) {
    return (
      <div
        ref={canvasRef}
        className="flex-1 flex items-center justify-center text-muted-foreground"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="text-center">
          <Workflow className="size-12 mx-auto mb-3 opacity-20" />
          <div className="text-xs font-medium">选择一个流程或从节点库拖入节点开始编程</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={canvasRef}
      className="flex-1 relative overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(circle, hsl(220 14% 96%) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* SVG 连线层 */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
        {flow.connections.map((conn) => {
          const source = flow.nodes.find((n) => n.id === conn.sourceId);
          const target = flow.nodes.find((n) => n.id === conn.targetId);
          if (!source || !target) return null;
          return (
            <g key={conn.id}>
              <path
                d={`M ${source.x + 80} ${source.y + 20} C ${source.x + 120} ${source.y + 20}, ${target.x - 40} ${target.y + 20}, ${target.x} ${target.y + 20}`}
                fill="none"
                stroke="#00B894"
                strokeWidth="2"
                opacity="0.4"
                strokeDasharray="6 3"
                className="[animation:dash_1s_linear_infinite]"
              />
            </g>
          );
        })}
      </svg>

      {/* 节点 */}
      {flow.nodes.map((node) => {
        const isSelected = selectedNodeIds.has(node.id);
        const isHighlighted = highlightedNodeId === node.id;

        return (
          <motion.div
            key={node.id}
            animate={
              isHighlighted
                ? { boxShadow: ['0 0 0 0 rgba(0,184,148,0.4)', '0 0 0 8px rgba(0,184,148,0)', '0 0 0 0 rgba(0,184,148,0)'] }
                : {}
            }
            transition={{ duration: 1.5, repeat: isHighlighted ? 2 : 0 }}
            className={`absolute cursor-pointer group rounded-xl border-2 px-3 py-2 min-w-[80px] bg-white ${
              isSelected ? 'ring-2 ring-primary/40 shadow-md border-primary/50' : 'shadow-sm border-[#00B894]/30'
            }`}
            style={{ left: node.x, top: node.y }}
            onClick={(e) => onSelectNode(node.id, e.metaKey || e.ctrlKey)}
          >
            <div className="text-[10px] font-black truncate max-w-[70px]">{node.label}</div>
            <div className="flex items-center gap-1 mt-1">
              <div className="size-1.5 rounded-full bg-[#00B894]" />
              <div className="size-1.5 rounded-full bg-[#00B894]" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── 右侧属性/调试面板 ───────────────────────────────────────

function PropertiesPanel({
  flow,
  selectedNodeIds,
  onUpdateNodeConfig,
}: {
  flow: INodeRedFlow | null;
  selectedNodeIds: Set<string>;
  onUpdateNodeConfig: (nodeId: string, config: Record<string, string>) => void;
}) {
  const [activeTab, setActiveTab] = useState<'properties' | 'debug'>('properties');
  const [debugMessages, setDebugMessages] = useState<IDebugMessage[]>([
    { id: 'd1', timestamp: '14:32:10', source: 'Modbus 读取', payload: '{"temperature": 25.6, "humidity": 65.2}' },
    { id: 'd2', timestamp: '14:32:15', source: '数据过滤', payload: '{"temperature": 25.6, "filtered": true}' },
    { id: 'd3', timestamp: '14:32:20', source: 'MQTT 发布', payload: 'Published to sensor/data: {"temp":25.6}' },
  ]);

  const selectedNode = flow && selectedNodeIds.size === 1
    ? flow.nodes.find((n) => n.id === Array.from(selectedNodeIds)[0])
    : null;

  return (
    <Card className="h-full rounded-2xl border border-border/60 shadow-sm flex flex-col overflow-hidden">
      {/* Tab 切换 */}
      <div className="px-3 py-2 border-b border-border/40">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'properties' | 'debug')}>
          <TabsList className="h-8 w-full">
            <TabsTrigger value="properties" className="text-[10px] font-bold flex-1">
              <Settings className="size-3 mr-1" />
              属性
            </TabsTrigger>
            <TabsTrigger value="debug" className="text-[10px] font-bold flex-1">
              <Terminal className="size-3 mr-1" />
              调试
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'properties' ? (
          <div className="p-3">
            {selectedNode ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-[#00B894]/10 flex items-center justify-center">
                    <Settings className="size-3.5 text-[#00B894]" />
                  </div>
                  <div>
                    <div className="text-xs font-black">{selectedNode.label}</div>
                    <div className="text-[9px] text-muted-foreground">{selectedNode.category} · {selectedNode.type}</div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {Object.entries(selectedNode.config).map(([key, value]) => (
                    <div key={key}>
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                        {key}
                      </label>
                      <Input
                        value={value}
                        onChange={(e) => onUpdateNodeConfig(selectedNode.id, { [key]: e.target.value })}
                        className="h-8 text-[10px]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MousePointer2 className="size-8 mb-2 opacity-20" />
                <div className="text-[10px] font-medium text-center">
                  {selectedNodeIds.size > 1
                    ? `已选中 ${selectedNodeIds.size} 个节点`
                    : '点击画布中的节点查看属性'}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">
                调试输出 ({debugMessages.length})
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[9px]"
                onClick={() => setDebugMessages([])}
              >
                <Trash2 className="size-2.5 mr-1" />
                清空
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {debugMessages.length === 0 ? (
                <div className="text-center py-8 text-[10px] text-muted-foreground">暂无调试输出</div>
              ) : (
                debugMessages.map((msg) => (
                  <div key={msg.id} className="p-2 rounded-lg bg-muted/30 border border-border/30 text-[9px] font-mono">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <span className="text-[#00B894] font-bold">{msg.timestamp}</span>
                      <span className="text-[#6366F1]">{msg.source}</span>
                    </div>
                    <div className="text-foreground whitespace-pre-wrap break-all">{msg.payload}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── AI Agent 对话框（底部可拖拽）─────────────────────────────

function AIAgentDialog({
  mode,
  onModeChange,
  selectedNodeIds,
  onAddCustomNode,
  onGenerateFlow,
  onModifyNode,
  isMinimized,
  onToggleMinimize,
}: {
  mode: 'node' | 'flow';
  onModeChange: (m: 'node' | 'flow') => void;
  selectedNodeIds: Set<string>;
  onAddCustomNode: (node: ICustomNode) => void;
  onGenerateFlow: (nodes: INodeRedNode[], connections: INodeRedConnection[]) => void;
  onModifyNode: (nodeId: string, config: Record<string, string>) => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}) {
  const [messages, setMessages] = useState<IChatMessage[]>([
    {
      id: 'sys-1',
      role: 'system',
      content: mode === 'node'
        ? '节点创建模式：描述你需要的节点功能，AI 将为你生成可复用的自定义节点。'
        : '流式编程模式：描述你想要的工作流，AI 将自动在画布中生成节点和连线。',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const quickPrompts = mode === 'node'
    ? ['创建一个Modbus RTU读取节点', '创建一个MQTT发布节点', '创建一个数据过滤节点']
    : ['创建一个温湿度监控流程', '创建一个告警联动流程', '创建一个数据采集上报流程'];

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isProcessing) return;

    const userMsg: IChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: selectedNodeIds.size > 0
        ? `[已选中 ${selectedNodeIds.size} 个节点] ${text}`
        : text,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    await new Promise((r) => setTimeout(r, 1200));

    if (mode === 'node') {
      const newNode: ICustomNode = {
        id: `custom-${Date.now()}`,
        name: text.includes('Modbus') ? 'Modbus读取' : text.includes('MQTT') ? 'MQTT发布' : '自定义节点',
        description: `根据描述"${text}"生成的节点`,
        icon: text.includes('Modbus') ? 'Cable' : text.includes('MQTT') ? 'Radio' : 'Zap',
        color: '#00B894',
        inputs: ['trigger'],
        outputs: ['data'],
        configParams: [
          { name: 'host', label: '主机地址', defaultValue: '192.168.1.100' },
          { name: 'port', label: '端口', defaultValue: '502' },
        ],
      };
      onAddCustomNode(newNode);

      const agentMsg: IChatMessage = {
        id: `agt-${Date.now()}`,
        role: 'agent',
        content: `好的，我来为你创建一个 **${newNode.name}** 节点。\n\n- **节点名称**：${newNode.name}\n- **功能**：${newNode.description}\n- **输入端口**：${newNode.inputs.join(', ')}\n- **输出端口**：${newNode.outputs.join(', ')}\n- **配置参数**：${newNode.configParams.map((p) => p.label).join('、')}\n\n节点已添加到左侧「我的节点」分类，可以直接拖拽到画布中使用。`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, agentMsg]);
    } else {
      if (selectedNodeIds.size > 0) {
        const nodeId = Array.from(selectedNodeIds)[0];
        onModifyNode(nodeId, { threshold: text.includes('35') ? '35' : '30' });
        const agentMsg: IChatMessage = {
          id: `agt-${Date.now()}`,
          role: 'agent',
          content: `已根据你的要求修改了选中节点的配置。`,
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages((prev) => [...prev, agentMsg]);
      } else {
        const newNodes: INodeRedNode[] = [
          { id: `gn-${Date.now()}-1`, type: 'inject', category: '输入', label: '定时触发', icon: 'Zap', x: 80, y: 120, config: { interval: '5s' } },
          { id: `gn-${Date.now()}-2`, type: 'modbus-in', category: '输入', label: '温湿度读取', icon: 'Cable', x: 280, y: 120, config: { host: '192.168.1.100', port: '502' } },
          { id: `gn-${Date.now()}-3`, type: 'switch', category: '逻辑', label: '阈值判断', icon: 'ArrowLeftRight', x: 480, y: 120, config: { property: 'temperature', rules: '> 30' } },
          { id: `gn-${Date.now()}-4`, type: 'http-out', category: '输出', label: '报警输出', icon: 'Globe', x: 680, y: 80, config: { url: 'https://alert.example.com', method: 'POST' } },
          { id: `gn-${Date.now()}-5`, type: 'debug', category: '输出', label: '日志记录', icon: 'Bug', x: 680, y: 180, config: { output: 'msg.payload' } },
        ];
        const newConns: INodeRedConnection[] = [
          { id: `gc-${Date.now()}-1`, sourceId: newNodes[0].id, sourcePort: 'out', targetId: newNodes[1].id, targetPort: 'in' },
          { id: `gc-${Date.now()}-2`, sourceId: newNodes[1].id, sourcePort: 'out', targetId: newNodes[2].id, targetPort: 'in' },
          { id: `gc-${Date.now()}-3`, sourceId: newNodes[2].id, sourcePort: 'out1', targetId: newNodes[3].id, targetPort: 'in' },
          { id: `gc-${Date.now()}-4`, sourceId: newNodes[2].id, sourcePort: 'out2', targetId: newNodes[4].id, targetPort: 'in' },
        ];
        onGenerateFlow(newNodes, newConns);

        const agentMsg: IChatMessage = {
          id: `agt-${Date.now()}`,
          role: 'agent',
          content: `好的，我来为你创建环境监控流程。\n\n已自动生成以下节点：\n1. ⏱ **定时触发** — 每 5 秒触发一次\n2. 🌡 **温湿度读取** — 通过 Modbus 读取传感器数据\n3. 🔀 **阈值判断** — 温度超过 30℃ 时触发报警\n4. 🚨 **报警输出** — 推送告警到 Webhook\n5. 📝 **日志记录** — 记录所有数据到 Debug 面板\n\n流程已加载到画布中，你可以继续对话修改参数。`,
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages((prev) => [...prev, agentMsg]);
      }
    }

    setIsProcessing(false);
  }, [input, isProcessing, mode, selectedNodeIds, onAddCustomNode, onGenerateFlow, onModifyNode]);

  return (
    <Card className="h-full rounded-2xl border border-border/60 shadow-sm flex flex-col overflow-hidden">
      {/* 模式切换 */}
      <div className="px-3 py-2.5 border-b border-border/40">
        <Tabs value={mode} onValueChange={(v) => onModeChange(v as 'node' | 'flow')}>
          <TabsList className="h-8 w-full">
            <TabsTrigger value="node" className="text-[10px] font-bold flex-1">
              <Plus className="size-3 mr-1" />
              节点创建
            </TabsTrigger>
            <TabsTrigger value="flow" className="text-[10px] font-bold flex-1">
              <Workflow className="size-3 mr-1" />
              流式编程
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}
          >
            {msg.role === 'system' ? (
              <div className="text-[9px] text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full max-w-[90%] text-center">
                {msg.content}
              </div>
            ) : (
              <div
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-[#00B894]/10 text-foreground rounded-bl-md border border-[#00B894]/20'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div className={`text-[8px] mt-1 ${msg.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                  {msg.timestamp}
                </div>
              </div>
            )}
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-[#00B894]/10 border border-[#00B894]/20 rounded-2xl rounded-bl-md px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[#00B894] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="size-1.5 rounded-full bg-[#00B894] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="size-1.5 rounded-full bg-[#00B894] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 选中节点提示 */}
      {selectedNodeIds.size > 0 && (
        <div className="px-3 py-1.5 border-t border-border/40 bg-[#00B894]/5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#00B894]">
            <MousePointer2 className="size-3" />
            已选中 {selectedNodeIds.size} 个节点，可直接对话修改
          </div>
        </div>
      )}

      {/* 快捷提示 */}
      <div className="px-3 py-2 border-t border-border/40 flex gap-1.5 flex-wrap">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => setInput(prompt)}
            className="text-[9px] font-medium text-muted-foreground bg-muted/50 hover:bg-muted px-2 py-1 rounded-full transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* 输入框 */}
      <div className="px-3 py-2.5 border-t border-border/40">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={mode === 'node' ? '描述你需要的节点...' : '描述你想要的工作流...'}
            className="flex-1 h-9 text-xs"
            disabled={isProcessing}
          />
          <Button
            size="sm"
            className="h-9 px-3"
            onClick={handleSend}
            disabled={isProcessing || !input.trim()}
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ── 可拖拽底部面板容器 ──────────────────────────────────────

function ResizableBottomPanel({
  children,
  isMinimized,
  onToggleMinimize,
  panelHeight,
  onHeightChange,
  title,
}: {
  children: React.ReactNode;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  panelHeight: number;
  onHeightChange: (h: number) => void;
  title: string;
}) {
  const dragRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startHeightRef.current = panelHeight;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startYRef.current - e.clientY;
      const newHeight = Math.min(600, Math.max(120, startHeightRef.current + delta));
      onHeightChange(newHeight);
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onHeightChange]);

  return (
    <div
      className="shrink-0 transition-[height] duration-200 ease-out flex flex-col"
      style={{ height: isMinimized ? 48 : panelHeight }}
    >
      {/* 拖拽手柄 */}
      <div
        ref={dragRef}
        onMouseDown={handleMouseDown}
        onDoubleClick={onToggleMinimize}
        className="flex items-center justify-center h-6 cursor-ns-resize hover:bg-muted/30 rounded-t-xl transition-colors group shrink-0 select-none"
      >
        <div className="flex items-center gap-1.5">
          <GripHorizontal className="size-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
        </div>
      </div>

      {/* 标题栏（最小化时显示） */}
      {isMinimized && (
        <div
          className="flex items-center justify-between px-4 h-6 cursor-pointer"
          onClick={onToggleMinimize}
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{title}</span>
            <Badge className="text-[8px] bg-[#00B894]/10 text-[#00B894]">展开</Badge>
          </div>
          <ChevronUp className="size-3 text-muted-foreground" />
        </div>
      )}

      {/* 内容区 */}
      {!isMinimized && (
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
}

// ── 主页面 ──────────────────────────────────────────────────

export default function VisualProgrammingPage() {
  const [activeFlowId, setActiveFlowId] = useState<string>(MOCK_FLOWS[0]?.id || '');
  const [flows, setFlows] = useState<INodeRedFlow[]>(MOCK_FLOWS);
  const [customNodes, setCustomNodes] = useState<ICustomNode[]>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<'node' | 'flow'>('flow');
  const [dialogMinimized, setDialogMinimized] = useState(false);
  const [dialogHeight, setDialogHeight] = useState(320);

  const activeFlow = flows.find((f) => f.id === activeFlowId) || null;

  const handleSelectNode = (id: string, multi: boolean) => {
    setSelectedNodeIds((prev) => {
      const next = new Set(multi ? prev : []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddCustomNode = (node: ICustomNode) => {
    setCustomNodes((prev) => [...prev, node]);
    toast.success(`节点「${node.name}」已添加到「我的节点」`);
  };

  const handleGenerateFlow = (nodes: INodeRedNode[], connections: INodeRedConnection[]) => {
    const newFlow: INodeRedFlow = {
      id: `flow-gen-${Date.now()}`,
      name: 'AI 生成流程',
      description: '通过 AI 对话自动生成的流程',
      nodes,
      connections,
    };
    setFlows((prev) => [...prev, newFlow]);
    setActiveFlowId(newFlow.id);
    toast.success('流程已生成并加载到画布');
  };

  const handleModifyNode = (nodeId: string, config: Record<string, string>) => {
    setFlows((prev) =>
      prev.map((f) =>
        f.id === activeFlowId
          ? {
              ...f,
              nodes: f.nodes.map((n) =>
                n.id === nodeId ? { ...n, config: { ...n.config, ...config } } : n,
              ),
            }
          : f,
      ),
    );
    setHighlightedNodeId(nodeId);
    setTimeout(() => setHighlightedNodeId(null), 3000);
    toast.success('节点配置已更新');
  };

  const handleUpdateNodeConfig = (nodeId: string, config: Record<string, string>) => {
    handleModifyNode(nodeId, config);
  };

  const handleDropNode = (type: string, label: string, icon: string, color: string, x: number, y: number) => {
    if (!activeFlow) return;
    const newNode: INodeRedNode = {
      id: `node-${Date.now()}`,
      type,
      category: '自定义',
      label,
      icon,
      x,
      y,
      config: {},
    };
    setFlows((prev) =>
      prev.map((f) =>
        f.id === activeFlowId
          ? { ...f, nodes: [...f.nodes, newNode] }
          : f,
      ),
    );
    toast.success(`节点「${label}」已添加到画布`);
  };

  const handleDeploy = () => {
    toast.success('流程已部署成功');
  };

  const handleExport = () => {
    if (!activeFlow) return;
    const json = JSON.stringify(activeFlow, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeFlow.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('流程已导出');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] gap-3">
      {/* ── 上半部分：三栏布局 ── */}
      <div className="flex flex-1 gap-3 min-h-0">
        {/* 左侧：节点面板 */}
        <div className="w-[200px] shrink-0">
          <NodePanel customNodes={customNodes} onDragStart={() => {}} />
        </div>

        {/* 中间：画布 + 工具栏 */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* 工具栏 */}
          <Card className="rounded-2xl border border-border/60 shadow-sm px-3 py-2 flex items-center gap-2 shrink-0">
            <Workflow className="size-4 text-[#00B894]" />
            <select
              value={activeFlowId}
              onChange={(e) => {
                setActiveFlowId(e.target.value);
                setSelectedNodeIds(new Set());
              }}
              className="text-xs font-bold bg-transparent border-none outline-none flex-1"
            >
              {flows.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <Badge className="text-[9px] bg-[#00B894]/10 text-[#00B894]">
              {activeFlow?.nodes.length || 0} 节点
            </Badge>
            <span className="w-px h-5 bg-border/60" />
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={handleDeploy}>
              <Play className="size-3" />
              部署
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={handleExport}>
              <Download className="size-3" />
              导出
            </Button>
          </Card>

          {/* 画布 */}
          <Card className="flex-1 rounded-2xl border border-border/60 shadow-sm overflow-hidden flex flex-col min-h-0">
            <FlowCanvas
              flow={activeFlow}
              selectedNodeIds={selectedNodeIds}
              onSelectNode={handleSelectNode}
              highlightedNodeId={highlightedNodeId}
              onDropNode={handleDropNode}
            />
          </Card>
        </div>

        {/* 右侧：属性/调试面板 */}
        <div className="w-[260px] shrink-0">
          <PropertiesPanel
            flow={activeFlow}
            selectedNodeIds={selectedNodeIds}
            onUpdateNodeConfig={handleUpdateNodeConfig}
          />
        </div>
      </div>

      {/* ── 底部：AI Agent 对话框（可拖拽调整高度）── */}
      <ResizableBottomPanel
        isMinimized={dialogMinimized}
        onToggleMinimize={() => setDialogMinimized((prev) => !prev)}
        panelHeight={dialogHeight}
        onHeightChange={setDialogHeight}
        title="AI Agent 对话框"
      >
        <AIAgentDialog
          mode={aiMode}
          onModeChange={setAiMode}
          selectedNodeIds={selectedNodeIds}
          onAddCustomNode={handleAddCustomNode}
          onGenerateFlow={handleGenerateFlow}
          onModifyNode={handleModifyNode}
          isMinimized={dialogMinimized}
          onToggleMinimize={() => setDialogMinimized((prev) => !prev)}
        />
      </ResizableBottomPanel>
    </div>
  );
}
