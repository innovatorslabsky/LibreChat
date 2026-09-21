import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { HubMcpServerOptions } from './server';
import { createHubMcpServer } from './server';

/**
 * Serves one MCP request over Streamable HTTP. A fresh server and transport
 * are constructed per request rather than kept alive across requests: the
 * hub has no reason to hold server-initiated state between calls, and a
 * per-request server means an authenticated caller's tools are scoped by
 * construction to the `store` built for their request — there is no shared
 * session map an authorization bug could serve from under the wrong caller.
 * `sessionIdGenerator: undefined` puts the transport in the SDK's stateless
 * mode to match: no session id is issued or expected.
 */
export async function handleHubMcpRequest(params: {
  req: IncomingMessage;
  res: ServerResponse;
  body: unknown;
  options: HubMcpServerOptions;
}): Promise<void> {
  const { req, res, body, options } = params;
  const server = createHubMcpServer(options);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  res.on('close', () => {
    void server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}
