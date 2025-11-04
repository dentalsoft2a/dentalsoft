#!/bin/bash

# Script pour générer les clés JWT Supabase avec votre JWT_SECRET
# Usage: ./generate-jwt-keys.sh

echo "🔐 Générateur de clés JWT pour Supabase"
echo "========================================"
echo ""

# Vérifier si .env existe
if [ ! -f ".env" ]; then
    echo "❌ Erreur : Fichier .env introuvable"
    echo "   Assurez-vous d'être dans le dossier /opt/gb-dental"
    exit 1
fi

# Lire le JWT_SECRET
JWT_SECRET=$(grep "^JWT_SECRET=" .env | cut -d '=' -f2 | tr -d ' ' | tr -d '"' | tr -d "'")

if [ -z "$JWT_SECRET" ]; then
    echo "❌ Erreur : JWT_SECRET introuvable dans .env"
    echo "   Générez-le avec : openssl rand -base64 32"
    exit 1
fi

echo "✅ JWT_SECRET trouvé dans .env"
echo ""

# Fonction pour générer un JWT avec Node.js (si disponible)
generate_with_node() {
    node -e "
const crypto = require('crypto');

function base64url(source) {
    let encoded = Buffer.from(source).toString('base64');
    encoded = encoded.replace(/=+$/, '');
    encoded = encoded.replace(/\+/g, '-');
    encoded = encoded.replace(/\//g, '_');
    return encoded;
}

function sign(payload, secret) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const signature = crypto
        .createHmac('sha256', secret)
        .update(encodedHeader + '.' + encodedPayload)
        .digest('base64');
    const encodedSignature = signature
        .replace(/=+$/, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    return encodedHeader + '.' + encodedPayload + '.' + encodedSignature;
}

const secret = '$JWT_SECRET';

const anonPayload = {
    iss: 'supabase',
    role: 'anon',
    iat: 1760831220,
    exp: 4916504820
};

const servicePayload = {
    iss: 'supabase',
    role: 'service_role',
    iat: 1760831220,
    exp: 4916504820
};

console.log('ANON:' + sign(anonPayload, secret));
console.log('SERVICE:' + sign(servicePayload, secret));
"
}

# Fonction pour générer avec Python (si disponible)
generate_with_python() {
    python3 -c "
import hmac
import hashlib
import json
import base64

def base64url_encode(data):
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def generate_jwt(payload, secret):
    header = {'alg': 'HS256', 'typ': 'JWT'}

    encoded_header = base64url_encode(json.dumps(header).encode())
    encoded_payload = base64url_encode(json.dumps(payload).encode())

    message = f'{encoded_header}.{encoded_payload}'
    signature = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).digest()
    encoded_signature = base64url_encode(signature)

    return f'{message}.{encoded_signature}'

secret = '$JWT_SECRET'

anon_payload = {
    'iss': 'supabase',
    'role': 'anon',
    'iat': 1760831220,
    'exp': 4916504820
}

service_payload = {
    'iss': 'supabase',
    'role': 'service_role',
    'iat': 1760831220,
    'exp': 4916504820
}

print('ANON:' + generate_jwt(anon_payload, secret))
print('SERVICE:' + generate_jwt(service_payload, secret))
"
}

# Essayer avec Node.js
if command -v node &> /dev/null; then
    echo "🔧 Génération des tokens avec Node.js..."
    RESULT=$(generate_with_node 2>/dev/null)
    if [ $? -eq 0 ]; then
        ANON_KEY=$(echo "$RESULT" | grep "^ANON:" | cut -d':' -f2-)
        SERVICE_KEY=$(echo "$RESULT" | grep "^SERVICE:" | cut -d':' -f2-)

        echo "✅ Tokens générés avec succès !"
        echo ""
        echo "========================================="
        echo "📋 COPIEZ CES VALEURS DANS VOTRE .env :"
        echo "========================================="
        echo ""
        echo "SUPABASE_ANON_KEY=$ANON_KEY"
        echo ""
        echo "SUPABASE_SERVICE_KEY=$SERVICE_KEY"
        echo ""
        echo "VITE_SUPABASE_ANON_KEY=$ANON_KEY"
        echo ""
        echo "========================================="
        echo ""
        echo "💡 Pour mettre à jour automatiquement le .env :"
        echo "   sed -i \"s|^SUPABASE_ANON_KEY=.*|SUPABASE_ANON_KEY=$ANON_KEY|\" .env"
        echo "   sed -i \"s|^SUPABASE_SERVICE_KEY=.*|SUPABASE_SERVICE_KEY=$SERVICE_KEY|\" .env"
        echo "   sed -i \"s|^VITE_SUPABASE_ANON_KEY=.*|VITE_SUPABASE_ANON_KEY=$ANON_KEY|\" .env"
        exit 0
    fi
fi

# Essayer avec Python
if command -v python3 &> /dev/null; then
    echo "🔧 Génération des tokens avec Python..."
    RESULT=$(generate_with_python 2>/dev/null)
    if [ $? -eq 0 ]; then
        ANON_KEY=$(echo "$RESULT" | grep "^ANON:" | cut -d':' -f2-)
        SERVICE_KEY=$(echo "$RESULT" | grep "^SERVICE:" | cut -d':' -f2-)

        echo "✅ Tokens générés avec succès !"
        echo ""
        echo "========================================="
        echo "📋 COPIEZ CES VALEURS DANS VOTRE .env :"
        echo "========================================="
        echo ""
        echo "SUPABASE_ANON_KEY=$ANON_KEY"
        echo ""
        echo "SUPABASE_SERVICE_KEY=$SERVICE_KEY"
        echo ""
        echo "VITE_SUPABASE_ANON_KEY=$ANON_KEY"
        echo ""
        echo "========================================="
        echo ""
        echo "💡 Pour mettre à jour automatiquement le .env :"
        echo "   sed -i \"s|^SUPABASE_ANON_KEY=.*|SUPABASE_ANON_KEY=$ANON_KEY|\" .env"
        echo "   sed -i \"s|^SUPABASE_SERVICE_KEY=.*|SUPABASE_SERVICE_KEY=$SERVICE_KEY|\" .env"
        echo "   sed -i \"s|^VITE_SUPABASE_ANON_KEY=.*|VITE_SUPABASE_ANON_KEY=$ANON_KEY|\" .env"
        exit 0
    fi
fi

# Si aucune méthode ne fonctionne
echo "❌ Ni Node.js ni Python3 ne sont disponibles"
echo ""
echo "📝 Méthode manuelle :"
echo ""
echo "1. Allez sur https://jwt.io"
echo "2. Dans HEADER, laissez par défaut"
echo "3. Dans PAYLOAD, collez :"
echo '   {"iss":"supabase","role":"anon","iat":1760831220,"exp":4916504820}'
echo "4. Dans VERIFY SIGNATURE (en bas), collez votre JWT_SECRET :"
echo "   $JWT_SECRET"
echo "5. Copiez le token encodé (en bleu) → SUPABASE_ANON_KEY"
echo ""
echo "6. Répétez avec ce payload pour SERVICE_KEY :"
echo '   {"iss":"supabase","role":"service_role","iat":1760831220,"exp":4916504820}'
echo ""
exit 1
