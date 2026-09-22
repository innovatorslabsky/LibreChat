import { createConfiguredGitArchiveTarget } from './config';

const baseConfig = {
  enabled: true,
  owner: 'me',
  repo: 'archive',
  ref: 'main',
  pathPrefix: 'context-hub',
  token: '${HUB_GIT_TOKEN}',
};

describe('createConfiguredGitArchiveTarget', () => {
  const originalEnv = process.env.HUB_GIT_TOKEN;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.HUB_GIT_TOKEN;
    } else {
      process.env.HUB_GIT_TOKEN = originalEnv;
    }
  });

  it('returns undefined when the target is not configured', () => {
    expect(createConfiguredGitArchiveTarget(undefined)).toBeUndefined();
  });

  it('returns undefined when the target is configured but disabled', () => {
    expect(createConfiguredGitArchiveTarget({ ...baseConfig, enabled: false })).toBeUndefined();
  });

  it('returns undefined when the referenced env var is unset', () => {
    delete process.env.HUB_GIT_TOKEN;

    expect(createConfiguredGitArchiveTarget(baseConfig)).toBeUndefined();
  });

  it('builds a target once the referenced env var resolves', () => {
    process.env.HUB_GIT_TOKEN = 'a-real-token';

    const target = createConfiguredGitArchiveTarget(baseConfig);

    expect(target).toBeDefined();
    expect(typeof target?.writeThread).toBe('function');
  });
});
