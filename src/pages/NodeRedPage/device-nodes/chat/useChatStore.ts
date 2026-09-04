import { useSyncExternalStore } from 'react';

import { getChatState, subscribeChatStore } from './store';
import type { ChatStoreState } from './types';

export function useChatStore(): ChatStoreState {
  return useSyncExternalStore(subscribeChatStore, getChatState, getChatState);
}
