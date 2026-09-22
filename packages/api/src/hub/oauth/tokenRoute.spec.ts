import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { createHubOAuthTokenHandler } from './tokenRoute';
import { issueHubOAuthCode } from './code';

function verifierAndChallenge() {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

function fakeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function fakeReq(body: Record<string, unknown>) {
  return { body } as unknown as Request;
}

describe('createHubOAuthTokenHandler', () => {
  const originalSecret = process.env.JWT_SECRET;
  const createAgentApiKey = jest.fn();
  const handler = createHubOAuthTokenHandler({ methods: { createAgentApiKey } });

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  beforeEach(() => {
    createAgentApiKey.mockReset();
    createAgentApiKey.mockResolvedValue({ key: 'raw-agent-key' });
  });

  it('mints an AgentApiKey as the access token when the code, PKCE, and redirect all match', async () => {
    const { verifier, challenge } = verifierAndChallenge();
    const code = issueHubOAuthCode({
      userId: 'user-a',
      clientId: 'mf_abc123',
      redirectUri: 'https://claude.ai/api/mcp/callback',
      codeChallenge: challenge,
    });
    const req = fakeReq({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://claude.ai/api/mcp/callback',
      client_id: 'mf_abc123',
      code_verifier: verifier,
    });
    const res = fakeRes();

    await handler(req, res as unknown as Response);

    expect(createAgentApiKey).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-a' }));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      access_token: 'raw-agent-key',
      token_type: 'Bearer',
    });
  });

  it('rejects a grant_type other than authorization_code', async () => {
    const req = fakeReq({ grant_type: 'client_credentials' });
    const res = fakeRes();

    await handler(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(createAgentApiKey).not.toHaveBeenCalled();
  });

  it('rejects a request missing required fields', async () => {
    const req = fakeReq({ grant_type: 'authorization_code' });
    const res = fakeRes();

    await handler(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects an invalid or expired code', async () => {
    const { verifier } = verifierAndChallenge();
    const req = fakeReq({
      grant_type: 'authorization_code',
      code: 'not-a-real-code',
      redirect_uri: 'https://claude.ai/api/mcp/callback',
      client_id: 'mf_abc123',
      code_verifier: verifier,
    });
    const res = fakeRes();

    await handler(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(createAgentApiKey).not.toHaveBeenCalled();
  });

  it('rejects a code whose client_id does not match the request', async () => {
    const { verifier, challenge } = verifierAndChallenge();
    const code = issueHubOAuthCode({
      userId: 'user-a',
      clientId: 'mf_abc123',
      redirectUri: 'https://claude.ai/api/mcp/callback',
      codeChallenge: challenge,
    });
    const req = fakeReq({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://claude.ai/api/mcp/callback',
      client_id: 'mf_someone_else',
      code_verifier: verifier,
    });
    const res = fakeRes();

    await handler(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(createAgentApiKey).not.toHaveBeenCalled();
  });

  it('rejects a code_verifier that does not match the challenge in the code', async () => {
    const { challenge } = verifierAndChallenge();
    const { verifier: wrongVerifier } = verifierAndChallenge();
    const code = issueHubOAuthCode({
      userId: 'user-a',
      clientId: 'mf_abc123',
      redirectUri: 'https://claude.ai/api/mcp/callback',
      codeChallenge: challenge,
    });
    const req = fakeReq({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://claude.ai/api/mcp/callback',
      client_id: 'mf_abc123',
      code_verifier: wrongVerifier,
    });
    const res = fakeRes();

    await handler(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(createAgentApiKey).not.toHaveBeenCalled();
  });
});
