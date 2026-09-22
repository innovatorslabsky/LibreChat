import type { Request, Response } from 'express';
import { createHubOAuthRegisterHandler } from './registerRoute';

function fakeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function fakeReq(body: Record<string, unknown>) {
  return { body } as unknown as Request;
}

describe('createHubOAuthRegisterHandler', () => {
  const registerHubOAuthClient = jest.fn();
  const handler = createHubOAuthRegisterHandler({ methods: { registerHubOAuthClient } });

  beforeEach(() => {
    registerHubOAuthClient.mockReset();
  });

  it('registers a public client and returns its metadata', async () => {
    registerHubOAuthClient.mockImplementation(async (client) => ({
      ...client,
      createdAt: new Date('2024-01-01T00:00:00Z'),
    }));
    const req = fakeReq({
      redirect_uris: ['https://claude.ai/api/mcp/callback'],
      client_name: 'Claude',
    });
    const res = fakeRes();

    await handler(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(registerHubOAuthClient).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: expect.stringMatching(/^mf_[0-9a-f]{32}$/),
        clientName: 'Claude',
        redirectUris: ['https://claude.ai/api/mcp/callback'],
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code'],
        response_types: ['code'],
      }),
    );
  });

  it('rejects a confidential-client auth method', async () => {
    const req = fakeReq({
      redirect_uris: ['https://claude.ai/api/mcp/callback'],
      token_endpoint_auth_method: 'client_secret_basic',
    });
    const res = fakeRes();

    await handler(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(registerHubOAuthClient).not.toHaveBeenCalled();
  });

  it('rejects an empty redirect_uris list', async () => {
    const req = fakeReq({ redirect_uris: [] });
    const res = fakeRes();

    await handler(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects a redirect_uri that is not a valid http(s) URL', async () => {
    const req = fakeReq({ redirect_uris: ['not-a-url'] });
    const res = fakeRes();

    await handler(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects more than the maximum number of redirect URIs', async () => {
    const req = fakeReq({
      redirect_uris: Array.from({ length: 11 }, (_, i) => `https://example.com/${i}`),
    });
    const res = fakeRes();

    await handler(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('truncates an overlong client_name rather than rejecting the registration', async () => {
    registerHubOAuthClient.mockImplementation(async (client) => ({
      ...client,
      createdAt: new Date('2024-01-01T00:00:00Z'),
    }));
    const req = fakeReq({
      redirect_uris: ['https://claude.ai/api/mcp/callback'],
      client_name: 'x'.repeat(500),
    });
    const res = fakeRes();

    await handler(req, res as unknown as Response);

    const [[registered]] = registerHubOAuthClient.mock.calls;
    expect(registered.clientName).toHaveLength(200);
  });
});
