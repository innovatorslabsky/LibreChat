import { createHash } from 'node:crypto';
import { verifyPkce } from './pkce';

function challengeFor(verifier: string): string {
  return createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

describe('verifyPkce', () => {
  it('accepts a verifier whose S256 hash matches the challenge', () => {
    const verifier = 'a'.repeat(43);

    expect(verifyPkce(verifier, challengeFor(verifier))).toBe(true);
  });

  it('rejects a verifier that does not hash to the challenge', () => {
    const verifier = 'a'.repeat(43);

    expect(verifyPkce(verifier, challengeFor('b'.repeat(43)))).toBe(false);
  });

  it('rejects a verifier shorter than the RFC 7636 minimum length', () => {
    const verifier = 'a'.repeat(42);

    expect(verifyPkce(verifier, challengeFor(verifier))).toBe(false);
  });

  it('rejects a verifier longer than the RFC 7636 maximum length', () => {
    const verifier = 'a'.repeat(129);

    expect(verifyPkce(verifier, challengeFor(verifier))).toBe(false);
  });

  it('rejects a verifier containing characters outside the unreserved set', () => {
    const verifier = `${'a'.repeat(42)}!`;

    expect(verifyPkce(verifier, challengeFor(verifier))).toBe(false);
  });
});
