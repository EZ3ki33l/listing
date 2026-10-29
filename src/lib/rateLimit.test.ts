import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';

// Tests d'intégration : base Postgres jetable obligatoire (jamais la production), comme security.test.ts.
const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/headers', () => ({ headers: vi.fn(), cookies: vi.fn() }));
vi.mock('./session', () => ({ getSessionUser: vi.fn() }));
vi.mock('./auth/server', () => ({ auth: { signIn: { email: vi.fn() } } }));

import { rateKey } from './rateLimit';

describe('rateKey', () => {
  it('normalise (trim, minuscules) et joint par « : »', () => {
    expect(rateKey('login', ' Alice ')).toBe(rateKey('login', 'alice'));
    expect(rateKey('login', ' Alice ')).toBe('login:alice');
  });
});

describe.skipIf(!TEST_DB)('limitation de débit (base réelle)', () => {
  let db: typeof import('./db').db;
  let rl: typeof import('./rateLimit');
  let actions: typeof import('./actions');
  let headers: ReturnType<typeof vi.fn>;
  let getSessionUser: ReturnType<typeof vi.fn>;
  let signIn: ReturnType<typeof vi.fn>;
  const userIds: string[] = [];
  const tag = Math.random().toString(36).slice(2, 8);
  const keys = new Set<string>();
  const key = (n: string) => { const k = rateKey('test', n, tag); keys.add(k); return k; };
  const count = async (k: string) => (await db.orm.public.RateLimitHit.where({ key: k }).all()).length;

  beforeAll(async () => {
    ({ db } = await import('./db'));
    rl = await import('./rateLimit');
    actions = await import('./actions');
    headers = vi.mocked((await import('next/headers')).headers) as unknown as ReturnType<typeof vi.fn>;
    signIn = vi.mocked((await import('./auth/server')).auth.signIn.email) as unknown as ReturnType<typeof vi.fn>;
    getSessionUser = vi.mocked((await import('./session')).getSessionUser) as unknown as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    for (const k of keys) await rl.clearHits(k);
    for (const id of userIds) await db.orm.public.User.where({ id }).delete();
    await db.close();
  });

  it('(a) bloque après le maximum, sans toucher les autres clés', async () => {
    const k = key('a');
    for (let i = 0; i < 5; i++) await rl.recordHit(k);
    expect(await rl.isLimited(k, 5)).toBe(true);
    expect(await rl.isLimited(k, 6)).toBe(false);
    expect(await rl.isLimited(key('a-autre'), 5)).toBe(false);
    await rl.clearHits(k);
    expect(await rl.isLimited(k, 5)).toBe(false);
  });

  it('(b) ignore les lignes plus anciennes que la fenêtre et purge celles de plus de 24 h', async () => {
    const k = key('b');
    const old = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    await db.orm.public.RateLimitHit.create({ key: k, createdAt: old });
    expect(await rl.isLimited(k, 1, 60 * 1000)).toBe(false); // plus vieille que 1 min
    expect(await rl.isLimited(k, 1, 5 * 60 * 1000)).toBe(true); // dans 5 min
    await db.orm.public.RateLimitHit.create({ key: k, createdAt: new Date(Date.now() - 25 * 3600 * 1000).toISOString() });
    await rl.recordHit(k);
    expect(await count(k)).toBe(2); // la ligne de 25 h a disparu
  });

  it('(d) 6 échecs de connexion = bloqué, quelle que soit l\'IP annoncée', async () => {
    delete process.env.CLIENT_IP_HEADER;
    const name = `Alice${tag}`;
    keys.add(rateKey('login', name));
    let n = 0;
    headers.mockImplementation(async () => new Headers({ 'x-forwarded-for': `10.0.0.${++n}` }));
    for (let i = 0; i < 5; i++) {
      expect(await actions.authenticateUser(name, 'mauvais')).toMatchObject({ error: 'Nom d\'utilisateur ou mot de passe incorrect' });
    }
    expect(await actions.authenticateUser(name, 'mauvais')).toEqual({ success: false, error: 'Trop de tentatives, réessayez dans 15 minutes' });
    expect(await count(rateKey('login-ip', '10.0.0.1'))).toBe(0); // sans CLIENT_IP_HEADER, aucune limite par IP
  });

  it('(d) avec CLIENT_IP_HEADER, la limite par IP s\'applique', async () => {
    vi.stubEnv('CLIENT_IP_HEADER', 'x-real-ip');
    const ipKey = rateKey('login-ip', `203.0.113.${tag}`);
    keys.add(ipKey);
    headers.mockResolvedValue(new Headers({ 'x-real-ip': `203.0.113.${tag}`, 'x-forwarded-for': '1.1.1.1' }));
    expect(await rl.getClientIp()).toBe(`203.0.113.${tag}`);
    for (let i = 0; i < 20; i++) await rl.recordHit(ipKey);
    expect(await actions.authenticateUser(`Bob${tag}`, 'x')).toMatchObject({ error: expect.stringContaining('Trop de tentatives') });
  });

  it('(e) échec ouvert : une base qui lève ne bloque personne et ne lève pas', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(db.orm.public.RateLimitHit, 'where').mockImplementation(() => { throw new Error('base indisponible'); });
    await expect(rl.isLimited(key('e'), 1)).resolves.toBe(false);
    await expect(rl.recordHit(key('e'))).resolves.toBeUndefined();
    await expect(rl.clearHits(key('e'))).resolves.toBeUndefined();
    expect(err).toHaveBeenCalledTimes(3);
  });

  it('(f) inscription et partage renvoient « Trop de tentatives » à la limite', async () => {
    delete process.env.CLIENT_IP_HEADER;
    vi.spyOn(console, 'error').mockImplementation(() => {}); // le mock d'auth fait échouer l'inscription après le limiteur
    headers.mockResolvedValue(new Headers());
    const name = `Reg${tag}`;
    keys.add(rateKey('register', name));
    for (let i = 0; i < 5; i++) {
      expect(await actions.registerUser(name, 'motdepasse')).not.toMatchObject({ error: expect.stringContaining('Trop de tentatives') });
    }
    expect(await actions.registerUser(name, 'motdepasse')).toEqual({ success: false, error: 'Trop de tentatives, réessayez dans 1 heure' });

    const me = { id: `share-${tag}`, username: 'x', email: null, isAdmin: false };
    getSessionUser.mockResolvedValue(me);
    const shareKey = rateKey('share', me.id);
    keys.add(shareKey);
    for (let i = 0; i < 30; i++) await rl.recordHit(shareKey);
    expect(await actions.shareEvent('inconnu', 'quelquun')).toEqual({ success: false, error: 'Trop de tentatives, réessayez dans 1 heure' });
  });

  describe('connexion : la tentative est comptée avant le travail lent', () => {
    const mkUser = async (name: string) => {
      const username = `${name}${tag}`;
      const u = await db.orm.public.User.create({ username, authId: `auth-${username}` });
      userIds.push(u.id);
      keys.add(rateKey('login', username));
      return username;
    };
    const userCount = (username: string) => count(rateKey('login', username));

    it('une tentative en vol est déjà comptée, et le succès efface la clé du pseudo', async () => {
      delete process.env.CLIENT_IP_HEADER;
      headers.mockResolvedValue(new Headers());
      const username = await mkUser('inflight');
      let release!: (v: unknown) => void;
      let entered!: () => void;
      const hasEntered = new Promise<void>((r) => (entered = r));
      signIn.mockImplementationOnce(() => { entered(); return new Promise((r) => (release = r)); });
      const pending = actions.authenticateUser(username, 'bon');
      await hasEntered;
      expect(await userCount(username)).toBe(1);
      release({ data: { user: { id: 'x' } }, error: null });
      expect(await pending).toMatchObject({ success: true });
      expect(await userCount(username)).toBe(0);
    });

    it('un succès n\'efface pas la clé IP', async () => {
      vi.stubEnv('CLIENT_IP_HEADER', 'x-real-ip');
      const ip = `198.51.100.${tag}`;
      const ipKey = rateKey('login-ip', ip);
      keys.add(ipKey);
      headers.mockResolvedValue(new Headers({ 'x-real-ip': ip }));
      const username = await mkUser('ipkeep');
      await rl.recordHit(ipKey);
      signIn.mockResolvedValueOnce({ data: { user: { id: 'x' } }, error: null });
      expect(await actions.authenticateUser(username, 'bon')).toMatchObject({ success: true });
      expect(await count(ipKey)).toBe(1);
    });

    it('un échec compte exactement une fois pour le pseudo', async () => {
      delete process.env.CLIENT_IP_HEADER;
      headers.mockResolvedValue(new Headers());
      const username = await mkUser('fail');
      signIn.mockResolvedValueOnce({ data: null, error: { message: 'non' } });
      expect(await actions.authenticateUser(username, 'mauvais')).toMatchObject({ success: false });
      expect(await userCount(username)).toBe(1);
    });
  });
});
