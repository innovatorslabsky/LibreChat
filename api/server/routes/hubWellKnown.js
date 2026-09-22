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
 */
router.get(
  '/oauth-authorization-server',
  configMiddleware,
  requireHubMcpEnabled,
  createHubOAuthAuthorizationServerMetadataHandler(resolveHubOAuthOrigin),
);
router.get(
  '/oauth-protected-resource',
  configMiddleware,
  requireHubMcpEnabled,
  createHubOAuthProtectedResourceMetadataHandler(resolveHubOAuthOrigin),
);

module.exports = router;
