#!/bin/bash

# Script de correction des permissions PostgreSQL
# Utilisation: ./fix-database-permissions.sh

set -e

INSTALL_DIR="/opt/gb-dental"

echo "=========================================="
echo "  🔧 Correction des permissions PostgreSQL"
echo "=========================================="
echo ""

cd $INSTALL_DIR

# 1. Vérifier que la base est accessible
echo "1️⃣  Vérification de la connexion à PostgreSQL..."
if ! docker compose exec -T db pg_isready -U postgres > /dev/null 2>&1; then
    echo "   ❌ PostgreSQL n'est pas accessible"
    exit 1
fi
echo "   ✅ PostgreSQL est accessible"
echo ""

# 2. Créer les rôles et permissions
echo "2️⃣  Création des rôles et permissions..."
docker compose exec -T db psql -U postgres -d postgres << 'EOSQL'
-- Création des rôles
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN NOINHERIT;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN NOINHERIT;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
        CREATE ROLE authenticator LOGIN NOINHERIT;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
        CREATE ROLE supabase_auth_admin LOGIN;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
        CREATE ROLE supabase_storage_admin LOGIN;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
        CREATE ROLE supabase_admin LOGIN;
    END IF;
END
$$;

-- Mise à jour des mots de passe
DO $$
BEGIN
    EXECUTE 'ALTER ROLE authenticator PASSWORD ' || quote_literal(current_setting('custom.postgres_password'));
    EXECUTE 'ALTER ROLE supabase_auth_admin PASSWORD ' || quote_literal(current_setting('custom.postgres_password'));
    EXECUTE 'ALTER ROLE supabase_storage_admin PASSWORD ' || quote_literal(current_setting('custom.postgres_password'));
    EXECUTE 'ALTER ROLE supabase_admin PASSWORD ' || quote_literal(current_setting('custom.postgres_password'));
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END
$$;

-- Grants sur les rôles
GRANT anon, authenticated, service_role TO authenticator;
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_storage_admin;
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_admin;
GRANT ALL PRIVILEGES ON DATABASE postgres TO postgres;

-- Création des schémas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS _realtime;
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grants sur le schéma public
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO supabase_admin;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT CREATE ON SCHEMA public TO supabase_admin;
GRANT CREATE ON SCHEMA public TO postgres;

-- Grants sur le schéma auth
GRANT USAGE ON SCHEMA auth TO supabase_auth_admin, authenticated, anon;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT CREATE ON SCHEMA auth TO supabase_auth_admin;

-- Grants sur le schéma storage
GRANT USAGE ON SCHEMA storage TO supabase_storage_admin, authenticated, anon;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
GRANT CREATE ON SCHEMA storage TO supabase_storage_admin;

-- Grants sur le schéma _realtime
GRANT USAGE ON SCHEMA _realtime TO postgres;
GRANT ALL ON SCHEMA _realtime TO postgres;

-- Grants sur le schéma extensions
GRANT USAGE ON SCHEMA extensions TO postgres;
GRANT ALL ON SCHEMA extensions TO postgres;

-- Permissions par défaut pour les futures tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, supabase_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, supabase_admin;

ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON FUNCTIONS TO supabase_auth_admin;

ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON TABLES TO supabase_storage_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON SEQUENCES TO supabase_storage_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON FUNCTIONS TO supabase_storage_admin;

-- Installation des extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgjwt WITH SCHEMA extensions;

\echo '✅ Permissions configurées avec succès'
EOSQL

if [ $? -eq 0 ]; then
    echo "   ✅ Rôles et permissions créés"
else
    echo "   ❌ Erreur lors de la création des rôles"
    exit 1
fi
echo ""

# 3. Redémarrer les services
echo "3️⃣  Redémarrage des services..."
docker compose restart auth storage realtime
echo "   ✅ Services redémarrés"
echo ""

# 4. Attente
echo "4️⃣  Attente du démarrage (30 secondes)..."
sleep 30
echo ""

# 5. Vérification
echo "5️⃣  Vérification de l'état des services..."
docker compose ps
echo ""

echo "=========================================="
echo "  ✅ Correction terminée"
echo "=========================================="
echo ""
echo "Vérifiez les logs si nécessaire:"
echo "  docker compose logs auth"
echo "  docker compose logs storage"
echo ""
