# Chantier 1 (sécurité) — suivis, 29 octobre 2026

Branche `chantier-1-securite`. Ce document liste ce qu'il faut faire avant la production, ce que
le propriétaire doit trancher, ce qui a été reporté et les limites connues. Aucun secret ici.

## 1. Avant la mise en production

Dans cet ordre : **la base d'abord, le code ensuite** (le code lit les nouvelles colonnes).

- [ ] **Appliquer le SQL ci-dessous sur la base de PRODUCTION**, avant de déployer. Dans la console Neon >
  branche production > éditeur SQL, tout coller **dans une seule transaction** (`BEGIN;` ... `COMMIT;`).
  Le SQL a été généré hors ligne (`prisma7 migrate diff` entre l'ancien `schema.prisma` du commit `924879a` et
  l'actuel, sans aucune base) ; il est **purement additif** (aucun `DROP`, colonnes nouvelles vides ou à défaut) :

  ```sql
  BEGIN;

  ALTER TABLE "User" ADD COLUMN     "authEmail" TEXT;

  ALTER TABLE "Event" ADD COLUMN     "hidePurchasesFromOwner" BOOLEAN NOT NULL DEFAULT true;

  CREATE TABLE "RateLimitHit" (
      "id" TEXT NOT NULL,
      "key" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id")
  );

  CREATE INDEX "RateLimitHit_key_createdAt_idx" ON "RateLimitHit"("key", "createdAt");

  CREATE UNIQUE INDEX "User_authEmail_key" ON "User"("authEmail");

  COMMIT;
  ```

  **Ne pas utiliser `db push` sur la production** (ni `--accept-data-loss`) : il applique TOUTE différence entre
  la base réelle et `schema.prisma`, pas seulement ces ajouts, et peut donc supprimer ou modifier des données.
  Ensuite, en local : `npm run contract:emit` si le contrat n'est pas déjà à jour.
- [ ] **Prévenir la famille avant le déploiement** : les listes existantes cachent désormais les achats à leur
  propriétaire par défaut (réglage « Cacher les achats au propriétaire » dans « Modifier la liste »).
- [ ] **Photos en `http://`** : exécuter sur la production
  `SELECT count(*) FROM "ShoppingItemPhoto" WHERE "imageUrl" NOT LIKE 'https://%';`. Une photo `http://` est
  bloquée par la CSP (`img-src`) et refusée à la réécriture ; corriger les lignes trouvées avant de déployer.
- [ ] **Définir `CLIENT_IP_HEADER`** chez l'hébergeur : nom d'un en-tête à valeur unique que l'hébergeur pose
  lui-même (`x-real-ip`, `cf-connecting-ip`…). Sans lui, la limite par IP est désactivée (voir README).
- [ ] **Neon Auth, branche production** (console Neon > projet Listing > branche production > Auth) :
  - Désactiver **« Verify at Sign-up »** (c'est `require_email_verification`, actuellement ON) : tant qu'il est
    ON, les comptes non vérifiés (anciens comptes `@listing.invalid`, nouveaux comptes) ne peuvent pas se connecter.
    **Ne pas le réactiver tant que le flux code n'est pas livré** (voir §4).
  - Ajouter l'origine de production de l'app comme **domaine de confiance** et désactiver **« Allow Localhost »**.
  - Configurer un **SMTP personnalisé** (Resend peut servir de SMTP) : l'expéditeur partagé de Neon est réservé
    au développement.
- [ ] Recommandé : définir `APP_ORIGIN` (origine fixe de l'app) pour le `redirectTo` du lien de réinitialisation
  (à implémenter, voir §4) ; HSTS est envoyé avec `includeSubDomains; max-age=2 ans` : agressif si le domaine
  héberge d'autres sous-domaines en http seul, à vérifier avant de déployer.
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
- Tests manquants : échec du dernier `signIn`, branche `newId === me.authId`, reset d'un ancien compte à email optionnel, clés `reset-ip`/`attach-ip` avec `CLIENT_IP_HEADER`, `Origin` absent, joker `_`/`%` à l'envers, `changePassword` qui lève sans trace du mot de passe dans les logs.
- Espaces autour d'un ancien `User.email` non rattrapés par `ILIKE` ; comptes bcrypt non migrés avec email : mail jamais reçu.
- Après l'échec du dernier `signIn` de `attachEmail`, l'interface se croit connectée jusqu'à la prochaine action.

## 4. Limites connues

- **Comptes Neon orphelins** si l'inscription réussit chez Neon et que la suite échoue : Neon ne permet pas de supprimer un compte (`/delete-user` répond 404 ; `auth.deleteUser()` ne fait rien). Une inscription interrompue laisse aussi une ligne `User` sans `authId` ni mot de passe : elle bloque le pseudo et l'email pendant 5 min, puis `registerUser` la récupère (les comptes bcrypt et reliés à Neon ne le sont jamais).
- **Un compte Neon inutilisable reste par ancien compte migré** (son mot de passe est changé en valeur aléatoire) ; un email squatté par un compte abandonné ne se libère pas.
- **Sessions non révoquées** après un mot de passe réinitialisé : les appareils déjà connectés restent connectés.
- **`getSession` de Neon** peut répondre depuis le cookie de session signé jusqu'à ~5 min (`sessionDataTtl`) après une révocation.
- **`resetPassword` sans limite de débit** : acceptable, le jeton est à forte entropie et à usage unique.
- **Pas de confirmation de l'email par code** pour l'instant : une faute de frappe rend le compte difficile à récupérer, et un tiers peut recevoir des liens de réinitialisation à une adresse qu'on lui aurait attribuée La double saisie de l'email limite les fautes.
  **Piège : « Verify at Sign-up » ne se réactive pas par un simple réglage.** Avec le code actuel, remettre
  `require_email_verification` sur ON bloquerait `authenticateUser` pour tous les comptes non vérifiés et casserait
  `registerUser` et `attachEmail` (l'inscription ne renvoie plus de session, la connexion de preuve échoue).
  Le réactiver demande d'abord de livrer le flux par code (OTP) et la gestion de `emailVerified`.
- **Écart de temps** à la demande de réinitialisation (adresse connue légèrement plus lente).
- **`redirectTo`** du lien de réinitialisation dérivé des en-têtes de la requête : définir `APP_ORIGIN` (à implémenter).
- **Tests avec emails réels non exécutés** : les tests appellent Neon Auth en version simulée ; le parcours complet avec de vrais emails (inscription, lien de réinitialisation, ajout d'email) n'a pas été rejoué de bout en bout, en attente de l'accord du propriétaire.
- **Écrans connectés non vérifiés dans un navigateur** avec un compte connecté (liste, administration, utilisateur) : vérification visuelle à faire.
- La CSP garde `style-src-attr 'unsafe-inline'` en production (attributs `style={{}}` de React), et toutes les routes sont rendues dynamiquement (nonce par requête).
- 26 avis `npm audit` restent ouverts (hors production réelle, voir la note d'audit).
