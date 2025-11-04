#!/bin/bash

# Script d'initialisation de la base de données DentalCloud
# Ce script applique toutes les migrations Supabase dans le bon ordre

set -e  # Exit on error

echo "🚀 Initialisation de la base de données DentalCloud"
echo "=================================================="
echo ""

# Vérifier que Docker Compose est en cours d'exécution
if ! docker compose ps 2>/dev/null | grep -q "gb-dental-postgres.*Up"; then
    echo "❌ Erreur : Le conteneur PostgreSQL n'est pas en cours d'exécution"
    echo "   Démarrez-le avec : docker compose up -d postgres"
    exit 1
fi

echo "✅ PostgreSQL est en cours d'exécution"
echo ""

# Attendre que PostgreSQL soit prêt
echo "⏳ Attente que PostgreSQL soit prêt..."
for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "✅ PostgreSQL est prêt"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Timeout : PostgreSQL n'est pas prêt après 30 secondes"
        exit 1
    fi
    sleep 1
done
echo ""

# Fonction pour appliquer une migration
apply_migration() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file")

    echo "📝 Application : $migration_name"

    if docker compose exec -T postgres psql -U postgres -d postgres < "$migration_file" 2>&1 | tee /tmp/migration_output.log | grep -q "ERROR"; then
        echo "⚠️  Warnings/errors détectés dans $migration_name (voir détails ci-dessus)"
        echo ""
        return 1
    else
        echo "✅ $migration_name appliquée avec succès"
        echo ""
        return 0
    fi
}

# Compteurs
total_migrations=0
successful_migrations=0
failed_migrations=0

# Appliquer les migrations dans l'ordre
echo "📦 Application des migrations..."
echo "================================"
echo ""

for migration in supabase/migrations/*.sql; do
    if [ -f "$migration" ]; then
        total_migrations=$((total_migrations + 1))

        if apply_migration "$migration"; then
            successful_migrations=$((successful_migrations + 1))
        else
            failed_migrations=$((failed_migrations + 1))
        fi
    fi
done

echo ""
echo "=================================================="
echo "📊 Résumé de l'initialisation"
echo "=================================================="
echo "Total de migrations    : $total_migrations"
echo "Succès                : $successful_migrations"
echo "Erreurs/Warnings      : $failed_migrations"
echo ""

if [ $failed_migrations -gt 0 ]; then
    echo "⚠️  Certaines migrations ont rencontré des erreurs"
    echo "   Cela peut être normal si vous réexécutez le script"
    echo "   Vérifiez les logs ci-dessus pour les détails"
    echo ""
fi

# Vérifier que les tables principales existent
echo "🔍 Vérification des tables principales..."
tables_check=$(docker compose exec -T postgres psql -U postgres -d postgres -t -c "
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'dentists', 'patients', 'catalog', 'invoices');
")

tables_count=$(echo $tables_check | tr -d ' ')

if [ "$tables_count" -ge 3 ]; then
    echo "✅ Les tables principales existent"
    echo ""
    echo "🎉 Base de données initialisée avec succès !"
    echo ""
    echo "📋 Prochaines étapes :"
    echo "1. Vérifiez Supabase Studio : http://localhost:3000"
    echo "2. Démarrez tous les services : docker compose up -d"
    echo "3. Compilez le frontend : npm run build"
    echo "4. Accédez à l'application : http://dentalcloud.fr"
else
    echo "⚠️  Certaines tables principales n'ont pas été créées"
    echo "   Tables trouvées : $tables_count / 5"
    echo ""
    echo "🔧 Essayez de réinitialiser la base :"
    echo "   docker compose down -v"
    echo "   docker compose up -d postgres"
    echo "   ./init-database.sh"
fi

echo ""
echo "=================================================="
