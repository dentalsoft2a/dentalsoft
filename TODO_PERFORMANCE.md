# TODO - Optimisations Performance Restantes

## Vue Rapide

✅ **Complété**: 30%
⏳ **En cours**: Phase 1 (Pagination)
🎯 **Objectif**: 1000 utilisateurs simultanés

---

## Semaine 1: Quick Wins (Critique)

### Jour 1-2: Pagination Complète

#### InvoicesPage
```typescript
// À ajouter dans InvoicesPage.tsx
import { usePagination } from '../../hooks/usePagination';
import PaginationControls from '../common/PaginationControls';

// Dans le composant
const pagination = usePagination(filteredInvoices, { initialPageSize: 50 });
const paginatedInvoices = pagination.paginatedItems;

// Remplacer filteredInvoices.map() par paginatedInvoices.map()
// Ajouter <PaginationControls {...pagination} /> avant </div>
```

#### ProformasPage
```typescript
// Même pattern que InvoicesPage
const pagination = usePagination(filteredProformas, { initialPageSize: 50 });
```

#### DentistsPage
```typescript
const pagination = usePagination(filteredDentists, { initialPageSize: 50 });
```

#### CatalogPage
```typescript
const pagination = usePagination(filteredItems, { initialPageSize: 100 });
```

#### ResourcesPage
```typescript
const pagination = usePagination(filteredResources, { initialPageSize: 100 });
```

#### WorkManagementPage
```typescript
// Attention: WorkKanbanView avec colonnes
// Paginer les notes dans chaque colonne
const paginateStageNotes = (notes) => {
  return usePagination(notes, { initialPageSize: 20 });
};
```

**Estimé**: 2 jours
**Impact**: +150 utilisateurs supportés

---

### Jour 3: Optimisation SELECT *

#### Fichiers à optimiser (liste prioritaire)

1. **InvoicesPage.tsx**
```typescript
// Ligne ~45 - loadInvoices
.select('id, invoice_number, date, total, status, payment_method, dentists(name)')

// Ligne ~90 - loadCreditNotes
.select('id, credit_note_number, amount, date, type, status, is_correction')
```

2. **ProformasPage.tsx**
```typescript
// Ligne ~60 - loadProformas
.select('id, proforma_number, date, total, status, dentists(name)')

// Ligne ~120 - loadProformaItems
.select('id, description, quantity, unit_price, catalog_items(name)')
```

3. **CatalogPage.tsx**
```typescript
// Ligne ~35 - loadItems
.select('id, name, category, default_price, default_unit, is_active, stock_quantity, track_stock')
```

4. **ResourcesPage.tsx**
```typescript
// Ligne ~40 - loadResources
.select('id, name, category, stock_quantity, low_stock_threshold, track_stock, has_variants')
```

5. **WorkKanbanView.tsx**
```typescript
// Ligne ~80 - loadDeliveryNotes
.select('id, delivery_number, date, patient_name, current_stage_id, progress, dentists(name)')
```

6. **DashboardPage.tsx**
```typescript
// Ligne ~50 - loadStats
.select('id, date, total')  // Au lieu de SELECT *

// Ligne ~80 - lowStockItems
.select('id, name, stock_quantity, low_stock_threshold')
```

**Script de recherche**:
```bash
# Trouver tous les SELECT *
rg "\.select\('\*'\)" src/components --type ts
```

**Estimé**: 1 jour
**Impact**: -50% transfert données

---

### Jour 4: Debouncing Universel

#### Fichiers à modifier

1. **InvoicesPage.tsx**
```typescript
import { useDebounce } from '../../hooks/useDebounce';

const debouncedSearchTerm = useDebounce(searchTerm, 300);
const debouncedStatusFilter = useDebounce(statusFilter, 300);

// Utiliser debouncedSearchTerm dans le filtre
```

2. **ProformasPage.tsx**
```typescript
const debouncedSearchTerm = useDebounce(searchTerm, 300);
```

3. **DentistsPage.tsx**
```typescript
const debouncedSearchTerm = useDebounce(searchTerm, 300);
```

4. **CatalogPage.tsx**
```typescript
const debouncedSearchTerm = useDebounce(searchTerm, 300);
const debouncedCategoryFilter = useDebounce(categoryFilter, 300);
```

5. **HelpCenterPage.tsx**
```typescript
const debouncedSearchTerm = useDebounce(searchTerm, 300);
```

**Pattern à suivre**:
```typescript
// 1. Importer le hook
import { useDebounce } from '../../hooks/useDebounce';

// 2. Créer la valeur debouncée
const debouncedSearch = useDebounce(searchTerm, 300);

// 3. Utiliser dans le filtre
const filtered = items.filter(item =>
  item.name.toLowerCase().includes(debouncedSearch.toLowerCase())
);
```

**Estimé**: 1 jour
**Impact**: -80% requêtes de recherche

---

## Semaine 2-3: React Query (Cache Layer)

### Étape 1: Créer les Hooks (2-3 jours)

#### src/hooks/queries/useDeliveryNotes.ts
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export function useDeliveryNotes(userId: string) {
  return useQuery({
    queryKey: ['deliveryNotes', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_notes')
        .select('id, delivery_number, date, status, patient_name, dentists(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateDeliveryNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteData) => {
      const { data, error } = await supabase
        .from('delivery_notes')
        .insert([noteData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalider le cache pour recharger
      queryClient.invalidateQueries({ queryKey: ['deliveryNotes'] });
    },
  });
}

// useUpdateDeliveryNote, useDeleteDeliveryNote...
```

#### src/hooks/queries/useInvoices.ts
```typescript
// Même pattern que useDeliveryNotes
export function useInvoices(userId: string) { ... }
export function useCreateInvoice() { ... }
export function useUpdateInvoice() { ... }
```

#### src/hooks/queries/useProformas.ts
```typescript
export function useProformas(userId: string) { ... }
export function useCreateProforma() { ... }
```

#### src/hooks/queries/useDentists.ts
```typescript
export function useDentists(userId: string) { ... }
export function useCreateDentist() { ... }
```

#### src/hooks/queries/useCatalogItems.ts
```typescript
export function useCatalogItems(userId: string) { ... }
export function useCreateCatalogItem() { ... }
```

**Estimé**: 2-3 jours
**Impact**: Infrastructure pour cache

---

### Étape 2: Migrer les Composants (3-4 jours)

#### Exemple: DeliveryNotesPage
```typescript
// AVANT
const [deliveryNotes, setDeliveryNotes] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadDeliveryNotes();
}, [user]);

const loadDeliveryNotes = async () => {
  setLoading(true);
  const { data } = await supabase.from('delivery_notes')...
  setDeliveryNotes(data);
  setLoading(false);
};

// APRÈS
import { useDeliveryNotes, useCreateDeliveryNote } from '../../hooks/queries/useDeliveryNotes';

const { data: deliveryNotes, isLoading } = useDeliveryNotes(user.id);
const createNote = useCreateDeliveryNote();

// Création simplifié
const handleCreate = async (noteData) => {
  await createNote.mutateAsync(noteData);
  // Cache invalidé automatiquement!
};
```

**Pages à migrer**:
1. DeliveryNotesPage
2. InvoicesPage
3. ProformasPage
4. DentistsPage
5. CatalogPage
6. ResourcesPage

**Estimé**: 3-4 jours
**Impact**: -60% requêtes, cache intelligent

---

## Semaine 4: Optimisations Avancées

### Lazy Loading des Pages

#### App.tsx
```typescript
import { lazy, Suspense } from 'react';

// Au lieu de
import InvoicesPage from './components/invoices/InvoicesPage';

// Utiliser
const InvoicesPage = lazy(() => import('./components/invoices/InvoicesPage'));
const ProformasPage = lazy(() => import('./components/proformas/ProformasPage'));
const WorkManagementPage = lazy(() => import('./components/work/WorkManagementPage'));

// Dans le render
<Suspense fallback={<div>Chargement...</div>}>
  <InvoicesPage />
</Suspense>
```

**Estimé**: 1 jour
**Impact**: -30% bundle initial

---

### Migration PDF vers Edge Functions

#### DeliveryNotesPage - Génération PDF
```typescript
// AVANT
import { generateDeliveryNotePDF } from '../../utils/pdfGenerator';
const pdf = await generateDeliveryNotePDF(noteData);

// APRÈS
const { data: pdf, error } = await supabase.functions.invoke('generate-pdf', {
  body: {
    type: 'delivery_note',
    noteId: note.id
  }
});

if (error) throw error;
const blob = new Blob([pdf], { type: 'application/pdf' });
const url = URL.createObjectURL(blob);
window.open(url);
```

**Edge Functions à utiliser**:
- `generate-pdf` (delivery notes)
- `generate-invoice-pdf` (invoices)

**Estimé**: 2 jours
**Impact**: -60% CPU client

---

### Tests de Charge

#### Installation k6
```bash
brew install k6  # macOS
# ou
curl -L https://github.com/grafana/k6/releases/download/v0.45.0/k6-v0.45.0-linux-amd64.tar.gz | tar xvz
```

#### Script de test: load-test.js
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up à 100 users
    { duration: '5m', target: 100 },  // Maintenir 100 users
    { duration: '2m', target: 500 },  // Ramp up à 500 users
    { duration: '5m', target: 500 },  // Maintenir 500 users
    { duration: '2m', target: 1000 }, // Ramp up à 1000 users
    { duration: '5m', target: 1000 }, // Maintenir 1000 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
};

export default function () {
  // Simuler login
  const loginRes = http.post('https://YOUR_APP/api/login', {
    email: 'test@example.com',
    password: 'password123',
  });

  check(loginRes, { 'logged in successfully': (r) => r.status === 200 });

  // Simuler navigation
  http.get('https://YOUR_APP/dashboard');
  sleep(1);

  http.get('https://YOUR_APP/delivery-notes');
  sleep(2);

  http.get('https://YOUR_APP/invoices');
  sleep(2);
}
```

#### Exécuter les tests
```bash
k6 run load-test.js
```

**Métriques à surveiller**:
- Response time (p95 < 500ms)
- Error rate (< 0.1%)
- Database connections (< 80% pool)
- Memory usage

**Estimé**: 1-2 jours
**Impact**: Validation capacité

---

## Infrastructure & Monitoring

### Option 1: Upgrade Supabase Enterprise

**Coût**: ~2500$/mois

**Bénéfices**:
- Connexions illimitées
- Support 24/7
- Infrastructure dédiée
- SLA 99.95%

**Contact**: support@supabase.com

---

### Option 2: Monitoring Avancé

#### Sentry (Erreurs)
```bash
npm install @sentry/react
```

```typescript
// src/main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
  tracesSampleRate: 0.1,
});
```

#### React Query Devtools (Dev)
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

---

## Checklist Complète

### Phase 1: Quick Wins (Semaine 1)
- [x] Hook usePagination créé
- [x] Composant PaginationControls créé
- [x] DeliveryNotesPage paginée
- [x] Hook useDebounce créé
- [x] DeliveryNotesPage avec debouncing
- [x] SELECT optimisé dans DeliveryNotesPage
- [x] React Query configuré
- [x] PgBouncer documenté
- [x] Build validé
- [ ] InvoicesPage paginée
- [ ] ProformasPage paginée
- [ ] DentistsPage paginée
- [ ] CatalogPage paginée
- [ ] ResourcesPage paginée
- [ ] Optimiser tous les SELECT *
- [ ] Debouncing sur toutes recherches

### Phase 2: React Query (Semaine 2-3)
- [ ] Créer hook useDeliveryNotes
- [ ] Créer hook useInvoices
- [ ] Créer hook useProformas
- [ ] Créer hook useDentists
- [ ] Créer hook useCatalogItems
- [ ] Migrer DeliveryNotesPage
- [ ] Migrer InvoicesPage
- [ ] Migrer ProformasPage
- [ ] Migrer DentistsPage
- [ ] Migrer CatalogPage

### Phase 3: Avancé (Semaine 4)
- [ ] Lazy loading des pages
- [ ] Migrer PDF vers Edge Functions
- [ ] Tests de charge (k6)
- [ ] Monitoring (Sentry)
- [ ] Optimiser images/assets
- [ ] Service Worker avancé

### Phase 4: Infrastructure
- [ ] Décision budget (Enterprise vs Hybride)
- [ ] Upgrade plan Supabase
- [ ] Configuration CDN (optionnel)
- [ ] Redis cache (optionnel)
- [ ] Alertes et monitoring

---

## Commandes Rapides

```bash
# Développement
npm run dev

# Build et vérifier
npm run build
npm run typecheck

# Chercher SELECT * à optimiser
rg "\.select\('\*'\)" src --type ts

# Chercher recherches sans debounce
rg "searchTerm" src --type ts -B 2 -A 2

# Taille du bundle
npm run build -- --analyze

# Tests de charge
k6 run load-test.js
```

---

## Ressources

- **React Query**: https://tanstack.com/query/latest
- **Supabase Docs**: https://supabase.com/docs
- **k6 Testing**: https://k6.io/docs/
- **Sentry**: https://docs.sentry.io/platforms/javascript/guides/react/

---

**Dernière mise à jour**: 18 novembre 2025
**Statut**: Phase 1 (30%) complétée
**Prochaine action**: Paginer InvoicesPage et ProformasPage
