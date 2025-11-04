#!/bin/bash

# Script de migration de la base de données pour DentalCloud
set -e

echo "=========================================="
echo "Migration de la base de données DentalCloud"
echo "=========================================="

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_DIR="/var/www/dentalcloud"

echo -e "${GREEN}Application des migrations...${NC}"

# Récupération du mot de passe de la base de données
DB_PASSWORD=$(grep DATABASE_URL $APP_DIR/.env.production | cut -d: -f3 | cut -d@ -f1)

# Application de chaque fichier de migration dans l'ordre
for migration in $APP_DIR/supabase/migrations/*.sql; do
    echo -e "${YELLOW}Application de: $(basename $migration)${NC}"
    PGPASSWORD="$DB_PASSWORD" psql -h localhost -U dentalcloud_user -d dentalcloud -f "$migration"
done

echo -e "${GREEN}Migrations appliquées avec succès!${NC}"
