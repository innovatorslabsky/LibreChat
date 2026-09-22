import { createGeminiSource } from './gemini';

/**
 * Shaped after Google Takeout's "My Activity" JSON for Gemini Apps: an
 * activity log, not a conversation export. Each entry is one prompt with a
 * timestamp; there is no assistant reply to recover.
 */
const takeoutExport = [
  {
    header: 'Gemini Apps',
    title: 'Prompted Gemini Apps with “How do I sync context between clients?”',
    titleUrl: 'https://gemini.google.com/app/abc123',
    time: '2024-01-07T10:00:00.000Z',
    products: ['Gemini Apps'],
  },
  {
    header: 'Search',
    title: 'Searched for librechat',
    time: '2024-01-07T11:00:00.000Z',
    products: ['Search'],
  },
];

describe('createGeminiSource', () => {
  const source = createGeminiSource();

  it('recognizes a Takeout export by its Gemini Apps header', () => {
    expect(source.detect(takeoutExport)).toBe(true);
    expect(source.detect([{ header: 'Search', products: ['Search'] }])).toBe(false);
    expect(source.detect([])).toBe(false);
    expect(source.detect([{ mapping: {} }])).toBe(false);
  });

  it('keeps only the Gemini-attributed entries, dropping unrelated Takeout activity', () => {
    const threads = source.parse(takeoutExport);

    expect(threads).toHaveLength(1);
    expect(threads[0].provider).toBe('gemini');
  });

  it('extracts the smart-quoted prompt out of the sentence-shaped title', () => {
    const [thread] = source.parse(takeoutExport);

    expect(thread.messages).toEqual([
      {
        id: 'abc123-prompt',
        role: 'user',
        createdAt: new Date('2024-01-07T10:00:00.000Z'),
        segments: [{ kind: 'text', text: 'How do I sync context between clients?' }],
        parentId: null,
      },
    ]);
  });

  it('derives the thread id from the share link rather than inventing one', () => {
    const [thread] = source.parse(takeoutExport);

    expect(thread.id).toBe('gemini:abc123');
  });

  it('keeps a title that is not in the "Asked X" sentence shape as-is', () => {
    const [thread] = source.parse([
      {
        header: 'Gemini Apps',
        title: 'Used Gemini Apps',
        time: '2024-01-07T10:00:00.000Z',
        products: ['Gemini Apps'],
      },
    ]);

    expect(thread.messages[0].segments[0].text).toBe('Used Gemini Apps');
  });

  it('produces no assistant turn, since Takeout does not export one', () => {
    const [thread] = source.parse(takeoutExport);

    expect(thread.messages.every((m) => m.role === 'user')).toBe(true);
  });

  it('falls back to a positional id when the entry carries no share link', () => {
    const [thread] = source.parse([
      {
        header: 'Gemini Apps',
        title: 'Prompted Gemini Apps with “hello”',
        time: '2024-01-07T10:00:00.000Z',
        products: ['Gemini Apps'],
      },
    ]);

    expect(thread.id).toBe('gemini:entry-0');
  });
});
