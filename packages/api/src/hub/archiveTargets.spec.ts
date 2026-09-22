import type { GitArchiveTarget } from './git/target';
import type { HubThread } from './thread';
import { archiveThreadToTargets } from './archiveTargets';

const thread: HubThread = {
  id: 'claude:c1',
  provider: 'claude',
  sourceId: 'c1',
  title: 'T',
  createdAt: new Date(0),
  updatedAt: new Date(0),
  messages: [],
};

describe('archiveThreadToTargets', () => {
  it('always writes to Mongo', async () => {
    const upsertHubThread = jest.fn().mockResolvedValue(undefined);

    await archiveThreadToTargets({ methods: { upsertHubThread } }, 'user-a', thread);

    expect(upsertHubThread).toHaveBeenCalledWith(
      'user-a',
      expect.objectContaining({ id: 'claude:c1' }),
    );
  });

  it('does not attempt a git write when no git target is configured', async () => {
    const upsertHubThread = jest.fn().mockResolvedValue(undefined);

    const result = await archiveThreadToTargets({ methods: { upsertHubThread } }, 'user-a', thread);

    expect(result).toEqual({});
  });

  it('writes to the git target when one is configured', async () => {
    const upsertHubThread = jest.fn().mockResolvedValue(undefined);
    const writeThread = jest.fn().mockResolvedValue({ path: 'claude/c1.md', commitSha: 'sha-1' });
    const git: GitArchiveTarget = { writeThread };

    const result = await archiveThreadToTargets(
      { methods: { upsertHubThread }, git },
      'user-a',
      thread,
    );

    expect(writeThread).toHaveBeenCalledWith(thread);
    expect(result).toEqual({ git: { path: 'claude/c1.md', commitSha: 'sha-1' } });
  });

  it('reports a git failure rather than throwing, since Mongo already succeeded', async () => {
    const upsertHubThread = jest.fn().mockResolvedValue(undefined);
    const git: GitArchiveTarget = {
      writeThread: jest.fn().mockRejectedValue(new Error('rate limited')),
    };

    const result = await archiveThreadToTargets(
      { methods: { upsertHubThread }, git },
      'user-a',
      thread,
    );

    expect(upsertHubThread).toHaveBeenCalled();
    expect(result.git?.error).toBe('rate limited');
  });

  it('never attempts the git write before Mongo has committed the thread', async () => {
    const order: string[] = [];
    const upsertHubThread = jest.fn().mockImplementation(async () => {
      order.push('mongo');
    });
    const git: GitArchiveTarget = {
      writeThread: jest.fn().mockImplementation(async () => {
        order.push('git');
        return { path: 'x' };
      }),
    };

    await archiveThreadToTargets({ methods: { upsertHubThread }, git }, 'user-a', thread);

    expect(order).toEqual(['mongo', 'git']);
  });
});
