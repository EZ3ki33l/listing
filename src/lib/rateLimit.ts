const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; resetAt: number }>();

// shortcut: compteur en mémoire d'un seul process (une instance serverless a le sien), passer à Redis/Upstash si ça devient nécessaire
export function isLimited(key: string, max: number, now = Date.now()) {
  const f = failures.get(key);
  return !!f && now < f.resetAt && f.count >= max;
}

export function recordFailure(key: string, now = Date.now()) {
  const f = failures.get(key);
  if (!f || now >= f.resetAt) failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else f.count++;
}

export function clearFailures(key: string) {
  failures.delete(key);
}
