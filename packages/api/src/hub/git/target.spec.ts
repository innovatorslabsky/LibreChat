import type { GitHubContentsClient } from './client';
import type { HubThread } from '../thread';
import { createGitArchiveTarget, pathForThread } from './target';

const thread: HubThread = {
  id: 'claude:c1',
  provider: 'claude',
  sourceId: 'c1',
  title: 'Designing the hub',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-02T00:00:00Z'),
  messages: [
    {
      id: 'm1',
      role: 'user',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      segments: [{ kind: 'text', text: 'hello' }],
      parentId: null,
    },
  ],
};

describe('pathForThread', () => {
  it('nests the file under the prefix, provider, and source id', () => {
    expect(pathForThread(thread, 'context-hub')).toBe('context-hub/claude/c1.md');
  });

  it('treats an empty prefix as the repo root', () => {
    expect(pathForThread(thread, '')).toBe('claude/c1.md');
  });

  it('sanitizes a source id that would otherwise add path segments', () => {
    const hostile: HubThread = { ...thread, sourceId: '../../etc/passwd' };

    const path = pathForThread(hostile, 'context-hub');

    // A slash in the source id must not become a directory separator in the
    // written path — everything after the fixed prefix/provider segments is
    // exactly one filename, whatever character soup the sanitizer left in it.
    expect(path.split('/')).toEqual(['context-hub', 'claude', expect.any(String)]);
  });
});

function fakeClient(
  overrides: Partial<GitHubContentsClient> = {},
): jest.Mocked<GitHubContentsClient> {
  return {
    getFile: jest.fn().mockResolvedValue(undefined),
    putFile: jest.fn().mockResolvedValue({ sha: 'blob-1', commitSha: 'commit-1' }),
    ...overrides,
  } as jest.Mocked<GitHubContentsClient>;
}

describe('createGitArchiveTarget', () => {
  it('writes a new file when none exists yet', async () => {
    const client = fakeClient();
    const target = createGitArchiveTarget({
      owner: 'me',
      repo: 'archive',
      ref: 'main',
      pathPrefix: 'context-hub',
      token: 'tok',
      client,
    });

    const result = await target.writeThread(thread);

    expect(client.putFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'context-hub/claude/c1.md', sha: undefined, branch: 'main' }),
    );
    expect(result).toEqual({ path: 'context-hub/claude/c1.md', commitSha: 'commit-1' });
  });

  it('updates in place, passing the existing blob sha', async () => {
    const client = fakeClient({
      getFile: jest.fn().mockResolvedValue({ content: 'stale', sha: 'old-sha' }),
    });
    const target = createGitArchiveTarget({
      owner: 'me',
      repo: 'archive',
      ref: 'main',
      pathPrefix: '',
      token: 'tok',
      client,
    });

    await target.writeThread(thread);

    expect(client.putFile).toHaveBeenCalledWith(expect.objectContaining({ sha: 'old-sha' }));
  });

  it('skips the write entirely when the rendered content already matches', async () => {
    const { renderThreadMarkdown } = await import('../render');
    const client = fakeClient({
      getFile: jest.fn().mockResolvedValue({ content: renderThreadMarkdown(thread), sha: 'same' }),
    });
    const target = createGitArchiveTarget({
      owner: 'me',
      repo: 'archive',
      ref: 'main',
      pathPrefix: '',
      token: 'tok',
      client,
    });

    const result = await target.writeThread(thread);

    expect(client.putFile).not.toHaveBeenCalled();
    expect(result).toEqual({ path: 'claude/c1.md' });
  });
});
