import type { Request, Response, NextFunction } from 'express';
import {
  buildProtectedResourceWwwAuthenticate,
  attachHubOAuthWwwAuthenticate,
} from './wwwAuthenticate';

describe('buildProtectedResourceWwwAuthenticate', () => {
  it('names the protected-resource metadata URL for the given origin', () => {
    expect(buildProtectedResourceWwwAuthenticate('https://hub.example.com')).toBe(
      'Bearer resource_metadata="https://hub.example.com/.well-known/oauth-protected-resource"',
    );
  });
});

describe('attachHubOAuthWwwAuthenticate', () => {
  const originalDomainServer = process.env.DOMAIN_SERVER;

  afterEach(() => {
    process.env.DOMAIN_SERVER = originalDomainServer;
  });

  it('sets the header before calling next, so it applies to whatever response follows', () => {
    process.env.DOMAIN_SERVER = 'https://hub.example.com';
    const set = jest.fn();
    const req = {} as unknown as Request;
    const res = { set } as unknown as Response;
    const next = jest.fn() as NextFunction;

    attachHubOAuthWwwAuthenticate(req, res, next);

    expect(set).toHaveBeenCalledWith(
      'WWW-Authenticate',
      'Bearer resource_metadata="https://hub.example.com/.well-known/oauth-protected-resource"',
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(set.mock.invocationCallOrder[0]).toBeLessThan(
      (next as jest.Mock).mock.invocationCallOrder[0],
    );
  });
});
