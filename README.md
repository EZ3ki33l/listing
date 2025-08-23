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
- Node.js 18+ 
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

3. **Configuration de la base de données**
```bash
# Créer un fichier .env à la racine
cp .env.example .env

# Configurer vos variables d'environnement
NEXT_PUBLIC_ADMIN_USERNAME=votre_username
NEXT_PUBLIC_ADMIN_PASSWORD=votre_password
DATABASE_URL="postgresql://user:password@localhost:5432/listing"
```

4. **Initialiser la base de données**
```bash
npx prisma generate
npx prisma db push
```

5. **Lancer l'application**
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

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
- **Event** : Événements avec type, nom, date cible
- **ShoppingList** : Listes d'achats liées aux événements
- **ShoppingItem** : Articles avec photos, descriptions, prix
- **Category** : Catégories d'articles
- **EventAdmin** : Administrateurs des événements

## 🎨 Personnalisation

### Ajouter un nouveau type d'événement
1. Modifier `EVENT_TYPES` dans `src/app/page.tsx`
2. Ajouter la logique dans `getEventTypeInfo()` des composants
3. Mettre à jour les actions serveur si nécessaire

### Modifier les couleurs et emojis
- Éditer les propriétés `color` et `emoji` dans `EVENT_TYPES`
- Ajuster les classes Tailwind CSS selon vos préférences

## 🔧 Technologies utilisées

- **Frontend** : Next.js 15, React 18, TypeScript
- **Styling** : Tailwind CSS
- **Base de données** : PostgreSQL avec Prisma ORM
- **Icons** : Lucide React
- **Dates** : date-fns

## 📝 Configuration des événements personnels

L'application est pré-configurée pour vos événements spécifiques :

- **Anniversaire de Mimoutte** : 28 septembre
- **Saint-Valentin** : 14 février
- **Noël** : 25 décembre  
- **Anniversaire de notre rencontre** : 4 novembre

## 🤝 Support

Cette application est conçue pour un usage familial et personnel. Elle vous permet de :
- Garder une trace de vos événements importants
- Organiser vos listes d'achats par occasion
- Avoir un compte à rebours visuel et motivant
- Gérer facilement vos préparatifs d'événements

---

**Développé avec ❤️ pour votre famille**
# listing
