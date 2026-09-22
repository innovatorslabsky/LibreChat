import { createGitHubContentsClient, GitHubContentsError } from './client';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'status',
    json: async () => body,
  } as Response;
}

describe('createGitHubContentsClient', () => {
  describe('getFile', () => {
    it('decodes base64 content and returns the blob sha', async () => {
      const content = Buffer.from('# hello', 'utf8').toString('base64');
      const fetchFn = jest
        .fn()
        .mockResolvedValue(jsonResponse(200, { content, encoding: 'base64', sha: 'blob-1' }));
      const client = createGitHubContentsClient({
        owner: 'me',
        repo: 'archive',
        token: 'tok',
        fetchFn,
      });

      const result = await client.getFile('claude/c1.md', 'main');

      expect(result).toEqual({ content: '# hello', sha: 'blob-1' });
    });

    it('returns undefined for a 404 rather than throwing', async () => {
      const fetchFn = jest.fn().mockResolvedValue(jsonResponse(404, { message: 'Not Found' }));
      const client = createGitHubContentsClient({
        owner: 'me',
        repo: 'archive',
        token: 'tok',
        fetchFn,
      });

      expect(await client.getFile('claude/missing.md', 'main')).toBeUndefined();
    });

    it('throws GitHubContentsError with the API message for any other failure', async () => {
      const fetchFn = jest
        .fn()
        .mockResolvedValue(jsonResponse(403, { message: 'API rate limit exceeded' }));
      const client = createGitHubContentsClient({
        owner: 'me',
        repo: 'archive',
        token: 'tok',
        fetchFn,
      });

      await expect(client.getFile('claude/c1.md', 'main')).rejects.toThrow(
        new GitHubContentsError(403, 'API rate limit exceeded'),
      );
    });

    it('percent-encodes each path segment and includes the ref', async () => {
      const fetchFn = jest
        .fn()
        .mockResolvedValue(jsonResponse(200, { content: '', encoding: 'base64', sha: 's' }));
      const client = createGitHubContentsClient({
        owner: 'me',
        repo: 'archive',
        token: 'tok',
        fetchFn,
      });

      await client.getFile('context hub/claude/c1.md', 'feature/x');

      const [url] = fetchFn.mock.calls[0];
      expect(url).toBe(
        'https://api.github.com/repos/me/archive/contents/context%20hub/claude/c1.md?ref=feature%2Fx',
      );
    });
  });

  describe('putFile', () => {
    it('base64-encodes the content and sends the branch and sha', async () => {
      const fetchFn = jest
        .fn()
        .mockResolvedValue(
          jsonResponse(200, { content: { sha: 'blob-2' }, commit: { sha: 'commit-2' } }),
        );
      const client = createGitHubContentsClient({
        owner: 'me',
        repo: 'archive',
        token: 'tok',
        fetchFn,
      });

      const result = await client.putFile({
        path: 'claude/c1.md',
        content: '# hello',
        message: 'Archive claude:c1',
        branch: 'main',
        sha: 'old-sha',
      });

      const [, options] = fetchFn.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.content).toBe(Buffer.from('# hello', 'utf8').toString('base64'));
      expect(body.branch).toBe('main');
      expect(body.sha).toBe('old-sha');
      expect(result).toEqual({ sha: 'blob-2', commitSha: 'commit-2' });
    });

    it('throws GitHubContentsError when the write is rejected', async () => {
      const fetchFn = jest.fn().mockResolvedValue(jsonResponse(422, { message: 'sha mismatch' }));
      const client = createGitHubContentsClient({
        owner: 'me',
        repo: 'archive',
        token: 'tok',
        fetchFn,
      });

      await expect(
        client.putFile({ path: 'c.md', content: 'x', message: 'm', branch: 'main' }),
      ).rejects.toThrow(new GitHubContentsError(422, 'sha mismatch'));
    });
  });
});
