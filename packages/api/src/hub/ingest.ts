import type { HubMethods } from '@librechat/data-schemas';
import type { ChatSource } from './source';
import type { HubThread } from './thread';
import { archiveHubThread } from './mcp/mongoStore';
import { parseExport } from './source';

export interface IngestExportResult {
  threads: HubThread[];
}

/**
 * Parses one uploaded export with the caller's `ChatSource`s and archives
 * every thread it produces for `userId`. Parsing and persistence are kept as
 * one step here because the only thing that changes between them is the
 * chosen `ChatSource` set — a caller that wants them separate can call
 * `parseExport` and `archiveHubThread` directly instead.
 */
export async function ingestExport(
  sources: readonly ChatSource[],
  methods: Pick<HubMethods, 'upsertHubThread'>,
  userId: string,
  payload: unknown,
): Promise<IngestExportResult> {
  const threads = parseExport(sources, payload);
  for (const thread of threads) {
    await archiveHubThread(methods, userId, thread);
  }
  return { threads };
}
