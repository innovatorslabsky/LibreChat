import { rateLimit } from 'express-rate-limit';

import type { RequestHandler } from 'express';

/**
 * Dynamic client registration and the token endpoint are both reachable
 * without a LibreChat session — DCR by design (an MCP client self-registers
 * before it has any credential), the token endpoint because PKCE, not a
 * session, is what authenticates that exchange. Both are keyed by IP, the
 * only identity available before either succeeds.
 */
export const hubOAuthRegisterLimiter: RequestHandler = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export const hubOAuthTokenLimiter: RequestHandler = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
