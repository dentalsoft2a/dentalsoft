#!/bin/bash

# Script de diagnostic JWT pour Supabase
# Utilisation: ./diagnose-jwt.sh

set -e

INSTALL_DIR="/opt/gb-dental"

echo "=========================================="
echo "  🔍 Diagnostic JWT Supabase"
echo "=========================================="
echo ""

# Vérifier que le répertoire existe
if [ ! -d "$INSTALL_DIR" ]; then
    echo "❌ Erreur: Le répertoire $INSTALL_DIR n'existe pas"
    exit 1
fi

cd $INSTALL_DIR

# 1. Vérifier le fichier .env
echo "1️⃣  Vérification du fichier .env"
if [ ! -f .env ]; then
    echo "   ❌ Fichier .env introuvable"
    exit 1
fi

JWT_SECRET=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2)
ANON_KEY=$(grep "^SUPABASE_ANON_KEY=" .env | cut -d'=' -f2)
SERVICE_KEY=$(grep "^SUPABASE_SERVICE_KEY=" .env | cut -d'=' -f2)

if [ -z "$JWT_SECRET" ]; then
    echo "   ❌ JWT_SECRET non trouvé dans .env"
    exit 1
fi

echo "   ✅ JWT_SECRET trouvé (${#JWT_SECRET} caractères)"
echo "   ✅ ANON_KEY trouvé (${#ANON_KEY} caractères)"
echo "   ✅ SERVICE_KEY trouvé (${#SERVICE_KEY} caractères)"
echo ""

# 2. Vérifier les conteneurs
echo "2️⃣  Vérification des conteneurs"
AUTH_RUNNING=$(docker compose ps auth --format json 2>/dev/null | grep -q "running" && echo "yes" || echo "no")
REST_RUNNING=$(docker compose ps rest --format json 2>/dev/null | grep -q "running" && echo "yes" || echo "no")

if [ "$AUTH_RUNNING" = "yes" ]; then
    echo "   ✅ Conteneur auth en cours d'exécution"
else
    echo "   ❌ Conteneur auth non démarré"
fi

if [ "$REST_RUNNING" = "yes" ]; then
    echo "   ✅ Conteneur rest en cours d'exécution"
else
    echo "   ❌ Conteneur rest non démarré"
fi
echo ""

# 3. Vérifier les variables d'environnement dans les conteneurs
echo "3️⃣  Vérification des variables d'environnement"
if [ "$AUTH_RUNNING" = "yes" ]; then
    AUTH_JWT=$(docker compose exec -T auth env | grep "GOTRUE_JWT_SECRET=" | cut -d'=' -f2 | tr -d '\r\n')
    if [ "$AUTH_JWT" = "$JWT_SECRET" ]; then
        echo "   ✅ JWT_SECRET correspond dans auth"
    else
        echo "   ❌ JWT_SECRET ne correspond PAS dans auth"
        echo "      .env:        $JWT_SECRET"
        echo "      auth:        $AUTH_JWT"
    fi
else
    echo "   ⚠️  Impossible de vérifier auth (conteneur non démarré)"
fi

if [ "$REST_RUNNING" = "yes" ]; then
    REST_JWT=$(docker compose exec -T rest env | grep "PGRST_JWT_SECRET=" | cut -d'=' -f2 | tr -d '\r\n')
    if [ "$REST_JWT" = "$JWT_SECRET" ]; then
        echo "   ✅ JWT_SECRET correspond dans rest"
    else
        echo "   ❌ JWT_SECRET ne correspond PAS dans rest"
        echo "      .env:        $JWT_SECRET"
        echo "      rest:        $REST_JWT"
    fi
else
    echo "   ⚠️  Impossible de vérifier rest (conteneur non démarré)"
fi
echo ""

# 4. Test de la clé JWT avec l'API
echo "4️⃣  Test de l'API REST"
API_DOMAIN=$(grep "^SUPABASE_PUBLIC_URL=" .env | cut -d'=' -f2 | sed 's|https://||')
if [ -z "$API_DOMAIN" ]; then
    echo "   ⚠️  SUPABASE_PUBLIC_URL non trouvé dans .env"
else
    RESPONSE=$(curl -s -w "\n%{http_code}" "https://${API_DOMAIN}/rest/v1/" -H "apikey: ${ANON_KEY}" 2>/dev/null || echo -e "\n000")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n -1)

    if [ "$HTTP_CODE" = "200" ]; then
        echo "   ✅ API répond correctement (HTTP 200)"
    else
        echo "   ❌ API retourne HTTP $HTTP_CODE"
        if echo "$BODY" | grep -q "Invalid API key"; then
            echo "      Erreur: Clé API invalide"
        elif echo "$BODY" | grep -q "authentication"; then
            echo "      Erreur: Problème d'authentification JWT"
        else
            echo "      Réponse: $BODY"
        fi
    fi
fi
echo ""

# 5. Vérification de la validité du JWT
echo "5️⃣  Vérification de la structure du JWT"
ANON_PARTS=$(echo "$ANON_KEY" | tr '.' '\n' | wc -l)
if [ "$ANON_PARTS" -eq 3 ]; then
    echo "   ✅ ANON_KEY a la structure correcte (3 parties)"

    # Décoder le payload
    PAYLOAD=$(echo "$ANON_KEY" | cut -d'.' -f2)
    # Ajouter le padding si nécessaire
    case $((${#PAYLOAD} % 4)) in
        2) PAYLOAD="${PAYLOAD}==" ;;
        3) PAYLOAD="${PAYLOAD}=" ;;
    esac
    DECODED=$(echo "$PAYLOAD" | tr '_-' '/+' | base64 -d 2>/dev/null || echo "{}")

    if echo "$DECODED" | grep -q '"role":"anon"'; then
        echo "   ✅ ANON_KEY contient le rôle 'anon'"
    else
        echo "   ❌ ANON_KEY ne contient pas le rôle 'anon'"
        echo "      Payload décodé: $DECODED"
    fi
else
    echo "   ❌ ANON_KEY a une structure invalide ($ANON_PARTS parties au lieu de 3)"
fi
echo ""

# 6. Recommandations
echo "=========================================="
echo "  📋 Recommandations"
echo "=========================================="
echo ""

if [ "$AUTH_JWT" != "$JWT_SECRET" ] || [ "$REST_JWT" != "$JWT_SECRET" ]; then
    echo "⚠️  Les JWT_SECRET ne correspondent pas!"
    echo ""
    echo "Solution:"
    echo "  1. Arrêtez les services: docker compose down"
    echo "  2. Vérifiez le fichier .env"
    echo "  3. Redémarrez: docker compose up -d"
    echo "  4. Attendez 90 secondes"
    echo ""
elif [ "$HTTP_CODE" != "200" ]; then
    echo "⚠️  L'API ne répond pas correctement"
    echo ""
    echo "Vérifications à faire:"
    echo "  1. Vérifiez les logs: docker compose logs auth rest"
    echo "  2. Vérifiez que tous les services sont démarrés: docker compose ps"
    echo "  3. Attendez quelques minutes et réessayez"
    echo ""
else
    echo "✅ Tout semble correct!"
    echo ""
    echo "Si vous avez toujours des problèmes:"
    echo "  1. Vérifiez les logs: docker compose logs -f"
    echo "  2. Vérifiez la base de données: docker compose logs postgres"
    echo ""
fi
