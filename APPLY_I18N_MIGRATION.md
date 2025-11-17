# 🚀 Application de la Migration i18n sur Supabase

## Migration à appliquer

**Fichier :** `supabase/migrations/20251117170000_add_language_preference.sql`

Cette migration ajoute le support de la préférence de langue pour tous les utilisateurs.

## 📋 Contenu de la migration

```sql
-- Ajoute language_preference aux profiles utilisateurs
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS language_preference text DEFAULT 'fr'
CHECK (language_preference IN ('fr', 'en'));

-- Ajoute language_preference aux comptes dentistes
ALTER TABLE dentist_accounts
ADD COLUMN IF NOT EXISTS language_preference text DEFAULT 'fr'
CHECK (language_preference IN ('fr', 'en'));

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_user_profiles_language ON user_profiles(language_preference);
CREATE INDEX IF NOT EXISTS idx_dentist_accounts_language ON dentist_accounts(language_preference);

-- Mise à jour des enregistrements existants
UPDATE user_profiles SET language_preference = 'fr' WHERE language_preference IS NULL;
UPDATE dentist_accounts SET language_preference = 'fr' WHERE language_preference IS NULL;
```

## 🎯 Méthode 1 : Via Supabase Dashboard (Recommandé)

### Étapes :

1. **Ouvrir le Dashboard Supabase**
   - Aller sur https://supabase.com/dashboard
   - Sélectionner votre projet DentalCloud

2. **Ouvrir SQL Editor**
   - Dans le menu latéral, cliquer sur "SQL Editor"
   - Cliquer sur "+ New Query"

3. **Copier le contenu de la migration**
   - Ouvrir le fichier `supabase/migrations/20251117170000_add_language_preference.sql`
   - Copier tout le contenu SQL
   - Coller dans l'éditeur SQL de Supabase

4. **Exécuter la migration**
   - Cliquer sur "Run" (ou Ctrl/Cmd + Enter)
   - Vérifier qu'il n'y a pas d'erreur
   - Vous devriez voir "Success. No rows returned"

5. **Vérifier l'application**
   - Aller dans "Table Editor"
   - Sélectionner la table `user_profiles`
   - Vérifier que la colonne `language_preference` existe
   - Faire de même pour `dentist_accounts`

## 🛠️ Méthode 2 : Via Supabase CLI

### Prérequis :
```bash
# Installer Supabase CLI si pas déjà fait
npm install -g supabase
```

### Étapes :

1. **Se connecter à Supabase**
```bash
supabase login
```

2. **Lier le projet local au projet Supabase**
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

3. **Appliquer toutes les migrations**
```bash
supabase db push
```

OU appliquer uniquement cette migration :

```bash
# Depuis la racine du projet
supabase db push --include-all
```

## ✅ Vérification après migration

### Via Dashboard :

1. **Table `user_profiles`**
   - Colonnes visibles : `language_preference` (text, default 'fr')
   - Vérifier qu'il y a une contrainte CHECK limitant à 'fr' et 'en'

2. **Table `dentist_accounts`**
   - Même chose que pour `user_profiles`

3. **Index créés**
   - `idx_user_profiles_language`
   - `idx_dentist_accounts_language`

### Via SQL Editor :

Exécuter ces requêtes pour vérifier :

```sql
-- Vérifier la colonne dans user_profiles
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name = 'language_preference';

-- Vérifier la colonne dans dentist_accounts
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'dentist_accounts'
AND column_name = 'language_preference';

-- Vérifier les index
SELECT indexname, tablename
FROM pg_indexes
WHERE indexname LIKE '%language%';

-- Compter les utilisateurs par langue (doit tous être 'fr' initialement)
SELECT language_preference, COUNT(*)
FROM user_profiles
GROUP BY language_preference;
```

## ⚠️ En cas d'erreur

### Erreur : "column already exists"
**Solution :** La migration a déjà été appliquée. Vérifier avec :
```sql
SELECT * FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name = 'language_preference';
```

### Erreur : "table does not exist"
**Solution :** Vérifier que les tables `user_profiles` et `dentist_accounts` existent :
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('user_profiles', 'dentist_accounts');
```

### Erreur : "permission denied"
**Solution :** Vous devez être propriétaire du projet ou avoir les droits admin sur Supabase Dashboard.

## 🎉 Migration réussie !

Une fois la migration appliquée :

1. ✅ Les utilisateurs peuvent sauvegarder leur préférence de langue
2. ✅ La langue est automatiquement chargée à la connexion
3. ✅ Le changement de langue via `<LanguageSwitcher />` fonctionne
4. ✅ La préférence persiste entre les sessions

## 🧪 Tester la migration

### Test 1 : Vérifier la valeur par défaut
```sql
-- Créer un utilisateur test et vérifier sa langue par défaut
SELECT language_preference FROM user_profiles WHERE id = 'VOTRE_USER_ID';
-- Devrait retourner 'fr'
```

### Test 2 : Changer la langue
```sql
-- Mettre à jour manuellement
UPDATE user_profiles
SET language_preference = 'en'
WHERE id = 'VOTRE_USER_ID';

-- Vérifier le changement
SELECT language_preference FROM user_profiles WHERE id = 'VOTRE_USER_ID';
-- Devrait retourner 'en'
```

### Test 3 : Tester la contrainte CHECK
```sql
-- Cette requête devrait échouer (langue non autorisée)
UPDATE user_profiles
SET language_preference = 'es'
WHERE id = 'VOTRE_USER_ID';
-- Erreur attendue : check constraint violation
```

## 📊 Statistiques après migration

Pour voir la répartition des langues :

```sql
-- Utilisateurs par langue
SELECT
  language_preference,
  COUNT(*) as user_count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM user_profiles), 2) as percentage
FROM user_profiles
GROUP BY language_preference
ORDER BY user_count DESC;

-- Dentistes par langue
SELECT
  language_preference,
  COUNT(*) as dentist_count
FROM dentist_accounts
GROUP BY language_preference
ORDER BY dentist_count DESC;
```

## 🔄 Rollback (si nécessaire)

Si vous devez annuler la migration :

```sql
-- Supprimer les colonnes
ALTER TABLE user_profiles DROP COLUMN IF EXISTS language_preference;
ALTER TABLE dentist_accounts DROP COLUMN IF EXISTS language_preference;

-- Supprimer les index
DROP INDEX IF EXISTS idx_user_profiles_language;
DROP INDEX IF EXISTS idx_dentist_accounts_language;
```

⚠️ **Attention :** Le rollback supprimera toutes les préférences de langue sauvegardées !

## ✨ Prochaine étape

Migration appliquée avec succès ? Parfait ! 🎉

**Maintenant :**
1. Rechargez votre application
2. Le `<LanguageSwitcher />` devrait être fonctionnel
3. Les changements de langue seront sauvegardés automatiquement
4. Commencez à traduire vos composants (voir `I18N_QUICK_START.md`)

**Besoin d'aide ?**
- Consultez `I18N_IMPLEMENTATION_GUIDE.md` pour la suite
- Consultez `I18N_QUICK_START.md` pour des exemples pratiques
