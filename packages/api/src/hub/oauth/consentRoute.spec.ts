import type { Response } from 'express';
import { createHubOAuthConsentHandler } from './consentRoute';
import { verifyHubOAuthCode } from './code';

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
  };
}

function fakeReq(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'user-a' },
    body: {
      client_id: 'mf_abc123',
      redirect_uri: 'https://claude.ai/api/mcp/callback',
      code_challenge: 'challenge-value',
      code_challenge_method: 'S256',
      response_type: 'code',
      state: 'xyz',
      decision: 'approve',
    },
    ...overrides,
  };
}

describe('createHubOAuthConsentHandler', () => {
  const originalSecret = process.env.JWT_SECRET;
  const getHubOAuthClient = jest.fn();
  const handler = createHubOAuthConsentHandler({ methods: { getHubOAuthClient } });

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  beforeEach(() => {
    getHubOAuthClient.mockReset();
    getHubOAuthClient.mockResolvedValue(registeredClient);
  });

  it('rejects an unauthenticated request before validating anything else', async () => {
    const req = fakeReq({ user: undefined });
    const res = fakeRes();

    await handler(req as never, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(getHubOAuthClient).not.toHaveBeenCalled();
  });

  it('issues a code scoped to the authenticated user on approval, and returns the redirect URL', async () => {
    const req = fakeReq();
    const res = fakeRes();

    await handler(req as never, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    const [[payload]] = (res.json as jest.Mock).mock.calls;
    const url = new URL(payload.redirectUrl);
    expect(url.origin + url.pathname).toBe('https://claude.ai/api/mcp/callback');
    expect(url.searchParams.get('state')).toBe('xyz');

    const claims = verifyHubOAuthCode(url.searchParams.get('code') as string);
    expect(claims).toEqual({
      userId: 'user-a',
      clientId: 'mf_abc123',
      redirectUri: 'https://claude.ai/api/mcp/callback',
      codeChallenge: 'challenge-value',
    });
  });

  it('returns an access_denied redirect without issuing a code when the user denies', async () => {
    const req = fakeReq({
      body: { ...fakeReq().body, decision: 'deny' },
    });
    const res = fakeRes();

    await handler(req as never, res as unknown as Response);

    const [[payload]] = (res.json as jest.Mock).mock.calls;
    const url = new URL(payload.redirectUrl);
    expect(url.searchParams.get('error')).toBe('access_denied');
    expect(url.searchParams.has('code')).toBe(false);
  });

  it('re-validates the redirect_uri against the registered client rather than trusting the form body', async () => {
    const req = fakeReq({
      body: { ...fakeReq().body, redirect_uri: 'https://evil.example/callback' },
    });
    const res = fakeRes();

    await handler(req as never, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
