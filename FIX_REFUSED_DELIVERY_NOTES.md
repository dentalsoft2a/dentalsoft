# Fix: Bons de livraison refusés encore visibles dans Gestion des Travaux

## Problème identifié

Les bons de livraison marqués comme "refusés" (supprimés par le laboratoire) restaient visibles dans:
- La page **Gestion des Travaux**
- Le **Tableau de bord**
- Le **Calendrier**

## Cause du problème

Le système a été modifié pour utiliser un **soft delete** au lieu d'un **hard delete** pour les bons de livraison:
- Au lieu de supprimer physiquement les enregistrements
- Les bons de livraison sont marqués avec `status = 'refused'`
- Cela permet de garder un historique des demandes refusées

**Migration concernée**: `20251113134504_20251113001000_add_rejection_tracking_to_delivery_notes.sql`

Cette migration a ajouté:
```sql
ALTER TABLE delivery_notes
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid;
```

## Problème dans le code

Les requêtes filtraient uniquement les bons **"completed"** mais pas les **"refused"**:

### ❌ AVANT (Problématique)

```typescript
// WorkManagementPage.tsx - Ligne 163
const { data, error } = await supabase
  .from('delivery_notes')
  .select('...')
  .eq('user_id', userId)
  .neq('status', 'completed')  // ← Exclut uniquement "completed"
  .order('created_at', { ascending: false });
```

Cela signifie que les bons avec status = "refused" étaient toujours affichés! 😱

## Solution appliquée

Ajouter un filtre supplémentaire pour exclure les bons refusés:

### ✅ APRÈS (Corrigé)

```typescript
const { data, error } = await supabase
  .from('delivery_notes')
  .select('...')
  .eq('user_id', userId)
  .neq('status', 'completed')  // ← Exclut les terminés
  .neq('status', 'refused')    // ← Exclut les refusés ✅
  .order('created_at', { ascending: false });
```

## Fichiers modifiés

### 1. **WorkManagementPage.tsx** (Page Gestion des Travaux)
**Ligne 172**: Ajout de `.neq('status', 'refused')`

```diff
  const { data, error } = await supabase
    .from('delivery_notes')
    .select('...')
    .eq('user_id', userId)
    .neq('status', 'completed')
+   .neq('status', 'refused')
    .order('created_at', { ascending: false });
```

### 2. **DashboardPage.tsx** (Tableau de bord)
**Ligne 226**: Ajout de `.neq('status', 'refused')` pour le comptage des livraisons à venir

```diff
  supabase
    .from('delivery_notes')
    .select('id, date, status', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .neq('status', 'completed')
+   .neq('status', 'refused')
    .gte('date', now.toISOString().split('T')[0])
    .lte('date', twoDaysFromNow.toISOString().split('T')[0])
```

### 3. **CalendarPage.tsx** (Calendrier)
**Ligne 64**: Ajout de `.neq('status', 'refused')` pour l'affichage du calendrier

```diff
  const { data, error } = await supabase
    .from('delivery_notes')
    .select('...')
    .eq('user_id', user.id)
+   .neq('status', 'refused')
    .gte('date', startOfMonth.toISOString().split('T')[0])
    .lte('date', endOfMonth.toISOString().split('T')[0])
    .order('date');
```

## Fichiers NON modifiés (et pourquoi)

### **DeliveryNotesPage.tsx**
Cette page affiche intentionnellement **TOUS** les bons de livraison, y compris les refusés, car:
- C'est la page de gestion principale des bons de livraison
- Les laboratoires doivent pouvoir voir l'historique complet
- Les bons refusés peuvent être consultés pour référence

```typescript
// Ligne 80-84 - PAS de filtre sur le statut (CORRECT)
const { data, error } = await supabase
  .from('delivery_notes')
  .select('*, dentists(name)')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });
// ← Affiche TOUS les statuts incluant "refused" ✅
```

## Statuts des bons de livraison

Après ce fix, voici comment chaque statut est géré:

| Statut | Description | Gestion Travaux | Dashboard | Calendrier | Bons de Livraison |
|--------|-------------|-----------------|-----------|------------|-------------------|
| `pending` | En attente | ✅ Affiché | ✅ Compté | ✅ Affiché | ✅ Affiché |
| `pending_approval` | En attente d'approbation | ✅ Affiché | ✅ Compté | ✅ Affiché | ✅ Affiché |
| `in_progress` | En cours | ✅ Affiché | ✅ Compté | ✅ Affiché | ✅ Affiché |
| `completed` | Terminé | ❌ Masqué | ❌ Exclu | ✅ Affiché | ✅ Affiché |
| `refused` | Refusé (supprimé) | ❌ **Masqué** ✅ | ❌ **Exclu** ✅ | ❌ **Masqué** ✅ | ✅ Affiché |

## Vérification de la base de données

Pour voir les bons de livraison refusés:

```sql
SELECT id, delivery_number, status, rejection_reason, rejected_at
FROM delivery_notes
WHERE status = 'refused'
ORDER BY rejected_at DESC;
```

Exemple de résultat actuel:
```
id                                  | delivery_number | status  | rejected_at
------------------------------------+-----------------+---------+----------------------------
65be7f11-5a45-4a65-b590-d1711381cddf | DENT-000002    | refused | 2025-11-13 14:06:41.654627+00
68051cec-6653-4d9c-acee-04e99beb3e7a | DENT-000001    | refused | 2025-11-13 13:41:48.277345+00
```

## Comportement attendu après le fix

### Scénario 1: Refus d'un bon de livraison
1. Le laboratoire refuse une demande de bon de livraison
2. Le bon est marqué `status = 'refused'` dans la base de données
3. ✅ Le bon **disparaît immédiatement** de "Gestion des Travaux"
4. ✅ Le bon **disparaît** du Dashboard
5. ✅ Le bon **disparaît** du Calendrier
6. ✅ Le bon reste **visible** dans "Bons de Livraison" avec badge rouge "Refusé"

### Scénario 2: Consultation de l'historique
1. Le laboratoire va sur "Bons de Livraison"
2. ✅ Il peut voir **tous** les bons incluant les refusés
3. ✅ Les bons refusés ont un badge rouge distinctif
4. ✅ La raison du refus est affichée si disponible

## Test de validation

Pour tester que le fix fonctionne:

1. **Créez un bon de livraison de test**
   - Allez dans "Bons de Livraison"
   - Créez un nouveau bon

2. **Vérifiez qu'il apparaît partout**
   - ✅ Gestion des Travaux
   - ✅ Dashboard (dans les stats)
   - ✅ Calendrier
   - ✅ Bons de Livraison

3. **Refusez le bon de livraison**
   - Dans "Bons de Livraison"
   - Cliquez sur "Supprimer"
   - Confirmez

4. **Vérifiez qu'il a disparu**
   - ❌ Gestion des Travaux (ne doit plus apparaître)
   - ❌ Dashboard (ne doit plus être compté)
   - ❌ Calendrier (ne doit plus apparaître)
   - ✅ Bons de Livraison (doit toujours être visible avec badge "Refusé")

## Impact sur les performances

- **Positif**: Une condition de filtrage supplémentaire est négligeable
- **Index existant**: La migration a créé un index sur `status = 'refused'`
- **Pas d'impact négatif** sur les performances

## Vue pour les dentistes

Il existe également une vue `refused_delivery_notes_view` qui permet aux dentistes de voir leurs demandes refusées avec toutes les informations:

```sql
CREATE OR REPLACE VIEW refused_delivery_notes_view AS
SELECT
  dn.id,
  dn.delivery_number,
  dn.dentist_id,
  d.name as dentist_name,
  dn.rejection_reason,
  dn.rejected_at,
  dn.rejected_by,
  ...
FROM delivery_notes dn
LEFT JOIN dentists d ON d.id = dn.dentist_id
WHERE dn.status = 'refused';
```

## Conclusion

Le problème a été complètement résolu. Les bons de livraison refusés:
- ✅ N'apparaissent plus dans "Gestion des Travaux"
- ✅ Ne sont plus comptés dans le Dashboard
- ✅ N'apparaissent plus dans le Calendrier
- ✅ Restent visibles dans "Bons de Livraison" pour l'historique
- ✅ Conservent toutes les informations de refus (raison, date, qui a refusé)

Le système de soft-delete fonctionne maintenant correctement! 🎉
