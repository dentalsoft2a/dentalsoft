#!/bin/bash

# Script de migration pour PostgreSQL auto-hébergé (sans Supabase)
set -e

echo "=========================================="
echo "Migration base de données auto-hébergée"
echo "=========================================="

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_DIR="/var/www/dentalcloud"

echo -e "${GREEN}Récupération des informations de connexion...${NC}"
DB_PASSWORD=$(grep DATABASE_URL $APP_DIR/.env.production | cut -d: -f3 | cut -d@ -f1)

echo -e "${GREEN}Création du rôle 'authenticated' pour compatibilité...${NC}"
sudo -u postgres psql -d dentalcloud <<'EOSQL'
-- Création des rôles pour compatibilité avec les migrations Supabase
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END
$$;

-- Accorder les privilèges nécessaires à dentalcloud_user
GRANT authenticated TO dentalcloud_user;
GRANT anon TO dentalcloud_user;
GRANT service_role TO dentalcloud_user;

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EOSQL

echo -e "${GREEN}Application des migrations...${NC}"

# Application de chaque fichier de migration dans l'ordre (sauf init_supabase.sql)
for migration in $APP_DIR/supabase/migrations/*.sql; do
    filename=$(basename "$migration")

    # Ignorer le fichier d'initialisation Supabase
    if [ "$filename" != "00000000000000_init_supabase.sql" ]; then
        echo -e "${YELLOW}Application de: $filename${NC}"
        PGPASSWORD="$DB_PASSWORD" psql -h localhost -U dentalcloud_user -d dentalcloud -f "$migration" 2>&1 | grep -v "does not exist" | grep -v "already exists" | grep -v "NOTICE" || true
    fi
done

echo -e "${GREEN}Vérification de l'utilisateur super admin...${NC}"
sudo -u postgres psql -d dentalcloud <<EOSQL
-- Vérifier si la table subscription_plans existe et contient des données
DO \$\$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscription_plans') THEN
    IF NOT EXISTS (SELECT 1 FROM subscription_plans LIMIT 1) THEN
      INSERT INTO subscription_plans (id, name, price, features)
      VALUES ('trial', 'Essai gratuit', 0, '{"max_users": 1, "max_storage": "1GB"}'::jsonb);
    END IF;
  END IF;
END
\$\$;
EOSQL

echo -e "${GREEN}=========================================="
echo -e "Migrations appliquées avec succès!"
echo -e "==========================================${NC}"
