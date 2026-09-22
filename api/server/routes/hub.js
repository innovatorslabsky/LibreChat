const multer = require('multer');
const express = require('express');
const { CLIENT_MESSAGE_SELECT } = require('@librechat/data-schemas');
const {
  createContextHubMcpHandler,
  createContextHubImportHandler,
  createContextHubArchiveHandler,
  contextHubMcpLimiter,
  contextHubImportLimiter,
  contextHubArchiveLimiter,
  createRequireApiKeyAuth,
  resolveImportMaxFileSize,
} = require('@librechat/api');
const { storage, importFileFilter } = require('~/server/routes/files/multer');
const { configMiddleware, requireJwtAuth } = require('~/server/middleware');
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

/**
 * The upload of a user's own export, through the LibreChat UI — an ordinary
 * session (`requireJwtAuth`), not the API-key path the MCP endpoint above
 * uses. `configMiddleware` runs before `multer` because its disk-storage
 * destination reads `req.config.paths.uploads`. Reuses the same disk storage
 * and JSON-only filter `/api/convos/import` already uses, and the same
 * env-configured size ceiling, since this is the same class of upload.
 */
const uploadSingle = multer({
  storage,
  fileFilter: importFileFilter,
  limits: { fileSize: resolveImportMaxFileSize() },
}).single('file');

function handleImportUpload(req, res, next) {
  uploadSingle(req, res, (err) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: {
          message: 'File exceeds the maximum allowed size',
          type: 'invalid_request_error',
          code: 'file_too_large',
        },
      });
    }
    if (err) {
      return next(err);
    }
    next();
  });
}

const importHandler = createContextHubImportHandler({ methods: db });

router.post(
  '/import',
  requireJwtAuth,
  configMiddleware,
  contextHubImportLimiter,
  handleImportUpload,
  importHandler,
);

/**
 * "Save to MindFerry" for a conversation the user already owns —
 * converts it directly rather than round-tripping through an export file.
 */
const archiveHandler = createContextHubArchiveHandler({
  methods: db,
  getConvo: db.getConvo,
  getMessages: (params) => db.getMessages(params, CLIENT_MESSAGE_SELECT),
});

router.post(
  '/archive/:conversationId',
  requireJwtAuth,
  configMiddleware,
  contextHubArchiveLimiter,
  archiveHandler,
);

module.exports = router;
