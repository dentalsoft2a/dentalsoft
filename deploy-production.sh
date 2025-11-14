#!/bin/bash

echo "🚀 Déploiement en production de GB Dental avec DS-Core"
echo "========================================================"
echo ""

# Vérifier que .env existe
if [ ! -f .env ]; then
    echo "❌ Erreur: Fichier .env non trouvé!"
    echo "Copiez .env.example vers .env et configurez les variables"
    exit 1
fi

# Charger les variables
export $(cat .env | grep -v '^#' | xargs)

# Vérifier les variables critiques
if [ -z "$VITE_DSCORE_CLIENT_ID" ]; then
    echo "❌ Erreur: VITE_DSCORE_CLIENT_ID n'est pas défini dans .env"
    exit 1
fi

if [ -z "$VITE_DSCORE_CALLBACK_URL" ]; then
    echo "❌ Erreur: VITE_DSCORE_CALLBACK_URL n'est pas défini dans .env"
    exit 1
fi

echo "📋 Configuration détectée:"
echo "   - Client ID: ${VITE_DSCORE_CLIENT_ID:0:8}..."
echo "   - Callback URL: $VITE_DSCORE_CALLBACK_URL"
echo "   - Environment: ${VITE_DSCORE_ENVIRONMENT:-sandbox}"
echo ""

read -p "⚠️  Voulez-vous continuer le déploiement? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Déploiement annulé."
    exit 1
fi

echo ""
echo "🛑 Arrêt du conteneur existant..."
docker stop gb-dental 2>/dev/null || true
docker rm gb-dental 2>/dev/null || true

echo ""
echo "🗑️  Suppression de l'ancienne image..."
docker rmi gb-dental:latest 2>/dev/null || true

echo ""
echo "🔨 Construction de la nouvelle image Docker..."
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
  --no-cache \
  -t gb-dental:latest .

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Erreur lors de la construction de l'image Docker"
    exit 1
fi

echo ""
echo "🚀 Lancement du nouveau conteneur..."
docker run -d \
  -p 3000:3000 \
  --name gb-dental \
  --restart unless-stopped \
  gb-dental:latest

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Erreur lors du lancement du conteneur"
    exit 1
fi

echo ""
echo "⏳ Attente du démarrage du conteneur (5 secondes)..."
sleep 5

echo ""
echo "📊 État du conteneur:"
docker ps | grep gb-dental

echo ""
echo "📝 Dernières lignes des logs:"
docker logs --tail 20 gb-dental

echo ""
echo "✅ Déploiement terminé!"
echo ""
echo "🌐 Votre application est accessible sur: http://localhost:3000"
echo ""
echo "📋 Commandes utiles:"
echo "   - Voir les logs:     docker logs -f gb-dental"
echo "   - Arrêter:           docker stop gb-dental"
echo "   - Redémarrer:        docker restart gb-dental"
echo "   - Supprimer:         docker rm -f gb-dental"
echo ""
echo "⚠️  N'oubliez pas de configurer le Redirect URL dans DS-Core Developer Portal:"
echo "   - URL: $VITE_DSCORE_CALLBACK_URL"
echo "   - Portal: https://open.dscore.com"
echo ""
