import { describe, it, expect } from 'vitest';
import { EVENT_TYPES, validateEventInput, validateItemInput, validateCategoryInput } from './validation';

const photo = (imageUrl: string) => ({ imageUrl });
const item = (o: object = {}) => ({ eventId: 'e', name: 'Gift', photos: [photo('https://a.fr/i.png')], ...o });

describe('validateEventInput', () => {
  const ok = { name: 'Anniv', eventType: 'noel', hasTargetDate: true, targetDate: new Date(), isPrivate: false };

  it('accepte une entrée valide, les 5 types et les champs optionnels absents', () => {
    expect(validateEventInput(ok)).toBeNull();
    expect(validateEventInput({ name: 'x', eventType: 'autre', targetDate: null })).toBeNull();
    expect(EVENT_TYPES).toEqual(['anniversaire', 'noel', 'saint-valentin', 'anniversaire-rencontre', 'autre']);
  });

  it.each([
    ['type inconnu', { eventType: 'x' }],
    ['nom blanc', { name: '   ' }],
    ['nom non texte', { name: 42 }],
    ['nom de 101 caractères', { name: 'a'.repeat(101) }],
    ['isPrivate en chaîne', { isPrivate: 'true' }],
    ['hasTargetDate en chaîne', { hasTargetDate: 'true' }],
    ['hidePurchasesFromOwner en chaîne', { hidePurchasesFromOwner: 'false' }],
    ['date invalide', { targetDate: new Date('nope') }],
    ['date non Date', { targetDate: '2026-01-01' }],
  ])('refuse : %s', (_, o) => {
    expect(validateEventInput({ ...ok, ...o })).toEqual(expect.any(String));
  });
});

describe('validateItemInput', () => {
  it('accepte un article valide, complet', () => {
    expect(validateItemInput(item())).toBeNull();
    expect(validateItemInput(item({
      description: 'd', price: 12.5, purchaseUrl: 'http://shop.fr/x', photos: [{ imageUrl: 'https://a.fr/i.png', altText: 'alt' }],
    }))).toBeNull();
  });

  it.each([
    ['nom vide', item({ name: ' ' })],
    ['nom de 101 caractères', item({ name: 'a'.repeat(101) })],
    ['description de 1001 caractères', item({ description: 'a'.repeat(1001) })],
    ['prix NaN', item({ price: NaN })],
    ['prix négatif', item({ price: -1 })],
    ['prix 1e12', item({ price: 1e12 })],
    ['lien d\'achat ftp', item({ purchaseUrl: 'ftp://a' })],
    ['photo javascript:', item({ photos: [photo('javascript:alert(1)')] })],
    ['photo data:', item({ photos: [photo('data:image/png;base64,AA')] })],
    ['photo http', item({ photos: [photo('http://a.fr/i.png')] })],
    ['photo avec identifiants', item({ photos: [photo('https://u:p@a.fr/i.png')] })],
    ['photo illisible', item({ photos: [photo('pas une url')] })],
    ['URL de 2049 caractères', item({ photos: [photo('https://a.fr/' + 'a'.repeat(2036))] })],
    ['11 photos', item({ photos: Array.from({ length: 11 }, () => photo('https://a.fr/i.png')) })],
    ['altText de 201 caractères', item({ photos: [{ imageUrl: 'https://a.fr/i.png', altText: 'a'.repeat(201) }] })],
  ])('refuse : %s', (_, d) => {
    expect(validateItemInput(d)).toEqual(expect.any(String));
  });

  it('accepte une URL de 2048 caractères et 10 photos', () => {
    const url = 'https://a.fr/' + 'a'.repeat(2035);
    expect(url).toHaveLength(2048);
    expect(validateItemInput(item({ photos: Array.from({ length: 10 }, () => photo(url)) }))).toBeNull();
  });
});

describe('validateCategoryInput', () => {
  it('accepte une catégorie valide et sans options', () => {
    expect(validateCategoryInput({ name: 'Livres', color: '#aB09fF', icon: '📚' })).toBeNull();
    expect(validateCategoryInput({ name: 'Livres' })).toBeNull();
  });

  it.each([
    ['nom vide', { name: ' ' }],
    ['nom de 51 caractères', { name: 'a'.repeat(51) }],
    ['couleur red', { name: 'x', color: 'red' }],
    ['couleur #fff', { name: 'x', color: '#fff' }],
    ['icône de 9 caractères', { name: 'x', icon: 'abcdefghi' }],
  ])('refuse : %s', (_, d) => {
    expect(validateCategoryInput(d)).toEqual(expect.any(String));
  });
});
