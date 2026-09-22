import type { ChatSource } from '../source';
import type { HubThread } from '../thread';
import { hubThreadId } from '../thread';

/**
 * Google Takeout's "My Activity" export for Gemini Apps — not a conversation
 * export. Each entry is one logged prompt with a timestamp; Takeout does not
 * include the model's reply, and does not reliably group prompts into
 * conversations (some entries carry a conversation-shaped `titleUrl`, most
 * do not, and Google has changed this shape before without notice). Rather
 * than invent grouping or synthesize an assistant turn that was never
 * exported, each entry becomes its own single-message thread: a real,
 * searchable record of what was asked and when, and nothing this adapter
 * did not actually receive.
 *
 * Takeout's `title` field reads like a sentence ("Asked Gemini Apps
 * “What's the weather?”"); the smart-quoted portion is the
 * prompt. When a title doesn't match that shape, it is kept as-is rather
 * than dropped, since it is still a real, searchable record of the entry.
 */

const ASKED_PATTERN = /[“"]([\s\S]+)[”"]\s*$/;
const GEMINI_PRODUCTS = new Set(['gemini apps', 'gemini', 'bard']);

interface TakeoutActivityItem {
  header?: string | null;
  title?: string | null;
  titleUrl?: string | null;
  time?: string | null;
  products?: readonly string[] | null;
}

function isGeminiEntry(item: TakeoutActivityItem): boolean {
  const header = item.header?.toLowerCase();
  if (header && GEMINI_PRODUCTS.has(header)) {
    return true;
  }
  return (item.products ?? []).some((product) => GEMINI_PRODUCTS.has(product.toLowerCase()));
}

function extractPrompt(title: string | null | undefined): string {
  if (!title) {
    return '';
  }
  const match = title.match(ASKED_PATTERN);
  return (match ? match[1] : title).trim();
}

function toDate(value: string | null | undefined, fallback: Date): Date {
  if (!value) {
    return fallback;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

/** Takeout gives no stable id; a share link's trailing path segment is the
 *  closest thing to one, falling back to position in the export. */
function sourceIdFor(item: TakeoutActivityItem, index: number): string {
  if (item.titleUrl) {
    const segments = item.titleUrl.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last) {
      return last;
    }
  }
  return `entry-${index}`;
}

function toThread(item: TakeoutActivityItem, index: number): HubThread {
  const createdAt = toDate(item.time, new Date(0));
  const prompt = extractPrompt(item.title);
  const sourceId = sourceIdFor(item, index);

  return {
    id: hubThreadId('gemini', sourceId),
    provider: 'gemini',
    sourceId,
    title: prompt.slice(0, 120) || 'Untitled Gemini activity',
    createdAt,
    updatedAt: createdAt,
    messages: prompt
      ? [
          {
            id: `${sourceId}-prompt`,
            role: 'user',
            createdAt,
            segments: [{ kind: 'text', text: prompt }],
            parentId: null,
          },
        ]
      : [],
  };
}

export function createGeminiSource(): ChatSource {
  return {
    provider: 'gemini',
    detect(payload: unknown): boolean {
      if (!Array.isArray(payload) || payload.length === 0) {
        return false;
      }
      const first = payload[0] as TakeoutActivityItem | null;
      return typeof first === 'object' && first !== null && isGeminiEntry(first);
    },
    parse(payload: unknown): HubThread[] {
      const items = payload as readonly TakeoutActivityItem[];
      return items.filter(isGeminiEntry).map(toThread);
    },
  };
}
