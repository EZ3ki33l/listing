import { db } from './db';
import { auth } from './auth/server';

// Utilisateur de l'application correspondant à la session Neon Auth (relu en base : isAdmin toujours à jour)
// authEmail et authId servent aux actions serveur ; ne pas le renvoyer tel quel au navigateur (voir getCurrentUser)
export async function getSessionUser() {
  const { data: session } = await auth.getSession();
  if (!session?.user) return null;
  return db.orm.public.User.where({ authId: session.user.id }).select('id', 'username', 'email', 'authEmail', 'authId', 'isAdmin').first();
}
