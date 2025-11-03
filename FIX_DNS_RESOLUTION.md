# 🔧 Fix : "name resolution failed" sur /auth/v1/signup

## Problème

L'erreur `{"message":"name resolution failed"}` signifie que les conteneurs Docker ne peuvent pas communiquer entre eux car ils ne sont pas sur le même réseau.

## Solution rapide (5 minutes)

### Étape 1 : Arrêter les conteneurs actuels

```bash
cd /opt/gb-dental
docker compose down
```

### Étape 2 : Remplacer le fichier docker-compose.yml

```bash
# Sauvegarder l'ancien fichier
mv docker-compose.yml docker-compose.yml.backup

# Utiliser la version corrigée
mv docker-compose.fixed.yml docker-compose.yml
```

**OU** créez un nouveau `docker-compose.yml` avec le réseau ajouté.

### Étape 3 : Vérifier le fichier .env

Assurez-vous que votre fichier `.env` contient les bonnes valeurs :

```bash
cat .env
```

**Valeurs importantes :**

```bash
# Votre IP ou domaine
SITE_URL=http://dentalcloud.fr
SUPABASE_PUBLIC_URL=http://dentalcloud.fr:8000
GOTRUE_URI_ALLOW_LIST=http://dentalcloud.fr,http://dentalcloud.fr:8000

# JWT Secret (doit être le même partout)
JWT_SECRET=votre-secret-jwt

# PostgreSQL
POSTGRES_PASSWORD=votre-mot-de-passe-postgres

# Clés Supabase (laisser par défaut pour commencer)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Frontend
VITE_SUPABASE_URL=http://dentalcloud.fr:8000
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

### Étape 4 : Redémarrer les services

```bash
# Démarrer tous les services
docker compose up -d

# Attendre que PostgreSQL soit prêt
sleep 15

# Vérifier que tous les services sont démarrés
docker compose ps
```

**Résultat attendu :** Tous les services doivent être "Up"

### Étape 5 : Vérifier les logs

```bash
# Voir les logs de Auth
docker compose logs auth

# Voir les logs de Kong
docker compose logs kong
```

**Recherchez les erreurs.** Il ne doit pas y avoir de messages d'erreur de type "connection refused" ou "name resolution failed".

### Étape 6 : Tester la connexion interne

```bash
# Test 1 : Vérifier que Kong peut atteindre Auth
docker compose exec kong curl -v http://auth:9999/health

# Test 2 : Vérifier que Auth peut atteindre PostgreSQL
docker compose exec auth nc -zv postgres 5432

# Test 3 : Tester l'inscription depuis le serveur
curl -X POST http://localhost:8000/auth/v1/signup \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }'
```

### Étape 7 : Tester depuis votre navigateur

Allez sur : `http://dentalcloud.fr`

Essayez de créer un compte avec :
- Email : `test2@example.com`
- Mot de passe : `test123456`
- Prénom : Test
- Nom : User
- Laboratoire : Mon Labo

## Vérification du réseau Docker

Pour vérifier que le réseau est correctement créé :

```bash
# Lister les réseaux Docker
docker network ls

# Vous devriez voir "gb-dental-network"

# Inspecter le réseau
docker network inspect gb-dental_gb-dental-network

# Vérifier que tous les conteneurs sont sur ce réseau
```

## Problèmes courants et solutions

### Problème 1 : "Network gb-dental-network declared as external, but could not be found"

**Solution :**
```bash
# Créer le réseau manuellement
docker network create gb-dental-network

# Redémarrer
docker compose up -d
```

### Problème 2 : Les conteneurs ne peuvent toujours pas communiquer

**Solution :**
```bash
# Nettoyer complètement Docker
docker compose down -v
docker network prune -f

# Recréer tout
docker compose up -d
```

### Problème 3 : "Connection refused" sur port 9999

**Solution :**

Le service Auth n'est pas démarré ou a crashé.

```bash
# Voir les logs
docker compose logs auth

# Redémarrer Auth
docker compose restart auth

# Vérifier que PostgreSQL est accessible
docker compose exec postgres psql -U postgres -c "SELECT version();"
```

### Problème 4 : "role authenticator does not exist"

**Solution :**

Les rôles PostgreSQL nécessaires ne sont pas créés.

```bash
# Se connecter à PostgreSQL
docker compose exec postgres psql -U postgres

# Créer les rôles nécessaires
CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
CREATE ROLE supabase_auth_admin NOLOGIN NOINHERIT;
CREATE ROLE supabase_storage_admin NOLOGIN NOINHERIT;
CREATE ROLE supabase_admin NOLOGIN NOINHERIT;
CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'votre-mot-de-passe-postgres';

GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;
GRANT supabase_auth_admin TO authenticator;

\q
```

Puis redémarrez :
```bash
docker compose restart
```

## Configuration DNS alternative

Si le problème persiste, vous pouvez forcer la résolution DNS dans docker-compose.yml :

```yaml
services:
  auth:
    # ... autres configs
    extra_hosts:
      - "postgres:172.20.0.2"  # IP du conteneur postgres
```

Pour trouver l'IP du conteneur postgres :
```bash
docker inspect gb-dental-postgres | grep IPAddress
```

## Test final

Une fois tout configuré, testez avec :

```bash
# Depuis le serveur
curl http://localhost:8000/auth/v1/health

# Résultat attendu :
# {"version":"...","name":"GoTrue"}

# Test signup
curl -X POST http://dentalcloud.fr:8000/auth/v1/signup \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "data": {
      "first_name": "Test",
      "last_name": "User",
      "laboratory_name": "Mon Labo"
    }
  }'
```

**Si vous recevez une réponse JSON avec un user ID, c'est bon !** ✅

## Diagnostic complet

Si rien ne fonctionne, lancez ce script de diagnostic :

```bash
#!/bin/bash
echo "=== Diagnostic GB Dental ==="
echo ""

echo "1. État des conteneurs :"
docker compose ps
echo ""

echo "2. Réseaux Docker :"
docker network ls | grep gb-dental
echo ""

echo "3. Test de connexion PostgreSQL :"
docker compose exec postgres pg_isready -U postgres
echo ""

echo "4. Test de connexion Auth -> PostgreSQL :"
docker compose exec auth nc -zv postgres 5432
echo ""

echo "5. Test de connexion Kong -> Auth :"
docker compose exec kong nc -zv auth 9999
echo ""

echo "6. Logs Auth (dernières 20 lignes) :"
docker compose logs --tail=20 auth
echo ""

echo "7. Configuration .env (sans secrets) :"
grep -E "SITE_URL|SUPABASE_PUBLIC_URL" .env
echo ""

echo "=== Fin du diagnostic ==="
```

Sauvegardez ce script dans `diagnostic.sh`, rendez-le exécutable et lancez-le :

```bash
chmod +x diagnostic.sh
./diagnostic.sh
```

Envoyez-moi le résultat pour un diagnostic plus précis !

## Besoin d'aide ?

Si le problème persiste après toutes ces étapes :

1. Copiez les logs complets :
   ```bash
   docker compose logs > logs.txt
   ```

2. Vérifiez la configuration :
   ```bash
   cat .env > config.txt  # Attention : masquez les mots de passe !
   ```

3. Vérifiez le réseau :
   ```bash
   docker network inspect gb-dental_gb-dental-network > network.txt
   ```

Envoyez ces fichiers pour analyse.
