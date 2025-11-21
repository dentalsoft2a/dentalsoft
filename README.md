# GB Dental - Plateforme de Gestion pour Laboratoires Dentaires

Plateforme web complète pour la gestion de laboratoires dentaires, incluant la gestion des commandes, factures, stocks, et collaboration avec les dentistes.

## Technologies

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **UI Icons**: Lucide React
- **PDF Generation**: jsPDF
- **State Management**: React Query (@tanstack/react-query)

## Fonctionnalités principales

### Pour les laboratoires
- Gestion des devis et bons de livraison
- Facturation automatisée avec conformité légale française
- Gestion du catalogue de produits
- Suivi de production avec étapes personnalisables
- Gestion des employés avec permissions granulaires
- Gestion des stocks et ressources
- Système de batch pour traçabilité des matériaux

### Pour les dentistes
- Portail dédié pour soumettre des demandes
- Suivi de l'historique des commandes
- Envoi de photos de cas cliniques
- Système de devis en ligne

### Fonctionnalités administratives
- Système de super admin
- Gestion des abonnements et extensions
- Codes d'accès avec plans tarifaires
- Système de parrainage
- Journaux d'audit complets
- Conformité anti-fraude (NF525)

## Installation

### Prérequis
- Node.js 18+
- npm ou yarn
- Compte Supabase

### Configuration

1. Cloner le projet
```bash
git clone <repository-url>
cd project
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer les variables d'environnement
Créer un fichier `.env` à la racine :
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Lancer en développement
```bash
npm run dev
```

5. Build pour production
```bash
npm run build
```

## Structure du projet

```
project/
├── src/
│   ├── components/          # Composants React organisés par fonctionnalité
│   │   ├── admin/          # Panneau d'administration
│   │   ├── auth/           # Authentification
│   │   ├── batch/          # Gestion des lots/batches
│   │   ├── catalog/        # Catalogue produits
│   │   ├── delivery-notes/ # Bons de livraison
│   │   ├── dentist/        # Portail dentiste
│   │   ├── invoices/       # Facturation
│   │   ├── work/           # Gestion de production
│   │   └── ...
│   ├── contexts/           # Contextes React (Auth, etc.)
│   ├── hooks/              # Hooks personnalisés
│   ├── lib/                # Configuration (Supabase, types)
│   ├── utils/              # Utilitaires (PDF, logger, cache)
│   └── config/             # Configuration (étapes de production)
├── supabase/
│   ├── functions/          # Edge Functions
│   └── migrations/         # Migrations de base de données
└── public/                 # Assets statiques
```

## Déploiement

### Avec Docker
```bash
docker-compose up -d
```

### Script de déploiement
```bash
./deploy-production.sh
```

## Base de données

La base de données utilise PostgreSQL via Supabase avec :
- Row Level Security (RLS) sur toutes les tables
- Triggers pour automatisation
- Fonctions pour logique métier complexe
- Index optimisés pour les performances

### Migrations
Les migrations sont dans `supabase/migrations/`. Elles sont appliquées automatiquement lors du déploiement.

## Sécurité

- Authentification JWT via Supabase Auth
- Row Level Security (RLS) sur toutes les tables
- Politiques RLS granulaires par rôle
- Logs d'audit pour toutes les actions critiques
- Conformité RGPD avec gestion des données personnelles

## Gestion des rôles

### Laboratoire (propriétaire)
- Accès complet à son laboratoire
- Gestion des employés et permissions
- Configuration des étapes de production

### Employé
- Permissions configurables par rôle
- Accès limité aux étapes assignées
- Vue filtrée des travaux

### Dentiste
- Portail dédié
- Accès à ses propres commandes uniquement
- Soumission de demandes et photos

### Super Admin
- Gestion globale de la plateforme
- Accès à tous les laboratoires
- Gestion des abonnements

## Scripts disponibles

- `npm run dev` - Lancer en mode développement
- `npm run build` - Créer un build de production
- `npm run preview` - Prévisualiser le build
- `npm run lint` - Vérifier le code avec ESLint
- `npm run typecheck` - Vérifier les types TypeScript

## Documentation technique

- [Documentation utilisateur](DOCUMENTATION_UTILISATEUR.md)
- [Conformité légale](DOCUMENT_CONFORMITE_LEGALE.md)
- [Plan conformité anti-fraude](PLAN_TECHNIQUE_CONFORMITE_ANTIFRAUD.md)
- [Instructions de déploiement](INSTRUCTIONS_DEPLOIEMENT.md)
- [Configuration PgBouncer](PGBOUNCER_SETUP.md)

## Conformité

Cette application est conforme aux exigences :
- **NF525** - Conformité anti-fraude pour la facturation
- **RGPD** - Protection des données personnelles
- **Loi française** - Mentions légales et CGU/CGV

## Support

Pour toute question ou problème, utilisez le système de support intégré dans l'application ou contactez l'équipe de développement.

## Licence

Propriétaire - Tous droits réservés
