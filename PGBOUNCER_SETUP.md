# Configuration PgBouncer pour Supabase

## Pourquoi PgBouncer?

PgBouncer est un **connection pooler** pour PostgreSQL qui permet de gérer efficacement les connexions à la base de données. Il est essentiel pour supporter un grand nombre d'utilisateurs simultanés.

### Problème Sans PgBouncer
- Chaque utilisateur = 1 connexion PostgreSQL
- Limite Supabase Free: 60 connexions max
- Limite Supabase Pro: 200 connexions max
- 1000 utilisateurs = **IMPOSSIBLE** sans pooling

### Solution Avec PgBouncer
- Mode Transaction: réutilise les connexions entre requêtes
- 1000 utilisateurs → 20-50 connexions réelles
- Performance optimale
- Coûts réduits

---

## Configuration Supabase (Recommandée)

Supabase offre PgBouncer intégré sur tous les plans.

### Étape 1: Accéder au Dashboard Supabase

1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Settings** → **Database**

### Étape 2: Activer Connection Pooling

Dans la section **Connection Pooling**:

```
Port: 6543 (PgBouncer port)
Mode: Transaction
Pool Size: 15 (par défaut)
```

### Étape 3: Obtenir l'URL de Connexion Poolée

Supabase fournit automatiquement une URL de connexion poolée:

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Important:** Notez le port **6543** (au lieu de 5432)

### Étape 4: Configuration dans l'Application

Dans votre fichier `.env`, vous avez déjà:
```env
VITE_SUPABASE_URL=https://eovmrvtiizyhyzcmpvov.supabase.co
VITE_SUPABASE_ANON_KEY=votre_anon_key
```

**Aucune modification nécessaire côté client!**

Le client Supabase JS utilise automatiquement l'API REST qui bénéficie du pooling.

---

## Modes de Pooling

### Mode Transaction (Recommandé)
- Une connexion est assignée pendant la durée d'une transaction
- Libérée immédiatement après le COMMIT
- **Idéal pour applications web**
- Compatible avec la majorité des requêtes

### Mode Session
- Une connexion par session utilisateur
- Plus de connexions utilisées
- Nécessaire si vous utilisez:
  - Temporary tables
  - LISTEN/NOTIFY
  - Advisory locks

### Mode Statement
- Chaque statement utilise une connexion
- Maximum de performance
- **Incompatible** avec transactions multi-statements

---

## Vérification du Pooling

### 1. Vérifier les Connexions Actives

Dans le dashboard Supabase, allez dans **Database** → **Roles & Privileges**:

```sql
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
```

### 2. Monitoring des Connexions

Dashboard Supabase → **Reports** → **Database**:
- Connection count
- Connection pool efficiency
- Active queries

### 3. Alertes Recommandées

Configurez des alertes si:
- Connexions actives > 80% du pool
- Temps d'attente de connexion > 500ms
- Timeouts de connexion

---

## Optimisations Complémentaires

### 1. Configuration Supabase Client

Le client actuel dans `src/lib/supabase.ts` est basique:

```typescript
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

**Optimisation possible** (optionnel):

```typescript
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-application-name': 'dentalcloud',
    },
  },
  db: {
    schema: 'public',
  },
});
```

### 2. Limite de Requêtes Simultanées

Pour éviter de saturer le pool, limitez les requêtes parallèles:

```typescript
// Exemple: Limiter à 5 requêtes simultanées
const batchSize = 5;
for (let i = 0; i < items.length; i += batchSize) {
  const batch = items.slice(i, i + batchSize);
  await Promise.all(batch.map(item => processItem(item)));
}
```

### 3. Timeouts

Ajoutez des timeouts pour éviter les connexions bloquées:

```typescript
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Query timeout')), 30000)
);

const queryPromise = supabase.from('table').select();

await Promise.race([queryPromise, timeoutPromise]);
```

---

## Monitoring et Debugging

### Logs Utiles

Pour monitorer l'utilisation du pool:

```sql
-- Voir les connexions par state
SELECT state, count(*)
FROM pg_stat_activity
GROUP BY state;

-- Voir les requêtes les plus longues
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC
LIMIT 10;

-- Voir les connexions par application
SELECT application_name, count(*)
FROM pg_stat_activity
GROUP BY application_name;
```

### Métriques à Surveiller

1. **Connection Pool Usage**: doit rester < 80%
2. **Wait Time**: doit être < 100ms
3. **Query Duration**: médiane < 50ms
4. **Error Rate**: doit être < 0.1%

---

## Plans Supabase et Limites

### Free Tier
- 60 connexions directes max
- PgBouncer inclus (mode transaction)
- Pool size: 15 connexions
- **Capacité réelle**: 100-150 utilisateurs simultanés

### Pro Tier (25$/mois)
- 200 connexions directes max
- PgBouncer inclus (mode transaction)
- Pool size: 15 connexions (configurable)
- **Capacité réelle**: 400-600 utilisateurs simultanés

### Enterprise Tier
- Connexions illimitées (configurables)
- PgBouncer dédié
- Pool size personnalisable
- **Capacité réelle**: 1000+ utilisateurs simultanés
- Prix: À partir de 2000$/mois

---

## Upgrade Path pour 1000 Utilisateurs

### Option 1: Supabase Enterprise (Recommandé)
```
Coût: ~2500$/mois
Avantages:
- PgBouncer inclus et optimisé
- Support premium
- Infrastructure dédiée
- Monitoring avancé
```

### Option 2: Self-hosted PgBouncer
```
Coût: ~500$/mois (serveur + Supabase Pro)
Complexité: Haute
Nécessite:
- Serveur PgBouncer dédié
- Configuration manuelle
- Maintenance continue
```

### Option 3: Architecture Hybride
```
Coût: ~1500$/mois
- Supabase Pro pour API
- PostgreSQL managé externe (AWS RDS)
- PgBouncer sur serveur dédié
- Redis pour cache
```

---

## Checklist de Mise en Production

- [ ] PgBouncer activé sur Supabase
- [ ] Mode Transaction configuré
- [ ] Pool size ajusté (15-30 connexions)
- [ ] Monitoring configuré (alertes)
- [ ] Timeouts configurés dans le code
- [ ] Tests de charge effectués (100, 500, 1000 users)
- [ ] Plan de scaling documenté
- [ ] Équipe formée au monitoring

---

## Ressources

- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooling)
- [PgBouncer Documentation](https://www.pgbouncer.org/)
- [PostgreSQL Connection Limits](https://www.postgresql.org/docs/current/runtime-config-connection.html)

---

## Contact Support

Pour activer Enterprise ou ajuster les limites:
- Email: support@supabase.com
- Dashboard: [https://supabase.com/dashboard/project/_/settings/billing](https://supabase.com/dashboard/project/_/settings/billing)
