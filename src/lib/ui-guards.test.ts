import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Parcourt src/**/*.tsx
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.tsx') ? [join(dir, e.name)] : []
  );

const files = walk(join(process.cwd(), 'src'));
const offenders = (re: RegExp) =>
  files.filter(f => re.test(readFileSync(f, 'utf8'))).map(f => f.replace(process.cwd() + '/', ''));

describe("garde-fous de l'interface", () => {
  it("n'utilise plus bg-opacity-* (supprimé dans Tailwind v4 : utiliser bg-black/50)", () => {
    expect(offenders(/bg-opacity-/), 'fichiers fautifs').toEqual([]);
  });
  it("n'utilise plus confirm() natif (utiliser useFeedback().confirm)", () => {
    expect(offenders(/(?<![\w.])confirm\(\s*['"`]/), 'fichiers fautifs').toEqual([]);
  });
  it("n'utilise plus le hack includes('✅')", () => {
    expect(offenders(/\.includes\('✅'\)/), 'fichiers fautifs').toEqual([]);
  });
});
