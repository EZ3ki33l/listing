import { describe, it, expect } from 'vitest';
import { buildCsp } from './csp';

const directive = (csp: string, name: string) =>
  csp.split(';').map(d => d.trim()).find(d => d.startsWith(name + ' ')) ?? '';

describe('buildCsp', () => {
  it('pose le nonce et verrouille frames/objets', () => {
    const csp = buildCsp('abc', false);
    expect(directive(csp, 'script-src')).toContain("'nonce-abc'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("img-src 'self' data: https:");
  });

  it("n'autorise ni unsafe-inline ni unsafe-eval dans script-src en production", () => {
    const script = directive(buildCsp('abc', false), 'script-src');
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
  });

  it('autorise unsafe-eval seulement en dev', () => {
    expect(directive(buildCsp('abc', true), 'script-src')).toContain("'unsafe-eval'");
  });
});

describe('buildCsp style-src', () => {
  it("n'autorise unsafe-inline pour les <style> qu'en dev", () => {
    expect(directive(buildCsp('abc', false), 'style-src')).not.toContain("'unsafe-inline'");
    expect(directive(buildCsp('abc', true), 'style-src')).toContain("'unsafe-inline'");
  });
});
