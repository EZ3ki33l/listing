// Règles de dates des événements récurrents (anniversaire, Noël) : on ne compare que jour et mois

// Faut-il masquer l'événement ? (date de cette année passée, et date stockée pas dans le futur)
export function shouldAutoHide(targetDate: Date, today: Date) {
  const stored = new Date(targetDate);
  if (stored > today) return false;
  return new Date(today.getFullYear(), stored.getMonth(), stored.getDate()) < today;
}

// Nouvelle date à la réactivation : l'an prochain si la date de cette année est passée, sinon null (inchangée)
export function reactivationDate(targetDate: Date, today: Date) {
  const stored = new Date(targetDate);
  if (new Date(today.getFullYear(), stored.getMonth(), stored.getDate()) >= today) return null;
  return new Date(today.getFullYear() + 1, stored.getMonth(), stored.getDate());
}
