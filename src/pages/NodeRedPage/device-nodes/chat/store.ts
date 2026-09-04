import type { ChatStoreState } from './types';

function generateSessionId(): string {
  return `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

type Listener = () => void;

let state: ChatStoreState = {
  messages: [],
  connectionState: 'disconnected',
  isTyping: false,
  activeSessionId: generateSessionId(),
};

const listeners = new Set<Listener>();

export function getChatState(): ChatStoreState {
  return state;
}

export function subscribeChatStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function updateChatStore(
  patch: Partial<ChatStoreState> | ((prev: ChatStoreState) => Partial<ChatStoreState>),
) {
  const nextPatch = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...nextPatch };
  emit();
}

export function createNewSessionId(): string {
  return generateSessionId();
}
