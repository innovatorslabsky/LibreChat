import type { Request, Response, NextFunction } from 'express';
import { resolveHubOAuthOrigin } from './origin';

/**
 * The `WWW-Authenticate` header a 401 from the MCP endpoint carries, naming
 * where an OAuth-capable client finds the protected-resource metadata (RFC
 * 9728) that in turn names the authorization server. This is the only hook
 * Claude.ai's connector has to discover the hub's OAuth server at all — its
 * "Add custom connector" dialog takes just a name and a URL, with no field
 * for a pre-shared credential.
 */
export function buildProtectedResourceWwwAuthenticate(origin: string): string {
  return `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`;
}

/**
 * Sets the header before the API-key auth middleware runs, so it is present
 * on whatever response that middleware ends up sending — a header set
 * earlier in the chain still applies to a later handler's response, as long
 * as it runs before that response is sent.
 */
export function attachHubOAuthWwwAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.set('WWW-Authenticate', buildProtectedResourceWwwAuthenticate(resolveHubOAuthOrigin(req)));
  next();
}
