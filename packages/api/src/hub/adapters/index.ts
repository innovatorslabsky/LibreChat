import type { ChatSource } from '../source';
import { createChatGptSource } from './chatgpt';
import { createClaudeSource } from './claude';

export * from './chatgpt';
export * from './claude';
export * from './librechat';

/**
 * The built-in adapters, in detection order. Claude is checked first because
 * the ChatGPT adapter accepts an empty array — an export with no
 * conversations — and would otherwise claim every empty payload.
 */
export function createDefaultChatSources(): ChatSource[] {
  return [createClaudeSource(), createChatGptSource()];
}
