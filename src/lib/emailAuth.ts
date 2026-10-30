// Adresse de connexion Neon Auth d'un utilisateur de l'application (identifié par pseudo).
// authEmail : adresse réelle (inscription ou ajout). Sinon, comme avant : l'email optionnel donné à l'inscription,
// ou une adresse dérivée du pseudo pour les comptes sans email (aucun mail possible vers .invalid).
export function signInEmail(user: { username: string; authEmail: string | null; email: string | null }): string {
  return user.authEmail ?? (user.email || `${Buffer.from(user.username.toLowerCase()).toString('hex')}@listing.invalid`);
}
