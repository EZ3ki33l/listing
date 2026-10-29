import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Parcourt src/**/*.tsx
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.tsx') ? [join(dir, e.name)] : []
  );

const NATIVE_CONFIRM = /(?:\bwindow\.|(?<![\w.]))confirm\(\s*['"`]/;
const EMOJI_HACK = /\.(includes|startsWith)\(\s*['"`][✅❌]/;

const files = walk(join(process.cwd(), 'src'));
const offenders = (re: RegExp) =>
  files.filter(f => re.test(readFileSync(f, 'utf8'))).map(f => f.replace(process.cwd() + '/', ''));

describe("garde-fous de l'interface", () => {
  it("n'utilise plus bg-opacity-* (supprimé dans Tailwind v4 : utiliser bg-black/50)", () => {
    expect(offenders(/bg-opacity-/), 'fichiers fautifs').toEqual([]);
  });
  it("n'utilise plus confirm() natif (utiliser useFeedback().confirm)", () => {
    expect(offenders(NATIVE_CONFIRM), 'fichiers fautifs').toEqual([]);
  });
  it("n'utilise plus le hack includes('✅') / startsWith('❌')", () => {
    expect(offenders(EMOJI_HACK), 'fichiers fautifs').toEqual([]);
  });
  it('les regex des gardes détectent bien les cas visés', () => {
    expect("window.confirm('x')").toMatch(NATIVE_CONFIRM);
    expect('confirm("x")').toMatch(NATIVE_CONFIRM);
    expect("await confirm({ title: 'x' })").not.toMatch(NATIVE_CONFIRM);
    expect("feedback.confirm({ title: 'x' })").not.toMatch(NATIVE_CONFIRM);
    expect("m.includes('✅')").toMatch(EMOJI_HACK);
    expect("m.startsWith('❌')").toMatch(EMOJI_HACK);
  });
});
