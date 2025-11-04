# Guide de dépannage des migrations DentalCloud

## Problème rencontré : Erreurs "schema auth does not exist" et "role authenticated does not exist"

### Cause
Vous utilisez une image PostgreSQL standard alors que les migrations sont écrites pour **Supabase** qui nécessite :
- Le schéma `auth`
- Les rôles `anon`, `authenticated`, `service_role`
- Des fonctions helper comme `auth.uid()`

### Solution : Utiliser le script d'initialisation

#### Étape 1 : Réinitialiser la base de données

```bash
# Arrêter et supprimer les volumes
cd /opt/gb-dental
docker compose down -v

# Redémarrer uniquement PostgreSQL
docker compose up -d postgres

# Attendre 10 secondes que PostgreSQL démarre
sleep 10
```

#### Étape 2 : Appliquer les migrations avec le script

```bash
# Rendre le script exécutable
chmod +x init-database.sh

# Exécuter le script d'initialisation
./init-database.sh
```

Le script va :
1. ✅ Vérifier que PostgreSQL est prêt
2. ✅ Appliquer la migration d'initialisation Supabase (schéma auth + rôles)
3. ✅ Appliquer toutes vos migrations dans l'ordre
4. ✅ Afficher un résumé avec le nombre de succès/erreurs
5. ✅ Vérifier que les tables principales existent

#### Étape 3 : Démarrer tous les services

```bash
# Démarrer tous les services Supabase
docker compose up -d

# Vérifier que tout fonctionne
docker compose ps
```

## Vérification

### 1. Vérifier que les tables existent

```bash
docker compose exec -T postgres psql -U postgres -d postgres -c "\dt"
```

Vous devriez voir :
- profiles
- user_profiles
- dentists
- patients
- catalog
- resources
- delivery_notes
- invoices
- proformas
- credit_notes
- etc.

### 2. Vérifier que le schéma auth existe

```bash
docker compose exec -T postgres psql -U postgres -d postgres -c "\dn"
```

Vous devriez voir :
- public
- auth

### 3. Vérifier que les rôles existent

```bash
docker compose exec -T postgres psql -U postgres -d postgres -c "\du"
```

Vous devriez voir :
- anon
- authenticated
- service_role
- supabase_auth_admin
- authenticator

### 4. Tester l'authentification

```bash
# Accéder à Supabase Studio
http://localhost:3000

# Ou tester directement l'API Auth
curl http://localhost:8000/auth/v1/health
```

## Erreurs courantes et solutions

### Erreur : "relation does not exist"

**Cause :** Une migration essaie de modifier une table qui n'a pas été créée.

**Solution :**
```bash
# Vérifier l'ordre des migrations
ls -la supabase/migrations/

# La migration 00000000000000_init_supabase.sql doit être la première
# Si ce n'est pas le cas, renommez-la pour qu'elle s'exécute en premier
```

### Erreur : "role authenticated does not exist"

**Cause :** Le schéma Supabase n'a pas été initialisé.

**Solution :**
```bash
# Appliquer manuellement la migration d'initialisation
docker compose exec -T postgres psql -U postgres -d postgres < supabase/migrations/00000000000000_init_supabase.sql

# Puis relancer le script
./init-database.sh
```

### Erreur : "permission denied for schema auth"

**Cause :** Les permissions ne sont pas configurées correctement.

**Solution :**
```bash
# Se connecter en tant que postgres (superuser)
docker compose exec postgres psql -U postgres -d postgres

# Accorder les permissions
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
```

### Erreur : Container not running

**Cause :** PostgreSQL n'est pas démarré.

**Solution :**
```bash
# Démarrer PostgreSQL
docker compose up -d postgres

# Attendre qu'il soit prêt
docker compose logs -f postgres

# Ctrl+C quand vous voyez "database system is ready to accept connections"
```

## Réinitialisation complète (dernier recours)

Si rien ne fonctionne, réinitialisez complètement :

```bash
# 1. Tout arrêter et supprimer
docker compose down -v
docker volume prune -f

# 2. Nettoyer les données locales
sudo rm -rf /var/lib/docker/volumes/gb-dental_*

# 3. Redémarrer PostgreSQL seul
docker compose up -d postgres
sleep 10

# 4. Initialiser la base
./init-database.sh

# 5. Démarrer tous les services
docker compose up -d
```

## Logs utiles pour le debug

```bash
# Logs PostgreSQL
docker compose logs postgres

# Logs Auth
docker compose logs auth

# Logs REST API
docker compose logs rest

# Tous les logs
docker compose logs -f
```

## Support

Si vous rencontrez toujours des problèmes :

1. Vérifiez le fichier `.env` (toutes les variables sont renseignées ?)
2. Vérifiez `docker compose ps` (tous les services sont "running" ?)
3. Consultez les logs ci-dessus
4. Vérifiez que les ports ne sont pas déjà utilisés :
   ```bash
   sudo netstat -tulpn | grep -E '(5432|8000|3000)'
   ```

## Notes importantes

### Ordre d'exécution des migrations

Les migrations sont appliquées par ordre alphabétique des noms de fichiers. C'est pourquoi :
- `00000000000000_init_supabase.sql` s'exécute en premier (initialisation)
- Puis `20251029*.sql`, `20251102*.sql`, etc. dans l'ordre chronologique

### Migrations idempotentes

La plupart des migrations utilisent :
- `CREATE TABLE IF NOT EXISTS`
- `DO $$ BEGIN IF NOT EXISTS ... END $$`

Cela permet de réexécuter le script sans erreurs si une migration a déjà été appliquée.

### RLS (Row Level Security)

Toutes les tables ont RLS activé par défaut. Si vous ne pouvez pas accéder aux données :

```sql
-- Vérifier les policies
SELECT * FROM pg_policies WHERE tablename = 'nom_de_la_table';

-- Désactiver temporairement RLS (DEV UNIQUEMENT)
ALTER TABLE nom_de_la_table DISABLE ROW LEVEL SECURITY;
```

⚠️ **Ne jamais désactiver RLS en production !**
