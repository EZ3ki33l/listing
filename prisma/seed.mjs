// Donne le rôle admin à un compte existant : ADMIN_USERNAME=pseudo npm run seed
// (le compte se crée normalement via l'inscription ; le mot de passe est géré par Neon Auth)
import { db } from '../src/prisma/db.ts';

const username = process.env.ADMIN_USERNAME;
if (!username) throw new Error('ADMIN_USERNAME est requis');

const count = await db.orm.public.User.where({ username }).updateAndCount({ isAdmin: true });
console.log(count ? `"${username}" est maintenant admin` : `Aucun compte "${username}" : inscrivez-vous d'abord`);
await db.close();
