import { logger } from '@librechat/data-schemas';
import type { HubMethods } from '@librechat/data-schemas';
import type { Request, Response } from 'express';
import { validateAuthorizeRequest } from './validate';

export const HUB_OAUTH_CONSENT_PATH = '/mindferry/connect';

export interface CreateHubOAuthAuthorizeHandlerDeps {
  methods: Pick<HubMethods, 'getHubOAuthClient'>;
}

/**
 * The browser lands here straight from Claude.ai's connector flow, with no
 * LibreChat session of its own yet established for this navigation. Rather
 * than authenticate the raw request itself — this app's access token lives
 * in the SPA's memory, not in a cookie a plain navigation carries — this
 * handler only validates the OAuth request shape and the client's identity,
 * then hands off to a real page in the app (`HUB_OAUTH_CONSENT_PATH`), which
 * already has a login redirect and an authenticated fetch client to work
 * with.
 */
export function createHubOAuthAuthorizeHandler(
  deps: CreateHubOAuthAuthorizeHandlerDeps,
): (req: Request, res: Response) => Promise<void> {
  const { methods } = deps;

  return async (req, res) => {
    try {
      const validation = await validateAuthorizeRequest(
        req.query as Record<string, unknown>,
        methods,
      );
      if (!validation.ok) {
        res.status(validation.status).json({
          error: validation.error,
          error_description: validation.description,
        });
        return;
      }

      const { params } = validation;
      const forward = new URLSearchParams({
        client_id: params.clientId,
        redirect_uri: params.redirectUri,
        code_challenge: params.codeChallenge,
      });
      if (params.state) {
        forward.set('state', params.state);
      }
      res.redirect(302, `${HUB_OAUTH_CONSENT_PATH}?${forward.toString()}`);
    } catch (error) {
      logger.error('[hubOAuthAuthorize] Error validating authorize request:', error);
      res.status(500).json({ error: 'server_error' });
    }
  };
}
