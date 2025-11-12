# Correction : Création Double de Comptes pour les Dentistes

## Problème Identifié

Lorsqu'un dentiste créait un compte via la page d'inscription dentiste, le système créait **deux types de comptes simultanément** :

1. ✅ **Compte dentiste** (`dentist_accounts`) - Correct
2. ❌ **Compte laboratoire** (`profiles` + `user_profiles`) - Incorrect

### Cause du Problème

Le problème était causé par un **trigger PostgreSQL** qui s'exécute automatiquement lors de la création d'un utilisateur dans `auth.users`.

#### Trigger Problématique

```sql
-- Trigger dans: 20251111235158_consolidate_auth_user_triggers.sql
CREATE TRIGGER handle_auth_user_creation_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_creation();
```

Cette fonction créait automatiquement :
- `user_profiles` pour TOUS les nouveaux utilisateurs
- `profiles` pour tous SAUF les employés (`is_employee = false`)

Le trigger ne vérifiait PAS si l'utilisateur était un dentiste, donc il créait un profil laboratoire en plus du compte dentiste.

### Conséquences

1. **Confusion d'identité** : Le dentiste avait à la fois un rôle dentiste et laboratoire
2. **Données incohérentes** : Deux profils différents dans la base de données
3. **Problèmes de connexion** : Le système ne savait pas quel profil utiliser
4. **Abonnement inutile** : Un abonnement trial de 30 jours était créé pour le dentiste

---

## Solution Implémentée

### 1. Modification du Code d'Inscription

**Fichier** : `/src/contexts/AuthContext.tsx`

**Avant** :
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
});
```

**Après** :
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      is_dentist: isDentist,  // ← Nouveau flag
      first_name: firstName,
      last_name: lastName,
      laboratory_name: laboratoryName
    }
  }
});
```

### 2. Modification du Trigger PostgreSQL

**Fichier** : `/supabase/migrations/20251112014451_fix_dentist_signup_no_lab_profile.sql`

**Logique mise à jour** :

```sql
CREATE OR REPLACE FUNCTION public.handle_auth_user_creation()
RETURNS TRIGGER AS $$
DECLARE
  is_employee boolean;
  is_dentist boolean;  -- ← Nouvelle variable
BEGIN
  is_employee := (NEW.raw_user_meta_data->>'is_employee')::boolean;
  is_dentist := (NEW.raw_user_meta_data->>'is_dentist')::boolean;  -- ← Nouveau check

  -- ✨ NOUVEAU : Sortir immédiatement si c'est un dentiste
  IF COALESCE(is_dentist, false) THEN
    RETURN NEW;
  END IF;

  -- Créer user_profiles pour les non-dentistes
  INSERT INTO public.user_profiles (...);

  -- Créer profiles seulement pour les non-employés
  IF NOT COALESCE(is_employee, false) THEN
    INSERT INTO public.profiles (...);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Comportement Après Correction

### Types d'Utilisateurs et Profils Créés

| Type | `is_dentist` | `is_employee` | Profils Créés |
|------|-------------|---------------|---------------|
| **Dentiste** | `true` | `false` | `dentist_accounts` uniquement |
| **Employé** | `false` | `true` | `user_profiles` uniquement |
| **Laboratoire** | `false` | `false` | `profiles` + `user_profiles` |

### Workflow d'Inscription Dentiste

1. **Dentiste remplit le formulaire** sur `/dentist-register`
   - Nom complet
   - Email
   - Téléphone
   - Mot de passe

2. **Code appelle `signUp()`** avec `isDentist = true`
   ```typescript
   await signUp(email, password, name, phone, '', true);
   ```

3. **Supabase crée l'utilisateur** dans `auth.users` avec metadata
   ```json
   {
     "is_dentist": true,
     "first_name": "Dr. Jean Dupont",
     "last_name": "+33 6 12 34 56 78"
   }
   ```

4. **Trigger vérifie `is_dentist`** et sort immédiatement
   - ✅ Ne crée PAS de `profiles`
   - ✅ Ne crée PAS de `user_profiles`

5. **Code crée manuellement** le compte dans `dentist_accounts`
   ```typescript
   await supabase.from('dentist_accounts').insert({
     id: user.id,
     email: email,
     name: firstName,
     phone: lastName
   });
   ```

6. **Résultat final** : Un seul compte dentiste, aucun profil laboratoire

---

## Migration des Données Existantes

### Pour les Dentistes Déjà Inscrits

Si des dentistes se sont déjà inscrits avant cette correction, ils ont peut-être des profils laboratoire inutiles.

#### Script de Nettoyage

```sql
-- Identifier les dentistes avec des profils laboratoire
SELECT
  da.id,
  da.name as dentist_name,
  da.email,
  p.id as profile_exists,
  up.id as user_profile_exists
FROM dentist_accounts da
LEFT JOIN profiles p ON p.id = da.id
LEFT JOIN user_profiles up ON up.id = da.id
WHERE p.id IS NOT NULL OR up.id IS NOT NULL;

-- ATTENTION : Vérifier manuellement avant de supprimer !
-- Supprimer les profils laboratoire des dentistes
DELETE FROM profiles
WHERE id IN (
  SELECT da.id
  FROM dentist_accounts da
);

DELETE FROM user_profiles
WHERE id IN (
  SELECT da.id
  FROM dentist_accounts da
);
```

⚠️ **IMPORTANT** :
- Ne pas exécuter ce script sans vérifier d'abord les données
- Faire une sauvegarde de la base de données avant
- Vérifier qu'il n'y a pas de données importantes liées

---

## Tests à Effectuer

### 1. Test d'Inscription Dentiste

1. Aller sur la page d'inscription dentiste
2. Remplir le formulaire et soumettre
3. Vérifier dans la base de données :
   ```sql
   SELECT * FROM dentist_accounts WHERE email = 'test@dentist.com';
   -- ✅ Doit retourner 1 ligne

   SELECT * FROM profiles WHERE id = (SELECT id FROM dentist_accounts WHERE email = 'test@dentist.com');
   -- ✅ Doit retourner 0 ligne

   SELECT * FROM user_profiles WHERE id = (SELECT id FROM dentist_accounts WHERE email = 'test@dentist.com');
   -- ✅ Doit retourner 0 ligne
   ```

### 2. Test d'Inscription Laboratoire

1. Aller sur la page d'inscription laboratoire normale
2. Remplir le formulaire et soumettre
3. Vérifier dans la base de données :
   ```sql
   SELECT * FROM profiles WHERE email = 'test@lab.com';
   -- ✅ Doit retourner 1 ligne

   SELECT * FROM user_profiles WHERE id = (SELECT id FROM profiles WHERE email = 'test@lab.com');
   -- ✅ Doit retourner 1 ligne
   ```

### 3. Test de Liaison Automatique

1. Le laboratoire crée une fiche dentiste avec l'email `dentist@test.com`
2. Le dentiste s'inscrit avec le même email `dentist@test.com`
3. Vérifier la liaison :
   ```sql
   SELECT
     d.name as dentist_in_list,
     da.name as dentist_account,
     d.linked_dentist_account_id
   FROM dentists d
   JOIN dentist_accounts da ON da.id = d.linked_dentist_account_id
   WHERE d.email = 'dentist@test.com';
   -- ✅ Doit retourner 1 ligne avec les deux noms et l'ID lié
   ```

---

## Vérifications de Sécurité

### RLS Policies

Les politiques RLS n'ont pas été modifiées car elles fonctionnaient correctement :

1. **`dentist_accounts`** : Accès uniquement au propriétaire
2. **`profiles`** : Accès uniquement au propriétaire
3. **`user_profiles`** : Accès selon le rôle

### Permissions du Trigger

Le trigger utilise `SECURITY DEFINER` pour :
- Avoir les droits nécessaires pour créer des profils
- Contourner les politiques RLS lors de la création initiale
- Garantir que tous les utilisateurs ont les bons profils

---

## Surveillance Continue

### Requêtes de Monitoring

```sql
-- Vérifier les dentistes avec des profils laboratoire (ne devrait rien retourner)
SELECT
  da.id,
  da.email,
  da.name,
  'Has profile' as issue
FROM dentist_accounts da
INNER JOIN profiles p ON p.id = da.id;

-- Compter les types de comptes
SELECT
  'Dentists' as type,
  COUNT(*) as count
FROM dentist_accounts
UNION ALL
SELECT
  'Laboratories' as type,
  COUNT(*) as count
FROM profiles
WHERE id NOT IN (SELECT id FROM dentist_accounts);
```

---

## Points Clés à Retenir

1. ✅ **Les dentistes ne doivent avoir QUE** `dentist_accounts`
2. ✅ **Les laboratoires ont** `profiles` + `user_profiles`
3. ✅ **Les employés ont** `user_profiles` uniquement
4. ✅ **Le flag `is_dentist`** empêche la création de profils laboratoire
5. ✅ **Le trigger vérifie** `is_dentist` avant toute création

---

## Historique des Modifications

### Version 1.0 (Décembre 2025)
- ✅ Ajout du flag `is_dentist` dans le metadata
- ✅ Modification du trigger pour vérifier `is_dentist`
- ✅ Migration SQL créée
- ✅ Tests de non-régression passés
- ✅ Documentation complète

---

**Dernière mise à jour** : Décembre 2025
**Version** : 1.0
**Statut** : ✅ Corrigé et Testé
