import { validateAuthorizeRequest } from './validate';

const registeredClient = {
  clientId: 'mf_abc123',
  clientName: 'Claude',
  redirectUris: ['https://claude.ai/api/mcp/callback'],
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

function baseQuery(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    response_type: 'code',
    client_id: 'mf_abc123',
    redirect_uri: 'https://claude.ai/api/mcp/callback',
    code_challenge: 'challenge-value',
    code_challenge_method: 'S256',
    state: 'xyz',
    ...overrides,
  };
}

describe('validateAuthorizeRequest', () => {
  const getHubOAuthClient = jest.fn();

  beforeEach(() => {
    getHubOAuthClient.mockReset();
    getHubOAuthClient.mockResolvedValue(registeredClient);
  });

  it('accepts a well-formed request for a registered client', async () => {
    const result = await validateAuthorizeRequest(baseQuery(), { getHubOAuthClient });

    expect(result).toEqual({
      ok: true,
      params: {
        clientId: 'mf_abc123',
        redirectUri: 'https://claude.ai/api/mcp/callback',
        codeChallenge: 'challenge-value',
        state: 'xyz',
      },
      client: registeredClient,
    });
  });

  it('rejects a response_type other than "code"', async () => {
    const result = await validateAuthorizeRequest(baseQuery({ response_type: 'token' }), {
      getHubOAuthClient,
    });

    expect(result).toEqual(
      expect.objectContaining({ ok: false, error: 'unsupported_response_type' }),
    );
    expect(getHubOAuthClient).not.toHaveBeenCalled();
  });

  it('rejects a missing client_id', async () => {
    const result = await validateAuthorizeRequest(baseQuery({ client_id: undefined }), {
      getHubOAuthClient,
    });

    expect(result).toEqual(expect.objectContaining({ ok: false, error: 'invalid_request' }));
  });

  it('rejects a code_challenge_method other than S256', async () => {
    const result = await validateAuthorizeRequest(baseQuery({ code_challenge_method: 'plain' }), {
      getHubOAuthClient,
    });

    expect(result).toEqual(expect.objectContaining({ ok: false, error: 'invalid_request' }));
  });

  it('rejects a missing redirect_uri', async () => {
    const result = await validateAuthorizeRequest(baseQuery({ redirect_uri: undefined }), {
      getHubOAuthClient,
    });

    expect(result).toEqual(expect.objectContaining({ ok: false, error: 'invalid_request' }));
  });

  it('rejects an unregistered client_id without leaking whether it almost matched', async () => {
    getHubOAuthClient.mockResolvedValue(null);

    const result = await validateAuthorizeRequest(baseQuery(), { getHubOAuthClient });

    expect(result).toEqual(expect.objectContaining({ ok: false, error: 'invalid_client' }));
  });

  it("rejects a redirect_uri outside the client's registered list, closing the open-redirect", async () => {
    const result = await validateAuthorizeRequest(
      baseQuery({ redirect_uri: 'https://evil.example/callback' }),
      { getHubOAuthClient },
    );

    expect(result).toEqual(expect.objectContaining({ ok: false, error: 'invalid_request' }));
  });

  it('accepts a request with no state, leaving it undefined', async () => {
    const result = await validateAuthorizeRequest(baseQuery({ state: undefined }), {
      getHubOAuthClient,
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.params.state).toBeUndefined();
  });
});
