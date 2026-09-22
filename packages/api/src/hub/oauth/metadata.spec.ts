import { buildAuthorizationServerMetadata, buildProtectedResourceMetadata } from './metadata';

describe('buildAuthorizationServerMetadata', () => {
  it('builds every endpoint from the given origin', () => {
    expect(buildAuthorizationServerMetadata('https://hub.example.com')).toEqual({
      issuer: 'https://hub.example.com',
      authorization_endpoint: 'https://hub.example.com/api/hub/oauth/authorize',
      token_endpoint: 'https://hub.example.com/api/hub/oauth/token',
      registration_endpoint: 'https://hub.example.com/api/hub/oauth/register',
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
    });
  });
});

describe('buildProtectedResourceMetadata', () => {
  it('names the MCP endpoint as the resource, and the origin as its authorization server', () => {
    expect(buildProtectedResourceMetadata('https://hub.example.com')).toEqual({
      resource: 'https://hub.example.com/api/hub/mcp',
      authorization_servers: ['https://hub.example.com'],
    });
  });
});
