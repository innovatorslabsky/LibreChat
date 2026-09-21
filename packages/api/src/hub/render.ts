import type { HubThread, HubMessage, HubSegment, HubRole } from './thread';

/**
 * Renders a canonical thread as Markdown once, for every archive target.
 * Git targets write the result as a file; a target whose storage is not
 * Markdown converts from here, so its lossiness stays inside that adapter
 * instead of reaching the canonical model.
 */

const ROLE_HEADINGS: Readonly<Record<HubRole, string>> = {
  user: 'User',
  assistant: 'Assistant',
  system: 'System',
};

const FENCE = '```';

/** Quotes and escapes a YAML scalar so any title survives a round trip. */
function yamlString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
}

/**
 * A fence long enough to contain `text`, so a message that itself shows a
 * code block does not terminate the block that wraps it.
 */
function fenceFor(text: string): string {
  let longest = 0;
  const runs = text.match(/^\s*`{3,}/gm);
  if (runs) {
    for (const run of runs) {
      longest = Math.max(longest, run.trim().length);
    }
  }
  return longest < FENCE.length ? FENCE : '`'.repeat(longest + 1);
}

function renderSegment(segment: HubSegment): string {
  const text = segment.text.trim();
  if (segment.kind === 'text') {
    return text;
  }
  const fence = fenceFor(text);
  if (segment.kind === 'code') {
    return `${fence}${segment.language ?? ''}\n${text}\n${fence}`;
  }
  if (segment.kind === 'tool') {
    return `${fence}tool${segment.name ? `:${segment.name}` : ''}\n${text}\n${fence}`;
  }
  return `${fence}thinking\n${text}\n${fence}`;
}

function renderMessage(message: HubMessage): string {
  const heading = ROLE_HEADINGS[message.role];
  const model = message.model ? ` · ${message.model}` : '';
  const parts = [`## ${heading} · ${message.createdAt.toISOString()}${model}`];
  for (const segment of message.segments) {
    parts.push(renderSegment(segment));
  }
  return parts.join('\n\n');
}

export function renderThreadMarkdown(thread: HubThread): string {
  const frontmatter = [
    '---',
    `id: ${yamlString(thread.id)}`,
    `provider: ${thread.provider}`,
    `sourceId: ${yamlString(thread.sourceId)}`,
    `title: ${yamlString(thread.title)}`,
    `createdAt: ${thread.createdAt.toISOString()}`,
    `updatedAt: ${thread.updatedAt.toISOString()}`,
    `messages: ${thread.messages.length}`,
    '---',
  ].join('\n');

  const body = thread.messages.map(renderMessage);
  return [frontmatter, `# ${thread.title}`, ...body].join('\n\n') + '\n';
}
