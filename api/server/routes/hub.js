const express = require('express');
const {
  createContextHubMcpHandler,
  contextHubMcpLimiter,
  createRequireApiKeyAuth,
} = require('@librechat/api');
const { configMiddleware } = require('~/server/middleware');
const db = require('~/models');

const router = express.Router();

/**
 * Authenticates the same way Remote Agent event ingestion does: a hashed,
 * expiring, per-user API key minted at `/api/api-keys`, gated behind the
 * REMOTE_AGENTS role permission. A caller that can already push agent
 * trigger events under this key can also reach their own hub archive under
 * it — one bearer credential, one principal, multiple capabilities for that
 * principal, rather than a second key type that would just duplicate this
 * hashed-storage and validation code for no additional isolation (nothing
 * here trusts the key with another user's data either way).
 */
const apiKeyMiddleware = createRequireApiKeyAuth({
  validateAgentApiKey: db.validateAgentApiKey,
  findUser: db.findUser,
  isPrincipalActive: db.isAgentTriggerPrincipalActive,
});

const mcpHandler = createContextHubMcpHandler({ methods: db });

/**
 * `configMiddleware` runs after `apiKeyMiddleware` because it derives
 * `req.config` from `req.user`, and the rate limiter runs after both so it
 * can key its window by the authenticated user rather than by IP.
 */
router.all('/mcp', apiKeyMiddleware, configMiddleware, contextHubMcpLimiter, mcpHandler);

module.exports = router;
