/**
 * A minimal client for GitHub's Contents API — enough to create or update
 * one file per call. This is deliberately not the blob/tree/commit plumbing
 * `packages/api/src/skills/sync` uses to *read* a repository efficiently at
 * scale; writing one Markdown file per archived thread is exactly the shape
 * the Contents API is for, and it needs no local git tooling or credential
 * beyond a bearer token.
 */

const GITHUB_API_BASE = 'https://api.github.com';

export interface GitHubContentsClientConfig {
  owner: string;
  repo: string;
  token: string;
  fetchFn?: typeof fetch;
}

export interface GitHubWriteFileParams {
  path: string;
  content: string;
  message: string;
  branch: string;
  authorName?: string;
  authorEmail?: string;
}

export interface GitHubWriteFileResult {
  /** The blob's content sha — round-tripped into a later call's `sha` to update in place. */
  sha: string;
  /** The commit this write landed in. */
  commitSha: string;
}

interface GitHubGetContentResponse {
  sha: string;
  content: string;
  encoding: string;
}

interface GitHubPutContentResponse {
  content: { sha: string };
  commit: { sha: string };
}

function headers(token: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'LibreChat-Context-Hub',
    'Content-Type': 'application/json',
  };
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    return typeof body.message === 'string' ? body.message : response.statusText;
  } catch {
    return response.statusText;
  }
}

export class GitHubContentsError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'GitHubContentsError';
  }
}

export interface GitHubContentsClient {
  /** The existing file's content and blob sha, or `undefined` when it does not exist yet. */
  getFile(path: string, ref: string): Promise<{ content: string; sha: string } | undefined>;
  /** Creates the file, or updates it in place when `sha` names the blob being replaced. */
  putFile(params: GitHubWriteFileParams & { sha?: string }): Promise<GitHubWriteFileResult>;
}

export function createGitHubContentsClient(
  config: GitHubContentsClientConfig,
): GitHubContentsClient {
  const { owner, repo, token } = config;
  const fetchFn = config.fetchFn ?? fetch;
  const base = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents`;

  return {
    async getFile(path, ref) {
      const url = `${base}/${encodePath(path)}?ref=${encodeURIComponent(ref)}`;
      const response = await fetchFn(url, { headers: headers(token) });
      if (response.status === 404) {
        return undefined;
      }
      if (!response.ok) {
        throw new GitHubContentsError(response.status, await readErrorMessage(response));
      }
      const body = (await response.json()) as GitHubGetContentResponse;
      if (body.encoding !== 'base64') {
        throw new GitHubContentsError(
          response.status,
          `Unsupported content encoding: ${body.encoding}`,
        );
      }
      return { content: Buffer.from(body.content, 'base64').toString('utf8'), sha: body.sha };
    },

    async putFile({ path, content, message, branch, sha, authorName, authorEmail }) {
      const url = `${base}/${encodePath(path)}`;
      const author =
        authorName && authorEmail ? { name: authorName, email: authorEmail } : undefined;
      const response = await fetchFn(url, {
        method: 'PUT',
        headers: headers(token),
        body: JSON.stringify({
          message,
          branch,
          content: Buffer.from(content, 'utf8').toString('base64'),
          sha,
          committer: author,
          author,
        }),
      });
      if (!response.ok) {
        throw new GitHubContentsError(response.status, await readErrorMessage(response));
      }
      const body = (await response.json()) as GitHubPutContentResponse;
      return { sha: body.content.sha, commitSha: body.commit.sha };
    },
  };
}
