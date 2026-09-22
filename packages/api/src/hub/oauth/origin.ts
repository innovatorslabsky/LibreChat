import type { Request } from 'express';

/**
 * The hub's own public origin, used to build every absolute URL its OAuth
 * server issues (metadata documents, endpoint URLs, the `WWW-Authenticate`
 * challenge). Prefers `DOMAIN_SERVER` — the same env var this repo's social
 * OAuth login flow already uses for its own callback URLs — over trusting
 * request headers, since `Host`/`X-Forwarded-*` are client-influenced and
 * this value is baked into tokens a client then relies on.
 */
export function resolveHubOAuthOrigin(req: Request): string {
  const configured = process.env.DOMAIN_SERVER?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  return `${req.protocol}://${req.get('host')}`;
}
