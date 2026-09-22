import fs from 'node:fs/promises';
import { logger } from '@librechat/data-schemas';
import type { ArchiveTargets } from './archiveTargets';
import { resolveImportMaxFileSize } from '../utils/import';
import { createDefaultChatSources } from './adapters';
import { ingestExport } from './ingest';

export class HubImportFileTooLargeError extends Error {
  constructor(
    public readonly size: number,
    public readonly maxSize: number,
  ) {
    super(`File size is ${size} bytes. It exceeds the maximum limit of ${maxSize} bytes.`);
    this.name = 'HubImportFileTooLargeError';
  }
}

export interface RunHubImportJobParams {
  filepath: string;
  userId: string;
  targets: ArchiveTargets;
  /** Defaults to the same operator-configured ceiling conversation import uses. */
  maxFileSize?: number;
}

export interface HubImportJobResult {
  threadCount: number;
}

/**
 * Reads one uploaded export file, archives every thread it contains, and
 * removes the temp file whether the archive succeeds or fails — mirroring
 * `importConversations`' own file lifecycle, so an interrupted or rejected
 * upload does not leave a stray file in the user's temp directory.
 */
export async function runHubImportJob(params: RunHubImportJobParams): Promise<HubImportJobResult> {
  const { filepath, userId, targets, maxFileSize = resolveImportMaxFileSize() } = params;
  try {
    const stat = await fs.stat(filepath);
    if (stat.size > maxFileSize) {
      throw new HubImportFileTooLargeError(stat.size, maxFileSize);
    }

    const raw = await fs.readFile(filepath, 'utf8');
    const payload: unknown = JSON.parse(raw);
    const { threads } = await ingestExport(createDefaultChatSources(), targets, userId, payload);
    return { threadCount: threads.length };
  } finally {
    try {
      await fs.unlink(filepath);
    } catch (error) {
      logger.error(
        `[runHubImportJob] user: ${userId} | Failed to delete temp file: ${filepath}`,
        error,
      );
    }
  }
}
