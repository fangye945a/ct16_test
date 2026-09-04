import { Bot, FileText } from 'lucide-react';
import { memo, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { AssistantMessageKind, ChatAttachment, ChatMessage, ChatToolCall } from './types';

function UserBubble({ content, attachments = [] }: { content: string; attachments?: ChatAttachment[] }) {
  const imageAttachments = attachments.filter((a) => a.type === 'image');
  const fileAttachments = attachments.filter((a) => a.type !== 'image');
  const hasText = content.trim().length > 0;

  return (
    <div className="flex w-full flex-col items-end gap-1.5">
      {imageAttachments.length > 0 && (
        <div className="flex max-w-[90%] flex-wrap justify-end gap-2">
          {imageAttachments.map((attachment, index) => (
            <img
              key={`${attachment.url}-${index}`}
              src={attachment.url}
              alt={attachment.filename || 'Uploaded image'}
              className="max-h-48 max-w-full rounded-md border border-border/60 object-cover"
            />
          ))}
        </div>
      )}
      {fileAttachments.length > 0 && (
        <div className="flex max-w-[90%] flex-wrap justify-end gap-2">
          {fileAttachments.map((attachment, index) => (
            <div
              key={`${attachment.url}-${index}`}
              className="flex max-w-full items-center gap-2 rounded-md border border-border/60 bg-card px-2.5 py-1.5"
              title={attachment.filename}
            >
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-[11px] text-foreground">
                {attachment.filename || '附件'}
              </span>
            </div>
          ))}
        </div>
      )}
      {hasText && (
        <p className="max-w-[90%] whitespace-pre-wrap rounded-lg bg-primary px-3 py-2 text-xs leading-5 text-primary-foreground">
          {content}
        </p>
      )}
    </div>
  );
}

function ToolCallsBlock({ toolCalls }: { toolCalls: ChatToolCall[] }) {
  return (
    <div className="space-y-2">
      {toolCalls.map((call, index) => (
        <div key={call.id || index} className="rounded-md border border-border/60 bg-background/60 p-2">
          <div className="text-[12px] font-semibold text-foreground">{call.function?.name || 'tool'}</div>
          {call.function?.arguments && (
            <pre className="mt-1 overflow-auto whitespace-pre-wrap font-mono text-[12px] leading-4 text-muted-foreground">
              {call.function.arguments}
            </pre>
          )}
          {call.extraContent?.toolFeedbackExplanation && (
            <p className="mt-1 text-[12px] leading-4 text-muted-foreground">
              {call.extraContent.toolFeedbackExplanation}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="node-chat-md text-xs leading-5 text-foreground [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-background/70 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_code]:text-foreground [&_h1]:mb-1.5 [&_h1]:text-sm [&_h1]:font-semibold [&_h2]:mb-1.5 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_pre]:my-1.5 [&_pre]:overflow-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border/60 [&_pre]:bg-background/70 [&_pre]:p-2 [&_pre]:font-mono [&_pre]:text-[12px] [&_pre]:leading-4 [&_pre]:text-foreground [&_strong]:font-semibold [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-4">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

function AssistantBubble({
  content,
  kind = 'normal',
  toolCalls = [],
  isComplete = false,
}: {
  content: string;
  kind?: AssistantMessageKind;
  toolCalls?: ChatToolCall[];
  isComplete?: boolean;
}) {
  const isThought = kind === 'thought';
  const isToolCalls = kind === 'tool_calls';
  const [expanded, setExpanded] = useState(true);
  const hasText = content.trim().length > 0;

  if (isThought || isToolCalls) {
    return (
      <div className="flex w-full flex-col items-start gap-1">
        <button
          type="button"
          className="rounded-md px-1.5 py-0.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {isThought ? '思考过程' : '工具调用'} {expanded ? '▾' : '▸'}
          {!isComplete ? ' …' : ''}
        </button>
        {expanded && (
          <div className="max-w-[90%] space-y-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground">
            {isToolCalls && toolCalls.length > 0 && <ToolCallsBlock toolCalls={toolCalls} />}
            {hasText && <MarkdownBody content={content} />}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[90%] rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-foreground">
        {hasText ? <MarkdownBody content={content} /> : <span className="text-muted-foreground">…</span>}
      </div>
    </div>
  );
}

function stripSkillRouting(content: string): string {
  let text = content;
  // 流式编程：去掉 nodered-flow-generator 技能路由前缀
  if (text.startsWith("使用 nodered-flow-generator技能生成nodered流程")) {
    const idx = text.indexOf('\n');
    text = idx >= 0 ? text.slice(idx + 1) : '';
    text = text.replace(/^\n+/, '');
    return text;
  }
  if (/^\/use\s/.test(text)) {
    const idx = text.indexOf('\n');
    text = idx > 0 ? text.slice(idx + 1) : '';
  }
  const parts = text.split('\n\n');
  if (parts.length >= 3) {
    const first = parts[0].trim();
    const second = parts[1].trim();
    if (first.includes('nodered') && second.startsWith('{') && second.endsWith('}')) {
      return parts.slice(2).join('\n\n').trim();
    }
  }
  return text;
}

/** 新建节点空态推荐示例：按钮只显示标题，点击后把完整描述填入输入框 */
const CREATE_PROMPT_EXAMPLES = [
  {
    title: '引脚类设备节点创建',
    prompt:
      '灯 light\n' +
      '引脚：red（DO）、yellow（DO）、green（DO）\n' +
      '指令：\n' +
      '1、闪烁（flicker）：red引脚输出高电平,间隔0.2秒，red引脚输出低电平，再间0.2秒；然后依次类推执行yellow引脚和green引脚，循环2次\n' +
      '2、指定灯亮（引脚名_on）：先判断另外两个引脚是不是高电平，如果是的话先将这个引脚输出低电平。最后再将当前指定引脚输出高电平\n' +
      '3、指定灯灭（引脚名_off）：当前指定引脚输出低电平\n' +
      '4、全灭（all_off）：所有引脚都输出低电平\n' +
      '5、全亮（all_on）：先亮红灯，0.5秒后亮黄灯，再0.5秒后亮绿灯',
  },
  {
    title: '串口类设备节点创建',
    prompt:
      '超声波 ultrasonic_serial\n' +
      '协议类型：标准 Modbus-RTU，设备地址（默认 0x01）+ 功能码 + 寄存器地址 + 数据 + CRC16 校验（低字节在前，高字节在后）\n' +
      '指令：\n' +
      '1、距离查询(distance)：\n' +
      '发送帧：设备地址 + 功能码 0x03 + 寄存器地址 0x0100（高字节 0x01，低字节 0x00）+ 读取数量 0x0001（高字节 0x00，低字节 0x01）+ CRC16 校验（低字节在前）;\n' +
      '应答帧：设备地址 + 功能码 0x03 + 数据字节数 0x02 + 距离值高字节 + 距离值低字节 + CRC16 校验（低字节在前）;\n' +
      '应答数据解析：距离值 =（高字节 << 8）+ 低字节，单位为 mm',
  },
] as const;

/** 编辑节点空态推荐示例 */
const EDIT_PROMPT_EXAMPLES = [
  {
    title: '引脚类设备节点编辑',
    prompt:
      '修改当前引脚类设备节点：\n' +
      '1、将闪烁（flicker）的间隔从 0.2 秒改为 0.5 秒，循环次数改为 3 次\n' +
      '2、新增指令「交替闪烁（alternate）」：红灯与绿灯交替亮灭，间隔 0.3 秒，循环 5 次；黄灯全程保持低电平\n' +
      '3、全亮（all_on）改为：三个灯同时点亮，不再延迟逐个点亮',
  },
  {
    title: '串口类设备节点编辑',
    prompt:
      '修改当前串口类设备节点：\n' +
      '1、将默认设备地址从 0x01 改为 0x02\n' +
      '2、距离查询(distance) 的寄存器地址从 0x0100 改为 0x0102，读取数量仍为 0x0001\n' +
      '3、新增指令「温度查询(temperature)」：\n' +
      '发送帧：设备地址 + 功能码 0x03 + 寄存器地址 0x0104（高字节 0x01，低字节 0x04）+ 读取数量 0x0001 + CRC16 校验（低字节在前）;\n' +
      '应答帧：设备地址 + 功能码 0x03 + 数据字节数 0x02 + 温度值高字节 + 温度值低字节 + CRC16 校验（低字节在前）;\n' +
      '应答数据解析：温度值 =（高字节 << 8）+ 低字节，单位为 0.1℃',
  },
] as const;

/** 流程编辑空态推荐示例 */
const FLOW_PROMPT_EXAMPLES = [
  {
    title: '添加一个灯的控制流程',
    prompt:
      '通过http节点接收请求，api为/control，post请求;\n' +
      '有三个light灯设备，需要根据SN号切换对应设备执行对应的动作指令，三个灯的SN号分别为SN-01, SN-02, SN-03，动作属性路径为status，引脚如下：\n' +
      '  SN-01, red [1, 1]  yellow [1, 2]  green [1, 3]\n' +
      '  SN-02, red [1, 4]  yellow [1, 5]  green [1, 6]\n' +
      '  SN-03, red [1, 7]  yellow [1, 8]  green [1, 9]',
  },
] as const;

export const NodeEditorMessagesList = memo(function NodeEditorMessagesList({
  messages,
  isTyping,
  mode,
  nodeCode,
  onSelectExample,
}: {
  messages: ChatMessage[];
  isTyping: boolean;
  mode: 'create' | 'edit' | 'flow';
  nodeCode?: string;
  onSelectExample?: (prompt: string) => void;
}) {
  let emptyHint: ReactNode = null;
  if (messages.length === 0 && !isTyping) {
    const promptExamples =
      mode === 'create'
        ? CREATE_PROMPT_EXAMPLES
        : mode === 'edit'
          ? EDIT_PROMPT_EXAMPLES
          : mode === 'flow'
            ? FLOW_PROMPT_EXAMPLES
            : null;

    emptyHint = (
      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
          <Bot className="size-5" />
        </div>
        <p className="mt-3 text-sm font-medium text-foreground">
          {mode === 'create'
            ? '描述新节点需求'
            : mode === 'edit'
              ? `编辑节点 ${nodeCode}`
              : '描述你的流程目标'}
        </p>
        <p className="mt-1.5 max-w-xs text-xs leading-5 text-muted-foreground">
          {mode === 'create'
            ? '请说明名称、指令、引脚等信息，生成结果会显示在左侧设备信息中。'
            : mode === 'edit'
              ? '请描述需要调整的内容，确认后会刷新左侧节点信息。'
              : '在对话中描述你的自动化目标，基于后端接口生成并刷新 Node-RED 流程。'}
        </p>
        {promptExamples && onSelectExample && (
          <div className="mt-16 flex w-full max-w-sm flex-col gap-2">
            <p className="text-[11px] text-muted-foreground">模版示例</p>
            <div className="flex flex-wrap justify-center gap-2">
              {promptExamples.map((example) => (
                <button
                  key={example.title}
                  type="button"
                  onClick={() => onSelectExample(example.prompt)}
                  className="rounded-md border border-border/60 bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/50 hover:bg-accent hover:text-accent-foreground"
                >
                  {example.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {emptyHint}
      {messages.map((msg) => {
        if (msg.role === 'assistant') {
          return (
            <AssistantBubble
              key={msg.id}
              content={msg.content}
              kind={msg.kind}
              toolCalls={msg.toolCalls}
              isComplete={!isTyping}
            />
          );
        }
        return (
          <UserBubble
            key={msg.id}
            content={stripSkillRouting(msg.content)}
            attachments={msg.attachments}
          />
        );
      })}
      {isTyping && messages.length > 0 && messages[messages.length - 1]?.role !== 'user' && (
        <div className="flex items-center gap-2 px-0.5 text-xs text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          正在处理...
        </div>
      )}
    </>
  );
});
