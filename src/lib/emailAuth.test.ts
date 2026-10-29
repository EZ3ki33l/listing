import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';

// Tests d'intégration : base Postgres jetable obligatoire (jamais la production), comme security.test.ts.
// Neon Auth est remplacé par un faux qui reproduit ce que la note de spike a observé : les appels du SDK serveur
// partent toujours avec le cookie de la requête d'origine (changePassword vise donc le compte de la session de départ),
// et le dernier appel qui pose un cookie de session décide du compte connecté à la fin.
const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/headers', () => ({ headers: vi.fn(), cookies: vi.fn() }));
vi.mock('./session', () => ({ getSessionUser: vi.fn() }));
vi.mock('./auth/server', () => ({
  auth: {
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn(),
    deleteUser: vi.fn(),
    changePassword: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

import { signInEmail } from './emailAuth';
import { validatePassword, validateEmail } from './validation';

const hex = (s: string) => Buffer.from(s.toLowerCase()).toString('hex');

describe('signInEmail', () => {
  it('adresse réelle si présente, sinon l\'ancienne adresse dérivée du pseudo', () => {
    expect(signInEmail({ username: 'Bob', authEmail: null, email: null })).toBe(`${hex('bob')}@listing.invalid`);
    expect(signInEmail({ username: 'Bob', authEmail: 'bob@exemple.fr', email: null })).toBe('bob@exemple.fr');
    // inscrits avant cette tâche avec l'email optionnel : leur compte Neon est déjà à cette adresse
    expect(signInEmail({ username: 'Bob', authEmail: null, email: 'bob@exemple.fr' })).toBe('bob@exemple.fr');
  });
});

describe('validatePassword / validateEmail', () => {
  it.each([['1234567'], [''], ['a'.repeat(129)], [12345678], [null]])('mot de passe refusé : %s', (p) => {
    expect(validatePassword(p)).toEqual(expect.any(String));
  });
  it('mot de passe accepté de 8 à 128 caractères', () => {
    expect(validatePassword('12345678')).toBeNull();
    expect(validatePassword('a'.repeat(128))).toBeNull();
  });
  it.each([
    [''], ['pas-un-email'], ['a@b'], ['a b@c.fr'], [`${hex('bob')}@listing.invalid`], ['x@y.INVALID'],
    [`${'a'.repeat(250)}@b.fr`], [42], [undefined],
  ])('email refusé : %s', (e) => {
    expect(validateEmail(e)).toEqual(expect.any(String));
  });
  it('email accepté', () => {
    expect(validateEmail('alice@exemple.fr')).toBeNull();
    expect(validateEmail('a.b+c@sous.domaine.com')).toBeNull();
  });
});

describe.skipIf(!TEST_DB)('email et mot de passe oublié (base réelle, Neon Auth simulé)', () => {
  type Acc = { id: string; password: string };
  type Me = { id: string; username: string; email: string | null; authEmail: string | null; authId: string | null; isAdmin: boolean };
  let db: typeof import('./db').db;
  let actions: typeof import('./actions');
  let rl: typeof import('./rateLimit');
  let auth: typeof import('./auth/server').auth;
  let getSessionUser: ReturnType<typeof vi.fn>;
  let headers: ReturnType<typeof vi.fn>;
  const tag = Math.random().toString(36).slice(2, 8);
  const keys = new Set<string>();

  // Faux Neon Auth
  let neon: Map<string, Acc>;
  let requestSession: string | null; // compte du cookie reçu avec la requête
  let cookie: string | null; // compte du dernier cookie de session posé dans la réponse
  let log: string[];

  const fn = (f: unknown) => vi.mocked(f as (...a: unknown[]) => unknown);
  const ok = (id: string) => { cookie = id; return { data: { user: { id } }, error: null }; };
  const ko = (code: string) => ({ data: null, error: { code, message: code } });

  const mkUser = async (o: { username: string; email?: string | null; authEmail?: string | null; authId?: string | null; password?: string | null }) => {
    const u = await db.orm.public.User.create({ email: null, authEmail: null, authId: null, password: null, ...o });
    keys.add(rateKey('login', u.username));
    return u;
  };
  const row = (id: string) => db.orm.public.User.where({ id }).first();
  const byName = (username: string) => db.orm.public.User.where({ username }).first();
  let rateKey: typeof import('./rateLimit').rateKey;

  beforeAll(async () => {
    ({ db } = await import('./db'));
    actions = await import('./actions');
    rl = await import('./rateLimit');
    rateKey = rl.rateKey;
    ({ auth } = await import('./auth/server'));
    getSessionUser = vi.mocked((await import('./session')).getSessionUser) as unknown as ReturnType<typeof vi.fn>;
    headers = vi.mocked((await import('next/headers')).headers) as unknown as ReturnType<typeof vi.fn>;
  });

  beforeEach(() => {
    delete process.env.CLIENT_IP_HEADER;
    headers.mockResolvedValue(new Headers({ origin: 'http://localhost:3000' }));
    neon = new Map();
    requestSession = null;
    cookie = null;
    log = [];
    fn(auth.signUp.email).mockImplementation(async (a) => {
      const { email, password } = a as { email: string; password: string };
      log.push(`signUp ${email}`);
      if (neon.has(email)) return ko('USER_ALREADY_EXISTS');
      const acc = { id: `neon-${email}`, password };
      neon.set(email, acc);
      return ok(acc.id);
    });
    fn(auth.signIn.email).mockImplementation(async (a) => {
      const { email, password } = a as { email: string; password: string };
      log.push(`signIn ${email}`);
      const acc = neon.get(email);
      return acc && acc.password === password ? ok(acc.id) : ko('INVALID_EMAIL_OR_PASSWORD');
    });
    fn(auth.changePassword).mockImplementation(async (a) => {
      const { currentPassword, newPassword, revokeOtherSessions } = a as { currentPassword: string; newPassword: string; revokeOtherSessions: boolean };
      log.push(`changePassword ${requestSession} revoke=${revokeOtherSessions}`);
      const acc = [...neon.values()].find((x) => x.id === requestSession);
      if (!acc || acc.password !== currentPassword) return ko('INVALID_PASSWORD');
      acc.password = newPassword;
      return ok(acc.id);
    });
    fn(auth.signOut).mockImplementation(async () => { log.push('signOut'); cookie = null; return { data: {}, error: null }; });
    fn(auth.deleteUser).mockImplementation(async () => { log.push('deleteUser'); return ko('NOT_FOUND'); });
    fn(auth.requestPasswordReset).mockImplementation(async (a) => { log.push(`requestPasswordReset ${JSON.stringify(a)}`); return { data: { status: true }, error: null }; });
    fn(auth.resetPassword).mockImplementation(async (a) => {
      log.push('resetPassword');
      return (a as { token: string }).token === 'bon-jeton' ? { data: { status: true }, error: null } : ko('INVALID_TOKEN');
    });
  });

  afterAll(async () => {
    for (const k of keys) await rl.clearHits(k);
    await db.orm.public.User.where((u) => u.username.like(`%${tag}`)).deleteAndCount();
    await db.close();
  });

  describe('ancien compte (Review Focus 2)', () => {
    it('authEmail et email nuls, hash bcrypt : la connexion marche et la migration utilise l\'adresse dérivée', async () => {
      const username = `Legacy${tag}`;
      const u = await mkUser({ username, password: bcrypt.hashSync('motdepasse1', 4) });
      const derived = `${hex(username)}@listing.invalid`;

      expect(await actions.authenticateUser(username, 'motdepasse1')).toMatchObject({ success: true, user: { id: u.id, email: null } });
      expect(log).toEqual([`signUp ${derived}`]);
      expect(await row(u.id)).toMatchObject({ authId: `neon-${derived}`, password: null, authEmail: null });

      log = [];
      expect(await actions.authenticateUser(username, 'motdepasse1')).toMatchObject({ success: true });
      expect(log).toEqual([`signIn ${derived}`]);
    });

    it('la réponse de connexion et getCurrentUser ne renvoient pas authEmail', async () => {
      const username = `NoLeak${tag}`;
      const u = await mkUser({ username, authEmail: `noleak${tag}@exemple.fr`, email: `noleak${tag}@exemple.fr`, authId: `neon-noleak${tag}` });
      neon.set(`noleak${tag}@exemple.fr`, { id: `neon-noleak${tag}`, password: 'motdepasse1' });
      const res = await actions.authenticateUser(username, 'motdepasse1');
      expect(res.success && res.user).not.toHaveProperty('authEmail');
      getSessionUser.mockResolvedValueOnce({ id: u.id, username, email: u.email, authEmail: u.authEmail, authId: u.authId, isAdmin: false });
      expect(await actions.getCurrentUser()).toEqual({ id: u.id, username, email: u.email, isAdmin: false });
    });
  });

  describe('attachEmail (nouveau compte Neon, ancien neutralisé)', () => {
    const setup = async (name: string) => {
      const username = `${name}${tag}`;
      const old = `${hex(username)}@listing.invalid`;
      neon.set(old, { id: `neon-old-${username}`, password: 'pw-actuel1' });
      const u = await mkUser({ username, authId: `neon-old-${username}` });
      keys.add(rateKey('attach', u.id));
      const me: Me = { id: u.id, username, email: null, authEmail: null, authId: `neon-old-${username}`, isAdmin: false };
      getSessionUser.mockResolvedValue(me);
      requestSession = `neon-old-${username}`;
      return { u, old, username };
    };

    it('crée le nouveau compte AVANT de neutraliser l\'ancien, et la session finale est le nouveau compte', async () => {
      const { u, old, username } = await setup('Attach');
      const email = `attach${tag}@exemple.fr`;

      expect(await actions.attachEmail(` Attach${tag}@Exemple.fr `, email, 'pw-actuel1')).toMatchObject({ success: true, email });

      expect(log).toEqual([
        `signIn ${old}`,
        `signUp ${email}`,
        `changePassword neon-old-${username} revoke=true`,
        `signIn ${email}`,
      ]);
      expect(neon.get(old)!.password).not.toBe('pw-actuel1'); // ancien compte inutilisable
      expect(neon.get(email)!.password).toBe('pw-actuel1'); // nouveau compte, même mot de passe
      expect(cookie).toBe(`neon-${email}`);
      const after = await row(u.id);
      expect(after).toMatchObject({ authId: `neon-${email}`, authEmail: email, email });
      expect(signInEmail(after!)).toBe(email);

      // reconnexion par pseudo : passe par la nouvelle adresse
      log = [];
      expect(await actions.authenticateUser(username, 'pw-actuel1')).toMatchObject({ success: true, user: { email } });
      expect(log).toEqual([`signIn ${email}`]);
    });

    it('si l\'inscription du nouveau compte échoue, l\'ancien compte reste intact', async () => {
      const { u, old } = await setup('AttachKo');
      const email = `pris${tag}@exemple.fr`;
      neon.set(email, { id: 'neon-quelquun', password: 'autre-mot' }); // adresse déjà chez Neon, autre mot de passe
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});

      const res = await actions.attachEmail(email, email, 'pw-actuel1');
      expect(res).toMatchObject({ success: false, error: 'Adresse email déjà utilisée' });
      expect(log.some((l) => l.startsWith('changePassword'))).toBe(false);
      expect(neon.get(old)!.password).toBe('pw-actuel1');
      expect(await row(u.id)).toMatchObject({ authId: `neon-old-${u.username}`, authEmail: null, email: null });
      expect(err).toHaveBeenCalledWith('Inscription Neon Auth refusée:', 'USER_ALREADY_EXISTS');
      err.mockRestore();
    });

    it('reprend un nouveau compte laissé par un essai interrompu (même mot de passe)', async () => {
      const { u } = await setup('AttachRetry');
      const email = `retry${tag}@exemple.fr`;
      neon.set(email, { id: 'neon-retry', password: 'pw-actuel1' });
      expect(await actions.attachEmail(email, email, 'pw-actuel1')).toMatchObject({ success: true });
      expect(await row(u.id)).toMatchObject({ authId: 'neon-retry', authEmail: email });
      expect(cookie).toBe('neon-retry');
    });

    it('si la base échoue après l\'inscription, l\'ancien compte reste utilisable et reconnecté', async () => {
      const { u, old } = await setup('AttachDb');
      const email = `attachdb${tag}@exemple.fr`;
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      const where = db.orm.public.User.where.bind(db.orm.public.User);
      const spy = vi.spyOn(db.orm.public.User, 'where').mockImplementation(((arg: unknown) => {
        const q = where(arg as never);
        if (arg && typeof arg === 'object' && 'id' in arg) return { ...(q as object), update: async () => { throw new Error('base indisponible'); } } as never;
        return q;
      }) as never);
      try {
        expect(await actions.attachEmail(email, email, 'pw-actuel1')).toMatchObject({ success: false });
      } finally {
        spy.mockRestore();
        err.mockRestore();
      }
      expect(log.some((l) => l.startsWith('changePassword'))).toBe(false);
      expect(neon.get(old)!.password).toBe('pw-actuel1');
      expect(cookie).toBe(`neon-old-${u.username}`);
      expect(await row(u.id)).toMatchObject({ authId: `neon-old-${u.username}`, authEmail: null });
    });

    it('si la neutralisation de l\'ancien compte échoue : succès quand même, journalisé, session sur le nouveau compte', async () => {
      const { u } = await setup('AttachNeutral');
      const email = `neutral${tag}@exemple.fr`;
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      fn(auth.changePassword).mockImplementationOnce(async () => { log.push('changePassword ko'); return ko('NETWORK'); });
      try {
        expect(await actions.attachEmail(email, email, 'pw-actuel1')).toEqual({ success: true, email });
        expect(err).toHaveBeenCalledWith(expect.stringContaining('non neutralisé'), 'NETWORK');
        expect(JSON.stringify(err.mock.calls)).not.toContain('pw-actuel1');
      } finally {
        err.mockRestore();
      }
      expect(cookie).toBe(`neon-${email}`);
      expect(await row(u.id)).toMatchObject({ authId: `neon-${email}`, authEmail: email });
    });

    it('mauvais mot de passe actuel : rien n\'est créé', async () => {
      await setup('AttachPw');
      const email = `pw${tag}@exemple.fr`;
      expect(await actions.attachEmail(email, email, 'faux')).toMatchObject({ success: false, error: 'Mot de passe incorrect' });
      expect(log.some((l) => l.startsWith('signUp'))).toBe(false);
    });

    it('adresse d\'un autre utilisateur, confirmation différente, sans session, trop d\'essais', async () => {
      const { u } = await setup('AttachMisc');
      const other = `other${tag}@exemple.fr`;
      await mkUser({ username: `Other${tag}`, email: other, authEmail: other });
      expect(await actions.attachEmail(other, other, 'pw-actuel1')).toEqual({ success: false, error: 'Adresse email déjà utilisée' });
      expect(await actions.attachEmail(`a${tag}@exemple.fr`, `b${tag}@exemple.fr`, 'pw-actuel1')).toMatchObject({ success: false, error: 'Les deux adresses email ne correspondent pas' });
      expect(log).toEqual([]);
      for (let i = 0; i < 4; i++) await rl.recordHit(rateKey('attach', u.id)); // 1 essai déjà compté (la confirmation différente est refusée avant)
      expect(await actions.attachEmail(other, other, 'pw-actuel1')).toEqual({ success: false, error: 'Trop de tentatives, réessayez dans 1 heure' });
      getSessionUser.mockResolvedValue(null);
      expect(await actions.attachEmail(other, other, 'pw-actuel1')).toMatchObject({ success: false, error: 'Vous devez être connecté' });
    });
  });

  describe('registerUser', () => {
    const reg = (name: string, email: unknown, confirm: unknown = email) => {
      keys.add(rateKey('register', `${name}${tag}`));
      return actions.registerUser(`${name}${tag}`, 'motdepasse1', email as string, confirm as string);
    };

    it('exige un email valide et confirmé', async () => {
      for (const e of [undefined, '', 'pas-un-email']) expect(await reg('RegNo', e)).toMatchObject({ success: false });
      expect(await reg('RegNo', `a${tag}@exemple.fr`, `b${tag}@exemple.fr`)).toMatchObject({ success: false, error: 'Les deux adresses email ne correspondent pas' });
      expect(log).toEqual([]);
      expect(await byName(`RegNo${tag}`)).toBeNull();
    });

    it('email ou pseudo déjà pris : même message générique', async () => {
      const taken = `taken${tag}@exemple.fr`;
      await mkUser({ username: `Taken${tag}`, email: taken, authEmail: taken });
      const msg = { success: false, error: 'Nom d\'utilisateur ou email déjà utilisé' };
      expect(await reg('RegTaken', taken)).toEqual(msg);
      expect(await reg('RegTaken', taken.toUpperCase())).toEqual(msg);
      expect(await reg('Taken', `libre${tag}@exemple.fr`)).toEqual(msg);
    });

    it('crée la ligne de l\'app avant le compte Neon, avec l\'adresse réelle, puis déconnecte', async () => {
      const email = `reg${tag}@exemple.fr`;
      let rowDuringSignUp: unknown;
      const signUp = fn(auth.signUp.email).getMockImplementation()!;
      fn(auth.signUp.email).mockImplementationOnce(async (a) => { rowDuringSignUp = await byName(`RegOk${tag}`); return signUp(a); });

      expect(await reg('RegOk', `REG${tag}@Exemple.fr`, email)).toMatchObject({ success: true, user: { username: `RegOk${tag}`, email } });
      expect(rowDuringSignUp).toMatchObject({ authId: null });
      expect(log).toEqual([`signUp ${email}`, 'signOut']);
      expect(await byName(`RegOk${tag}`)).toMatchObject({ email, authEmail: email, authId: `neon-${email}` });
    });

    it('échec de l\'inscription Neon : la ligne de l\'app est retirée, sans deleteUser', async () => {
      const email = `regko${tag}@exemple.fr`;
      neon.set(email, { id: 'neon-x', password: 'autre-mot' });
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(await reg('RegKo', email)).toMatchObject({ success: false, error: 'Nom d\'utilisateur ou email déjà utilisé' });
      expect(await byName(`RegKo${tag}`)).toBeNull();
      expect(log).not.toContain('deleteUser');
      err.mockRestore();
    });
  });

  describe('mot de passe oublié', () => {
    const SENT = { success: true, message: 'Si un compte existe, un email vient d\'être envoyé' };

    it('même réponse pour une adresse connue ou inconnue ; seul le compte connu déclenche l\'envoi', async () => {
      const known = `known${tag}@exemple.fr`;
      const unknown = `inconnu${tag}@exemple.fr`;
      keys.add(rateKey('reset', known)).add(rateKey('reset', unknown));
      await mkUser({ username: `Known${tag}`, email: known, authEmail: known, authId: 'neon-known' });

      expect(await actions.requestPasswordReset(unknown)).toEqual(SENT);
      expect(log).toEqual([]);
      expect(await actions.requestPasswordReset(` ${known.toUpperCase()} `)).toEqual(SENT);
      expect(log).toEqual([`requestPasswordReset ${JSON.stringify({ email: known, redirectTo: 'http://localhost:3000/reset-password' })}`]);
    });

    it('bloquée à la 4ᵉ demande pour la même adresse', async () => {
      const email = `limit${tag}@exemple.fr`;
      keys.add(rateKey('reset', email));
      for (let i = 0; i < 3; i++) expect(await actions.requestPasswordReset(email)).toEqual(SENT);
      expect(await actions.requestPasswordReset(email)).toEqual({ success: false, error: 'Trop de tentatives, réessayez dans 1 heure' });
    });

    it('resetPassword : valide le mot de passe, rejette un jeton invalide, déconnecte après succès', async () => {
      expect(await actions.resetPassword('bon-jeton', '1234567')).toMatchObject({ success: false });
      expect(log).toEqual([]);
      expect(await actions.resetPassword('mauvais', 'nouveau-mdp')).toMatchObject({ success: false, error: expect.stringContaining('Lien invalide') });
      log = [];
      expect(await actions.resetPassword('bon-jeton', 'nouveau-mdp')).toEqual({ success: true });
      expect(log).toEqual(['resetPassword', 'signOut']);
      expect(auth.resetPassword).toHaveBeenLastCalledWith({ token: 'bon-jeton', newPassword: 'nouveau-mdp' });
    });
  });
});
