import type { GitHubContentsClient } from './client';
import type { HubThread } from '../thread';
import { createGitHubContentsClient } from './client';
import { renderThreadMarkdown } from '../render';

/**
 * Mirrors an archived thread to a Markdown file in a GitHub repository —
 * a second read path for the same archive, one Claude Code (or anyone else
 * with repo access) reads as plain files with no MCP round trip.
 */
export interface GitArchiveTargetConfig {
  owner: string;
  repo: string;
  ref: string;
  /** Directory inside the repo threads are written under; '' means the repo root. */
  pathPrefix: string;
  token: string;
  authorName?: string;
  authorEmail?: string;
  client?: GitHubContentsClient;
}

export interface GitArchiveWriteResult {
  path: string;
  /** `undefined` when the write was skipped because the file already matched. */
  commitSha?: string;
}

export interface GitArchiveTarget {
  writeThread(thread: HubThread): Promise<GitArchiveWriteResult>;
}

/** `provider/sourceId.md`, with every path segment sanitized so a hostile or
 *  malformed `sourceId` can never escape the configured directory. */
function sanitizeSegment(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '_');
  return cleaned.length > 0 ? cleaned : '_';
}

export function pathForThread(thread: HubThread, pathPrefix: string): string {
  const segments = [
    ...pathPrefix.split('/').filter(Boolean),
    sanitizeSegment(thread.provider),
    `${sanitizeSegment(thread.sourceId)}.md`,
  ];
  return segments.join('/');
}

export function createGitArchiveTarget(config: GitArchiveTargetConfig): GitArchiveTarget {
  const { owner, repo, ref, pathPrefix, token, authorName, authorEmail } = config;
  const client = config.client ?? createGitHubContentsClient({ owner, repo, token });

  return {
    async writeThread(thread: HubThread): Promise<GitArchiveWriteResult> {
      const path = pathForThread(thread, pathPrefix);
      const markdown = renderThreadMarkdown(thread);

      const existing = await client.getFile(path, ref);
      if (existing?.content === markdown) {
        return { path };
      }

      const result = await client.putFile({
        path,
        content: markdown,
        branch: ref,
        sha: existing?.sha,
        message: `Archive ${thread.provider}:${thread.sourceId} — ${thread.title}`.slice(0, 200),
        authorName,
        authorEmail,
      });

      return { path, commitSha: result.commitSha };
    },
  };
}
