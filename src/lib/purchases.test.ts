import { describe, it, expect } from 'vitest';
import { maskItems, purchasesHidden } from './purchases';

const created = new Date('2026-01-01T00:00:00Z');
const bought = { id: 'i', isPurchased: true, purchasedBy: 'bob', purchasedAt: new Date('2026-02-01T00:00:00Z'), createdAt: created, updatedAt: new Date('2026-02-01T00:00:00Z') };

describe('purchasesHidden', () => {
  const ev = { ownerId: 'alice', hidePurchasesFromOwner: true };
  it('vrai seulement pour le propriétaire quand le masquage est actif', () => {
    expect(purchasesHidden(ev, 'alice')).toBe(true);
    expect(purchasesHidden({ ...ev, hidePurchasesFromOwner: false }, 'alice')).toBe(false);
    expect(purchasesHidden(ev, 'bob')).toBe(false);
  });
});

describe('maskItems', () => {
  it('neutralise l\'achat, y compris updatedAt, sans modifier l\'original', () => {
    const [m] = maskItems([bought]);
    expect(m).toMatchObject({ id: 'i', isPurchased: false, purchasedBy: null, purchasedAt: null, updatedAt: created });
    expect(bought.isPurchased).toBe(true);
  });
});
