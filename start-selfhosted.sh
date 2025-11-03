#!/bin/bash

# GB Dental - Script de démarrage pour self-hosting
# Ce script configure et démarre tous les services nécessaires

set -e

echo "🚀 Démarrage de GB Dental Self-Hosted..."
echo ""

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez l'installer d'abord."
    echo "   Installation: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# Vérifier que Docker Compose est installé
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé."
    exit 1
fi

echo "✅ Docker et Docker Compose sont installés"
echo ""

# Vérifier que le fichier .env existe
if [ ! -f .env ]; then
    echo "⚠️  Fichier .env non trouvé. Création depuis .env.example..."

    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Fichier .env créé"
        echo ""
        echo "⚠️  IMPORTANT: Editez le fichier .env et configurez :"
        echo "   - POSTGRES_PASSWORD (mot de passe sécurisé)"
        echo "   - JWT_SECRET (secret sécurisé)"
        echo "   - SMTP_* (configuration email)"
        echo "   - URLs publiques si nécessaire"
        echo ""
        read -p "Appuyez sur Entrée quand vous avez terminé..."
    else
        echo "❌ Fichier .env.example non trouvé"
        exit 1
    fi
fi

echo "✅ Configuration .env trouvée"
echo ""

# Créer les répertoires nécessaires
mkdir -p supabase/migrations
mkdir -p supabase/functions

echo "✅ Répertoires créés"
echo ""

# Arrêter les conteneurs existants
echo "🛑 Arrêt des conteneurs existants (si présents)..."
docker compose down 2>/dev/null || true
echo ""

# Nettoyer les volumes orphelins (optionnel)
read -p "Voulez-vous nettoyer les volumes de données existants ? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 Nettoyage des volumes..."
    docker compose down -v
    echo "✅ Volumes nettoyés"
fi
echo ""

# Démarrer les services
echo "🚀 Démarrage des services Docker..."
docker compose up -d

echo ""
echo "⏳ Attente du démarrage de PostgreSQL..."
sleep 10

# Vérifier que PostgreSQL est démarré
until docker compose exec postgres pg_isready -U postgres &> /dev/null; do
    echo "   Attente de PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL est prêt"
echo ""

# Appliquer les migrations
echo "📦 Application des migrations..."

if [ -d "supabase/migrations" ] && [ "$(ls -A supabase/migrations/*.sql 2>/dev/null)" ]; then
    for migration in supabase/migrations/*.sql; do
        if [ -f "$migration" ]; then
            echo "   Applying: $(basename $migration)"
            docker compose exec -T postgres psql -U postgres -d postgres < "$migration"
        fi
    done
    echo "✅ Migrations appliquées"
else
    echo "⚠️  Aucune migration trouvée dans supabase/migrations/"
fi

echo ""
echo "✅ Installation terminée !"
echo ""
echo "📍 Services disponibles :"
echo "   - Supabase Studio : http://localhost:3000"
echo "   - API REST        : http://localhost:8000"
echo "   - PostgreSQL      : localhost:5432"
echo ""
echo "🔧 Commandes utiles :"
echo "   - Voir les logs     : docker compose logs -f"
echo "   - Arrêter          : docker compose down"
echo "   - Redémarrer       : docker compose restart"
echo "   - État des services: docker compose ps"
echo ""
echo "📚 Pour démarrer le frontend :"
echo "   cd $(pwd)"
echo "   npm install"
echo "   npm run dev"
echo ""
echo "🎉 GB Dental est prêt à l'emploi !"
