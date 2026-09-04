export interface ChatAttachment {
  type: 'image' | 'audio' | 'video' | 'file';
  url: string;
  filename?: string;
  contentType?: string;
}

export interface ChatToolCallFunction {
  name?: string;
  arguments?: string;
}

export interface ChatToolCallExtraContent {
  toolFeedbackExplanation?: string;
}

export interface ChatToolCall {
  id?: string;
  type?: string;
  function?: ChatToolCallFunction;
  extraContent?: ChatToolCallExtraContent;
}

export type AssistantMessageKind = 'normal' | 'thought' | 'tool_calls';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number | string;
  kind?: AssistantMessageKind;
  attachments?: ChatAttachment[];
  toolCalls?: ChatToolCall[];
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ChatStoreState {
  messages: ChatMessage[];
  connectionState: ConnectionState;
  isTyping: boolean;
  activeSessionId: string;
}

export type GatewayState = 'running' | 'starting' | 'restarting' | 'stopped' | 'error' | 'unknown';
