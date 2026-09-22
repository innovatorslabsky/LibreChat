import type { Request } from 'express';
import { resolveHubOAuthOrigin } from './origin';

describe('resolveHubOAuthOrigin', () => {
  const originalDomainServer = process.env.DOMAIN_SERVER;

  afterEach(() => {
    process.env.DOMAIN_SERVER = originalDomainServer;
  });

  it('prefers DOMAIN_SERVER over request headers, stripping a trailing slash', () => {
    process.env.DOMAIN_SERVER = 'https://hub.example.com/';
    const req = { protocol: 'http', get: () => 'localhost:3080' } as unknown as Request;

    expect(resolveHubOAuthOrigin(req)).toBe('https://hub.example.com');
  });

  it('falls back to the request protocol and host when DOMAIN_SERVER is unset', () => {
    delete process.env.DOMAIN_SERVER;
    const req = { protocol: 'https', get: () => 'hub.example.com' } as unknown as Request;

    expect(resolveHubOAuthOrigin(req)).toBe('https://hub.example.com');
  });
});
