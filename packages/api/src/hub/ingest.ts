import type { ArchiveTargets } from './archiveTargets';
import type { ChatSource } from './source';
import type { HubThread } from './thread';
import { archiveThreadToTargets } from './archiveTargets';
import { parseExport } from './source';

export interface IngestExportResult {
  threads: HubThread[];
}

/**
 * Parses one uploaded export with the caller's `ChatSource`s and archives
 * every thread it produces for `userId` to every configured target. Parsing
 * and persistence are kept as one step here because the only thing that
 * changes between them is the chosen `ChatSource` set — a caller that wants
 * them separate can call `parseExport` and `archiveThreadToTargets` directly
 * instead.
 */
export async function ingestExport(
  sources: readonly ChatSource[],
  targets: ArchiveTargets,
  userId: string,
  payload: unknown,
): Promise<IngestExportResult> {
  const threads = parseExport(sources, payload);
  for (const thread of threads) {
    await archiveThreadToTargets(targets, userId, thread);
  }
  return { threads };
}
