#!/bin/bash

# Script pour construire l'image Docker avec toutes les variables d'environnement

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
  --build-arg VITE_DSCORE_CLIENT_ID="$VITE_DSCORE_CLIENT_ID" \
  --build-arg VITE_DSCORE_CLIENT_SECRET="$VITE_DSCORE_CLIENT_SECRET" \
  --build-arg VITE_DSCORE_ENVIRONMENT="$VITE_DSCORE_ENVIRONMENT" \
  --build-arg VITE_DSCORE_SANDBOX_BASE_HOST="$VITE_DSCORE_SANDBOX_BASE_HOST" \
  --build-arg VITE_DSCORE_SANDBOX_AUTH_HOST="$VITE_DSCORE_SANDBOX_AUTH_HOST" \
  --build-arg VITE_DSCORE_PRODUCTION_BASE_HOST="$VITE_DSCORE_PRODUCTION_BASE_HOST" \
  --build-arg VITE_DSCORE_PRODUCTION_AUTH_HOST="$VITE_DSCORE_PRODUCTION_AUTH_HOST" \
  --build-arg VITE_DSCORE_GLOBAL_HOST="$VITE_DSCORE_GLOBAL_HOST" \
  --build-arg VITE_DSCORE_CALLBACK_URL="$VITE_DSCORE_CALLBACK_URL" \
  --build-arg VITE_3SHAPE_CLIENT_ID="$VITE_3SHAPE_CLIENT_ID" \
  --build-arg VITE_3SHAPE_CLIENT_SECRET="$VITE_3SHAPE_CLIENT_SECRET" \
  --build-arg VITE_3SHAPE_API_URL="$VITE_3SHAPE_API_URL" \
  --build-arg VITE_3SHAPE_AUTH_URL="$VITE_3SHAPE_AUTH_URL" \
  --build-arg VITE_3SHAPE_CALLBACK_URL="$VITE_3SHAPE_CALLBACK_URL" \
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
