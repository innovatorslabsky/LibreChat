import { logger } from '@librechat/data-schemas';
import type { HubMethods, IUser } from '@librechat/data-schemas';
import type { Request, Response } from 'express';
import { validateAuthorizeRequest } from './validate';
import { issueHubOAuthCode } from './code';

interface ConsentRequestBody {
  client_id?: unknown;
  redirect_uri?: unknown;
  code_challenge?: unknown;
  state?: unknown;
  decision?: unknown;
}

type ConsentRequest = Request<unknown, unknown, ConsentRequestBody> & { user?: IUser };

export interface CreateHubOAuthConsentHandlerDeps {
  methods: Pick<HubMethods, 'getHubOAuthClient'>;
}

function buildRedirect(redirectUri: string, params: Record<string, string>): string {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

/**
 * The user's actual decision. Re-validates the client and `redirect_uri`
 * exactly as `/authorize` did rather than trusting what the consent page
 * submits — the page is client-controlled, so nothing it says about which
 * client or redirect URI this is can be taken as authoritative on its own.
 */
export function createHubOAuthConsentHandler(
  deps: CreateHubOAuthConsentHandlerDeps,
): (req: ConsentRequest, res: Response) => Promise<void> {
  const { methods } = deps;

  return async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'invalid_request', error_description: 'Not authenticated' });
      return;
    }

    try {
      const validation = await validateAuthorizeRequest(
        req.body as Record<string, unknown>,
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
      const stateParam: Record<string, string> =
        params.state !== undefined ? { state: params.state } : {};

      if (req.body?.decision !== 'approve') {
        res.status(200).json({
          redirectUrl: buildRedirect(params.redirectUri, { error: 'access_denied', ...stateParam }),
        });
        return;
      }

      const code = issueHubOAuthCode({
        userId,
        clientId: params.clientId,
        redirectUri: params.redirectUri,
        codeChallenge: params.codeChallenge,
      });

      res.status(200).json({
        redirectUrl: buildRedirect(params.redirectUri, { code, ...stateParam }),
      });
    } catch (error) {
      logger.error('[hubOAuthConsent] Error deciding authorize request:', error);
      res.status(500).json({ error: 'server_error' });
    }
  };
}
