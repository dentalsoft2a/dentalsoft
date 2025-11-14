#!/bin/bash

# Script pour construire l'image Docker avec les variables d'environnement

# Charger les variables depuis .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  Fichier .env non trouvé!"
    echo "Copiez .env.example vers .env et remplissez les valeurs"
    exit 1
fi

echo "🔨 Construction de l'image Docker..."

docker build \
  --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --build-arg VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
  -t gb-dental:latest .

if [ $? -eq 0 ]; then
    echo "✅ Image Docker construite avec succès!"
    echo ""
    echo "Pour lancer le conteneur:"
    echo "  docker run -d -p 3000:3000 --name gb-dental gb-dental:latest"
    echo ""
    echo "Pour voir les logs:"
    echo "  docker logs -f gb-dental"
else
    echo "❌ Erreur lors de la construction de l'image Docker"
    exit 1
fi
