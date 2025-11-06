# Guide de Migration vers Supabase Coolify

Ce guide vous explique comment migrer votre base de données Supabase actuelle vers votre instance Supabase sur Coolify.

## Fichiers de Migration Disponibles

- **complete_migration.sql** : Toutes les migrations SQL consolidées (schéma complet)
- **export_data.sql** : Script pour exporter vos données actuelles

## Étape 1 : Préparer votre Supabase Coolify

1. Assurez-vous que votre instance Supabase Coolify est opérationnelle
2. Notez les informations de connexion :
   - URL Supabase
   - Anon Key
   - Service Role Key
   - URL de la base de données PostgreSQL

## Étape 2 : Exporter les Données de votre Supabase Actuelle

### Option A : Via l'interface Supabase (Recommandé)

1. Allez dans votre projet Supabase actuel
2. Allez dans **Database** → **Backups**
3. Créez un backup complet
4. Téléchargez le fichier de backup

### Option B : Via pg_dump

```bash
# Obtenez votre DATABASE_URL depuis Supabase actuel
pg_dump "votre_database_url" > backup.sql
```

### Option C : Via SQL Editor (pour les petites bases)

1. Allez dans **SQL Editor** dans votre Supabase actuel
2. Exécutez les commandes du fichier `export_data.sql`
3. Sauvegardez les résultats CSV pour chaque table

## Étape 3 : Appliquer le Schéma sur Coolify

### Via SQL Editor Supabase Coolify

1. Connectez-vous à votre Supabase Coolify
2. Allez dans **SQL Editor**
3. Copiez le contenu de `complete_migration.sql`
4. Exécutez le script complet

**IMPORTANT** : Le script contient :
- Toutes les tables nécessaires
- Les politiques RLS (Row Level Security)
- Les triggers et fonctions
- Les index et contraintes

### Via psql (Si vous avez accès direct)

```bash
psql "votre_database_url_coolify" < complete_migration.sql
```

## Étape 4 : Importer les Données

### Option A : Restaurer depuis backup complet

```bash
psql "votre_database_url_coolify" < backup.sql
```

### Option B : Via l'interface Supabase

1. Dans votre Supabase Coolify, allez dans **Database** → **Tables**
2. Pour chaque table, utilisez l'option d'import CSV
3. Importez les fichiers CSV exportés à l'étape 2

### Option C : Copie directe entre bases (Si les deux sont accessibles)

```bash
# Pour chaque table, exemple avec profiles
pg_dump -t profiles "url_supabase_source" | psql "url_supabase_coolify"
```

## Étape 5 : Migrer les Utilisateurs Auth

Les utilisateurs dans `auth.users` ne sont pas inclus dans les migrations SQL standard.

### Via l'API Supabase

1. Exportez les utilisateurs de votre Supabase actuel :
   - Allez dans **Authentication** → **Users**
   - Exportez la liste (ou utilisez l'API)

2. Réinvitez les utilisateurs dans Coolify, OU :
   - Utilisez la fonction d'import d'utilisateurs de Supabase
   - Les utilisateurs devront réinitialiser leurs mots de passe

## Étape 6 : Migrer les Edge Functions

Vos Edge Functions sont dans `/supabase/functions/` :
- delete-user
- send-invoice-email
- send-proforma-email

Pour chaque fonction :

```bash
# Depuis votre projet
supabase functions deploy nom-fonction --project-ref votre-ref-coolify
```

Ou via l'interface Supabase Coolify **Edge Functions**.

## Étape 7 : Migrer les Variables d'Environnement

Copiez les variables de `.env` vers votre nouvelle configuration Coolify :

```env
VITE_SUPABASE_URL=votre_nouvelle_url_coolify
VITE_SUPABASE_ANON_KEY=votre_nouvelle_anon_key
```

## Étape 8 : Migrer le Storage (Si utilisé)

Si vous utilisez Supabase Storage pour les photos :

1. Dans Supabase actuel, allez dans **Storage**
2. Téléchargez tous les fichiers de vos buckets
3. Dans Supabase Coolify, créez les mêmes buckets
4. Uploadez les fichiers

Ou utilisez l'API :

```typescript
// Script pour copier les fichiers
const { data: files } = await supabaseSource.storage
  .from('bucket-name')
  .list();

for (const file of files) {
  const { data } = await supabaseSource.storage
    .from('bucket-name')
    .download(file.name);

  await supabaseCoolify.storage
    .from('bucket-name')
    .upload(file.name, data);
}
```

## Étape 9 : Vérification Post-Migration

1. **Vérifier les tables** :
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';
   ```

2. **Vérifier les données** :
   ```sql
   SELECT COUNT(*) FROM profiles;
   SELECT COUNT(*) FROM dentist_accounts;
   SELECT COUNT(*) FROM delivery_notes;
   -- etc.
   ```

3. **Vérifier les politiques RLS** :
   ```sql
   SELECT tablename, policyname FROM pg_policies;
   ```

4. **Tester l'authentification** :
   - Essayez de vous connecter avec un compte existant
   - Créez un nouveau compte de test

5. **Tester les fonctionnalités** :
   - Création de bon de livraison
   - Génération de facture
   - Upload de photos
   - Etc.

## Étape 10 : Mettre à Jour l'Application

1. Mettez à jour le fichier `.env` avec les nouvelles variables Coolify
2. Testez localement avec `npm run dev`
3. Déployez votre application avec les nouvelles variables

## Troubleshooting

### Erreur : "relation already exists"

Si le schéma existe déjà partiellement, vous pouvez :
- Supprimer les tables existantes (ATTENTION : perte de données)
- Ou modifier le script pour utiliser `CREATE TABLE IF NOT EXISTS`

### Erreur : "RLS policy violation"

Vérifiez que :
- Les politiques RLS sont bien créées
- Votre utilisateur a les bons rôles
- Les fonctions comme `auth.uid()` fonctionnent

### Les utilisateurs ne peuvent pas se connecter

- Assurez-vous d'avoir migré les utilisateurs de `auth.users`
- Vérifiez que les `user_id` dans vos tables correspondent
- Les utilisateurs peuvent avoir besoin de réinitialiser leurs mots de passe

### Les Edge Functions ne fonctionnent pas

- Vérifiez que les variables d'environnement sont configurées
- Testez chaque fonction individuellement
- Vérifiez les logs dans Supabase Coolify

## Notes Importantes

1. **Sauvegardez tout** avant de commencer la migration
2. **Testez d'abord** sur une instance de test si possible
3. **Planifiez une maintenance** pour éviter les pertes de données pendant la migration
4. **Vérifiez les quotas** de votre instance Coolify (stockage, fonctions, etc.)
5. **Documentez** toutes les différences de configuration entre les deux environnements

## Support

Si vous rencontrez des problèmes :
1. Consultez les logs de Supabase Coolify
2. Vérifiez la documentation Supabase
3. Consultez la documentation Coolify pour la configuration Supabase
