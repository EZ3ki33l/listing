// Validation côté serveur des champs reçus par les actions (les types TypeScript ne protègent pas à l'exécution).
// Chaque validateur renvoie un message d'erreur en français, ou null si l'entrée est valide.
import type { CreateShoppingItemData } from './actions';

export const EVENT_TYPES = ['anniversaire', 'noel', 'saint-valentin', 'anniversaire-rencontre', 'autre'] as const;

const isString = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const isBoolOrAbsent = (v: unknown) => v === undefined || typeof v === 'boolean';

function parseUrl(v: unknown) {
  try {
    return typeof v === 'string' ? new URL(v) : null;
  } catch {
    return null;
  }
}

export function validateEventInput(d: {
  name: unknown; eventType: unknown; hasTargetDate?: unknown; targetDate?: unknown; isPrivate?: unknown; hidePurchasesFromOwner?: unknown;
}): string | null {
  if (typeof d.name !== 'string' || !d.name.trim()) return 'Nom de l\'événement requis';
  if (d.name.length > 100) return 'Nom de l\'événement trop long (100 caractères maximum)';
  if (!EVENT_TYPES.includes(d.eventType as never)) return 'Type d\'événement invalide';
  if (![d.hasTargetDate, d.isPrivate, d.hidePurchasesFromOwner].every(isBoolOrAbsent)) return 'Option d\'événement invalide';
  if (d.targetDate != null && !(d.targetDate instanceof Date && !isNaN(d.targetDate.getTime()))) return 'Date invalide';
  return null;
}

export function validateItemInput(d: CreateShoppingItemData): string | null {
  if (typeof d.name !== 'string' || !d.name.trim()) return 'Nom de l\'article requis';
  if (d.name.length > 100) return 'Nom de l\'article trop long (100 caractères maximum)';
  if (d.description != null && !isString(d.description, 1000)) return 'Description trop longue (1000 caractères maximum)';
  if (d.price != null && !(typeof d.price === 'number' && Number.isFinite(d.price) && d.price >= 0 && d.price <= 1_000_000)) return 'Prix invalide';
  if (d.purchaseUrl) {
    const url = parseUrl(d.purchaseUrl);
    if (!url || !/^https?:$/.test(url.protocol)) return 'Le lien d\'achat doit commencer par http:// ou https://';
  }
  if (!Array.isArray(d.photos) || d.photos.length > 10) return 'Dix photos maximum par article';
  for (const p of d.photos) {
    const url = p && isString(p.imageUrl, 2048) ? parseUrl(p.imageUrl) : null;
    if (!url || url.protocol !== 'https:' || url.username || url.password) return 'Adresse de photo invalide (https:// requis)';
    if (p.altText != null && !isString(p.altText, 200)) return 'Texte alternatif trop long (200 caractères maximum)';
  }
  return null;
}

export function validateCategoryInput(d: { name: unknown; color?: unknown; icon?: unknown }): string | null {
  if (typeof d.name !== 'string' || !d.name.trim() || d.name.length > 50) return 'Nom de catégorie requis (50 caractères maximum)';
  if (d.color != null && !(typeof d.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(d.color))) return 'Couleur invalide (format #RRGGBB)';
  if (d.icon != null && !isString(d.icon, 8)) return 'Icône trop longue (8 caractères maximum)';
  return null;
}
