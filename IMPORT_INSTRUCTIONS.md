# Instructions d'importation Supabase

## Fichiers créés

1. `supabase_complete_dump.sql` - Dump complet du schéma (toutes les migrations)
2. `clean_and_import.sql` - Script de nettoyage pour éviter les erreurs de duplication

## Comment importer dans votre nouvelle instance Supabase sur Coolify

### Étape 1 : Créer une nouvelle instance Supabase sur Coolify

1. Créez un nouveau projet Supabase dans Coolify
2. Notez les nouvelles informations de connexion :
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Étape 2 : Importer le schéma

Le fichier `supabase_complete_dump.sql` contient maintenant des `DROP POLICY IF EXISTS` avant chaque `CREATE POLICY`, donc plus de problème de duplication !

1. Ouvrez le SQL Editor dans votre nouveau dashboard Supabase
2. Copiez le contenu du fichier `supabase_complete_dump.sql`
3. Collez-le dans l'éditeur SQL et exécutez
4. Le script va :
   - Supprimer les policies existantes si elles existent (DROP IF EXISTS)
   - Recréer toutes les tables et policies
   - Configurer tous les triggers et functions

**Note** : Le fichier contient 75 migrations et 59 policies. L'exécution peut prendre 1-2 minutes.

### Étape 3 : Importer les données (méthode manuelle)

Comme vous avez des données sensibles (4 profils, 44 dentistes, 76 items de catalogue), je recommande :

1. **Option A** : Utiliser l'outil d'export/import intégré de Supabase
   - Dans votre ancienne instance : Settings > Database > Backups
   - Créez un backup
   - Restaurez-le dans votre nouvelle instance

2. **Option B** : Utiliser pgAdmin ou un outil similaire
   ```bash
   pg_dump "postgresql://postgres:password@old-instance-url:5432/postgres" > full_backup.sql
   psql "postgresql://postgres:password@new-instance-url:5432/postgres" < full_backup.sql
   ```

3. **Option C** : Export CSV table par table depuis le dashboard Supabase
   - Table Editor > Sélectionnez une table > Export to CSV
   - Puis Import dans la nouvelle instance

### Étape 4 : Mettre à jour votre .env

```env
VITE_SUPABASE_URL=https://votre-nouveau-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-nouvelle-clé-anonyme
```

### Étape 5 : Rebuild et redéployer

```bash
git add .
git commit -m "Update Supabase credentials"
git push
```

Puis redéployez dans Coolify.

## Notes importantes

- ⚠️ Les users dans `auth.users` ne seront PAS migrés automatiquement
- ⚠️ Il faudra que les utilisateurs se recréent un compte OU utiliser la migration d'auth Supabase
- ✅ Toutes les RLS policies sont incluses dans le dump
- ✅ Tous les triggers et functions sont inclus

## Support

Si vous rencontrez des problèmes, contactez le support Supabase ou consultez :
https://supabase.com/docs/guides/platform/migrating-and-upgrading-projects
