# 📦 Migration complète de la base de données

Ce dossier contient les fichiers de migration pour votre base de données Supabase.

## 📁 Fichiers disponibles

### 1. `combined_migration_safe.sql` ⭐ **RECOMMANDÉ**
- Contient **toutes les 72 migrations** dans l'ordre chronologique
- **Idempotent** : peut être exécuté plusieurs fois sans erreur
- Ajoute automatiquement `DROP POLICY IF EXISTS` avant chaque `CREATE POLICY`
- **Taille** : ~5570 lignes

### 2. `combined_migration.sql`
- Version originale sans les `DROP IF EXISTS`
- Peut causer des erreurs si les politiques existent déjà
- Utilisez plutôt `combined_migration_safe.sql`

### 3. `supabase/migrations/`
- Fichiers de migration individuels (72 fichiers)
- Utile pour appliquer les migrations une par une

## 🚀 Comment appliquer la migration

### Option 1 : Via Supabase Dashboard (Recommandé)

1. Allez sur votre projet Supabase : https://supabase.com/dashboard
2. Cliquez sur **SQL Editor** dans le menu de gauche
3. Cliquez sur **+ New query**
4. Ouvrez le fichier `combined_migration_safe.sql` localement
5. Copiez **tout** son contenu
6. Collez-le dans l'éditeur SQL
7. Cliquez sur **Run** (ou appuyez sur Cmd/Ctrl + Enter)
8. Attendez que l'exécution se termine (peut prendre 30-60 secondes)

### Option 2 : Via psql (Ligne de commande)

```bash
# Récupérez votre connection string depuis Supabase Dashboard
# Settings > Database > Connection string (Direct connection)

psql "postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@db.[YOUR-REGION].supabase.co:5432/postgres" -f combined_migration_safe.sql
```

### Option 3 : Via l'API Supabase (pour les scripts)

```javascript
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const sql = readFileSync('combined_migration_safe.sql', 'utf-8')

// Note: Cette méthode peut avoir des limites de taille
const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
```

## ⚠️ Avertissements

### Avant d'exécuter la migration :

1. **Faites une sauvegarde** de votre base de données actuelle
2. **Testez d'abord** sur un environnement de développement/staging
3. **Vérifiez** que vous avez les bonnes credentials Supabase
4. **Assurez-vous** d'utiliser `combined_migration_safe.sql` (pas `combined_migration.sql`)

### Ce que fait cette migration :

- ✅ Crée toutes les tables nécessaires
- ✅ Configure Row Level Security (RLS)
- ✅ Crée 241 politiques de sécurité
- ✅ Crée tous les index pour les performances
- ✅ Configure les triggers automatiques
- ✅ Initialise les données de base

### Ce que cette migration NE fait PAS :

- ❌ Ne supprime PAS de données existantes
- ❌ Ne modifie PAS les données existantes
- ❌ Ne supprime PAS de tables

## 🔍 Structure de la base de données

La migration crée les tables suivantes :

### Tables principales
- `profiles` - Profils utilisateurs publics
- `user_profiles` - Profils détaillés avec abonnements
- `dentists` - Informations sur les dentistes
- `patients` - Base de données patients
- `catalog_items` - Catalogue de produits/services
- `resources` - Ressources et matériaux
- `resource_variants` - Variantes de ressources

### Documents commerciaux
- `proformas` - Devis/Proformas
- `proforma_items` - Lignes de proformas
- `invoices` - Factures
- `invoice_payments` - Paiements de factures
- `delivery_notes` - Bons de livraison
- `credit_notes` - Avoirs
- `credit_note_items` - Lignes d'avoirs

### Gestion des stocks
- `stock_movements` - Mouvements de stock
- `catalog_item_resources` - Liaison catalogue-ressources

### Système d'administration
- `access_codes` - Codes d'accès
- `access_code_usage` - Historique d'utilisation
- `admin_audit_log` - Journal d'audit
- `subscription_plans` - Plans d'abonnement
- `smtp_settings` - Configuration email

### Support & Aide
- `support_tickets` - Tickets de support
- `support_messages` - Messages de support
- `help_topics` - Articles d'aide
- `help_replies` - Réponses aux articles
- `help_votes` - Votes sur les articles

### Fonctionnalités avancées
- `photo_submissions` - Soumissions de photos dentistes
- `dentist_accounts` - Comptes clients dentistes
- `dentist_favorite_laboratories` - Laboratoires favoris
- `laboratory_employees` - Employés de laboratoire
- `laboratory_role_permissions` - Permissions des rôles

## 🐛 Résolution de problèmes

### Erreur : "relation already exists"
- ✅ Normal ! Le script utilise `CREATE TABLE IF NOT EXISTS`
- ✅ L'exécution continuera automatiquement

### Erreur : "policy already exists"
- ❌ Vous utilisez `combined_migration.sql` au lieu de `combined_migration_safe.sql`
- ✅ Utilisez `combined_migration_safe.sql` qui a les `DROP IF EXISTS`

### Erreur : "timeout" ou "query too large"
- Option 1 : Divisez le fichier en plusieurs parties
- Option 2 : Utilisez `psql` en ligne de commande plutôt que le Dashboard
- Option 3 : Appliquez les migrations individuellement depuis `supabase/migrations/`

### Erreur : "permission denied"
- Vérifiez que vous utilisez un compte avec les droits d'administration
- Assurez-vous d'utiliser la connexion "Direct" et non "Pooler"

## 📝 Notes importantes

1. **Temps d'exécution** : La migration complète prend environ 30-60 secondes
2. **Connexions actives** : Fermez toutes les connexions actives avant la migration
3. **RLS** : Toutes les tables ont Row Level Security activé par défaut
4. **Super Admin** : Le premier utilisateur créé sera automatiquement Super Admin

## 🆘 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs d'erreur SQL
2. Consultez la documentation Supabase : https://supabase.com/docs
3. Vérifiez que votre plan Supabase supporte les migrations de cette taille

---

**Dernière mise à jour** : 6 novembre 2025
**Version** : 1.0
**Migrations incluses** : 72 fichiers (du 2025-10-29 au 2025-11-05)
