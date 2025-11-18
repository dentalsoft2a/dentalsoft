# Correctifs du Système de Démonstration

## Problème Initial

L'erreur `403 Forbidden` sur `/rest/v1/demo_sessions` était causée par des politiques RLS trop restrictives et l'absence de session authentifiée lors de la création du compte démo.

## Correctifs Appliqués

### 1. Correction des Politiques RLS (Migration)

**Fichier:** `fix_demo_sessions_rls_for_creation.sql`

**Problème:** Les politiques RLS ne permettaient pas l'insertion de sessions démo pendant la création du compte.

**Solution:**
```sql
-- Permet aux utilisateurs authentifiés d'insérer leur propre session
CREATE POLICY "Authenticated users can insert own demo session"
  ON demo_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Permet au service role d'insérer (pour les edge functions)
CREATE POLICY "Service role can insert demo sessions"
  ON demo_sessions FOR INSERT
  TO service_role
  WITH CHECK (true);
```

### 2. Ajout des Champs Démo à user_profiles (Migration)

**Fichier:** `add_demo_fields_to_user_profiles.sql`

**Problème:** Les colonnes `is_demo_account` et `demo_session_id` n'existaient pas dans `user_profiles`.

**Solution:**
```sql
-- Ajout de is_demo_account
ALTER TABLE user_profiles ADD COLUMN is_demo_account boolean DEFAULT false NOT NULL;

-- Ajout de demo_session_id
ALTER TABLE user_profiles ADD COLUMN demo_session_id uuid;

-- Index pour recherches rapides
CREATE INDEX idx_user_profiles_demo_account
  ON user_profiles(is_demo_account)
  WHERE is_demo_account = true;
```

### 3. Correction du Flux d'Authentification (AuthContext)

**Fichier:** `src/contexts/AuthContext.tsx`

**Problème 1:** L'utilisateur n'était pas authentifié au moment de l'insertion dans `demo_sessions`.
**Problème 2:** Le rôle 'laboratory' n'est pas valide (contrainte `user_profiles_role_check`).

**Solution:**

1. **Connexion immédiate après signup:**
```typescript
// Créer le compte
const { data: authData, error: authError } = await supabase.auth.signUp({...});

// Se connecter immédiatement pour obtenir une session active
const { error: signInError } = await supabase.auth.signInWithPassword({
  email: demoEmail,
  password: demoPassword
});
```

2. **Création explicite du user_profile avec le bon rôle:**
```typescript
// Créer le profil user_profiles avec marqueur démo
await supabase
  .from('user_profiles')
  .upsert({
    id: userId,
    email: demoEmail,
    role: 'user', // ✅ Correction: 'user' au lieu de 'laboratory'
    subscription_status: 'trial',
    trial_ends_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    is_demo_account: true
  });
```

**Note:** La contrainte accepte uniquement `'user'` ou `'super_admin'`.

## Ordre des Opérations Corrigé

Le flux correct est maintenant:

1. `supabase.auth.signUp()` - Créer l'utilisateur
2. `supabase.auth.signInWithPassword()` - Obtenir une session authentifiée
3. Créer `profiles` - Profil laboratoire
4. Créer `user_profiles` - Profil utilisateur avec `is_demo_account: true`
5. Créer `demo_sessions` - Session démo (maintenant avec auth.uid() valide)
6. Générer les données de test
7. Charger le profil pour mettre à jour l'état React

## Tests de Vérification

### Test 1: Création de Compte Démo
```bash
# Dans la console du navigateur, après avoir cliqué sur "Essayer la Démo"
# Vérifier qu'il n'y a plus d'erreur 403
# La création devrait réussir sans erreurs
```

### Test 2: Vérification Base de Données
```sql
-- Vérifier qu'un compte démo a été créé
SELECT
  up.id,
  up.email,
  up.is_demo_account,
  ds.expires_at,
  ds.is_active
FROM user_profiles up
JOIN demo_sessions ds ON ds.user_id = up.id
WHERE up.is_demo_account = true
ORDER BY ds.created_at DESC
LIMIT 5;
```

### Test 3: Timer et Badge
- Le timer doit s'afficher en haut à droite
- Le badge "Mode Démo" doit apparaître dans le header
- Le temps doit décompter correctement

### Test 4: Données Générées
```sql
-- Compter les données générées pour un utilisateur démo
SELECT
  (SELECT COUNT(*) FROM dentists WHERE user_id = '<demo_user_id>') as dentists,
  (SELECT COUNT(*) FROM patients WHERE user_id = '<demo_user_id>') as patients,
  (SELECT COUNT(*) FROM delivery_notes WHERE user_id = '<demo_user_id>') as delivery_notes,
  (SELECT COUNT(*) FROM proformas WHERE user_id = '<demo_user_id>') as proformas,
  (SELECT COUNT(*) FROM invoices WHERE user_id = '<demo_user_id>') as invoices,
  (SELECT COUNT(*) FROM catalog_items WHERE user_id = '<demo_user_id>') as catalog_items;
```

Résultats attendus:
- dentists: 8
- patients: 15
- delivery_notes: 25
- proformas: 12
- invoices: 8
- catalog_items: 20

## État Actuel

✅ **Build:** Compilé avec succès sans erreurs
✅ **RLS:** Politiques corrigées pour permettre l'insertion
✅ **Authentification:** Flux corrigé avec connexion immédiate
✅ **Base de données:** Colonnes ajoutées à user_profiles
✅ **UI:** Timer et badge intégrés dans le layout

## Prochaine Étape

Tester la fonctionnalité de création de démo en environnement de développement ou production pour vérifier que toutes les corrections fonctionnent comme prévu.

## Notes Importantes

1. **Email temporaire:** Les comptes démo utilisent des emails `@dentalcloud.temp` qui ne peuvent pas recevoir d'emails réels
2. **Durée:** Les sessions expirent après exactement 30 minutes
3. **Nettoyage:** La Edge Function `cleanup-demo-accounts` doit être déployée et configurée avec un cron job
4. **Sécurité:** Les comptes démo ne peuvent pas effectuer de paiements réels ou envoyer d'emails

## Dépendances

- Supabase Auth configuré et fonctionnel
- Table `demo_sessions` créée avec les bonnes colonnes
- Table `user_profiles` avec colonnes démo ajoutées
- Politiques RLS correctement configurées
- Edge Function déployée (optionnel pour le test initial)
