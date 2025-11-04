#!/bin/bash

# Script de déploiement rapide - À exécuter depuis votre machine locale

set -e

SERVER_IP="185.172.57.253"
SERVER_USER="root"

echo "=========================================="
echo "Déploiement rapide DentalCloud"
echo "=========================================="

echo "1. Préparation de l'archive..."
tar -czf /tmp/dentalcloud.tar.gz \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.git \
    --exclude=*.log \
    .

echo "2. Transfert vers le serveur..."
scp /tmp/dentalcloud.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

echo "3. Déploiement sur le serveur..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /tmp
mkdir -p ~/dentalcloud-deploy
tar -xzf dentalcloud.tar.gz -C ~/dentalcloud-deploy
cd ~/dentalcloud-deploy
chmod +x deploy.sh migrate-database.sh
./deploy.sh
./migrate-database.sh
ENDSSH

echo ""
echo "=========================================="
echo "Déploiement terminé!"
echo "=========================================="
echo ""
echo "Votre application est accessible à:"
echo "  https://dentalcloud.fr"
echo ""
echo "N'oubliez pas de configurer vos DNS!"
