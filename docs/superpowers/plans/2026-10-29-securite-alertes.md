# Chantier 1 : sécurité, alertes et mot de passe oublié — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fiabiliser Listing (limitation de débit, validation, en-têtes, dépendances), unifier les alertes, masquer les achats au propriétaire (réglage par liste) et ajouter email confirmé + mot de passe oublié.

**Architecture:** Fonctions pures et testables (`validation.ts`, `purchases.ts`, `csp.ts`) appelées par les actions serveur existantes de `src/lib/actions.ts` ; limitation de débit dans une table Postgres ; un fournisseur React unique (`Feedback`) pour toasts et confirmations ; Neon Auth garde l'envoi des emails (codes et réinitialisation).

**Tech Stack:** Next.js 16 (Turbopack, `proxy.ts`), React 19, Prisma 8 (`db.orm`), Neon Auth (`@neondatabase/auth` 0.7 bêta), Tailwind v4, Vitest.

**Spec:** [docs/superpowers/specs/2026-10-29-securite-alertes-design.md](../specs/2026-10-29-securite-alertes-design.md)

## Global Constraints

- Lire le guide Next concerné dans `node_modules/next/dist/docs/` avant de coder (`AGENTS.md`) ; CSP : `01-app/02-guides/content-security-policy.md`, fichier `proxy.ts`.
- Prisma 8 : après toute modification de `prisma/schema.prisma`, appliquer `DATABASE_URL=<branche> npx prisma7 db push` puis `npm run contract:emit`, et committer `src/prisma/contract.*`.
- Jamais la base de production : tout tourne sur la **branche Neon jetable** (Tâche 0) ; `.env` n'est pas modifié (la branche va dans `.env.local` et `TEST_DATABASE_URL`).
- Le dépôt git est à `/mnt/SSDMedias/Codes` : toujours `git add` avec des chemins sous `Listing/` (jamais `git add -A` à la racine). Messages de commit terminés par la ligne `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Pas de nouvelle dépendance (ni Redis, ni bibliothèque de schémas, ni bibliothèque de tests React). Interface et messages en français.
- Valeurs du spec : connexion 5 échecs/pseudo et 20/IP par 15 min ; types d'événement `anniversaire`, `noel`, `saint-valentin`, `anniversaire-rencontre`, `autre` ; photos en `https` uniquement ; masquage des achats actif par défaut, y compris listes existantes ; si Postgres échoue, le limiteur laisse passer et journalise ; limite par IP désactivée si `CLIENT_IP_HEADER` n'est pas défini ; mot de passe 8 caractères minimum (inchangé).
- Les tests d'intégration exigent `TEST_DATABASE_URL=<branche Neon>` ; `npm run lint`, `npx tsc --noEmit` et `npm test` doivent passer à la fin de chaque tâche.

## Review Focus

1. **Fuite par `updatedAt`** : même masqué, un article acheté change d'`updatedAt` ; le propriétaire ne doit pas pouvoir le deviner (Tâche 6).
2. **Ancien compte** (mot de passe bcrypt, email `…@listing.invalid`) : doit toujours pouvoir se connecter après les changements de schéma (Tâche 8).
3. **Clés de limitation** : « Alice », « alice » et « alice » avec espaces comptent pour le même pseudo ; un `x-forwarded-for` aléatoire ne contourne pas la limite par pseudo (Tâche 3).
4. **URL d'image ou d'achat piégées** : `javascript:`, `data:`, `http:`, URL avec identifiants, URL de plus de 2048 caractères, prix `NaN`/négatif/gigantesque, nom fait d'espaces, `hidePurchasesFromOwner` envoyé en chaîne (Tâche 2).
5. **CSP qui casse le site** : scripts Next, polices `next/font`, mode dev (`unsafe-eval`), images externes en `https` (Tâche 4).

---

### Task 0: Point de retour et branche Neon de test

**Files:**
- Modify: `.gitignore` (ajouter `.playwright-mcp/` si absent)
- Create: `.env.local` (ignoré par git, jamais committé)

**Interfaces:**
- Produces: une branche Neon jetable (URL de connexion, `NEON_AUTH_BASE_URL` de cette branche) utilisée par toutes les tâches ; l'état initial committé.

- [ ] **Step 1:** Vérifier que `.env`, `.env.local`, `tsconfig.tsbuildinfo` sont ignorés (`git check-ignore -v`) ; supprimer `.playwright-mcp/` s'il existe, arrêter un éventuel `next dev` sur le port 3111 (en citant son PID, pas `pkill` large).
- [ ] **Step 2:** Premier commit de l'état actuel : `git add -- .` depuis `Listing/`, vérifier avec `git status --short` qu'aucun `.env*` n'est indexé, puis `git commit -m "chore: état initial de Listing"`.
- [ ] **Step 3:** Créer la branche Neon (outil MCP `create_branch` sur le projet de l'app, parent = branche de production) ; récupérer son URL de connexion et la configuration Neon Auth de **cette branche** (`get_neon_auth_config`/`get_auth`, l'authentification est isolée par branche).
- [ ] **Step 4:** Écrire `.env.local` avec `DATABASE_URL`, `NEON_AUTH_BASE_URL` et `NEON_AUTH_COOKIE_SECRET` de la branche (Next charge `.env.local` avant `dotenv/config`, qui n'écrase pas les variables existantes).
- [ ] **Step 5:** Vérifier : `TEST_DATABASE_URL=<url branche> npx vitest run` → tous les tests passent, y compris le bloc « autorisations et achats (base réelle) » (non ignoré). Committer `.gitignore`.

---

### Task 1: Système d'alertes unifié et fond des modales

**Files:**
- Create: `src/components/Feedback.tsx` (fournisseur + hook), `src/components/Modal.tsx`, `src/lib/ui-guards.test.ts`
- Modify: `src/app/layout.tsx`, `NotificationToast.tsx`, `ConfirmModal.tsx`, `UserAuth.tsx`, `UserEvents.tsx` (modales de partage, création, modification), `src/app/page.tsx`, `src/app/liste/page.tsx`, `src/app/admin/page.tsx`, `DefaultCategoriesInitializer.tsx`, `UserNotifications.tsx`, tout fichier contenant `bg-opacity-`

**Interfaces:**
- Produces:
  - `useFeedback(): { notify(type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string): void; confirm(opts: { title: string; message: string; confirmText?: string; type?: 'danger' | 'warning' | 'info' }): Promise<boolean> }`
  - `<FeedbackProvider>` monté dans `layout.tsx` ; réutilise `NotificationToast` et `ConfirmModal` existants.
  - `<Modal open onClose labelledBy>{children}</Modal>` : fond `bg-black/50`, `role="dialog"`, `aria-modal`, fermeture par Échap et clic sur le fond, focus déplacé dans la modale à l'ouverture et rendu à l'élément précédent à la fermeture.

- [ ] **Step 1: Écrire le test de garde** `src/lib/ui-guards.test.ts` (Vitest, `fs` + parcours de `src/**/*.tsx`) avec trois assertions : aucune occurrence de `bg-opacity-`, de `confirm(` natif (regex `(?<![\w.])confirm\(`, hors `useFeedback`) ni de `.includes('✅')`. Le test énumère les fichiers fautifs dans son message d'échec.
- [ ] **Step 2:** `npx vitest run src/lib/ui-guards.test.ts` → échoue en listant les fichiers actuels.
- [ ] **Step 3:** Implémenter `Feedback.tsx` (un seul toast visible à la fois suffit ; la confirmation rend la promesse `true`/`false`) et `Modal.tsx` ; monter `FeedbackProvider` dans `layout.tsx`.
- [ ] **Step 4:** Rendre `NotificationToast` accessible : conteneur `role="status"` (`role="alert"` pour `error`), bouton de fermeture avec `aria-label="Fermer"`, icône d'avertissement distincte de celle d'erreur ; `ConfirmModal` s'appuie sur `Modal`.
- [ ] **Step 5:** Migrer tous les écrans : chaque `setMessage('✅ …')`/`'❌ …'` devient `notify('success'|'error', …)` ; chaque `confirm()` natif devient `await confirm({…})` ; les modales de `UserAuth` et de `UserEvents` utilisent `Modal`. Les échecs aujourd'hui silencieux notifient une erreur : suppression d'article et bascule d'achat dans `liste/page.tsx` (`result.success === false` et `catch`). Plus aucun `${error}` brut affiché : message générique en français, détail dans `console.error`. L'état `showThankYouModal` et le message d'erreur d'authentification du formulaire (inline) restent inchangés.
- [ ] **Step 6:** `npx vitest run src/lib/ui-guards.test.ts` → PASS ; `npm run lint` sans nouvel avertissement.
- [ ] **Step 7:** Vérifier à l'écran avec Playwright (`next dev -p 3111` sur la branche) : ouvrir la modale de connexion → fond translucide, Échap la ferme, un échec de connexion affiche l'erreur ; arrêter ensuite le serveur par son PID.
- [ ] **Step 8: Commit** `git add -- src docs && git commit -m "feat: système d'alertes unifié et modales accessibles"`

---

### Task 2: Validation côté serveur

**Files:**
- Create: `src/lib/validation.ts`, `src/lib/validation.test.ts`
- Modify: `src/lib/actions.ts` (`createEvent`, `updateEvent`, `createShoppingItem`, `createCategory`, `updateCategory`)

**Interfaces:**
- Produces (tous retournent un message d'erreur en français, ou `null` si valide) :
  - `EVENT_TYPES` (constante `as const`, valeurs du spec ; aligner sur le `<select>` de `UserEvents.tsx`)
  - `validateEventInput(d: { name: unknown; eventType: unknown; hasTargetDate?: unknown; targetDate?: unknown; isPrivate?: unknown; hidePurchasesFromOwner?: unknown }): string | null` : nom non vide après `trim`, ≤ 100 ; `eventType ∈ EVENT_TYPES` ; booléens strictement booléens ; date valide si présente.
  - `validateItemInput(d: CreateShoppingItemData): string | null` : nom ≤ 100 ; description ≤ 1000 ; prix fini, ≥ 0, ≤ 1 000 000 ; `purchaseUrl` en `http(s)` ; ≤ 10 photos, chaque `imageUrl` en **`https`**, ≤ 2048 caractères, sans identifiants (`user:pass@`) ; `altText` ≤ 200.
  - `validateCategoryInput(d: { name: unknown; color?: unknown; icon?: unknown }): string | null` : nom 1–50 ; couleur `/^#[0-9a-fA-F]{6}$/` ; icône ≤ 8 caractères.

- [ ] **Step 1: Écrire `validation.test.ts`** (Review Focus 4) : un cas valide par fonction ; rejets pour `eventType: 'x'`, nom `'   '`, nom de 101 caractères, `imageUrl` `javascript:alert(1)`, `data:image/png;base64,AA`, `http://a.fr/i.png`, `https://u:p@a.fr/i.png`, URL de 2049 caractères, 11 photos, prix `NaN`, `-1`, `1e12`, `purchaseUrl: 'ftp://a'`, `isPrivate: 'true'` (chaîne), couleur `'red'`.
- [ ] **Step 2:** `npx vitest run src/lib/validation.test.ts` → FAIL (module absent).
- [ ] **Step 3:** Implémenter `validation.ts` en TypeScript pur (`new URL(...)` pour les URL ; pas de dépendance).
- [ ] **Step 4:** Même commande → PASS.
- [ ] **Step 5:** Appeler les validateurs en tête des cinq actions, avant tout accès base (retour `{ success: false, error }`) ; supprimer les contrôles ad hoc devenus redondants dans `createShoppingItem`. Ajouter à `security.test.ts` un test d'intégration : `createShoppingItem` avec une photo `http://` est refusé et ne crée aucune ligne.
- [ ] **Step 6:** `TEST_DATABASE_URL=… npm test` → PASS. **Commit** `git add -- src && git commit -m "feat: validation serveur des entrées"`

---

### Task 3: Limitation de débit en base

**Files:**
- Modify: `prisma/schema.prisma` (modèle `RateLimitHit { id String @id @default(cuid()); key String; createdAt DateTime @default(now()); @@index([key, createdAt]) }`), `src/prisma/contract.*`, `src/lib/rateLimit.ts` (remplacé), `src/lib/actions.ts` (`authenticateUser`, `registerUser`, `shareEvent`), `src/lib/security.test.ts` (l'ancien test mémoire est remplacé)
- Create: `src/lib/rateLimit.test.ts` (tests d'intégration, `describe.skipIf(!TEST_DB)`)

**Interfaces:**
- Produces (module `rateLimit.ts`, toutes asynchrones, **échec ouvert** : toute erreur Postgres est journalisée et traitée comme « non limité » / sans effet) :
  - `rateKey(...parts: string[]): string` : normalise (`trim`, minuscules) et joint par `:`.
  - `getClientIp(): Promise<string | null>` : lit l'en-tête nommé par `process.env.CLIENT_IP_HEADER` via `headers()` ; `null` si la variable ou l'en-tête est absent.
  - `isLimited(key: string, max: number, windowMs?: number): Promise<boolean>` (défaut 15 min) : compte les lignes de `key` plus récentes que la fenêtre.
  - `recordHit(key: string): Promise<void>` : insère une ligne et supprime au passage celles de la même clé de plus de 24 h.
  - `clearHits(key: string): Promise<void>`
- Seuils : connexion `rateKey('login', pseudo)` 5 et `rateKey('login-ip', ip)` 20 par 15 min, échecs seulement, effacés après succès ; inscription `rateKey('register-ip', ip)` 10 par heure et `rateKey('register', pseudo)` 5 par heure, chaque tentative compte ; partage `rateKey('share', me.id)` 30 par heure, chaque tentative compte.

- [ ] **Step 1: Écrire `rateLimit.test.ts`** (Review Focus 3) : (a) 5 `recordHit` → `isLimited(k, 5)` vrai, une autre clé non ; (b) `isLimited(k, 5, 1)` après insertion d'une ligne plus ancienne que la fenêtre (insérer `createdAt` dans le passé) → faux ; (c) `rateKey('login', ' Alice ')` égale `rateKey('login', 'alice')` ; (d) `authenticateUser('Alice', 'mauvais')` appelé 6 fois avec des `x-forwarded-for` différents (mock de `headers`) → le 6ᵉ renvoie « Trop de tentatives » et `CLIENT_IP_HEADER` non défini ne bloque pas par IP ; (e) échec ouvert : avec `db` qui lève, `isLimited` renvoie faux sans exception ; (f) `registerUser` et `shareEvent` renvoient « Trop de tentatives » une fois la limite atteinte.
- [ ] **Step 2:** Modifier le schéma, `DATABASE_URL=<branche> npx prisma7 db push`, `npm run contract:emit`.
- [ ] **Step 3:** `TEST_DATABASE_URL=… npx vitest run src/lib/rateLimit.test.ts` → FAIL.
- [ ] **Step 4:** Réécrire `rateLimit.ts` avec les signatures ci-dessus ; brancher les trois actions (même message d'erreur que l'existant : « Trop de tentatives, réessayez dans 15 minutes », adapté en « dans 1 heure » pour les limites horaires).
- [ ] **Step 5:** Même commande + `npm test` → PASS. **Commit** `git add -- prisma src && git commit -m "feat: limitation de débit persistante en base"`

---

### Task 4: En-têtes de sécurité et CSP

**Files:**
- Create: `src/lib/csp.ts`, `src/lib/csp.test.ts`, `src/proxy.ts`
- Modify: `next.config.ts` (`poweredByHeader: false`, ajout de `Strict-Transport-Security: max-age=63072000; includeSubDomains` et `Referrer-Policy: strict-origin-when-cross-origin`), `src/app/layout.tsx` (rendu dynamique requis pour les nonces, selon le guide)

**Interfaces:**
- Produces: `buildCsp(nonce: string, isDev: boolean): string` avec au minimum `default-src 'self'`, `script-src 'self' 'nonce-<nonce>' 'strict-dynamic'` (+ `'unsafe-eval'` si `isDev`), `img-src 'self' data: https:`, `connect-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`. `proxy.ts` génère un nonce par requête et pose l'en-tête sur la réponse et sur la requête, comme dans le guide.

- [ ] **Step 1: Écrire `csp.test.ts`** (Review Focus 5) : `buildCsp('abc', false)` contient `'nonce-abc'`, `frame-ancestors 'none'`, `object-src 'none'`, ne contient ni `'unsafe-inline'` ni `'unsafe-eval'` dans `script-src` ; `buildCsp('abc', true)` contient `'unsafe-eval'`.
- [ ] **Step 2:** `npx vitest run src/lib/csp.test.ts` → FAIL ; implémenter `csp.ts` ; → PASS.
- [ ] **Step 3:** Créer `proxy.ts` (matcher excluant `_next/static`, `_next/image`, `favicon.ico`) ; si `style-src` avec nonce casse Tailwind, autoriser `'unsafe-inline'` pour `style-src` uniquement et le noter en commentaire `shortcut:`.
- [ ] **Step 4:** Vérifier : `curl -sI` sur `/` montre `Content-Security-Policy`, `Strict-Transport-Security`, `Referrer-Policy` et plus de `X-Powered-By` ; avec Playwright, charger `/`, ouvrir la modale de connexion et `/liste`, et vérifier qu'aucun message « Content Security Policy » n'apparaît dans la console (dev puis `npm run build && npm start`).
- [ ] **Step 5: Commit** `git add -- src next.config.ts && git commit -m "feat: CSP à nonce et en-têtes de sécurité"`

---

### Task 5: Tri des vulnérabilités npm

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `docs/security/npm-audit-2026-10-29.md`

- [ ] **Step 1:** `npm audit --omit=dev --json > <scratchpad>/audit.json` ; pour chaque vulnérabilité haute ou critique, noter le paquet, la chaîne de dépendance, et si le code atteint réellement le chemin vulnérable en production.
- [ ] **Step 2:** `npm audit fix` (sans `--force`) ; si un correctif exige `--force` ou une montée majeure (Prisma, Neon Auth, Next), **ne pas l'appliquer** : le décrire et poser la question au propriétaire avec des choix cliquables.
- [ ] **Step 3:** Écrire `docs/security/npm-audit-2026-10-29.md` : tableau corrigé / risque accepté (avec la raison) / à décider.
- [ ] **Step 4:** Vérifier : `npm run build`, `npx tsc --noEmit`, `npm run lint`, `TEST_DATABASE_URL=… npm test` → verts ; relancer `npm audit --omit=dev` et reporter le nouveau total dans le document. **Commit** `git add -- package.json package-lock.json docs && git commit -m "chore: correction des vulnérabilités atteignables"`

---

### Task 6: Masquage des achats au propriétaire (réglage par liste)

**Files:**
- Modify: `prisma/schema.prisma` (`Event.hidePurchasesFromOwner Boolean @default(true)`), `src/prisma/contract.*`, `src/lib/actions.ts` (`getEvent`, `getUserEvents`, `getAllActiveEvents`, `updateItemStatus`, `createEvent`, `updateEvent`), `src/components/UserEvents.tsx` (case à cocher dans les modales de création et de modification), `src/app/liste/page.tsx`
- Create: `src/lib/purchases.ts`, `src/lib/purchases.test.ts`
- Test: `src/lib/security.test.ts`

**Interfaces:**
- Consumes: `validateEventInput` (Tâche 2), qui contrôle `hidePurchasesFromOwner`.
- Produces :
  - `purchasesHidden(event: { ownerId: string; hidePurchasesFromOwner: boolean }, userId: string): boolean` : vrai si `userId` est le propriétaire et le masquage actif.
  - `maskItems<I extends { isPurchased: boolean; purchasedBy: string | null; purchasedAt: unknown; updatedAt: unknown }>(items: I[], createdAt?: unknown): I[]` : renvoie les articles avec `isPurchased: false`, `purchasedBy: null`, `purchasedAt: null` et `updatedAt` remplacé par leur `createdAt` (Review Focus 1).
  - Les événements renvoyés par les trois lectures portent `purchasesHidden: boolean` pour l'interface.

- [ ] **Step 1: Écrire `purchases.test.ts`** (unitaire) : propriétaire + masquage → articles neutralisés, `updatedAt === createdAt` ; propriétaire + masquage désactivé → inchangés ; autre utilisateur → inchangés.
- [ ] **Step 2:** Ajouter à `security.test.ts` (intégration, avec Alice propriétaire, Bob partagé sans droit d'édition, Carol partagée avec `canEdit`) : après achat par Bob, `getEvent`, `getUserEvents` et `getAllActiveEvents` côté Alice ne montrent ni `isPurchased`, ni `purchasedBy`, ni `purchasedAt`, et `updatedAt` égal à `createdAt` ; côté Bob et Carol ils les montrent ; après `updateEvent(..., { hidePurchasesFromOwner: false })`, Alice les voit ; avec masquage actif, `updateItemStatus` par Alice (acheter ou annuler) est refusé avec « Vous ne pouvez pas marquer vos propres articles comme achetés ».
- [ ] **Step 3:** Lancer les deux fichiers → FAIL.
- [ ] **Step 4:** Modifier le schéma, `db push`, `contract:emit` ; implémenter `purchases.ts` ; appliquer `maskItems` dans les trois lectures (événements possédés uniquement) et le refus dans `updateItemStatus` ; accepter et enregistrer `hidePurchasesFromOwner` dans `createEvent`/`updateEvent` (défaut `true`).
- [ ] **Step 5:** Interface : case « Cacher les achats au propriétaire (garde la surprise) » cochée par défaut dans les modales de création et de modification ; dans `liste/page.tsx`, ne pas afficher le bouton d'achat ni la ligne « Acheté par » quand `purchasesHidden` est vrai.
- [ ] **Step 6:** `TEST_DATABASE_URL=… npm test` → PASS. **Commit** `git add -- prisma src && git commit -m "feat: achats masqués au propriétaire, réglage par liste"`

---

### Task 7: Vérification de faisabilité Neon Auth (point de décision)

**Files:**
- Create: `docs/superpowers/notes/2026-10-29-neon-auth-email-spike.md`

**Interfaces:**
- Produces: la note de spike, qui fixe les appels exacts du SDK utilisés par la Tâche 8 (noms des méthodes, paramètres, délai et format du code, `redirectTo` de réinitialisation, domaines de confiance).

- [ ] **Step 1:** Dans un script jetable (dossier scratchpad, jamais committé) exécuté sur la **branche** Neon, créer un compte de test avec une adresse `@listing.invalid`, puis vérifier avec le SDK `auth` de `src/lib/auth/server.ts` : (a) changement d'email d'un compte connecté vers une vraie adresse avec confirmation par code (`changeEmailEmailOTP` / flux OTP du SDK) ; (b) connexion avec la nouvelle adresse, échec avec l'ancienne ; (c) envoi du code de vérification à l'inscription ; (d) `requestPasswordReset` puis `resetPassword`, y compris le domaine de redirection à déclarer comme domaine de confiance (`add_auth_trusted_domain`). Demander au propriétaire une boîte email de test avec des choix cliquables avant tout envoi.
- [ ] **Step 2:** Écrire la note : pour chacun des points (a)–(d), « possible » ou « impossible », l'appel exact et ce qui a été observé.
- [ ] **Step 3: Point de décision.** Si (a) ou (d) est impossible : **s'arrêter** et demander au propriétaire, avec des choix cliquables, s'il veut la solution de repli (table de jetons maison + envoi par Resend, hors périmètre actuel) ; ne pas poursuivre la Tâche 8. Sinon, committer la note : `git add -- docs && git commit -m "docs: résultats du test Neon Auth (email, codes, réinitialisation)"`.

---

### Task 8: Email obligatoire confirmé et mot de passe oublié

**Files:**
- Modify: `prisma/schema.prisma` (`User.authEmail String? @unique`, `User.emailVerified Boolean @default(false)`), `src/prisma/contract.*`, `src/lib/actions.ts` (`registerUser`, `authenticateUser`, `getSessionUser` consommateurs), `src/lib/session.ts` (ajouter `emailVerified` au `select`), `src/components/UserAuth.tsx`, `src/components/UserMenu.tsx`, `src/app/page.tsx`
- Create: `src/components/EmailConfirmModal.tsx`, `src/app/reset-password/page.tsx`, `src/lib/emailAuth.test.ts`

**Interfaces:**
- Consumes: la note de spike (Tâche 7) pour les appels SDK ; `rateKey`, `isLimited`, `recordHit`, `getClientIp` (Tâche 3) ; `useFeedback` (Tâche 1) ; `validatePassword` ci-dessous.
- Produces :
  - `signInEmail(user: { username: string; authEmail: string | null; email: string | null }): string` : `user.authEmail ?? ` ancien dérivé du pseudo (`<hex>@listing.invalid`) ; remplace `authEmail()` pour la connexion et la migration paresseuse bcrypt ; ne dépend plus de `User.email`.
  - `validatePassword(p: unknown): string | null` (≥ 8 caractères, ≤ 128) et `validateEmail(e: unknown): string | null` dans `validation.ts`.
  - Actions : `requestEmailCode(email: string)`, `confirmEmailCode(email: string, code: string)` (les deux exigent une session ; la confirmation met `User.authEmail`, `User.email`, `emailVerified = true` ensemble et refuse une adresse déjà prise avec un message générique), `requestPasswordReset(email: string)` (réponse toujours identique « Si un compte existe, un email vient d'être envoyé », limitée par `rateKey('reset', email)` 3/heure et `rateKey('reset-ip', ip)` 10/heure), `resetPassword(token: string, newPassword: string)`.
  - Page `/reset-password?token=…` : saisie du nouveau mot de passe, appel de `resetPassword`, puis retour à la connexion.

- [ ] **Step 1: Écrire `emailAuth.test.ts`** (Review Focus 2, `describe.skipIf(!TEST_DB)`, `auth` mocké) : (a) ancien compte avec `authEmail: null`, `email: null`, `password` bcrypt → `authenticateUser` se connecte et la migration paresseuse utilise `<hex>@listing.invalid` ; (b) après `confirmEmailCode`, un compte garde la possibilité de se connecter : `signInEmail` renvoie la nouvelle adresse ; (c) `requestPasswordReset` renvoie exactement la même réponse pour une adresse inconnue et une adresse connue, et se bloque à la 4ᵉ demande ; (d) `registerUser` sans email ou avec `'pas-un-email'` est refusé ; email déjà utilisé : message générique identique à celui du pseudo déjà pris ; (e) `validatePassword('1234567')` refusé.
- [ ] **Step 2:** Lancer le fichier → FAIL.
- [ ] **Step 3:** Schéma + `db push` + `contract:emit` ; script `prisma/backfill-auth-email.mjs` (idempotent) qui laisse `authEmail` à `null` pour les anciens comptes (la valeur dérivée sert de repli) et met `emailVerified = false` partout ; implémenter `signInEmail`, validations et actions selon la note de spike.
- [ ] **Step 4:** Inscription : champ email obligatoire dans `UserAuth`, envoi du code à l'inscription ; message de succès via `notify`. Connexion : lien « Mot de passe oublié ? » ouvrant le formulaire de demande. Après connexion, si `emailVerified` est faux, ouvrir `EmailConfirmModal` (saisie de l'adresse si absente, saisie du code, renvoi du code) ; l'utilisateur peut fermer la modale et continuer, elle revient à la connexion suivante (choix : pas de blocage tant que l'email n'est pas confirmé, pour ne verrouiller personne dehors). Ajouter `emailVerified` aux données stockées par `UserMenu`/`page.tsx`.
- [ ] **Step 5:** Tests → PASS. Vérifier de bout en bout avec Playwright et la boîte de test du propriétaire : inscription, code reçu, confirmation, déconnexion, « Mot de passe oublié ? », lien reçu, nouveau mot de passe, connexion ; puis ancien compte : connexion, ajout d'un email, code, reconnexion avec la nouvelle adresse.
- [ ] **Step 6: Commit** `git add -- prisma src && git commit -m "feat: email confirmé par code et mot de passe oublié"`

---

### Task 9: Vérification finale et documentation

**Files:**
- Modify: `README.md` (variables `CLIENT_IP_HEADER`, `.env.local`, commande `prisma7 db push` pour les nouvelles tables ; corriger la mention de Next 15)

- [ ] **Step 1:** `npm run lint`, `npx tsc --noEmit`, `TEST_DATABASE_URL=… npm test`, `npm run build` → tous verts.
- [ ] **Step 2:** Rejouer chaque critère de réussite du spec (section « Critères de réussite ») avec une commande ou une capture : script de 10 tentatives de connexion avec `x-forwarded-for` aléatoires bloqué ; `curl -sI` des en-têtes ; `grep -rn "confirm(" src` vide ; lectures du propriétaire sans état d'achat.
- [ ] **Step 3:** Mettre à jour le README, puis **Commit** `git add -- README.md && git commit -m "docs: variables d'environnement et schéma du chantier 1"`.
- [ ] **Step 4:** Rappeler au propriétaire, avant tout déploiement : appliquer `prisma7 db push` sur la base de production avant le code, définir `CLIENT_IP_HEADER` selon l'hébergeur, configurer un SMTP personnalisé dans Neon Auth.
