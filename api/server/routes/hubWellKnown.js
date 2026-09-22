const express = require('express');
const {
  createHubOAuthAuthorizationServerMetadataHandler,
  createHubOAuthProtectedResourceMetadataHandler,
  resolveHubOAuthOrigin,
} = require('@librechat/api');

const router = express.Router();

/**
 * RFC 8414 / RFC 9728 discovery documents, mounted at the origin root
 * (never under `/api/hub`) since that's where an OAuth client is required to
 * look them up.
 */
router.get(
  '/oauth-authorization-server',
  createHubOAuthAuthorizationServerMetadataHandler(resolveHubOAuthOrigin),
);
router.get(
  '/oauth-protected-resource',
  createHubOAuthProtectedResourceMetadataHandler(resolveHubOAuthOrigin),
);

module.exports = router;
