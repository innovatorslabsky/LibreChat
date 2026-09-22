import { logger } from '@librechat/data-schemas';
import type { HubMethods } from '@librechat/data-schemas';
import type { GitArchiveTarget } from './git/target';
import type { HubThread } from './thread';
import { archiveHubThread } from './mcp/mongoStore';

/**
 * Every place that already archives a thread archives to all of these:
 * Mongo, always, and a git mirror, when one is configured. A caller
 * assembles this from whatever targets its config has turned on — no call
 * site needs to know which targets exist.
 */
export interface ArchiveTargets {
  methods: Pick<HubMethods, 'upsertHubThread'>;
  git?: GitArchiveTarget;
}

export interface ArchiveThreadResult {
  git?: { path: string; commitSha?: string; error?: string };
}

/**
 * Mongo is the archive's source of truth; the git mirror is a convenience
 * read path. A git write failure is logged and reported back, never thrown
 * — the caller's thread is already durably archived in Mongo by the time
 * git is attempted, and a mirror outage should not turn that into a failed
 * request.
 */
export async function archiveThreadToTargets(
  targets: ArchiveTargets,
  userId: string,
  thread: HubThread,
): Promise<ArchiveThreadResult> {
  await archiveHubThread(targets.methods, userId, thread);

  if (!targets.git) {
    return {};
  }

  try {
    const result = await targets.git.writeThread(thread);
    return { git: result };
  } catch (error) {
    logger.error(
      `[archiveThreadToTargets] user: ${userId} | Git mirror write failed for ${thread.id}:`,
      error,
    );
    return { git: { path: '', error: error instanceof Error ? error.message : String(error) } };
  }
}
