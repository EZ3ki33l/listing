# Test Neon Auth : email, codes, réinitialisation (Tâche 7)

Date : 2026-10-29. Branche Neon de test `chantier-1-test` (br-gentle-lab-a22ezti8), jamais
la production. `@neondatabase/auth` 0.7.0-beta, Better Auth 1.7.6 côté serveur Neon.
Méthode : script Node jetable (hors dépôt) qui appelle en HTTP les endpoints Better Auth de
`NEON_AUTH_BASE_URL` avec `Origin: http://localhost:3000` et un pot de cookies, plus lecture
seule de `neon_auth.verification` / `neon_auth.project_config` par SQL sur la branche de test.
Seul destinataire réel : r.rousset31@gmail.com.

Configuration de la branche au moment du test (inchangée, aucune modification faite) :
`email_verification_method: otp`, `verify_email_on_sign_up: false`,
`require_email_verification: false`, `verify_email_on_sign_in: false`,
`auto_sign_in_after_verification: true`, fournisseur d'email partagé
(`auth@mail.myneon.app`), `allow_localhost: true`, aucun domaine de confiance.

## Résumé

| Point | Verdict |
|---|---|
| (a) changer l'email `…@listing.invalid` d'un compte vers une vraie adresse | **impossible** (désactivé chez Neon Auth) |
| (b) connexion avec la nouvelle adresse, échec avec l'ancienne | **sans objet** pour (a) ; **partiellement** via le contournement « nouveau compte » |
| (c) code de vérification à l'inscription / déclenché par l'app | **partiellement** : le code est créé, **l'email n'est pas envoyé** avec la config actuelle |
| (d) mot de passe oublié | **possible**, par lien **et** par code |
| (e) limites d'envoi | rien observé |

**Point de décision : (a) est impossible. On s'arrête avant la Tâche 8 et on revient vers
le propriétaire** (voir la dernière section).

## (a) Changement d'email d'un compte connecté — impossible

Compte de test créé comme l'app le fait aujourd'hui :
`POST /sign-up/email {email: "<hex du pseudo>@listing.invalid", name, password}` → 200,
`emailVerified: false`, cookie `__Secure-neon-auth.session_token`.

Avec ce cookie de session, toutes les voies de changement d'email sont refusées **avant
tout envoi** (aucun email parti) :

| Appel | Réponse |
|---|---|
| `POST /email-otp/request-email-change {newEmail}` | `400 {"message":"Change email with OTP is disabled"}` |
| `POST /change-email {newEmail, callbackURL}` | `400 {"code":"CHANGE_EMAIL_DISABLED"}` |
| `POST /update-user {email}` | `400 {"code":"EMAIL_CAN_NOT_BE_UPDATED"}` |
| `POST /admin/update-user {userId, data:{email}}` (session non admin) | `403 {"code":"YOU_ARE_NOT_ALLOWED_TO_UPDATE_USERS"}` |

- Les options Better Auth `emailOTP.changeEmail.enabled` et `user.changeEmail.enabled` sont
  fixées par Neon et **absentes** de la configuration de branche (ni `get_neon_auth_config`,
  ni `neon_auth.project_config.plugin_configs`, ni l'outil `update_auth_config`, qui ne
  permet que de renommer). La doc Neon le dit aussi : « Email address changes are not
  currently supported » (guide *User management*).
- Question « faut-il confirmer l'ancienne adresse ? » : dans Better Auth, l'option
  `changeEmail.verifyCurrentEmail` exigerait un code envoyé à l'**ancienne** adresse
  (`.invalid`, donc impossible). Sans objet ici puisque la fonction entière est désactivée.
- Le serveur SDK (`auth` de `createNeonAuth`) n'expose d'ailleurs ni
  `emailOtp.requestEmailChange` ni `emailOtp.changeEmail` (table `API_ENDPOINTS` de
  `dist/server-*.mjs`).
- Voie admin (`/admin/update-user`, qui accepte `email` et `emailVerified` pour un rôle
  `admin`) : **non vérifiée**. Donner le rôle `admin` à un compte de service de test
  (`update_auth_user_role`) a été refusé par les permissions de cette session ; le compte
  `spike-admin-631fe5` est resté `user`.

## (b) Connexion avec la nouvelle adresse

Sans changement d'email possible, testé sur le contournement « nouveau compte Neon Auth
avec le vrai email et le même mot de passe » (voir la décision) :

- `POST /sign-up/email {email: "r.rousset31@gmail.com", name: "spike-00197f", password: <même>}`
  → 200, nouvel utilisateur Neon Auth (autre `id`), `emailVerified: false`. Aucun email envoyé.
- `POST /sign-in/email` avec la vraie adresse et ce mot de passe → 200.
- `POST /sign-in/email` avec l'ancienne adresse `.invalid` → **200 aussi** : les deux comptes
  Neon Auth coexistent tant que l'ancien n'est pas supprimé (`auth.deleteUser()` avec la
  session de l'ancien, comme le fait déjà `registerUser` pour les orphelins).
- Mauvais mot de passe → `401 INVALID_EMAIL_OR_PASSWORD`.

## (c) Code de vérification — partiellement

- `POST /email-otp/send-verification-otp {email, type: "email-verification"}` (public, pas de
  session) → `200 {"success":true}` et une ligne
  `email-verification-otp-<email>` apparaît dans `neon_auth.verification`
  (expiration **5 minutes**). **Mais aucun email n'est arrivé** (2 essais, 20:55 et 21:05 UTC,
  boîte vérifiée jusqu'à 6 minutes après, spam compris), alors que les emails de
  réinitialisation envoyés entre-temps à la même adresse sont arrivés en une seconde.
- `POST /send-verification-email {email, callbackURL}` → `200 {"status":true}`, rien en base,
  rien reçu.
- Hypothèse (non vérifiable ici) : Neon n'envoie les codes `email-verification` que si
  **« Verify at Sign-up »** (`verify_email_on_sign_up`) est activé. Cette option n'est pas
  modifiable par les outils de cette session (`update_auth_config` ne prend que `name`) ;
  elle se règle dans la console (Auth → Configuration) ou par l'API
  `PATCH /projects/{id}/branches/{id}/auth/email_and_password`. À tester par le propriétaire
  sur la branche de test avec `verify_email_on_sign_up: true` **et**
  `require_email_verification: false` (la connexion reste permise avant confirmation, comme
  l'exige la spec).
- Vérification du code : `POST /email-otp/verify-email {email, otp}` ; mauvais code →
  `400 {"code":"INVALID_OTP"}` (le code reste valable, compteur d'essais incrémenté). Non
  testé avec un vrai code, faute d'email reçu.
- Savoir si l'email est confirmé : champ `user.emailVerified` (booléen) renvoyé par
  `sign-up`, `sign-in` et `GET /get-session` (côté app : `auth.getSession()`).
- Anti-énumération : pour une adresse inconnue, la réponse est identique (`200 success`),
  aucun envoi.

## (d) Mot de passe oublié — possible (lien et code)

Les deux emails arrivent depuis `auth@mail.myneon.app`, sujet « Reset Your Password -
Listing » (le nom de l'app vient du nom de la config Neon Auth, ici « Listing »), en anglais.

**Par lien** (méthodes exposées par le serveur SDK : `auth.requestPasswordReset`,
`auth.resetPassword`) :
1. `POST /request-password-reset {email, redirectTo: "http://localhost:3000/reinitialiser"}`
   → `200 {"status":true,"message":"If this email exists in our system, check your email for the reset link"}`.
2. Email reçu : « Click the link below… This link will expire in 1 hour » (la doc dit 15 min ;
   la base indique bien 1 h). Le lien passe par le suivi de clics SendGrid, puis
   `302 <NEON_AUTH_BASE_URL>/reset-password/<jeton>?callbackURL=http%3A%2F%2Flocalhost%3A3000%2Freinitialiser`,
   puis `302 http://localhost:3000/reinitialiser?token=<jeton>`.
3. `POST /reset-password {token, newPassword}` → `200 {"status":true}` ; second usage du
   même jeton → `400 INVALID_TOKEN`.
4. Connexion : ancien mot de passe → 401, nouveau → 200.

**Par code** (doc Neon « Reset Password with OTP ») :
1. `POST /email-otp/request-password-reset {email}` (alias `/forget-password/email-otp`)
   → `200 {"success":true}`.
2. Email reçu : code à **6 chiffres**, « This code will expire in 10 minutes » — mais la
   ligne `forget-password-otp-<email>` expire en **5 minutes** en base : se fier à 5 min.
3. Optionnel : `POST /email-otp/check-verification-otp {email, type:"forget-password", otp}`
   → `200 {"success":true}`.
4. `POST /email-otp/reset-password {email, otp, password}` → `200 {"success":true}`.
5. Connexion : ancien mot de passe → 401, nouveau → 200.

Points d'attention :
- **Le serveur SDK ne couvre pas le flux par code** : `auth.emailOtp.resetPassword` appelle
  `email-otp/passcode` → **404** (bug de 0.7.0-beta), et `request-password-reset` par code
  n'est pas exposé. Il faut un `fetch` direct vers `NEON_AUTH_BASE_URL` avec un en-tête
  `Origin` de confiance (pas de cookie nécessaire). Le flux par lien, lui, passe par le SDK.
- **Redirection** : `redirectTo` doit avoir la même origine qu'un domaine de confiance. Avec
  `allow_localhost: true`, seule l'origine localhost **de la requête** (`Origin`) est
  acceptée : `Origin: localhost:3000` + `redirectTo` `localhost:3000` → OK ;
  `redirectTo` `localhost:3111` → `403 INVALID_REDIRECT_URL` ; domaine externe → `403`.
  En production : `add_auth_trusted_domain` avec l'origine exacte de l'app
  (`https://…`, sans `/` final). Rien n'a été ajouté sur la branche de test (pas nécessaire).
- **Les sessions ouvertes ne sont pas révoquées** par la réinitialisation (la session
  d'avant restait valide sur `get-session`). Si on le souhaite, révoquer côté app.
- Anti-énumération : réponses identiques pour une adresse inconnue (lien comme code), pas
  d'envoi.

## (e) Limites et restrictions observées

- Aucune limite de débit déclenchée : 6 connexions ratées et 5 demandes de code en quelques
  secondes (adresse inconnue) → toutes acceptées, pas d'en-tête `X-RateLimit`/`Retry-After`.
  La protection côté app (Tâche « limitation ») reste nécessaire.
- L'expéditeur partagé envoie bien codes et liens de réinitialisation (via SendGrid, liens
  réécrits pour le suivi de clics). Délai d'arrivée ~1 s ; l'index de recherche Gmail a, lui,
  mis ~5 min.
- Les `+` et les points Gmail : non testés (une seule adresse utilisée).

## Décision pour la Tâche 8

**Blocage** : un compte existant ne peut pas changer son email Neon Auth
(`…@listing.invalid` → vraie adresse) : la fonction est désactivée par Neon et non
configurable. Conformément à la spec, **on s'arrête et le propriétaire choisit** parmi :

1. **Recréer le compte Neon Auth** (plus petite option, sans nouvelle dépendance, déjà le
   motif de la migration bcrypt de `loginUser`) : l'utilisateur connecté saisit son email
   **et son mot de passe** ; l'app vérifie le mot de passe (`signIn.email` sur l'ancienne
   adresse), crée `signUp.email({email: réel, name, password})`, envoie le code, et après
   `verify-email` réussi met `User.authId` (et l'email de connexion stocké) sur le nouvel
   utilisateur puis supprime l'ancien. (b) montre que les deux premières étapes marchent ;
   **reste bloqué par (c)** : l'envoi du code de vérification.
2. **Voie admin** : un compte de service `admin` (rôle donné dans la console) appelle
   `/admin/update-user {userId, data:{email}}` puis le code de vérification. Non vérifié ;
   un secret de compte de service à gérer en plus ; dépend aussi de (c).
3. Dernier recours : table de jetons maison + Resend (autre chantier, non construit).

Dans tous les cas, **(c) doit d'abord être débloqué** : activer « Verify at Sign-up »
(`verify_email_on_sign_up: true`, `require_email_verification: false`) sur la branche de
test et vérifier qu'un code `email-verification` arrive (à l'inscription et via
`send-verification-otp`). Si ça ne marche toujours pas, seule l'option 3 permet la
confirmation par code.

Flux recommandés une fois (c) débloqué :

- **Nouveau compte** : `auth.signUp.email({email, name: pseudo, password})` → (envoi auto si
  « Verify at Sign-up », sinon `auth.emailOtp.sendVerificationOtp({email, type:
  "email-verification"})`) → écran « code » → `auth.emailOtp.verifyEmail({email, otp})` →
  `emailVerified: true`. Connexion permise avant confirmation ; bandeau tant que
  `emailVerified` est faux. Code : 6 chiffres, 5 min, renvoi possible.
- **Ancien compte** : option 1 ci-dessus, à la connexion suivante (invitation), sans bloquer
  la connexion par pseudo tant que ce n'est pas fait.
- **Mot de passe oublié** (marche dès maintenant) : par code (cohérent avec la spec) en
  `fetch` direct `POST /email-otp/request-password-reset {email}` puis
  `POST /email-otp/reset-password {email, otp, password}` ; ou par lien avec le SDK
  `auth.requestPasswordReset({email, redirectTo: <origine de l'app>/reinitialiser})` puis
  `auth.resetPassword({token, newPassword})`. Déclarer l'origine de production comme domaine
  de confiance. Le mot de passe oublié suppose un vrai email confirmé : les comptes encore
  en `.invalid` ne peuvent pas l'utiliser.

## Traces laissées sur la branche de test

Aucune modification de configuration. Comptes Neon Auth de test (non supprimés) :

| Email | Nom | Pourquoi |
|---|---|---|
| `7370696b652d303031393766@listing.invalid` | spike-00197f | ancien compte type `.invalid`, essais de changement d'email |
| `7370696b652d61646d696e2d363331666535@listing.invalid` | spike-admin-631fe5 | tentative de voie admin (rôle resté `user`) |
| `r.rousset31@gmail.com` | spike-00197f | contournement « nouveau compte » et réinitialisations (non vérifié) |

## Suite (même jour, après activation annoncée de « Verify at sign-up »)

### 1. Configuration réellement en vigueur sur `chantier-1-test`

Relue avec `get_neon_auth_config` à 21:20 UTC : **rien n'a changé**.
`verify_email_on_sign_up: false`, `email_verification_method: otp`,
`require_email_verification: false`, `verify_email_on_sign_in: false`. La table
`neon_auth.project_config` de la branche confirme
(`sendVerificationEmailOnSignUp: false`, `updated_at` = 19:15 UTC, avant la création de la
branche). **Le réglage a probablement été fait sur une autre branche** (la branche par
défaut que la console affiche, c'est-à-dire la production ?) : à vérifier par le
propriétaire, et à défaire là-bas si ce n'était pas voulu.

### 2. Code de vérification à l'inscription — non testé (précondition absente)

Arrêté comme demandé : sans le réglage sur la branche, l'inscription n'envoie pas de code
(déjà observé plus haut), donc **aucun email envoyé** dans cette suite. À refaire une fois
`verify_email_on_sign_up: true` visible dans `get_neon_auth_config` de `chantier-1-test`.

Observation utile : le compte de test réinitialisé **par code** est passé à
`emailVerified: true`. Better Auth (`/email-otp/reset-password`) marque l'email confirmé
quand le code est bon : un code reçu prouve la possession de l'adresse.

### 3. Connexion avant confirmation — possible

`POST /sign-in/email` → 200 avec `emailVerified: false` (nouveau compte de test, et tous les
comptes `.invalid`). Avec `require_email_verification: false`, rien ne bloque.

### 4. Inscription avec une autre session ouverte, puis suppression

- Pot de cookies connecté en `spike-admin-631fe5` (ancien compte), puis
  `POST /sign-up/email {email, name, password}` dans le **même** pot → 200, `token` et
  nouveau `__Secure-neon-auth.session_token` : **le cookie est remplacé**, `get-session`
  renvoie ensuite l'`id` du **nouveau** compte. Dans l'app, après `auth.signUp.email`, la
  session courante est donc celle du nouvel utilisateur.
- **`POST /delete-user` répond `404`**, avec ou sans `{password}`, pour n'importe quel compte
  et une session toute neuve : la suppression de compte par l'utilisateur est **désactivée**
  chez Neon Auth (Better Auth renvoie 404 quand `user.deleteUser.enabled` est faux).
  Conséquence : **le nettoyage d'orphelin de `registerUser` (`auth.deleteUser()`) ne fait
  rien aujourd'hui** (l'erreur est ignorée). L'ancien compte ne peut pas être supprimé par
  l'app sans rôle admin (`/admin/remove-user`) ou l'API de la console Neon.
- **Neutraliser l'ancien compte, testé et suffisant** : nouveau pot, connexion à l'ancien
  compte, puis `POST /change-password {currentPassword, newPassword: <aléatoire jetable,
  jamais stocké>, revokeOtherSessions: true}` → 200. Ensuite connexion à l'ancien compte
  avec l'ancien mot de passe → `401` ; nouveau compte avec ce même mot de passe → `200`.
  Côté SDK serveur : `auth.changePassword({...})` (exposé par `createNeonAuth`). Attention :
  à faire **avant** `signUp` (qui remplace le cookie) ou dans un appel séparé connecté à
  l'ancien compte.

### 5. Même mot de passe pour le nouveau compte — possible

`POST /sign-up/email` avec le mot de passe en clair que l'utilisateur vient de taper (le même
que l'ancien compte), puis `POST /sign-in/email` avec ce mot de passe → 200. Rien d'autre à
transmettre : Better Auth hache de son côté.

### Flux recommandé pour la Tâche 8 (ancien compte)

1. L'utilisateur connecté saisit email + mot de passe actuel ; l'app vérifie le mot de passe
   (`auth.signIn.email` sur l'adresse de connexion stockée) puis **neutralise l'ancien
   compte** : `auth.changePassword({currentPassword, newPassword: aléatoire,
   revokeOtherSessions: true})`.
2. `auth.signUp.email({email: réel, name: pseudo, password})` (la session devient celle du
   nouveau compte) ; l'app met `User.authId` et l'adresse de connexion stockée sur le nouvel
   `id`. Si l'inscription échoue, rétablir l'ancien mot de passe
   (`auth.changePassword` en sens inverse), sinon le compte est perdu.
3. Envoi et saisie du code (`/email-otp/verify-email {email, otp}`) — **en attente du
   réglage sur la bonne branche** ; l'ancien utilisateur Neon reste en base, inutilisable
   (suppression : admin ou console, hors app).

Comptes de test ajoutés : `spike-new-9a43b8` (`…@listing.invalid`, inscription avec session
ouverte et même mot de passe). `spike-admin-631fe5` a maintenant un mot de passe aléatoire
inconnu (neutralisé). Le compte `r.rousset31@gmail.com` n'a pas pu être supprimé (404) et
reste sur la branche, ce qui bloque une nouvelle inscription de test avec cette adresse :
il faudra une adresse en `+` (après vérification qu'elle arrive) ou une suppression depuis la
console.
