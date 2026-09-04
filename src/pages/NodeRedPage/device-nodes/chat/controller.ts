import { getGatewayStatus } from '../api';
import { handlePicoMessage, type PicoMessage } from './protocol';
import { createNewSessionId, getChatState, updateChatStore } from './store';
import type { ChatAttachment, GatewayState } from './types';

let wsRef: WebSocket | null = null;
let isConnecting = false;
let msgIdCounter = 0;
let activeSessionIdRef = getChatState().activeSessionId;
let connectionGeneration = 0;
let reconnectTimer: number | null = null;
let reconnectAttempts = 0;
let shouldMaintainConnection = false;
let gatewayStatus: GatewayState = 'unknown';
let gatewayPollTimer: ReturnType<typeof setTimeout> | null = null;
let gatewayPollSubscribers = 0;

function clearReconnectTimer() {
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function invalidateSocket(socket: WebSocket | null) {
  if (!socket) return;
  socket.onopen = null;
  socket.onmessage = null;
  socket.onclose = null;
  socket.onerror = null;
  socket.close();
}

function isCurrentSocket(
  socket: WebSocket,
  generation: number,
  sessionId: string,
): boolean {
  return (
    wsRef === socket &&
    generation === connectionGeneration &&
    sessionId === activeSessionIdRef
  );
}

function shouldReconnectFor(generation: number, sessionId: string): boolean {
  return (
    shouldMaintainConnection &&
    generation === connectionGeneration &&
    sessionId === activeSessionIdRef &&
    gatewayStatus === 'running'
  );
}

function scheduleReconnect(generation: number, sessionId: string) {
  if (!shouldReconnectFor(generation, sessionId) || reconnectTimer !== null) {
    return;
  }

  const delay = Math.min(1000 * 2 ** reconnectAttempts, 5000);
  reconnectAttempts += 1;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    if (!shouldReconnectFor(generation, sessionId)) {
      return;
    }
    void connectChat();
  }, delay);
}

function disconnectChatInternal({ clearDesiredConnection }: { clearDesiredConnection: boolean }) {
  connectionGeneration += 1;
  clearReconnectTimer();

  if (clearDesiredConnection) {
    shouldMaintainConnection = false;
  }

  const socket = wsRef;
  wsRef = null;
  isConnecting = false;
  invalidateSocket(socket);
  updateChatStore({
    connectionState: 'disconnected',
    isTyping: false,
  });
}

export async function connectChat() {
  if (gatewayStatus !== 'running') {
    return;
  }

  if (
    isConnecting ||
    (wsRef && (wsRef.readyState === WebSocket.OPEN || wsRef.readyState === WebSocket.CONNECTING))
  ) {
    return;
  }

  const generation = connectionGeneration + 1;
  connectionGeneration = generation;
  isConnecting = true;
  clearReconnectTimer();
  updateChatStore({ connectionState: 'connecting' });

  try {
    const sessionId = activeSessionIdRef;
    const wsScheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsScheme}//${window.location.host}/pico/ws`;
    const url = `${wsUrl}?session_id=${encodeURIComponent(sessionId)}`;
    const socket = new WebSocket(url);

    if (generation !== connectionGeneration) {
      isConnecting = false;
      invalidateSocket(socket);
      return;
    }

    socket.onopen = () => {
      if (!isCurrentSocket(socket, generation, sessionId)) return;
      updateChatStore({ connectionState: 'connected' });
      isConnecting = false;
      reconnectAttempts = 0;
    };

    socket.onmessage = (event) => {
      if (!isCurrentSocket(socket, generation, sessionId)) return;
      try {
        const message = JSON.parse(event.data as string) as PicoMessage;
        handlePicoMessage(message, sessionId);
      } catch {
        console.warn('Non-JSON message from pico:', event.data);
      }
    };

    socket.onclose = () => {
      if (!isCurrentSocket(socket, generation, sessionId)) return;
      wsRef = null;
      isConnecting = false;
      updateChatStore({
        connectionState: 'disconnected',
        isTyping: false,
      });
      scheduleReconnect(generation, sessionId);
    };

    socket.onerror = () => {
      if (!isCurrentSocket(socket, generation, sessionId)) return;
      isConnecting = false;
      updateChatStore({ connectionState: 'error' });
      scheduleReconnect(generation, sessionId);
    };

    wsRef = socket;
  } catch (error) {
    if (generation !== connectionGeneration) {
      isConnecting = false;
      return;
    }
    console.error('Failed to connect to pico:', error);
    updateChatStore({ connectionState: 'error' });
    isConnecting = false;
    scheduleReconnect(generation, activeSessionIdRef);
  }
}

export function sendStopSignal() {
  if (!wsRef || wsRef.readyState !== WebSocket.OPEN) {
    return false;
  }
  try {
    wsRef.send(
      JSON.stringify({
        type: 'message.send',
        id: `stop-${Date.now()}`,
        payload: { content: '/stop', media: [] },
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function sendChatMessage({
  content,
  attachments = [],
}: {
  content: string;
  attachments?: ChatAttachment[];
}) {
  if (!wsRef || wsRef.readyState !== WebSocket.OPEN) {
    console.warn('WebSocket not connected');
    return false;
  }

  const normalizedContent = content.trim();
  // 与 zhos-claw pico 通道一致：图片与文档均可下发，由后端落盘并注入路径标签
  const normalizedAttachments = attachments
    .filter((attachment) => Boolean(attachment.url))
    .map((attachment) => ({ ...attachment }));

  if (!normalizedContent && normalizedAttachments.length === 0) {
    return false;
  }

  const socket = wsRef;
  const id = `msg-${++msgIdCounter}-${Date.now()}`;

  updateChatStore((prev) => ({
    messages: [
      ...prev.messages,
      {
        id,
        role: 'user',
        content: normalizedContent,
        attachments: normalizedAttachments.length > 0 ? normalizedAttachments : undefined,
        timestamp: Date.now(),
      },
    ],
    isTyping: true,
  }));

  try {
    socket.send(
      JSON.stringify({
        type: 'message.send',
        id,
        payload: {
          content: normalizedContent,
          media: normalizedAttachments.map((attachment) => attachment.url),
          attachments: normalizedAttachments.map((attachment) => ({
            type: attachment.type,
            url: attachment.url,
            filename: attachment.filename,
            content_type: attachment.contentType,
          })),
        },
      }),
    );
    return true;
  } catch (error) {
    console.error('Failed to send pico message:', error);
    updateChatStore((prev) => ({
      messages: prev.messages.filter((message) => message.id !== id),
      isTyping: false,
    }));
    return false;
  }
}

export async function newChatSession() {
  disconnectChatInternal({ clearDesiredConnection: false });
  const sessionId = createNewSessionId();
  activeSessionIdRef = sessionId;
  updateChatStore({
    messages: [],
    isTyping: false,
    activeSessionId: sessionId,
  });

  if (gatewayStatus === 'running') {
    shouldMaintainConnection = true;
    await connectChat();
  }
}

function syncConnectionWithGateway() {
  if (gatewayStatus === 'running') {
    shouldMaintainConnection = true;
    void connectChat();
    return;
  }

  if (gatewayStatus === 'stopped' || gatewayStatus === 'error') {
    disconnectChatInternal({ clearDesiredConnection: true });
  }
}

async function pollGatewayOnce() {
  try {
    const status = await getGatewayStatus();
    const next = status.gateway_status as GatewayState;
    if (next !== gatewayStatus) {
      gatewayStatus = next;
      syncConnectionWithGateway();
    }
  } catch {
    // keep last known status
  }
}

function scheduleGatewayPoll() {
  if (gatewayPollSubscribers === 0) return;
  if (gatewayPollTimer !== null) {
    clearTimeout(gatewayPollTimer);
  }
  const delay =
    gatewayStatus === 'starting' || gatewayStatus === 'restarting' ? 1000 : 2000;
  gatewayPollTimer = setTimeout(() => {
    gatewayPollTimer = null;
    void pollGatewayOnce().finally(() => scheduleGatewayPoll());
  }, delay);
}

/** 节点编辑页挂载时调用：轮询网关并建立 WebSocket */
export function startNodeChatRuntime() {
  gatewayPollSubscribers += 1;
  if (gatewayPollSubscribers === 1) {
    void pollGatewayOnce().finally(() => scheduleGatewayPoll());
  }

  return () => {
    gatewayPollSubscribers = Math.max(0, gatewayPollSubscribers - 1);
    if (gatewayPollSubscribers === 0) {
      if (gatewayPollTimer !== null) {
        clearTimeout(gatewayPollTimer);
        gatewayPollTimer = null;
      }
      disconnectChatInternal({ clearDesiredConnection: true });
    }
  };
}

export function getGatewayStatusSnapshot(): GatewayState {
  return gatewayStatus;
}
