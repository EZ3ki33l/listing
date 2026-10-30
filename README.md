# 🎉 Gestionnaire d'Événements Familial

Une application personnelle et familiale pour gérer vos événements spéciaux et vos listes d'achats avec des comptes à rebours personnalisés.

## ✨ Fonctionnalités

### 🎯 **Gestion des événements personnels**
- **4 types d'événements** avec designs uniques :
  - 🎂 **Anniversaires** (rose) - Célébrez les moments spéciaux
  - 🎄 **Noël** (rouge-vert) - La magie des fêtes de fin d'année
  - 💝 **Saint-Valentin** (rouge-rose) - L'amour est dans l'air
  - 💕 **Anniversaires de rencontre** (bleu-violet) - Célébrez vos relations

### ⏰ **Compte à rebours intelligent**
- Affichage permanent du compte à rebours sur la page d'accueil
- Calcul automatique des jours restants pour chaque événement
- Gestion intelligente des événements passés (calcule la prochaine occurrence)

### 📋 **Listes d'achats organisées**
- Liste spécifique pour chaque type d'événement
- Création automatique des listes lors de la création d'événements
- Filtrage par type d'événement et par catégorie
- Gestion des photos, descriptions et prix

### 🎨 **Interface personnalisée**
- Design moderne et responsive avec Tailwind CSS
- Couleurs et emojis spécifiques à chaque type d'événement
- Navigation intuitive entre les différentes sections

## 🚀 Installation

### Prérequis
- Node.js 20.9+ (requis par Next.js 16)
- PostgreSQL
- npm ou yarn

### Étapes d'installation

1. **Cloner le projet**
```bash
git clone <votre-repo>
cd listing
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Variables d'environnement**

Créer un fichier `.env.local` à la racine (ignoré par git ; Next le charge **avant** `.env`, donc ses valeurs l'emportent). Il n'y a pas de `.env.example`.

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/listing"   # base de l'application
NEON_AUTH_BASE_URL=url_auth_de_la_console_neon                      # console Neon > Auth
NEON_AUTH_COOKIE_SECRET=une_chaine_de_32_caracteres_minimum         # openssl rand -base64 32
CLIENT_IP_HEADER=x-real-ip                                          # voir ci-dessous (production)
TEST_DATABASE_URL="postgresql://..."                                # base JETABLE pour les tests, jamais la production
```

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Base PostgreSQL de l'application (Neon). |
| `NEON_AUTH_BASE_URL` | URL du service Neon Auth (console Neon). |
| `NEON_AUTH_COOKIE_SECRET` | Secret de 32 caractères minimum qui signe le cookie de session. |
| `TEST_DATABASE_URL` | Base de test pour les tests d'intégration (voir « Tests »). |
| `CLIENT_IP_HEADER` | **Nom de l'en-tête de requête dont l'HÉBERGEUR garantit qu'il contient la vraie IP du client.** |

**`CLIENT_IP_HEADER`** : préférer un en-tête à valeur unique posé par l'hébergeur (`x-real-ip`, `cf-connecting-ip`…). Ne pas utiliser `x-forwarded-for` derrière un proxy qui *ajoute* sa valeur : l'élément le plus à gauche est choisi par le client, donc falsifiable (contournement de la limite, ou blocage de l'IP d'un tiers). **Sans cette variable, la limite par IP est désactivée** ; seule la limite par pseudo (ou par adresse email) protège alors les comptes.

```bash
# Seulement après vous être inscrit sur le site : promouvoir le compte admin
# ADMIN_USERNAME n'est PAS dans .env.local : `npm run seed` ne lit que `.env` (donc la base de .env),
# le pseudo se donne sur la ligne de commande (ou via ADMIN_USERNAME dans .env)
ADMIN_USERNAME=pseudo npm run seed
```

4. **Initialiser la base de données**
```bash
# Le schéma reste dans prisma/schema.prisma (géré par la CLI Prisma 7 installée sous le nom prisma7)
npx prisma7 db push
# Puis régénérer le contrat lu par le client Prisma 8 (src/prisma/contract.*)
npm run contract:emit
# Cibler la base de .env.local (ex. base de test) : préfixer par `node --env-file=.env.local node_modules/.bin/prisma7 db push`
```

Le chantier sécurité a ajouté la table `RateLimitHit`, la colonne `Event.hidePurchasesFromOwner` (booléen, défaut `true`) et la colonne `User.authEmail`. Pour `authEmail`, Prisma affiche un avertissement générique sur la contrainte unique et demande `--accept-data-loss` : le SQL est pourtant **purement additif** (`ALTER TABLE "User" ADD COLUMN "authEmail" TEXT;` puis `CREATE UNIQUE INDEX "User_authEmail_key" ON "User"("authEmail");`, colonne vide partout). **En production, ne pas utiliser `db push`** : il applique toute différence entre la base réelle et `schema.prisma`, pas seulement ces ajouts ; le SQL exact à exécuter est dans `docs/superpowers/notes/2026-10-29-chantier-1-suivis.md` (§1).

5. **Lancer l'application**
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

## 🧪 Tests

```bash
# Avec TEST_DATABASE_URL défini dans .env.local
node --env-file=.env.local node_modules/vitest/vitest.mjs run
# ou directement
TEST_DATABASE_URL="postgresql://..." npm test
```

Sans `TEST_DATABASE_URL`, les tests d'intégration sont ignorés. **Ne jamais pointer les tests vers la production** : ils créent et suppriment des utilisateurs, des événements et des compteurs réels. Utiliser une base jetable (par exemple une branche Neon dédiée, appliquer le schéma avec `prisma7 db push` d'abord). Les appels à Neon Auth sont simulés dans les tests.

## 📱 Utilisation

### 🏠 **Page d'accueil**
- Compte à rebours principal de l'événement le plus proche
- 4 cadres d'événements avec accès direct aux listes spécifiques
- Navigation vers l'administration et toutes les listes

### ⚙️ **Administration** (`/admin`)
- **Événements personnels** : Créer vos 4 événements avec dates spécifiques
- **Gestion des événements** : Créer, modifier et gérer vos événements
- **Gestion des listes** : Suivre la progression de vos achats

### 📋 **Listes d'achats** (`/liste`)
- Vue d'ensemble de tous les articles
- Filtrage par type d'événement (`/liste?type=anniversaire`)
- Filtrage par catégorie
- Recherche d'articles
- Gestion du statut d'achat

## 🗄️ Structure de la base de données

### Modèles principaux
- **User** : pseudo unique, `authId` (compte Neon Auth), `email` (obligatoire à l'inscription), `authEmail` (adresse de connexion Neon Auth), `isAdmin`
- **Event** : événement avec type, nom, date cible, visibilité et réglage `hidePurchasesFromOwner` ; appartient à un propriétaire
- **EventShare** : partage d'un événement avec un autre utilisateur (`canEdit`)
- **ShoppingItem** : article de la liste d'un événement (description, prix, lien d'achat, état d'achat)
- **Category** : catégories d'articles (couleur, icône)
- **ShoppingItemPhoto** : photos d'un article
- **Notification** : notifications reçues par un utilisateur
- **RateLimitHit** : tentatives enregistrées pour la limitation de débit

## 🔒 Sécurité

- **Limitation de débit** (en base, `RateLimitHit`) sur la connexion, l'inscription, le partage, l'ajout d'email et le mot de passe oublié : par pseudo/adresse, et par IP si `CLIENT_IP_HEADER` est défini.
- **Validation côté serveur** de chaque action (types, formats, longueurs, URL `https` pour les images).
- **En-têtes de sécurité** : Content-Security-Policy avec nonce par requête (sans `unsafe-inline` ni `unsafe-eval` pour les scripts en production), HSTS, Referrer-Policy, X-Frame-Options, pas de `X-Powered-By`.
- **Masquage des achats** : par défaut, le propriétaire d'une liste ne voit pas qui a acheté quoi (réglage par liste) ; les personnes avec qui elle est partagée le voient.
- **Email obligatoire et mot de passe oublié** : lien de réinitialisation par email (Neon Auth), réponse identique que l'adresse existe ou non. Les anciens comptes peuvent ajouter un email sans perdre l'accès.
- Avant un déploiement, voir `docs/superpowers/notes/2026-10-29-chantier-1-suivis.md`.

## 🎨 Personnalisation

### Ajouter un nouveau type d'événement
1. Modifier `EVENT_TYPES` dans `src/app/page.tsx`
2. Ajouter la logique dans `getEventTypeInfo()` des composants
3. Mettre à jour les actions serveur si nécessaire

### Modifier les couleurs et emojis
- Éditer les propriétés `color` et `emoji` dans `EVENT_TYPES`
- Ajuster les classes Tailwind CSS selon vos préférences

## 🔧 Technologies utilisées

- **Frontend** : Next.js 16, React 19, TypeScript
- **Styling** : Tailwind CSS
- **Base de données** : PostgreSQL (Neon) avec Prisma ORM 8 (release candidate)
- **Authentification** : Neon Auth (`@neondatabase/auth`)
- **Tests** : Vitest
- **Icons** : Lucide React
- **Dates** : date-fns

## 🤝 Support

Cette application est conçue pour un usage familial et personnel. Elle vous permet de :
- Garder une trace de vos événements importants
- Organiser vos listes d'achats par occasion
- Avoir un compte à rebours visuel et motivant
- Gérer facilement vos préparatifs d'événements

---

**Développé avec ❤️ pour votre famille**
# listing
