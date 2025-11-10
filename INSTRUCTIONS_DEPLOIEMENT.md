# Instructions de Déploiement - Conformité Anti-Fraude TVA

## ⚠️ IMPORTANT : Migrations à appliquer

Les nouvelles migrations de conformité doivent être appliquées à votre base de données Supabase avant d'utiliser les fonctionnalités de conformité.

## 📋 Étapes de déploiement

### 1. Appliquer les migrations de base de données

Vous avez **4 nouvelles migrations** à appliquer dans l'ordre :

1. `20251108000000_create_audit_log_system.sql` - Système de journal d'audit
2. `20251108000001_create_sealing_and_periods.sql` - Scellement et périodes fiscales
3. `20251108000002_create_certificates_and_archives.sql` - Certificats et archivage
4. `20251108000003_alter_invoices_and_credit_notes.sql` - Modification des factures

#### Option A : Via l'interface Supabase (Recommandé)

1. Connectez-vous à votre projet Supabase : https://supabase.com/dashboard
2. Allez dans **SQL Editor**
3. Pour chaque fichier de migration dans l'ordre :
   - Ouvrez le fichier depuis `supabase/migrations/`
   - Copiez le contenu complet du fichier
   - Collez-le dans l'éditeur SQL
   - Cliquez sur **Run** pour exécuter la migration
   - Vérifiez qu'il n'y a pas d'erreurs

#### Option B : Via Supabase CLI (Si installé)

```bash
# Installer Supabase CLI si nécessaire
npm install -g supabase

# Se connecter à votre projet
supabase login

# Lier votre projet local
supabase link --project-ref YOUR_PROJECT_ID

# Appliquer toutes les migrations
supabase db push
```

### 2. Déployer les Edge Functions

Les Edge Functions doivent être déployées sur Supabase :

#### Fonctions à déployer :

- `generate-certificate` - Génération de certificats numériques
- `sign-document` - Signature électronique des documents

#### Via l'interface Supabase :

1. Allez dans **Edge Functions**
2. Cliquez sur **Deploy function**
3. Pour `generate-certificate`:
   - Nom: `generate-certificate`
   - Copiez le contenu de `supabase/functions/generate-certificate/index.ts`
   - Déployez
4. Répétez pour `sign-document`

#### Via Supabase CLI :

```bash
# Déployer generate-certificate
supabase functions deploy generate-certificate

# Déployer sign-document
supabase functions deploy sign-document
```

### 3. Vérifier les permissions RLS

Après avoir appliqué les migrations, vérifiez que les politiques RLS (Row Level Security) sont actives :

```sql
-- Vérifier les tables créées
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%audit%' OR tablename LIKE '%fiscal%' OR tablename LIKE '%certificate%';

-- Vérifier que RLS est activé
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('audit_log', 'fiscal_periods', 'digital_certificates', 'archived_documents', 'data_seals');
```

Toutes les tables doivent avoir `rowsecurity = true`.

## 🧪 Tester l'implémentation

### 1. Tester la génération de certificat

1. Connectez-vous à votre application DentalCloud
2. Allez dans **Paramètres** > **Conformité** > **Attestation**
3. Cliquez sur **"Générer le certificat"**
4. Vérifiez qu'un certificat est créé avec succès

Si vous obtenez une erreur :
- Vérifiez que les migrations sont bien appliquées
- Vérifiez que les Edge Functions sont déployées
- Consultez les logs dans Supabase Dashboard > Edge Functions > Logs

### 2. Tester le journal d'audit

1. Créez ou modifiez une facture
2. Allez dans **Paramètres** > **Conformité** > **Journal d'audit**
3. Vérifiez que l'opération apparaît dans le journal
4. Cliquez sur **"Vérifier l'intégrité"**
5. Le résultat doit être vert ✅ "Chaîne d'audit intègre"

### 3. Tester les périodes fiscales

1. Allez dans **Paramètres** > **Conformité** > **Périodes fiscales**
2. Cliquez sur **"Créer période du mois en cours"**
3. Une période doit apparaître avec le statut "Ouverte"
4. Créez quelques factures
5. Cliquez sur **"Clôturer"** pour tester le scellement
6. La période doit passer au statut "Clôturée" avec un hash de scellement

## 🔍 Dépannage

### Erreur : "relation does not exist"

**Cause** : Les migrations n'ont pas été appliquées.

**Solution** : Appliquez les 4 migrations dans l'ordre (voir Étape 1).

### Erreur : "permission denied"

**Cause** : Les politiques RLS bloquent l'accès.

**Solution** :
1. Vérifiez que vous êtes bien connecté
2. Vérifiez que votre utilisateur a un profil dans la table `profiles`
3. Consultez les logs Supabase pour plus de détails

### Erreur : "Edge Function returned a non-2xx status code"

**Cause** : La fonction Edge n'est pas déployée ou rencontre une erreur.

**Solution** :
1. Déployez la fonction (voir Étape 2)
2. Consultez les logs dans **Supabase Dashboard > Edge Functions > Logs**
3. Vérifiez que la table `digital_certificates` existe

### Erreur : "Function does not exist"

**Cause** : Les fonctions PostgreSQL n'ont pas été créées.

**Solution** : Réappliquez la migration `20251108000000_create_audit_log_system.sql`

## 📊 Vérification post-déploiement

### Tables créées (5 nouvelles tables) :

```sql
SELECT * FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'audit_log',
  'data_seals',
  'fiscal_periods',
  'digital_certificates',
  'archived_documents'
);
```

### Fonctions créées :

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%audit%'
OR routine_name LIKE '%seal%'
OR routine_name LIKE '%hash%';
```

Vous devriez voir :
- `calculate_document_hash`
- `log_audit_entry`
- `verify_audit_chain`
- `seal_fiscal_period`
- `create_fiscal_periods_for_month`
- `calculate_invoice_hash`
- `calculate_credit_note_hash`
- `archive_document`

### Triggers créés :

```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%audit%';
```

Vous devriez voir :
- `audit_invoices` sur `invoices`
- `audit_credit_notes` sur `credit_notes`
- `audit_proformas` sur `proformas`
- `prevent_locked_invoice_update` sur `invoices`
- `prevent_locked_credit_note_update` sur `credit_notes`

## ✅ Checklist finale

- [ ] Les 4 migrations sont appliquées sans erreur
- [ ] Les 5 nouvelles tables existent
- [ ] Les 8 fonctions PostgreSQL sont créées
- [ ] Les 5 triggers sont actifs
- [ ] RLS est activé sur toutes les nouvelles tables
- [ ] Les Edge Functions `generate-certificate` et `sign-document` sont déployées
- [ ] La génération de certificat fonctionne
- [ ] Le journal d'audit enregistre les opérations
- [ ] La vérification d'intégrité fonctionne
- [ ] Les périodes fiscales peuvent être créées et clôturées

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs Supabase : **Dashboard > Database > Logs**
2. Vérifiez les logs Edge Functions : **Dashboard > Edge Functions > Logs**
3. Consultez la documentation : `DOCUMENTATION_UTILISATEUR.md`
4. Vérifiez le plan technique : `PLAN_TECHNIQUE_CONFORMITE_ANTIFRAUD.md`

## 🎉 Félicitations !

Une fois toutes les étapes complétées, votre application DentalCloud est **100% conforme** à l'article 286 du CGI et prête à générer des attestations de conformité anti-fraude TVA !
