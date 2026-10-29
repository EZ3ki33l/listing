// Prisma 8 lit et écrit les DateTime en texte ISO sans fuseau, en UTC ("2026-09-28T00:00:00") ;
// l'interface continue de manipuler des Date.
const DATE_KEYS = ['createdAt', 'updatedAt', 'targetDate', 'purchasedAt'] as const;
type DateKey = (typeof DATE_KEYS)[number];

type ToDate<V> = V extends string ? Date : V;
export type WithDates<T> = T extends readonly (infer U)[]
  ? WithDates<U>[]
  : T extends object
    ? { [K in keyof T]: K extends DateKey ? ToDate<T[K]> : K extends 'data' ? T[K] : WithDates<T[K]> }
    : T;

export const parseTimestamp = (s: string) => new Date(`${s}Z`);

export function toDates<T>(value: T): WithDates<T> {
  if (Array.isArray(value)) return value.map(toDates) as WithDates<T>;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        (DATE_KEYS as readonly string[]).includes(k) && typeof v === 'string' ? parseTimestamp(v) : k === 'data' ? v : toDates(v),
      ])
    ) as WithDates<T>;
  }
  return value as WithDates<T>;
}
