import type { Response, NextFunction } from 'express';
import type { ServerRequest } from '../../types/http';
import { requireHubMcpEnabled } from './gate';

function fakeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('requireHubMcpEnabled', () => {
  it('calls next without responding when the hub and its MCP surface are enabled', () => {
    const req = {
      config: { contextHub: { enabled: true, mcp: { enabled: true } } },
    } as unknown as ServerRequest;
    const res = fakeRes();
    const next = jest.fn() as NextFunction;

    requireHubMcpEnabled(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responds with 404 rather than calling next when the hub is disabled', () => {
    const req = { config: { contextHub: { enabled: false } } } as unknown as ServerRequest;
    const res = fakeRes();
    const next = jest.fn() as NextFunction;

    requireHubMcpEnabled(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('responds with 404 when the hub is enabled but its MCP surface is not', () => {
    const req = {
      config: { contextHub: { enabled: true, mcp: { enabled: false } } },
    } as unknown as ServerRequest;
    const res = fakeRes();
    const next = jest.fn() as NextFunction;

    requireHubMcpEnabled(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('responds with 404 when no config was resolved at all', () => {
    const req = { config: undefined } as unknown as ServerRequest;
    const res = fakeRes();
    const next = jest.fn() as NextFunction;

    requireHubMcpEnabled(req, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
