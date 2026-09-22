import type { HubOAuthClientRecord } from '@librechat/data-schemas';
import type { HubMethods } from '@librechat/data-schemas';

/**
 * Shared between the `/authorize` redirect and the `/consent` decision: both
 * must reject an unregistered client or a `redirect_uri` outside what that
 * client registered before anything else happens — the second check in
 * particular is what stops the authorization endpoint from being usable as
 * an open redirect.
 */

export interface AuthorizeRequestParams {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state?: string;
}

export type AuthorizeValidation =
  | { ok: true; params: AuthorizeRequestParams; client: HubOAuthClientRecord }
  | { ok: false; status: number; error: string; description: string };

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export async function validateAuthorizeRequest(
  query: Record<string, unknown>,
  methods: Pick<HubMethods, 'getHubOAuthClient'>,
): Promise<AuthorizeValidation> {
  const responseType = asString(query.response_type);
  const clientId = asString(query.client_id);
  const redirectUri = asString(query.redirect_uri);
  const codeChallenge = asString(query.code_challenge);
  const codeChallengeMethod = asString(query.code_challenge_method);
  const state = asString(query.state);

  if (responseType !== 'code') {
    return {
      ok: false,
      status: 400,
      error: 'unsupported_response_type',
      description: 'Only "code" is supported',
    };
  }
  if (!clientId) {
    return {
      ok: false,
      status: 400,
      error: 'invalid_request',
      description: 'client_id is required',
    };
  }
  if (!codeChallenge || codeChallengeMethod !== 'S256') {
    return {
      ok: false,
      status: 400,
      error: 'invalid_request',
      description: 'PKCE with code_challenge_method=S256 is required',
    };
  }
  if (!redirectUri) {
    return {
      ok: false,
      status: 400,
      error: 'invalid_request',
      description: 'redirect_uri is required',
    };
  }

  const client = await methods.getHubOAuthClient(clientId);
  if (!client) {
    return { ok: false, status: 400, error: 'invalid_client', description: 'Unknown client_id' };
  }
  if (!client.redirectUris.includes(redirectUri)) {
    return {
      ok: false,
      status: 400,
      error: 'invalid_request',
      description: "redirect_uri does not match the client's registered redirect URIs",
    };
  }

  return {
    ok: true,
    params: { clientId, redirectUri, codeChallenge, state },
    client,
  };
}
