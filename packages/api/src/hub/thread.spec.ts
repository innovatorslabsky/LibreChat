import type { HubThread, HubMessage } from './thread';
import { compactMessages, orderMessages, hubThreadId, threadText } from './thread';

const message = (
  id: string,
  parentId: string | null,
  text: string,
  createdAt = new Date('2024-01-01T00:00:00Z'),
): HubMessage => ({
  id,
  role: 'assistant',
  createdAt,
  segments: [{ kind: 'text', text }],
  parentId,
});

describe('hubThreadId', () => {
  it('namespaces the provider so two providers can reuse one id', () => {
    expect(hubThreadId('chatgpt', 'abc')).toBe('chatgpt:abc');
    expect(hubThreadId('claude', 'abc')).toBe('claude:abc');
  });
});

describe('compactMessages', () => {
  it('rewires a survivor to its nearest surviving ancestor', () => {
    const compacted = compactMessages([
      message('root', null, 'kept'),
      message('hidden', 'root', '   '),
      message('leaf', 'hidden', 'also kept'),
    ]);

    expect(compacted.map((m) => m.id)).toEqual(['root', 'leaf']);
    expect(compacted[1].parentId).toBe('root');
  });

  it('walks a run of dropped ancestors up to the surviving one', () => {
    const compacted = compactMessages([
      message('root', null, 'kept'),
      message('a', 'root', ''),
      message('b', 'a', ''),
      message('leaf', 'b', 'kept'),
    ]);

    expect(compacted.map((m) => m.id)).toEqual(['root', 'leaf']);
    expect(compacted[1].parentId).toBe('root');
  });

  it('makes a message a root when every ancestor was dropped', () => {
    const compacted = compactMessages([
      message('hidden', null, ''),
      message('leaf', 'hidden', 'kept'),
    ]);

    expect(compacted).toHaveLength(1);
    expect(compacted[0].parentId).toBeNull();
  });

  it('drops only the blank segments of a message that still has content', () => {
    const compacted = compactMessages([
      {
        ...message('one', null, 'kept'),
        segments: [
          { kind: 'thinking', text: '  ' },
          { kind: 'text', text: 'kept' },
        ],
      },
    ]);

    expect(compacted[0].segments).toEqual([{ kind: 'text', text: 'kept' }]);
  });

  it('terminates on a parent cycle instead of walking forever', () => {
    const compacted = compactMessages([
      message('a', 'b', ''),
      message('b', 'a', ''),
      message('leaf', 'a', 'kept'),
    ]);

    expect(compacted.map((m) => m.id)).toEqual(['leaf']);
    expect(compacted[0].parentId).toBeNull();
  });
});

describe('orderMessages', () => {
  it('emits every parent before its children', () => {
    const ordered = orderMessages([message('child', 'root', 'c'), message('root', null, 'r')]);

    expect(ordered.map((m) => m.id)).toEqual(['root', 'child']);
  });

  it('orders siblings by time, keeping a branch contiguous', () => {
    const ordered = orderMessages([
      message('root', null, 'r'),
      message('late', 'root', 'l', new Date('2024-01-01T00:02:00Z')),
      message('early', 'root', 'e', new Date('2024-01-01T00:01:00Z')),
      message('earlyChild', 'early', 'ec', new Date('2024-01-01T00:03:00Z')),
    ]);

    expect(ordered.map((m) => m.id)).toEqual(['root', 'early', 'earlyChild', 'late']);
  });

  it('treats a message whose parent is absent as a root', () => {
    const ordered = orderMessages([message('orphan', 'missing', 'o')]);

    expect(ordered.map((m) => m.id)).toEqual(['orphan']);
  });

  it('handles a deep linear thread without exhausting the stack', () => {
    const deep: HubMessage[] = [];
    for (let i = 0; i < 20000; i++) {
      deep.push(message(`m${i}`, i === 0 ? null : `m${i - 1}`, `text ${i}`));
    }

    const ordered = orderMessages(deep);

    expect(ordered).toHaveLength(20000);
    expect(ordered[19999].id).toBe('m19999');
  });
});

describe('threadText', () => {
  it('concatenates every segment of every message', () => {
    const thread: HubThread = {
      id: 'claude:x',
      provider: 'claude',
      sourceId: 'x',
      title: 'T',
      createdAt: new Date(0),
      updatedAt: new Date(0),
      messages: [
        { ...message('a', null, 'first'), segments: [{ kind: 'text', text: 'first' }] },
        { ...message('b', 'a', 'second'), segments: [{ kind: 'thinking', text: 'second' }] },
      ],
    };

    expect(threadText(thread)).toBe('first\nsecond');
  });
});
