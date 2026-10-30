// Masquage des achats au propriétaire d'une liste (il garde la surprise).
export const purchasesHidden = (event: { ownerId: string; hidePurchasesFromOwner: boolean }, userId: string) =>
  event.ownerId === userId && event.hidePurchasesFromOwner;

// updatedAt remplacé par createdAt : sinon le propriétaire verrait quand un article a été touché.
export function maskItems<I extends { isPurchased: boolean; purchasedBy: string | null; purchasedAt: unknown; createdAt: unknown; updatedAt: unknown }>(items: I[]): I[] {
  return items.map((i) => ({ ...i, isPurchased: false, purchasedBy: null, purchasedAt: null, updatedAt: i.createdAt }));
}
