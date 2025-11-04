#!/bin/bash
set -e

echo "=========================================="
echo "  Vérification de l'état de auth"
echo "=========================================="
echo ""

INSTALL_DIR="/opt/gb-dental"
cd ${INSTALL_DIR}

echo "1️⃣ Statut des services:"
docker compose ps

echo ""
echo "2️⃣ Logs du service auth (dernières 30 lignes):"
docker compose logs auth --tail=30

echo ""
echo "3️⃣ Vérification des tables auth dans la base:"
docker compose exec -T db psql -U postgres -d postgres << 'EOSQL'
\dt auth.*
EOSQL

echo ""
echo "4️⃣ Vérification de l'ownership des tables auth:"
docker compose exec -T db psql -U postgres -d postgres << 'EOSQL'
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'auth'
ORDER BY tablename;
EOSQL

echo ""
echo "5️⃣ Test de la connexion à l'API auth:"
echo "GET /health"
curl -s http://localhost:8000/auth/v1/health || echo "Failed"

echo ""
echo ""
echo "6️⃣ Test de signup:"
curl -s -X POST http://localhost:8000/auth/v1/signup \
  -H "Content-Type: application/json" \
  -H "apikey: ${ANON_KEY}" \
  -d '{"email":"test@example.com","password":"test123456"}' | jq .

echo ""
