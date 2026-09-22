import { randomUUID } from 'node:crypto';
import { logger } from '@librechat/data-schemas';
import type { HubMethods } from '@librechat/data-schemas';
import type { Request, Response } from 'express';

/**
 * Dynamic Client Registration (RFC 7591), unauthenticated by design — an MCP
 * client self-registers the first time it connects, rather than an operator
 * pre-configuring a client id anywhere. Every client registered here is
 * public: no secret is issued, since the token endpoint authenticates the
 * exchange with PKCE instead.
 */

const MAX_REDIRECT_URIS = 10;

interface DcrRequestBody {
  redirect_uris?: unknown;
  client_name?: unknown;
  token_endpoint_auth_method?: unknown;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export interface CreateHubOAuthRegisterHandlerDeps {
  methods: Pick<HubMethods, 'registerHubOAuthClient'>;
}

export function createHubOAuthRegisterHandler(
  deps: CreateHubOAuthRegisterHandlerDeps,
): (req: Request<unknown, unknown, DcrRequestBody>, res: Response) => Promise<void> {
  const { methods } = deps;

  return async (req, res) => {
    const body = req.body ?? {};

    if (body.token_endpoint_auth_method != null && body.token_endpoint_auth_method !== 'none') {
      res.status(400).json({
        error: 'invalid_client_metadata',
        error_description: 'Only public clients (token_endpoint_auth_method "none") are supported',
      });
      return;
    }

    const redirectUris = body.redirect_uris;
    if (
      !Array.isArray(redirectUris) ||
      redirectUris.length === 0 ||
      redirectUris.length > MAX_REDIRECT_URIS ||
      !redirectUris.every((uri) => typeof uri === 'string' && isHttpUrl(uri))
    ) {
      res.status(400).json({
        error: 'invalid_redirect_uri',
        error_description: 'redirect_uris must be 1-10 valid http(s) URLs',
      });
      return;
    }

    const clientName =
      typeof body.client_name === 'string' ? body.client_name.slice(0, 200) : undefined;

    try {
      const client = await methods.registerHubOAuthClient({
        clientId: `mf_${randomUUID().replace(/-/g, '')}`,
        clientName,
        redirectUris,
      });

      res.status(201).json({
        client_id: client.clientId,
        client_name: client.clientName,
        redirect_uris: client.redirectUris,
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code'],
        response_types: ['code'],
      });
    } catch (error) {
      logger.error('[hubOAuthRegister] Error registering client:', error);
      res.status(500).json({ error: 'server_error' });
    }
  };
}
