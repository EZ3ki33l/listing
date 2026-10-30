import { describe, it, expect } from 'vitest';
import { maskEmail } from './maskEmail';

describe('maskEmail', () => {
  it('garde la première lettre et le domaine', () => {
    expect(maskEmail('jean.dupont@gmail.com')).toBe('j***@gmail.com');
  });
  it("renvoie une chaîne vide si ce n'est pas une adresse", () => {
    expect(maskEmail('')).toBe('');
    expect(maskEmail('@x.fr')).toBe('');
    expect(maskEmail('sans-arobase')).toBe('');
  });
});
