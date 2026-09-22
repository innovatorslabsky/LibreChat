import type { Response, NextFunction } from 'express';
import type { ServerRequest } from '../../types/http';
import { isContextHubMcpEnabled } from '../config';

/**
 * The OAuth server exists only to authorize access to the hub's MCP
 * endpoint, so it stays behind the same gate that endpoint already checks
 * itself: an operator who disables the hub (or its MCP surface) shouldn't
 * still have clients able to register, get consent screens, or mint tokens
 * for a feature that's off. Requires `configMiddleware` to have already run.
 */
export function requireHubMcpEnabled(req: ServerRequest, res: Response, next: NextFunction): void {
  if (!isContextHubMcpEnabled(req.config)) {
    res.status(404).json({
      error: { message: 'Context hub is not enabled', type: 'not_found', code: 'not_found' },
    });
    return;
  }
  next();
}
