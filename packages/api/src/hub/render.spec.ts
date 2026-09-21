import type { HubThread, HubMessage } from './thread';
import { renderThreadMarkdown } from './render';

const thread = (messages: HubMessage[], title = 'A Thread'): HubThread => ({
  id: 'claude:abc',
  provider: 'claude',
  sourceId: 'abc',
  title,
  createdAt: new Date('2024-01-07T10:00:00Z'),
  updatedAt: new Date('2024-01-08T11:00:00Z'),
  messages,
});

const message = (overrides: Partial<HubMessage>): HubMessage => ({
  id: 'm1',
  role: 'user',
  createdAt: new Date('2024-01-07T10:00:00Z'),
  segments: [{ kind: 'text', text: 'hello' }],
  parentId: null,
  ...overrides,
});

describe('renderThreadMarkdown', () => {
  it('opens with frontmatter carrying the thread identity', () => {
    const markdown = renderThreadMarkdown(thread([message({})]));

    expect(markdown).toContain('id: "claude:abc"');
    expect(markdown).toContain('provider: claude');
    expect(markdown).toContain('createdAt: 2024-01-07T10:00:00.000Z');
    expect(markdown).toContain('messages: 1');
  });

  it('escapes a title that would break the YAML scalar', () => {
    const markdown = renderThreadMarkdown(thread([message({})], 'He said "hi"\nthen left'));

    expect(markdown).toContain('title: "He said \\"hi\\" then left"');
  });

  it('labels each turn with its role and timestamp', () => {
    const markdown = renderThreadMarkdown(
      thread([
        message({ role: 'user' }),
        message({
          id: 'm2',
          role: 'assistant',
          parentId: 'm1',
          model: 'claude-opus-4',
          segments: [{ kind: 'text', text: 'hi back' }],
        }),
      ]),
    );

    expect(markdown).toContain('## User · 2024-01-07T10:00:00.000Z');
    expect(markdown).toContain('## Assistant · 2024-01-07T10:00:00.000Z · claude-opus-4');
  });

  it('fences thinking, code and tool segments distinctly', () => {
    const markdown = renderThreadMarkdown(
      thread([
        message({
          role: 'assistant',
          segments: [
            { kind: 'thinking', text: 'let me think' },
            { kind: 'code', text: 'print(1)', language: 'python' },
            { kind: 'tool', text: '{"q":1}', name: 'search' },
          ],
        }),
      ]),
    );

    expect(markdown).toContain('```thinking\nlet me think\n```');
    expect(markdown).toContain('```python\nprint(1)\n```');
    expect(markdown).toContain('```tool:search\n{"q":1}\n```');
  });

  it('lengthens the fence so an embedded code block cannot close it early', () => {
    const markdown = renderThreadMarkdown(
      thread([
        message({
          role: 'assistant',
          segments: [{ kind: 'thinking', text: 'see:\n```js\nconst a = 1;\n```' }],
        }),
      ]),
    );

    expect(markdown).toContain('````thinking\n');
    expect(markdown).toContain('const a = 1;\n```\n````');
  });

  it('ends with a single trailing newline so the file is diff-stable', () => {
    const markdown = renderThreadMarkdown(thread([message({})]));

    expect(markdown.endsWith('\n')).toBe(true);
    expect(markdown.endsWith('\n\n')).toBe(false);
  });
});
