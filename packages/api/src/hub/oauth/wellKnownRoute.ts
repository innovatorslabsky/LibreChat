import type { Request, Response } from 'express';
import { buildAuthorizationServerMetadata, buildProtectedResourceMetadata } from './metadata';

export function createHubOAuthAuthorizationServerMetadataHandler(
  resolveOrigin: (req: Request) => string,
): (req: Request, res: Response) => void {
  return (req, res) => {
    res.status(200).json(buildAuthorizationServerMetadata(resolveOrigin(req)));
  };
}

export function createHubOAuthProtectedResourceMetadataHandler(
  resolveOrigin: (req: Request) => string,
): (req: Request, res: Response) => void {
  return (req, res) => {
    res.status(200).json(buildProtectedResourceMetadata(resolveOrigin(req)));
  };
}
