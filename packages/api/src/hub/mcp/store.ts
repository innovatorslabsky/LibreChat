import type { HubThread, HubProvider } from '../thread';

/**
 * The storage surface the hub's MCP server needs, and nothing more. The caller
 * constructs it, so the server can be exercised against a real in-memory store
 * without a database and moved behind a different one without a rewrite.
 */

export interface HubThreadSummary {
  id: string;
  provider: HubProvider;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  /** Text around the match, already bounded by the caller's snippet length. */
  snippet?: string;
}

export interface HubSearchParams {
  query: string;
  providers?: readonly HubProvider[];
  /** Already clamped by the server to the configured ceiling. */
  limit: number;
  snippetLength: number;
}

/** Which client wrote a note — lets a note left by one surface read as
 *  distinct from one left by another when several clients share the archive. */
export type HubNoteSurface = 'chat' | 'code' | 'agent' | 'other';

export interface HubNoteInput {
  title: string;
  text: string;
  /** Anchors the note to a thread when the writer knows which one it is about. */
  threadId?: string;
  surface?: HubNoteSurface;
  /** Distinguishes one session from another of the same surface. */
  sessionTag?: string;
}

export interface HubNote extends HubNoteInput {
  id: string;
  createdAt: Date;
}

export interface HubStore {
  searchThreads(params: HubSearchParams): Promise<HubThreadSummary[]>;
  getThread(id: string): Promise<HubThread | undefined>;
  listNotes(threadId?: string): Promise<HubNote[]>;
  appendNote(note: HubNoteInput): Promise<HubNote>;
}

export function summarize(thread: HubThread, snippet?: string): HubThreadSummary {
  return {
    id: thread.id,
    provider: thread.provider,
    title: thread.title,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    messageCount: thread.messages.length,
    snippet,
  };
}
