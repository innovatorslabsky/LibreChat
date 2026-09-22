import jwt from 'jsonwebtoken';
import { issueHubOAuthCode, verifyHubOAuthCode, HUB_OAUTH_CODE_SCOPE } from './code';

const claims = {
  userId: 'user-a',
  clientId: 'mf_abc123',
  redirectUri: 'https://claude.ai/api/mcp/callback',
  codeChallenge: 'challenge-value',
};

describe('issueHubOAuthCode / verifyHubOAuthCode', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('round-trips the claims it was issued with', () => {
    const code = issueHubOAuthCode(claims);

    expect(verifyHubOAuthCode(code)).toEqual(claims);
  });

  it('rejects a token signed under a different scope', () => {
    const token = jwt.sign(
      {
        scope: 'not_hub_oauth_code',
        sub: claims.userId,
        client_id: claims.clientId,
        redirect_uri: claims.redirectUri,
        code_challenge: claims.codeChallenge,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '2m', algorithm: 'HS256' },
    );

    expect(verifyHubOAuthCode(token)).toBeUndefined();
  });

  it('rejects a token signed with a different secret', () => {
    const token = jwt.sign(
      {
        scope: HUB_OAUTH_CODE_SCOPE,
        sub: claims.userId,
        client_id: claims.clientId,
        redirect_uri: claims.redirectUri,
        code_challenge: claims.codeChallenge,
      },
      'wrong-secret',
      { expiresIn: '2m', algorithm: 'HS256' },
    );

    expect(verifyHubOAuthCode(token)).toBeUndefined();
  });

  it('rejects an expired code', () => {
    const token = jwt.sign(
      {
        scope: HUB_OAUTH_CODE_SCOPE,
        sub: claims.userId,
        client_id: claims.clientId,
        redirect_uri: claims.redirectUri,
        code_challenge: claims.codeChallenge,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: -1, algorithm: 'HS256' },
    );

    expect(verifyHubOAuthCode(token)).toBeUndefined();
  });

  it('rejects garbage input', () => {
    expect(verifyHubOAuthCode('not-a-jwt')).toBeUndefined();
  });
});
