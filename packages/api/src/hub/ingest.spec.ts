import { createDefaultChatSources } from './adapters';
import { ingestExport } from './ingest';

describe('ingestExport', () => {
  const claudeExport = [
    {
      uuid: 'c1',
      name: 'Designing the hub',
      created_at: '2024-01-01T00:00:00.000Z',
      chat_messages: [
        {
          uuid: 'm1',
          sender: 'human',
          content: [{ type: 'text', text: 'hello' }],
        },
      ],
    },
  ];

  it('parses and archives every thread the export produces, scoped to the caller', async () => {
    const upsertHubThread = jest.fn().mockResolvedValue(undefined);

    const result = await ingestExport(
      createDefaultChatSources(),
      { methods: { upsertHubThread } },
      'user-a',
      claudeExport,
    );

    expect(result.threads).toHaveLength(1);
    expect(result.threads[0].id).toBe('claude:c1');
    expect(upsertHubThread).toHaveBeenCalledTimes(1);
    expect(upsertHubThread).toHaveBeenCalledWith(
      'user-a',
      expect.objectContaining({ id: 'claude:c1' }),
    );
  });

  it('propagates an unrecognized export rather than archiving anything', async () => {
    const upsertHubThread = jest.fn();

    await expect(
      ingestExport(createDefaultChatSources(), { methods: { upsertHubThread } }, 'user-a', {
        bogus: true,
      }),
    ).rejects.toThrow();
    expect(upsertHubThread).not.toHaveBeenCalled();
  });
});
