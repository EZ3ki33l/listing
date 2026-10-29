import { and } from '@prisma/orm-postgres/orm-client';
import { headers } from 'next/headers';
import { db } from './db';

const HITS = () => db.orm.public.RateLimitHit;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString(); // mêmes ISO que le reste de l'app

// Chaque partie est coupée à 128 caractères : une saisie énorme ne gonfle pas la table
export const rateKey = (...parts: string[]) => parts.map((p) => p.trim().toLowerCase().slice(0, 128)).join(':');

// Sans CLIENT_IP_HEADER (nom de l'en-tête posé par l'hébergeur), pas d'IP : la limite par IP est alors désactivée
export async function getClientIp(): Promise<string | null> {
  const name = process.env.CLIENT_IP_HEADER;
  if (!name) return null;
  return (await headers()).get(name)?.split(',')[0].trim() || null;
}

// Échec ouvert : une panne de la base ne doit pas empêcher de se connecter (elle est journalisée)
export async function isLimited(key: string, max: number, windowMs = 15 * 60 * 1000): Promise<boolean> {
  try {
    const { n } = await HITS().where((h) => and(h.key.eq(key), h.createdAt.gt(iso(windowMs)))).aggregate((a) => ({ n: a.count() }));
    return n >= max;
  } catch (error) {
    console.error('Limitation de débit indisponible:', error);
    return false;
  }
}

export async function recordHit(key: string): Promise<void> {
  try {
    await HITS().create({ key });
    await HITS().where((h) => and(h.key.eq(key), h.createdAt.lt(iso(24 * 3600 * 1000)))).deleteAndCount(); // purge au passage
  } catch (error) {
    console.error('Limitation de débit indisponible:', error);
  }
}

export async function clearHits(key: string): Promise<void> {
  try {
    await HITS().where({ key }).deleteAndCount();
  } catch (error) {
    console.error('Limitation de débit indisponible:', error);
  }
}
