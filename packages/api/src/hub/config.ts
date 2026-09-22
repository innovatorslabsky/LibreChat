import type { AppConfig } from '@librechat/data-schemas';

/**
 * Pure gates over `contextHub` config, shared by every hub surface (the MCP
 * endpoint, the import endpoint) so each checks the same thing the same way
 * rather than re-deriving it. `isContextHubEnabled` is the base toggle;
 * `isContextHubMcpEnabled` layers the MCP-specific one on top of it, since an
 * operator can archive into the hub without exposing it over MCP.
 */
export function isContextHubEnabled(config: AppConfig | undefined): boolean {
  return config?.contextHub?.enabled === true;
}

export function isContextHubMcpEnabled(config: AppConfig | undefined): boolean {
  return isContextHubEnabled(config) && config?.contextHub?.mcp?.enabled === true;
}
