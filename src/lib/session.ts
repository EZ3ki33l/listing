import { db } from './db';
import { auth } from './auth/server';

// Utilisateur de l'application correspondant à la session Neon Auth (relu en base : isAdmin toujours à jour)
export async function getSessionUser() {
  const { data: session } = await auth.getSession();
  if (!session?.user) return null;
  return db.orm.public.User.where({ authId: session.user.id }).select('id', 'username', 'email', 'isAdmin').first();
}
