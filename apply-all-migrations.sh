#!/bin/bash

# Script pour appliquer toutes les migrations Supabase
# Ce script lit chaque fichier de migration et l'applique via l'API Supabase

set -e

MIGRATION_DIR="./supabase/migrations"
APPLIED_COUNT=0
FAILED_COUNT=0

echo "=========================================="
echo "  Application des migrations Supabase"
echo "=========================================="
echo ""

# Liste tous les fichiers de migration dans l'ordre
for migration_file in $(ls -1 "$MIGRATION_DIR"/*.sql | sort); do
    filename=$(basename "$migration_file")
    echo "📝 Migration: $filename"

    # Lire le contenu du fichier
    content=$(cat "$migration_file")

    # Note: Cette partie doit être exécutée via l'outil MCP Supabase
    # car on ne peut pas appeler l'API Supabase directement depuis ce script
    echo "   ⏳ En attente d'application..."

    APPLIED_COUNT=$((APPLIED_COUNT + 1))
done

echo ""
echo "=========================================="
echo "✅ $APPLIED_COUNT migrations à appliquer"
echo "=========================================="
echo ""
echo "⚠️  IMPORTANT: Ce script liste les migrations."
echo "    Vous devez les appliquer manuellement via l'outil MCP Supabase"
echo "    ou via le Supabase Dashboard."
