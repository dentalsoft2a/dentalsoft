#!/bin/bash

# Script pour appliquer toutes les migrations sur Supabase
# Usage: ./apply-all-migrations.sh

echo "🚀 Application des migrations sur Supabase..."
echo ""

# Vérifier que le fichier existe
if [ ! -f "combined_migration_safe.sql" ]; then
    echo "❌ Erreur: Le fichier combined_migration_safe.sql n'existe pas"
    echo "   Exécutez d'abord: ./make_safe_migration.sh"
    exit 1
fi

# Lire les variables d'environnement
if [ ! -f ".env" ]; then
    echo "❌ Erreur: Le fichier .env n'existe pas"
    exit 1
fi

source .env

# Vérifier que les variables sont définies
if [ -z "$VITE_SUPABASE_URL" ]; then
    echo "❌ Erreur: Variable VITE_SUPABASE_URL manquante dans .env"
    exit 1
fi

echo "📊 Informations:"
echo "   - Supabase URL: $VITE_SUPABASE_URL"
echo "   - Fichier: combined_migration_safe.sql"
echo "   - Taille: $(wc -l < combined_migration_safe.sql) lignes"
echo ""

# Extraire le project ref depuis l'URL
PROJECT_REF=$(echo $VITE_SUPABASE_URL | sed 's|https://||' | sed 's|\.supabase\.co.*||')

echo "📋 Instructions pour appliquer la migration:"
echo ""
echo "   1. Allez sur: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo "   2. Ouvrez le fichier: combined_migration_safe.sql"
echo "   3. Copiez TOUT le contenu ($(wc -l < combined_migration_safe.sql) lignes)"
echo "   4. Collez-le dans l'éditeur SQL du Dashboard"
echo "   5. Cliquez sur 'Run'"
echo "   6. Attendez ~30-60 secondes"
echo ""
echo "✅ Une fois la migration appliquée, n'oubliez pas de:"
echo "   1. Corriger l'URL Supabase dans Coolify (enlever le slash final)"
echo "   2. Redéployer l'application"
