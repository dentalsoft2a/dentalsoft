# 🚀 Guide Rapide : Réparer votre base de données

## Le problème
Vous avez ces erreurs :
- ❌ `column catalog_items.is_active does not exist`
- ❌ `column user_profiles.trial_ends_at does not exist`
- ❌ `policy "Users can view own profile" already exists`
- ❌ `trigger "update_credit_notes_updated_at" already exists`
- ❌ Erreur 400 sur toutes les requêtes API

## La solution en 2 étapes

**⚠️ IMPORTANT** : Utilisez UNIQUEMENT `combined_migration_safe.sql` (PAS `combined_migration.sql`)

### Étape 1 : Appliquer la migration SQL ⚙️

1. Ouvrez : https://supabase.com/dashboard/project/eovmrvtiizyhyzcmpvov/sql/new
2. Ouvrez le fichier `combined_migration_safe.sql` sur votre ordinateur
3. Copiez TOUT le contenu (~5597 lignes)
4. Collez dans l'éditeur SQL de Supabase
5. Cliquez sur **"Run"**
6. ⏱️ Attendez ~30-60 secondes

✅ Toutes les tables, colonnes et politiques seront créées !

### Étape 2 : Corriger l'URL dans Coolify 🔧

1. Allez dans Coolify > Votre application > **Environment Variables**
2. Trouvez `VITE_SUPABASE_URL`
3. **Changez** :
   ```
   ❌ https://eovmrvtiizyhyzcmpvov.supabase.co/  (MAUVAIS - slash à la fin)
   ✅ https://eovmrvtiizyhyzcmpvov.supabase.co   (BON - pas de slash)
   ```
4. Cochez **"Build"** pour les deux variables (`VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`)
5. Cliquez sur **"Redeploy"**

## C'est tout ! 🎉

Après ces 2 étapes, votre site devrait fonctionner parfaitement.

---

**Besoin d'aide ?** Consultez `MIGRATION_README.md` pour plus de détails.
