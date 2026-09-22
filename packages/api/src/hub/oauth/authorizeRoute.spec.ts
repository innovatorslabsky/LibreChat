import type { Request, Response } from 'express';
import { createHubOAuthAuthorizeHandler, HUB_OAUTH_CONSENT_PATH } from './authorizeRoute';

const registeredClient = {
  clientId: 'mf_abc123',
  clientName: 'Claude',
  redirectUris: ['https://claude.ai/api/mcp/callback'],
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

function fakeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    redirect: jest.fn(),
  };
}

function fakeReq(query: Record<string, unknown>) {
  return { query } as unknown as Request;
}

describe('createHubOAuthAuthorizeHandler', () => {
  const getHubOAuthClient = jest.fn();
  const handler = createHubOAuthAuthorizeHandler({ methods: { getHubOAuthClient } });

  beforeEach(() => {
    getHubOAuthClient.mockReset();
    getHubOAuthClient.mockResolvedValue(registeredClient);
  });

  it("redirects to the SPA's consent page, forwarding the OAuth params", async () => {
    const req = fakeReq({
      response_type: 'code',
      client_id: 'mf_abc123',
      redirect_uri: 'https://claude.ai/api/mcp/callback',
      code_challenge: 'challenge-value',
      code_challenge_method: 'S256',
      state: 'xyz',
    });
    const res = fakeRes();

    await handler(req, res as unknown as Response);

    expect(res.redirect).toHaveBeenCalledWith(
      302,
      `${HUB_OAUTH_CONSENT_PATH}?client_id=mf_abc123&redirect_uri=https%3A%2F%2Fclaude.ai%2Fapi%2Fmcp%2Fcallback&code_challenge=challenge-value&state=xyz`,
    );
  });

  it('omits state from the forwarded params when the caller supplied none', async () => {
    const req = fakeReq({
      response_type: 'code',
      client_id: 'mf_abc123',
      redirect_uri: 'https://claude.ai/api/mcp/callback',
      code_challenge: 'challenge-value',
      code_challenge_method: 'S256',
    });
    const res = fakeRes();

    await handler(req, res as unknown as Response);

    const [, redirectUrl] = res.redirect.mock.calls[0];
    expect(redirectUrl).not.toContain('state=');
  });

  it('never redirects for a validation failure, reporting it as JSON instead', async () => {
    const req = fakeReq({ response_type: 'token' });
    const res = fakeRes();

    await handler(req, res as unknown as Response);

    expect(res.redirect).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects a redirect_uri outside the registered client list before redirecting anywhere', async () => {
    const req = fakeReq({
      response_type: 'code',
      client_id: 'mf_abc123',
      redirect_uri: 'https://evil.example/callback',
      code_challenge: 'challenge-value',
      code_challenge_method: 'S256',
    });
    const res = fakeRes();

    await handler(req, res as unknown as Response);

    expect(res.redirect).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
