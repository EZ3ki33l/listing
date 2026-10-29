# Chantier 1 (sécurité) — suivis, 29 octobre 2026

Branche `chantier-1-securite`. Ce document liste ce qu'il faut faire avant la production, ce que
le propriétaire doit trancher, ce qui a été reporté et les limites connues. Aucun secret ici.

## 1. Avant la mise en production

Dans cet ordre : **la base d'abord, le code ensuite** (le code lit les nouvelles colonnes).

- [ ] **Appliquer les 3 changements de schéma sur la base de PRODUCTION**, avant de déployer :
  - `User.authEmail` (SQL vérifié, purement additif, colonne vide partout) :
    `ALTER TABLE "User" ADD COLUMN "authEmail" TEXT;`
    `CREATE UNIQUE INDEX "User_authEmail_key" ON "User"("authEmail");`
  - `Event.hidePurchasesFromOwner` : colonne booléenne `NOT NULL DEFAULT true`.
  - Table `RateLimitHit` (`id`, `key`, `createdAt`, index sur `key, createdAt`).
  - Pour les deux derniers, le SQL exact n'a pas été relevé : utiliser `prisma7 db push` (additif, sans perte)
    sur la production, puis `npm run contract:emit`. Prisma affichera un avertissement générique sur la
    contrainte unique de `authEmail` et demandera `--accept-data-loss` : à tort, voir les deux lignes ci-dessus.
- [ ] **Définir `CLIENT_IP_HEADER`** chez l'hébergeur : nom d'un en-tête à valeur unique que l'hébergeur pose
  lui-même (`x-real-ip`, `cf-connecting-ip`…). Sans lui, la limite par IP est désactivée (voir README).
- [ ] **Neon Auth, branche production** (console Neon > projet Listing > branche production > Auth) :
  - Désactiver **« Verify at Sign-up »** (c'est `require_email_verification`, actuellement ON) : tant qu'il est
    ON, les comptes non vérifiés (anciens comptes `@listing.invalid`, nouveaux comptes) ne peuvent pas se connecter.
  - Ajouter l'origine de production de l'app comme **domaine de confiance** et désactiver **« Allow Localhost »**.
  - Configurer un **SMTP personnalisé** (Resend peut servir de SMTP) : l'expéditeur partagé de Neon est réservé
    au développement.
- [ ] Vérifier `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` et `DATABASE_URL` côté hébergeur.
- [ ] Le `next dev` local du propriétaire lit maintenant `.env.local` (branche Neon de **test**) : un redémarrage
  l'utilise à la place de la production. Normal, mais à savoir ; la production n'a pas encore les nouvelles tables.
- [ ] Après déploiement : tester sur la production inscription, mot de passe oublié (vrai email) et ajout d'email
  sur un ancien compte.

## 2. Décisions du propriétaire à prendre

Détails dans `docs/security/npm-audit-2026-10-29.md`.

- **Vitest 3 → 5** (outil de test, aucun effet en production) : corrige 2 critiques et 1 modérée de l'audit.
  Montée majeure : relancer toute la suite. Oui ou non ?
- **`better-auth` / `zod` : forcer des versions plus récentes (`overrides`) ou attendre une version de
  `@neondatabase/auth` ?** Les avis ne sont pas atteignables aujourd'hui (pas d'OAuth ni de lien magique, serveur
  d'authentification chez Neon). Les `overrides` ne sont pas testés sur une bêta ; attendre est plus sûr.
  À reconsidérer si on ajoute OAuth ou les liens magiques.

## 3. Points reportés (relecture, jugés mineurs)

**Tâche 1 — alertes**
- Le test de garde ne détecte que `.includes('✅')` entre guillemets simples (pas `"…"`, `startsWith`, `❌`) et seulement les `.tsx`.
- `NotificationToast` : `setTimeout(onClose, 300)` sans nettoyage (course si `notify()` arrive dans les 300 ms).
- Toast monté avec son contenu (`role=status` parfois non annoncé) et hors de la modale `aria-modal`.
- `confirm()` de `Feedback.tsx` jamais résolu si le provider se démonte (inoffensif, layout racine).
- `Modal.tsx` restaure `body.style.overflow` par modale (fermeture non LIFO).

**Tâche 2 — validation**
- `purchaseUrl` : `http:foo` / `https:/x` acceptés, pas de plafond de longueur ni de contrôle d'identifiants ; l'URL est stockée brute, sans `trim` (reprise prévue en Tâche 8, seulement partiellement faite).
- Longueurs mesurées avant `trim` ; icône comptée en UTF-16.
- Les validateurs s'exécutent avant les contrôles d'authentification (option : authentifier d'abord).
- Trous de tests : types non-string sur articles/catégories, `HTTPS://` en majuscules, câblage `createEvent`/`updateEvent`/`createCategory`/`updateCategory`, test `if (d.purchaseUrl)` qui saute `0`/`false`.

**Tâche 3 — limitation de débit**
- `getClientIp` prend l'élément le plus à gauche de l'en-tête configuré (falsifiable avec `x-forwarded-for` derrière un proxy qui ajoute) : documenté dans le README, ajouter un commentaire dans le code.
- `rateKey` : plafond de 128 caractères par partie ajouté depuis (Tâche 8) ; la table `RateLimitHit` n'est jamais purgée globalement (seulement les clés touchées).
- Enfermement par pseudo connu (compromis voulu) ; `rateKey` en minuscules alors que la recherche d'utilisateur est sensible à la casse.
- Trous de tests : succès efface la clé pseudo mais pas la clé IP, `shareEvent` sans session non compté, test (d) n'atteint pas `headers()`, test (e) ne couvre pas l'échec de `create`.
- `getClientIp` hors `try/catch` ; `console.error` peut contenir la clé ; `const HOUR` placée entre `NO_AUTH` et `FORBIDDEN` ; « 15 minutes » écrit en dur.

**Tâche 4 — en-têtes**
- `csp.test.ts` n'asserte pas `strict-dynamic`, `default-src`, `connect-src`, `base-uri`, `form-action`, `style-src-attr`, et aucun test de `proxy()` (nonce distinct, CSP sur requête et réponse).
- Commentaire dev `'unsafe-inline'` sans étiquette `shortcut:` ; `x-nonce` posé mais jamais lu ; commentaire `csp.ts:8` trop long.
- `next/image` sans `remotePatterns` (images non optimisées, non touché).

**Tâche 5 — dépendances**
- Note d'audit : l'exemple `overrides` vise `better-auth` 1.7.14, préférer 1.7.7 (première version corrigée, pins alignés) ; « version exacte épinglée » inexact (`^0.7.0-beta`) ; la section « Comment relancer » mélange `--omit=dev` et `audit fix` sans l'expliquer ; phrase `zod` trop affirmative ; vitest 4.1.x (palier plus petit) non étudié ; deux copies de `zod` coexistent en production (inoffensif).

**Tâche 6 — masquage des achats**
- Tests manquants : `purchasedAt` avec masquage désactivé, Carol `canEdit` capable d'acheter, propriétaire d'un événement partagé par un autre (test unitaire seulement).
- `purchasesHidden` calculé 2 fois dans `getUserEvents` ; le drapeau brut est aussi renvoyé pour les événements partagés (non sensible).
- Le test d'ordre attend l'ordre de création, pas la règle `(createdAt, id)` : flakiness théorique si deux insertions tombent dans la même milliseconde (non observée). Commentaire flottant `actions.ts:44`.

**Tâche 8 — email et mot de passe oublié**
- Oracle de temps sur `requestPasswordReset` (adresse connue plus lente ; l'inscription révèle déjà l'existence) : envisager `after()`.
- `redirectTo` dérivé des en-têtes `Origin`/`Host` : préférer une variable `APP_ORIGIN` fixe en production, repli sur les en-têtes en dev ; `https://null` si `Host` absent.
- `attachEmail` utilisable par tout compte connecté (changement d'email non vérifié, chaque appel grille l'ancienne adresse chez Neon) ; oracle « adresse déjà utilisée » avant la vérification du mot de passe.
- Tout échec de `neonSignUp` s'affiche « déjà utilisé » ; pas d'écran pour corriger un email mal saisi à l'inscription ; `/reset-password` sans jeton n'affiche l'erreur qu'à la soumission.
- Doublon `registerUser` / `hitLimit` / migration paresseuse ; `actions.ts` fait ~960 lignes.
- Tests manquants : échec du dernier `signIn`, branche `newId === me.authId`, reset d'un ancien compte à email optionnel, clés `reset-ip`/`attach-ip` avec `CLIENT_IP_HEADER`, échec de la mise à jour `authId` dans `registerUser`, `Origin` absent, joker `_`/`%` à l'envers, `changePassword` qui lève sans trace du mot de passe dans les logs.
- Espaces autour d'un ancien `User.email` non rattrapés par `ILIKE` ; comptes bcrypt non migrés avec email : mail jamais reçu.
- Après l'échec du dernier `signIn` de `attachEmail`, l'interface se croit connectée jusqu'à la prochaine action.

## 4. Limites connues

- **Comptes Neon orphelins** si l'inscription réussit chez Neon et que la suite échoue : Neon ne permet pas de supprimer un compte (`/delete-user` répond 404 ; `auth.deleteUser()` ne fait rien).
- **Un compte Neon inutilisable reste par ancien compte migré** (son mot de passe est changé en valeur aléatoire) ; un email squatté par un compte abandonné ne se libère pas.
- **Sessions non révoquées** après un mot de passe réinitialisé : les appareils déjà connectés restent connectés.
- **Pas de confirmation de l'email par code** pour l'instant : une faute de frappe rend le compte difficile à récupérer, et un tiers peut recevoir des liens de réinitialisation à une adresse qu'on lui aurait attribuée (réglage Neon « Verify at Sign-up » à activer plus tard, voir plus haut). La double saisie de l'email limite les fautes.
- **Écart de temps** à la demande de réinitialisation (adresse connue légèrement plus lente).
- **`redirectTo`** du lien de réinitialisation dérivé des en-têtes de la requête : définir `APP_ORIGIN` (à implémenter).
- **Tests avec emails réels non exécutés** : les tests appellent Neon Auth en version simulée ; le parcours complet avec de vrais emails (inscription, lien de réinitialisation, ajout d'email) n'a pas été rejoué de bout en bout, en attente de l'accord du propriétaire.
- **Écrans connectés non vérifiés dans un navigateur** avec un compte connecté (liste, administration, utilisateur) : vérification visuelle à faire.
- La CSP garde `style-src-attr 'unsafe-inline'` en production (attributs `style={{}}` de React), et toutes les routes sont rendues dynamiquement (nonce par requête).
- 26 avis `npm audit` restent ouverts (hors production réelle, voir la note d'audit).
