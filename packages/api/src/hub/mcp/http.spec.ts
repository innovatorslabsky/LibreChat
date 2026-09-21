import http from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { AddressInfo } from 'node:net';
import type { HubMcpServerOptions } from './server';
import type { HubThread } from '../thread';
import { createHubMemoryStore } from './memory';
import { handleHubMcpRequest } from './http';

/**
 * Exercises the real HTTP surface: a Node http.Server routes every request
 * through `handleHubMcpRequest`, and a real MCP `Client` talks to it over
 * `StreamableHTTPClientTransport` — nothing about the transport or the
 * protocol layer is mocked, only the store behind it.
 */

const thread: HubThread = {
  id: 'claude:c1',
  provider: 'claude',
  sourceId: 'c1',
  title: 'Designing the context hub',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-02T00:00:00Z'),
  messages: [
    {
      id: 'm1',
      role: 'user',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      segments: [{ kind: 'text', text: 'How do I sync context between clients?' }],
      parentId: null,
    },
  ],
};

async function startServer(options: Partial<HubMcpServerOptions> = {}) {
  const store = options.store ?? createHubMemoryStore({ threads: [thread] });
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const body = raw.length > 0 ? JSON.parse(raw) : undefined;
      void handleHubMcpRequest({ req, res, body, options: { ...options, store } });
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: new URL(`http://127.0.0.1:${port}/mcp`),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

const textOf = (result: CallToolResult): string => {
  const [first] = result.content;
  return first && first.type === 'text' ? first.text : '';
};

describe('handleHubMcpRequest', () => {
  it('serves a real MCP client over Streamable HTTP end to end', async () => {
    const { url, close } = await startServer();
    const client = new Client({ name: 'hub-http-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(url);

    try {
      await client.connect(transport);

      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name)).toContain('search_context');

      const result = (await client.callTool({
        name: 'search_context',
        arguments: { query: 'sync context' },
      })) as CallToolResult;
      expect(textOf(result)).toContain('claude:c1');
    } finally {
      await client.close();
      await close();
    }
  });

  it('serves a request without issuing a session id, in stateless mode', async () => {
    const { url, close } = await startServer();
    const client = new Client({ name: 'hub-http-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(url);

    try {
      await client.connect(transport);
      await client.listTools();

      expect(transport.sessionId).toBeUndefined();
    } finally {
      await client.close();
      await close();
    }
  });

  it('withholds append_note over HTTP the same way the server does in-process', async () => {
    const { url, close } = await startServer({ allowNotes: false });
    const client = new Client({ name: 'hub-http-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(url);

    try {
      await client.connect(transport);
      const { tools } = await client.listTools();

      expect(tools.map((t) => t.name)).not.toContain('append_note');
    } finally {
      await client.close();
      await close();
    }
  });
});
