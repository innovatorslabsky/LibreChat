import { logger } from '@librechat/data-schemas';
import type { AgentApiKeyMethods } from '@librechat/data-schemas';
import type { Request, Response } from 'express';
import { verifyHubOAuthCode } from './code';
import { verifyPkce } from './pkce';

interface TokenRequestBody {
  grant_type?: unknown;
  code?: unknown;
  redirect_uri?: unknown;
  client_id?: unknown;
  code_verifier?: unknown;
}

export interface CreateHubOAuthTokenHandlerDeps {
  methods: Pick<AgentApiKeyMethods, 'createAgentApiKey'>;
}

function errorResponse(res: Response, status: number, error: string, description: string): void {
  res.status(status).json({ error, error_description: description });
}

/**
 * Exchanges an authorization code for an access token — which is a freshly
 * minted `AgentApiKey`, not a bespoke token type. This is what lets the MCP
 * endpoint's existing auth middleware (`createRequireApiKeyAuth`) validate
 * an OAuth-issued token with no changes at all: from that middleware's side,
 * it is exactly the same kind of credential a user creates by hand in the
 * API keys settings, just minted here instead of clicked there. It shows up
 * in that same list, named and revocable like any other key.
 */
export function createHubOAuthTokenHandler(
  deps: CreateHubOAuthTokenHandlerDeps,
): (req: Request<unknown, unknown, TokenRequestBody>, res: Response) => Promise<void> {
  const { methods } = deps;

  return async (req, res) => {
    const body = req.body ?? {};

    if (body.grant_type !== 'authorization_code') {
      errorResponse(res, 400, 'unsupported_grant_type', 'Only authorization_code is supported');
      return;
    }
    const code = typeof body.code === 'string' ? body.code : undefined;
    const redirectUri = typeof body.redirect_uri === 'string' ? body.redirect_uri : undefined;
    const clientId = typeof body.client_id === 'string' ? body.client_id : undefined;
    const codeVerifier = typeof body.code_verifier === 'string' ? body.code_verifier : undefined;

    if (!code || !redirectUri || !clientId || !codeVerifier) {
      errorResponse(
        res,
        400,
        'invalid_request',
        'code, redirect_uri, client_id, and code_verifier are all required',
      );
      return;
    }

    const claims = verifyHubOAuthCode(code);
    if (!claims) {
      errorResponse(res, 400, 'invalid_grant', 'The authorization code is invalid or expired');
      return;
    }
    if (claims.clientId !== clientId || claims.redirectUri !== redirectUri) {
      errorResponse(res, 400, 'invalid_grant', 'client_id or redirect_uri does not match the code');
      return;
    }
    if (!verifyPkce(codeVerifier, claims.codeChallenge)) {
      errorResponse(res, 400, 'invalid_grant', 'code_verifier does not match code_challenge');
      return;
    }

    try {
      const key = await methods.createAgentApiKey({
        userId: claims.userId,
        name: `Claude.ai connector (${new Date().toISOString().slice(0, 10)})`,
      });
      res.status(200).json({ access_token: key.key, token_type: 'Bearer' });
    } catch (error) {
      logger.error('[hubOAuthToken] Error minting access token:', error);
      errorResponse(res, 500, 'server_error', 'Failed to mint an access token');
    }
  };
}
