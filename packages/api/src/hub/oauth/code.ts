import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

/**
 * The hub's authorization code, as a short-lived, self-contained JWT rather
 * than a row in a database: PKCE (mandatory here) already defeats the
 * interception-replay that a server-side single-use code store exists to
 * prevent, so a signed token with a two-minute expiry needs no additional
 * storage or cleanup. It is signed with the same `JWT_SECRET` this repo
 * already uses for other short-lived, scoped tokens (see
 * `crypto/jwt.ts`'s `generateAgentTriggerToken`), under a distinct `scope`
 * claim so a code and a session token can never be mistaken for each other.
 */

export const HUB_OAUTH_CODE_SCOPE = 'hub_oauth_code';
const CODE_TTL = '2m';

export interface HubOAuthCodeClaims {
  userId: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
}

export function issueHubOAuthCode(claims: HubOAuthCodeClaims): string {
  return jwt.sign(
    {
      scope: HUB_OAUTH_CODE_SCOPE,
      sub: claims.userId,
      client_id: claims.clientId,
      redirect_uri: claims.redirectUri,
      code_challenge: claims.codeChallenge,
      jti: randomUUID(),
    },
    process.env.JWT_SECRET as string,
    { expiresIn: CODE_TTL, algorithm: 'HS256' },
  );
}

export function verifyHubOAuthCode(code: string): HubOAuthCodeClaims | undefined {
  try {
    const payload = jwt.verify(code, process.env.JWT_SECRET as string, {
      algorithms: ['HS256'],
    });
    if (
      typeof payload !== 'object' ||
      payload.scope !== HUB_OAUTH_CODE_SCOPE ||
      typeof payload.sub !== 'string' ||
      typeof payload.client_id !== 'string' ||
      typeof payload.redirect_uri !== 'string' ||
      typeof payload.code_challenge !== 'string'
    ) {
      return undefined;
    }
    return {
      userId: payload.sub,
      clientId: payload.client_id,
      redirectUri: payload.redirect_uri,
      codeChallenge: payload.code_challenge,
    };
  } catch {
    return undefined;
  }
}
