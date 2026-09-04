import { toast } from 'sonner';

import {
  parseAssistantMessageCreateState,
  parseAssistantMessageUpdateState,
} from './assistant-message-state';
import { updateChatStore } from './store';
import type { ChatAttachment } from './types';

export interface PicoMessage {
  type: string;
  id?: string;
  session_id?: string;
  timestamp?: number | string;
  payload?: Record<string, unknown>;
}

function normalizeUnixTimestamp(value: number): number {
  return value < 1e12 ? value * 1000 : value;
}

function parseAttachments(payload: Record<string, unknown>): ChatAttachment[] | undefined {
  const raw = payload.attachments;
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const attachments: ChatAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const attachment = item as Record<string, unknown>;
    const url = typeof attachment.url === 'string' ? attachment.url : '';
    if (!url) {
      continue;
    }

    const type =
      attachment.type === 'audio' ||
      attachment.type === 'video' ||
      attachment.type === 'file' ||
      attachment.type === 'image'
        ? attachment.type
        : 'file';

    const filename = typeof attachment.filename === 'string' ? attachment.filename : undefined;
    const contentType =
      typeof attachment.content_type === 'string' ? attachment.content_type : undefined;

    attachments.push({
      type,
      url,
      ...(filename ? { filename } : {}),
      ...(contentType ? { contentType } : {}),
    });
  }

  return attachments.length > 0 ? attachments : undefined;
}

export function handlePicoMessage(message: PicoMessage, expectedSessionId: string) {
  if (message.session_id && message.session_id !== expectedSessionId) {
    return;
  }

  const payload = message.payload || {};

  switch (message.type) {
    case 'message.create':
    case 'media.create': {
      const messageId = (payload.message_id as string) || `pico-${Date.now()}`;
      const { content, kind, toolCalls } = parseAssistantMessageCreateState(payload);
      const attachments = parseAttachments(payload);
      const timestamp =
        message.timestamp !== undefined && Number.isFinite(Number(message.timestamp))
          ? normalizeUnixTimestamp(Number(message.timestamp))
          : Date.now();

      updateChatStore((prev) => ({
        messages: [
          ...prev.messages,
          {
            id: messageId,
            role: 'assistant',
            content,
            kind,
            ...(toolCalls ? { toolCalls } : {}),
            attachments,
            timestamp,
          },
        ],
      }));
      break;
    }

    case 'message.update': {
      const messageId = payload.message_id as string;
      const attachments = parseAttachments(payload);
      const timestamp =
        message.timestamp !== undefined && Number.isFinite(Number(message.timestamp))
          ? normalizeUnixTimestamp(Number(message.timestamp))
          : Date.now();
      if (!messageId) {
        break;
      }

      updateChatStore((prev) => ({
        messages: (() => {
          let found = false;
          const messages = prev.messages.map((msg) => {
            if (msg.id !== messageId) {
              return msg;
            }
            found = true;
            const { content, kind, toolCalls } = parseAssistantMessageUpdateState(payload, msg);
            return {
              ...msg,
              id: messageId,
              content,
              kind,
              toolCalls,
              ...(attachments ? { attachments } : {}),
            };
          });
          if (found) {
            return messages;
          }

          const { content, kind, toolCalls } = parseAssistantMessageUpdateState(payload);
          return [
            ...messages,
            {
              id: messageId,
              role: 'assistant' as const,
              content,
              kind,
              toolCalls,
              ...(attachments ? { attachments } : {}),
              timestamp,
            },
          ];
        })(),
      }));
      break;
    }

    case 'message.delete': {
      const messageId = payload.message_id as string;
      if (!messageId) {
        break;
      }
      updateChatStore((prev) => ({
        messages: prev.messages.filter((msg) => msg.id !== messageId),
      }));
      break;
    }

    case 'typing.start':
      updateChatStore({ isTyping: true });
      break;

    case 'typing.stop':
      updateChatStore({ isTyping: false });
      break;

    case 'error': {
      const requestId = typeof payload.request_id === 'string' ? payload.request_id : '';
      const errorMessage = typeof payload.message === 'string' ? payload.message : '';
      if (errorMessage) {
        toast.error(errorMessage);
      }
      updateChatStore((prev) => ({
        messages: requestId ? prev.messages.filter((msg) => msg.id !== requestId) : prev.messages,
        isTyping: false,
      }));
      break;
    }

    case 'pong':
      break;

    default:
      break;
  }
}
