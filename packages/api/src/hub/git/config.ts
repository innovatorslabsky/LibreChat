import { logger } from '@librechat/data-schemas';
import type { ContextHubGitTargetConfig } from 'librechat-data-provider';
import type { GitArchiveTarget } from './target';
import { createGitArchiveTarget } from './target';

const TOKEN_REF_PATTERN = /^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/;

/** `${ENV_VAR_NAME}` -> the env var's value, mirroring the skill sync
 *  system's own token-reference convention so an operator configures both
 *  the same way, without pulling in its full credential-registry machinery
 *  for what is here a single, statically configured repository. */
function resolveToken(reference: string): string | undefined {
  const match = reference.match(TOKEN_REF_PATTERN);
  if (!match) {
    return undefined;
  }
  return process.env[match[1]]?.trim() || undefined;
}

/**
 * Builds the git mirror target from config, or `undefined` when it isn't
 * configured or its token cannot be resolved — callers treat either as
 * "no git target," not an error, since the git mirror is optional.
 */
export function createConfiguredGitArchiveTarget(
  config: ContextHubGitTargetConfig | undefined,
): GitArchiveTarget | undefined {
  if (!config?.enabled) {
    return undefined;
  }
  const token = resolveToken(config.token);
  if (!token) {
    logger.warn(
      `[contextHubGit] Git archive target is enabled but its token reference "${config.token}" did not resolve to a value; the git mirror is disabled until it does.`,
    );
    return undefined;
  }
  return createGitArchiveTarget({
    owner: config.owner,
    repo: config.repo,
    ref: config.ref,
    pathPrefix: config.pathPrefix,
    token,
  });
}
