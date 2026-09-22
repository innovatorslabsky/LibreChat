/**
 * RFC 8414 (Authorization Server Metadata) and RFC 9728 (Protected Resource
 * Metadata) documents for the hub's OAuth server. Claude.ai's connector flow
 * discovers these after the MCP endpoint answers its first, unauthenticated
 * request with a 401 that names the resource-metadata URL — see
 * `wwwAuthenticate.ts` for that half of the handshake.
 */

export interface HubOAuthAuthorizationServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint: string;
  response_types_supported: string[];
  grant_types_supported: string[];
  code_challenge_methods_supported: string[];
  token_endpoint_auth_methods_supported: string[];
}

export function buildAuthorizationServerMetadata(
  origin: string,
): HubOAuthAuthorizationServerMetadata {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/api/hub/oauth/authorize`,
    token_endpoint: `${origin}/api/hub/oauth/token`,
    registration_endpoint: `${origin}/api/hub/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
  };
}

export interface HubOAuthProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
}

export function buildProtectedResourceMetadata(origin: string): HubOAuthProtectedResourceMetadata {
  return {
    resource: `${origin}/api/hub/mcp`,
    authorization_servers: [origin],
  };
}
