const express = require('express');
const {
  createHubOAuthAuthorizationServerMetadataHandler,
  createHubOAuthProtectedResourceMetadataHandler,
  resolveHubOAuthOrigin,
  requireHubMcpEnabled,
} = require('@librechat/api');
const { configMiddleware } = require('~/server/middleware');

const router = express.Router();

/**
 * RFC 8414 / RFC 9728 discovery documents, mounted at the origin root
 * (never under `/api/hub`) since that's where an OAuth client is required to
 * look them up. Gated the same as the OAuth routes under `/api/hub/oauth` —
 * no reason to advertise an authorization server for a feature that's off.
 *
 * RFC 9728 has a client insert the resource's own path after the
 * well-known segment (`/.well-known/oauth-protected-resource/api/hub/mcp`
 * for this hub's one resource) and try that before the bare path below —
 * an MCP client that does this gets a 200 with a document that describes a
 * different path than it asked about, which is still the right document
 * since this hub exposes exactly one resource.
 */
router.get(
  ['/oauth-authorization-server', '/oauth-authorization-server/*splat'],
  configMiddleware,
  requireHubMcpEnabled,
  createHubOAuthAuthorizationServerMetadataHandler(resolveHubOAuthOrigin),
);
router.get(
  ['/oauth-protected-resource', '/oauth-protected-resource/*splat'],
  configMiddleware,
  requireHubMcpEnabled,
  createHubOAuthProtectedResourceMetadataHandler(resolveHubOAuthOrigin),
);

module.exports = router;
