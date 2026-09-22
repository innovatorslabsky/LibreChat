import { createHash } from 'node:crypto';

/**
 * RFC 7636 PKCE (S256 only — the hub's registration and authorize handlers
 * reject `plain`, since a public client with no secret is exactly the case
 * PKCE's hashed challenge exists to protect).
 */

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier)) {
    return false;
  }
  const computed = base64UrlEncode(createHash('sha256').update(codeVerifier).digest());
  return computed === codeChallenge;
}
