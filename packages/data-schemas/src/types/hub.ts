/**
 * Public, storage-engine-neutral shapes for the context hub archive. These
 * intentionally duplicate the field shapes in `@librechat/api`'s canonical
 * `HubThread` rather than importing them — `data-schemas` does not depend on
 * `packages/api` — and carry no Mongoose type (`ObjectId`, `Document`,
 * `FilterQuery`) in any exported signature, so a caller depends on the data
 * these describe rather than on Mongo.
 */

export type HubSegmentKind = 'text' | 'thinking' | 'code' | 'tool';

export interface HubSegmentRecord {
  kind: HubSegmentKind;
  text: string;
  language?: string;
  name?: string;
}

export type HubMessageRole = 'user' | 'assistant' | 'system';

export interface HubMessageRecord {
  id: string;
  role: HubMessageRole;
  createdAt: Date;
  segments: HubSegmentRecord[];
  parentId: string | null;
  model?: string;
}

export interface HubThreadRecord {
  /** Canonical `${provider}:${sourceId}`. */
  id: string;
  provider: string;
  sourceId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: HubMessageRecord[];
}

export interface HubThreadSearchQuery {
  query: string;
  providers?: readonly string[];
  limit: number;
}

export interface HubThreadSearchResult {
  id: string;
  provider: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  /** Denormalized title + message text this row matched against. */
  searchText: string;
}

export interface HubNoteInput {
  title: string;
  text: string;
  threadId?: string;
}

export interface HubNoteRecord extends HubNoteInput {
  id: string;
  createdAt: Date;
}

export interface HubDataDeleteResult {
  deletedThreads: number;
  deletedNotes: number;
}
