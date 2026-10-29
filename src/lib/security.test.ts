import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// Tests d'intégration : nécessitent une base Postgres jetable (jamais la production), ex.
// TEST_DATABASE_URL=postgresql://postgres:test@localhost:54329/listing npm test
const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/headers', () => ({ headers: vi.fn(), cookies: vi.fn() }));
vi.mock('./session', () => ({ getSessionUser: vi.fn() }));
vi.mock('./auth/server', () => ({ auth: {} }));

import { isLimited, recordFailure } from './rateLimit';
import { shouldAutoHide, reactivationDate } from './recurring';
import { toDates } from './dates';

describe.skipIf(!TEST_DB)('autorisations et achats (base réelle)', () => {
  type Row = { id: string; username: string; email: null; isAdmin: boolean };
  let db: typeof import('./db').db;
  let actions: typeof import('./actions');
  let getSessionUser: ReturnType<typeof vi.fn>;
  let alice: Row, bob: Row, carol: Row; // propriétaire, lecteur (canEdit=false), sans accès
  let eventId: string;
  const tag = Math.random().toString(36).slice(2, 8);
  const loginAs = (u: Row | null) => getSessionUser.mockResolvedValue(u);

  const newItem = async () => (await db.orm.public.ShoppingItem.create({ name: 'Gift', eventId })).id;
  const itemRow = (id: string) => db.orm.public.ShoppingItem.where({ id }).first();
  const mkUser = async (name: string): Promise<Row> => {
    const u = await db.orm.public.User.create({ username: `${name}-${tag}` });
    return { id: u.id, username: u.username, email: null, isAdmin: false };
  };

  beforeAll(async () => {
    ({ db } = await import('./db'));
    actions = await import('./actions');
    getSessionUser = vi.mocked((await import('./session')).getSessionUser) as unknown as ReturnType<typeof vi.fn>;
    [alice, bob, carol] = [await mkUser('alice'), await mkUser('bob'), await mkUser('carol')];
    eventId = (await db.orm.public.Event.create({ name: 'Anniv', eventType: 'autre', ownerId: alice.id })).id;
    await db.orm.public.EventShare.create({ eventId, userId: bob.id, canEdit: false });
  });

  afterAll(async () => {
    for (const u of [alice, bob, carol]) await db.orm.public.User.where({ id: u.id }).delete(); // cascade
    await db.close();
  });

  it('refuse sans session', async () => {
    loginAs(null);
    expect((await actions.deleteShoppingItem(await newItem())).success).toBe(false);
  });

  it('suppression : propriétaire oui, lecteur et inconnu non', async () => {
    const id = await newItem();
    for (const u of [bob, carol]) {
      loginAs(u);
      expect((await actions.deleteShoppingItem(id)).success).toBe(false);
    }
    expect(await itemRow(id)).not.toBeNull();
    loginAs(alice);
    expect((await actions.deleteShoppingItem(id)).success).toBe(true);
    expect(await itemRow(id)).toBeNull();
  });

  it('seul le propriétaire modifie ou masque l\'événement', async () => {
    const data = { name: 'Piraté', eventType: 'autre', targetDate: null, hasTargetDate: false, isPrivate: false };
    loginAs(bob);
    expect((await actions.updateEvent(eventId, data)).success).toBe(false);
    expect((await actions.hideEvent(eventId)).success).toBe(false);
    loginAs(alice);
    expect((await actions.updateEvent(eventId, { ...data, name: 'Anniv' })).success).toBe(true);
  });

  it('achat : sans accès refusé, le vrai pseudo est enregistré, pas de 2e achat', async () => {
    const id = await newItem();
    loginAs(carol);
    expect((await actions.updateItemStatus({ itemId: id, isPurchased: true })).success).toBe(false);
    loginAs(bob);
    expect((await actions.updateItemStatus({ itemId: id, isPurchased: true })).success).toBe(true);
    expect((await itemRow(id))?.purchasedBy).toBe(bob.username);
    loginAs(alice);
    expect(await actions.updateItemStatus({ itemId: id, isPurchased: true })).toMatchObject({ success: false });
    expect((await actions.updateItemStatus({ itemId: id, isPurchased: false })).success).toBe(false); // pas l'acheteur
    loginAs(bob);
    expect((await actions.updateItemStatus({ itemId: id, isPurchased: false })).success).toBe(true);
    expect((await itemRow(id))?.isPurchased).toBe(false);
  });

  it('deux clics simultanés : un seul acheteur', async () => {
    const id = await newItem();
    getSessionUser.mockResolvedValueOnce(alice).mockResolvedValueOnce(bob);
    const results = await Promise.all([
      actions.updateItemStatus({ itemId: id, isPurchased: true }),
      actions.updateItemStatus({ itemId: id, isPurchased: true }),
    ]);
    expect(results.filter((r) => r.success)).toHaveLength(1);
  });

  it('les dates font l\'aller-retour en UTC', async () => {
    loginAs(alice);
    const targetDate = new Date('2027-09-28T00:00:00.000Z');
    expect((await actions.createEvent({ name: 'Date', eventType: 'autre', hasTargetDate: true, targetDate })).success).toBe(true);
    const r = await actions.getAllActiveEvents();
    const created = r.events?.find((e) => e.name === 'Date');
    expect(created?.targetDate).toEqual(targetDate);
    expect(created?.owner.username).toBe(alice.username);
    expect(created?.owner).not.toHaveProperty('password');
  });
});

describe('limite de tentatives', () => {
  it('bloque après le maximum', () => {
    for (let i = 0; i < 5; i++) recordFailure('k', 0);
    expect(isLimited('k', 5, 1)).toBe(true);
    expect(isLimited('k', 5, 16 * 60 * 1000)).toBe(false);
  });
});

describe('dates des événements récurrents', () => {
  const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

  it('masque seulement si la date de cette année est passée', () => {
    expect(shouldAutoHide(d(2020, 3, 1), d(2026, 10, 29))).toBe(true);
    expect(shouldAutoHide(d(2020, 12, 25), d(2026, 10, 29))).toBe(false);
    expect(shouldAutoHide(d(2030, 1, 1), d(2026, 10, 29))).toBe(false); // date stockée future
  });

  it('réactivation : passe à l\'an prochain seulement si la date est passée', () => {
    expect(reactivationDate(d(2020, 3, 1), d(2026, 10, 29))).toEqual(d(2027, 3, 1));
    expect(reactivationDate(d(2020, 12, 25), d(2026, 10, 29))).toBeNull();
    expect(reactivationDate(d(2020, 10, 29), d(2026, 10, 29))).toBeNull(); // le jour même
  });

  it('29 février en année non bissextile : bascule au 1er mars, sans planter', () => {
    expect(reactivationDate(d(2020, 2, 29), d(2026, 10, 29))).toEqual(d(2027, 3, 1));
  });

  it('passage d\'année', () => {
    expect(reactivationDate(d(2020, 12, 31), d(2027, 1, 1))).toBeNull(); // 31/12/2027 pas encore passé
    expect(reactivationDate(d(2020, 1, 1), d(2026, 12, 31))).toEqual(d(2027, 1, 1));
  });
});

describe('toDates', () => {
  it('convertit les timestamps UTC sans fuseau, sans toucher au JSON', () => {
    const r = toDates({ createdAt: '2026-09-28T00:00:00', data: { createdAt: 'x' }, items: [{ purchasedAt: null }] });
    expect(r.createdAt).toEqual(new Date('2026-09-28T00:00:00Z'));
    expect(r.data).toEqual({ createdAt: 'x' });
  });
});
