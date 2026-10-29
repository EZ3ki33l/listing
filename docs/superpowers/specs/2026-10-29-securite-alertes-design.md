# Chantier 1 : sécurité, alertes et mot de passe oublié

Premier des quatre chantiers de modernisation de Listing (les suivants, brainstormés
un par un : partage et recherche de profils, création d'article par IA, refonte visuelle).

## Intention

Listing est utilisée par une famille et des amis proches ; l'inscription reste libre.
L'application tient des données privées (listes de cadeaux, relations entre personnes)
et ses garde-fous sont inégaux : les autorisations des actions serveur sont bonnes,
mais la limitation de tentatives est contournable, la validation des entrées est
partielle, les en-têtes de sécurité sont incomplets, les retours d'action à l'utilisateur
sont incohérents, et un compte sans email réel ne peut pas retrouver son mot de passe.
Ce chantier pose les fondations dont le partage et l'IA dépendront (limitation de débit,
validation, système d'alertes).

## Objectifs

1. **Limitation de débit fiable** sur connexion, inscription, partage et demande de
   réinitialisation de mot de passe, valable sur plusieurs instances serverless.
2. **Validation côté serveur** de tous les champs envoyés aux actions de
   `src/lib/actions.ts`.
3. **En-têtes de sécurité complets** : CSP, HSTS, Referrer-Policy, suppression de
   `X-Powered-By`.
4. **Dépendances** : trier les 27 vulnérabilités de `npm audit --omit=dev` et corriger
   celles qui touchent réellement la production.
5. **Un seul système d'alertes** : toasts et confirmations unifiés, accessibles, utilisés
   par toutes les pages, qui remplacent les `confirm()` natifs et les messages texte à
   emoji. Le fond des modales redevient translucide (Tailwind v4 a supprimé
   `bg-opacity-*`, utilisé 15 fois : le fond est aujourd'hui noir opaque).
6. **Surprise préservée, réglable par liste** : un réglage « cacher les achats au
   propriétaire » (nouveau champ sur `Event`) décide si le propriétaire voit l'état
   d'achat (`isPurchased`, `purchasedBy`, `purchasedAt`) de ses articles. Quand il est
   actif, le filtrage se fait côté serveur, pas seulement à l'écran, dans **les trois
   lectures** qui renvoient des articles (`getEvent`, `getUserEvents`,
   `getAllActiveEvents`) ; le propriétaire ne peut alors pas non plus marquer ses propres
   articles comme achetés. Les personnes avec qui la liste est partagée voient toujours
   tout, y compris celles qui ont le droit d'édition. Le propriétaire règle l'option à la
   création et dans la modification de la liste. Cas d'usage : une liste créée pour
   quelqu'un d'autre (organisateur) désactive le masquage pour suivre les achats.
7. **Mot de passe oublié par email**, avec email obligatoire et **confirmé par un code**
   (voir ci-dessous).

## Hors périmètre

- Recherche de profils, liens d'invitation, retrait de partage par le propriétaire
  (chantier 2). Les messages d'erreur du partage qui révèlent l'existence d'un pseudo
  sont traités dans ce chantier-là, avec la recherche.
- Création d'article par IA (chantier 3).
- Refonte visuelle, passage aux Server Components, découpage des gros fichiers
  (chantier 4). On touche à une page ici seulement pour y brancher les alertes ou la
  validation.
- Authentification à deux facteurs, connexion sociale, modération.
- Modification d'un article, suppression d'un événement (absents aujourd'hui, non demandés).

## Anti-objectifs (ce qui rendrait le chantier raté)

- Une régression d'autorisation : aujourd'hui un lecteur ne peut ni supprimer ni créer
  d'article, et un inconnu n'accède à rien. Les tests de `src/lib/security.test.ts` doivent
  continuer à passer et être étendus.
- Verrouiller les vrais utilisateurs dehors (limites trop basses, compte bloqué à vie,
  mot de passe oublié inopérant pour les anciens comptes).
- Ajouter un service payant ou une dépendance lourde pour un besoin que Postgres ou Next
  couvrent déjà.

## Contraintes

- Next.js 16 avec des changements cassants : lire le guide concerné dans
  `node_modules/next/dist/docs/` avant d'écrire du code (consigne de `AGENTS.md`),
  notamment pour les en-têtes, la CSP et les Server Actions.
- Prisma 8 (client `db.orm`), schéma dans `prisma/schema.prisma`, régénérer le contrat
  avec `npm run contract:emit` après toute modification (voir README).
- Authentification : Neon Auth (`src/lib/auth/server.ts`). L'identité applicative est le
  pseudo ; Neon Auth identifie par email, dérivé du pseudo (`…@listing.invalid`) quand
  l'utilisateur n'en a pas fourni.
- Tout le développement et les tests tournent sur une **branche Neon jetable**, jamais sur
  la base de production (`.env` pointe aujourd'hui vers la vraie base).
- Le dépôt git est à la racine `/mnt/SSDMedias/Codes`, partagée avec d'autres projets :
  les commits ne concernent que `Listing/`.
- Interface en français.

## Décisions prises avec le propriétaire du projet

- **Public** : famille et amis proches, inscription libre (pas d'invitation obligatoire).
- **Surprise** : le propriétaire ne voit pas par défaut qui a acheté quoi sur sa liste,
  mais le propriétaire d'une liste créée pour quelqu'un d'autre peut désactiver le
  masquage : le propriétaire n'est pas toujours la personne qui reçoit les cadeaux.
- **Email obligatoire** à l'inscription, **confirmé par un code reçu par email**. Les
  comptes existants sans email réel doivent en renseigner un et le confirmer
  (invitation à la connexion suivante) ; tant qu'ils ne l'ont pas fait, ils peuvent
  continuer à se connecter normalement.
- **Envoi des emails** (codes de confirmation et réinitialisation) : par Neon Auth. Les
  codes et la réinitialisation fonctionnent avec son expéditeur partagé ; les liens de
  vérification exigent un SMTP personnalisé, d'où le choix de codes. Resend (en SMTP) n'est
  utilisé que si Neon Auth ne suffit pas.
- **Hébergement** : l'application n'est pas encore en production. Hébergeur et SMTP
  personnalisé se décideront au déploiement ; ce chantier doit rester neutre sur ce point.
- **Garde-fous** : un premier commit de l'état actuel de `Listing/` sert de point de
  retour avant tout changement.

## Choix faits par moi (à vérifier à la lecture)

- Limitation de débit stockée dans **Postgres** (table dédiée, fenêtre glissante), sans
  Redis ni nouvelle dépendance. Remplace `src/lib/rateLimit.ts`.
- L'hébergeur n'étant pas choisi, la lecture de l'IP passe par **une seule fonction**
  qui lit l'en-tête nommé par une variable d'environnement (`CLIENT_IP_HEADER`) ; sans
  cette variable, la limite par IP est désactivée plutôt que fondée sur un en-tête
  falsifiable. La limite par pseudo/email est toujours active : c'est elle qui protège
  réellement un compte. À brancher sur l'en-tête de l'hébergeur au déploiement.
- **Si Postgres échoue**, le limiteur laisse passer et journalise l'erreur (si la base est
  hors service, l'application l'est déjà).
- **Mise en production du schéma** (table de limitation, champ de masquage des achats) :
  `npx prisma7 db push` puis `npx prisma contract emit`, comme décrit dans le README ;
  la modification est purement additive et s'applique avant le déploiement du code.
- **Identifiant de connexion Neon Auth stable** : il ne doit plus être dérivé de
  `User.email`, modifiable. Sans cela, ajouter un vrai email à un ancien compte
  (`…@listing.invalid` côté Neon Auth) l'empêcherait de se connecter. Le changement d'email
  chez Neon Auth (puis confirmation par code) se vérifie en premier : le SDK expose la
  demande et l'exécution de réinitialisation, pas encore confirmé pour le changement
  d'email d'un compte existant. **Si c'est impossible, on s'arrête et on revient vers le
  propriétaire du projet** (l'alternative, une table de jetons maison, est un autre chantier).
- **Réglage par liste** : le masquage est actif par défaut, y compris pour les listes
  existantes (protège les surprises) ; le propriétaire peut le désactiver.
- Validation écrite à la main (fonctions courtes par action) plutôt que d'ajouter une
  bibliothèque de schémas ; à reconsidérer si le chantier IA multiplie les formulaires.
- Les valeurs de `eventType` acceptées sont celles de l'application
  (`anniversaire`, `noel`, `saint-valentin`, `anniversaire-rencontre`, `autre`).
- Les photos d'article : schéma `https` uniquement, longueur et nombre limités ; les
  images restent chargées depuis des sites externes dans ce chantier (leur
  téléchargement vers un stockage propre relève du chantier IA).
- Les alertes : un fournisseur de toasts monté dans `layout.tsx` + une confirmation
  réutilisable, en s'appuyant sur `NotificationToast` et `ConfirmModal` existants.

## Ce qui est laissé à la personne qui construit

- Seuils précis de limitation (mon point de départ : 5 échecs par pseudo et 20 par IP sur
  15 minutes pour la connexion, comme aujourd'hui ; des valeurs plus larges pour le
  reste), longueurs maximales des champs, contenu exact de la CSP.
- Le tri des vulnérabilités npm : quelles mises à jour, lesquelles sont acceptables
  (versions bêta de Prisma et Neon Auth comprises) et lesquelles sont documentées comme
  risque accepté.
- Format exact des messages et des animations d'alerte, tant qu'ils sont cohérents,
  accessibles (`role`, annonce aux lecteurs d'écran, Échap, focus) et en français.
- Détail de la migration des comptes sans email et de l'écran « ajoutez votre email ».

## Critères de réussite

- Un script de tentatives répétées sur la connexion, l'inscription et la demande de
  réinitialisation se fait bloquer, y compris avec un `x-forwarded-for` falsifié.
- Aucune action serveur n'accepte un champ hors format (type d'événement inconnu, URL
  d'image non `https`, textes démesurés).
- Les réponses du site portent CSP, HSTS et Referrer-Policy ; l'application fonctionne
  toujours avec la CSP (polices, images, scripts Next).
- Plus aucun `confirm()` ni message à emoji pour décider de la couleur ; le même
  composant d'alerte sert sur toutes les pages, y compris pour les échecs aujourd'hui
  silencieux (suppression d'article).
- Quand le masquage est actif, `getEvent`, `getUserEvents` et `getAllActiveEvents` ne
  renvoient plus aucun état d'achat au propriétaire ; une personne partagée le reçoit
  toujours, et le propriétaire l'obtient si le masquage est désactivé. Des tests le
  vérifient pour les trois lectures.
- Un utilisateur peut confirmer son email par code, demander un lien de réinitialisation,
  le recevoir, choisir un nouveau mot de passe et se connecter avec. Un ancien compte
  (sans email réel) peut ajouter et confirmer un email sans perdre l'accès.
- `npm run lint`, `npx tsc --noEmit` et `npm test` (avec une base de test) passent.

## Ordre de travail conseillé

0. Premier commit de `Listing/`, branche Neon de test, vérifier que les tests
   d'intégration tournent dessus.
1. Système d'alertes (utile à tout le reste) et correction du fond des modales.
2. Validation côté serveur, puis limitation de débit en base.
3. En-têtes de sécurité et tri des dépendances.
4. Masquage de l'état d'achat pour le propriétaire (réglage par liste).
5. Vérification de faisabilité chez Neon Auth (changement d'email d'un ancien compte, code
   de confirmation, réinitialisation) **avant** de construire l'écran ; puis email
   obligatoire, confirmation par code et mot de passe oublié.
