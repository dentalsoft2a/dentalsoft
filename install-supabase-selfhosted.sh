#!/bin/bash

# Configuration
SUPABASE_DIR="/opt/supabase"
DOMAIN="dentalcloud.fr"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Installation de Supabase Self-Hosted ===${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Ce script doit être exécuté en tant que root${NC}"
    exit 1
fi

# Check system requirements
echo -e "${YELLOW}Vérification des ressources système...${NC}"
TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
if [ "$TOTAL_RAM" -lt 4 ]; then
    echo -e "${RED}ATTENTION: Supabase nécessite au moins 4GB de RAM${NC}"
    echo "Vous avez seulement ${TOTAL_RAM}GB"
    read -p "Voulez-vous continuer quand même? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update system
echo -e "${YELLOW}Mise à jour du système...${NC}"
apt update && apt upgrade -y

# Install Docker
echo -e "${YELLOW}Installation de Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    echo "Docker est déjà installé"
fi

# Install Docker Compose
echo -e "${YELLOW}Installation de Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose est déjà installé"
fi

# Create Supabase directory
echo -e "${YELLOW}Création du répertoire Supabase...${NC}"
mkdir -p ${SUPABASE_DIR}
cd ${SUPABASE_DIR}

# Clone Supabase
echo -e "${YELLOW}Clonage de Supabase...${NC}"
if [ ! -d "${SUPABASE_DIR}/docker" ]; then
    git clone --depth 1 https://github.com/supabase/supabase
    cd supabase/docker
else
    echo "Supabase est déjà cloné"
    cd supabase/docker
fi

# Copy example env
cp .env.example .env

# Generate secrets
echo -e "${YELLOW}Génération des secrets...${NC}"
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
ANON_KEY=$(openssl rand -base64 32)
SERVICE_ROLE_KEY=$(openssl rand -base64 32)
DASHBOARD_PASSWORD=$(openssl rand -base64 16)

# Update .env file
sed -i "s|POSTGRES_PASSWORD=your-super-secret-and-long-postgres-password|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|g" .env
sed -i "s|JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters-long|JWT_SECRET=${JWT_SECRET}|g" .env
sed -i "s|ANON_KEY=.*|ANON_KEY=${ANON_KEY}|g" .env
sed -i "s|SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}|g" .env
sed -i "s|DASHBOARD_USERNAME=supabase|DASHBOARD_USERNAME=admin|g" .env
sed -i "s|DASHBOARD_PASSWORD=this_password_is_insecure_and_should_be_updated|DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD}|g" .env

# Set site URL
sed -i "s|SITE_URL=http://localhost:3000|SITE_URL=https://${DOMAIN}|g" .env
sed -i "s|API_EXTERNAL_URL=http://localhost:8000|API_EXTERNAL_URL=https://api.${DOMAIN}|g" .env

# Configure firewall
echo -e "${YELLOW}Configuration du pare-feu...${NC}"
ufw allow 8000/tcp  # Kong API Gateway
ufw allow 3000/tcp  # Studio
ufw allow 5432/tcp  # PostgreSQL (optionnel, pour accès externe)

# Start Supabase
echo -e "${YELLOW}Démarrage de Supabase...${NC}"
docker-compose up -d

# Wait for services to start
echo -e "${YELLOW}Attente du démarrage des services (60 secondes)...${NC}"
sleep 60

# Check if services are running
echo -e "${YELLOW}Vérification des services...${NC}"
docker-compose ps

# Save credentials
cat > ${SUPABASE_DIR}/credentials.txt << EOF
=================================
SUPABASE CREDENTIALS
=================================
Date: $(date)

DATABASE:
---------
Host: localhost (ou ${DOMAIN})
Port: 5432
Database: postgres
User: postgres
Password: ${POSTGRES_PASSWORD}

API:
----
URL: http://localhost:8000
Site URL: https://${DOMAIN}
JWT Secret: ${JWT_SECRET}
Anon Key: ${ANON_KEY}
Service Role Key: ${SERVICE_ROLE_KEY}

STUDIO (Interface Admin):
-------------------------
URL: http://localhost:3000
Username: admin
Password: ${DASHBOARD_PASSWORD}

IMPORTANT:
----------
Pour votre application frontend (.env):
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=${ANON_KEY}

SÉCURISEZ CE FICHIER!
chmod 600 ${SUPABASE_DIR}/credentials.txt
EOF

chmod 600 ${SUPABASE_DIR}/credentials.txt

# Create management scripts
cat > /usr/local/bin/supabase-start << 'STARTEOF'
#!/bin/bash
cd /opt/supabase/supabase/docker
docker-compose start
echo "Supabase démarré"
STARTEOF

cat > /usr/local/bin/supabase-stop << 'STOPEOF'
#!/bin/bash
cd /opt/supabase/supabase/docker
docker-compose stop
echo "Supabase arrêté"
STOPEOF

cat > /usr/local/bin/supabase-restart << 'RESTARTEOF'
#!/bin/bash
cd /opt/supabase/supabase/docker
docker-compose restart
echo "Supabase redémarré"
RESTARTEOF

cat > /usr/local/bin/supabase-logs << 'LOGSEOF'
#!/bin/bash
cd /opt/supabase/supabase/docker
docker-compose logs -f
LOGSEOF

cat > /usr/local/bin/supabase-backup << 'BACKUPEOF'
#!/bin/bash
BACKUP_DIR="/opt/supabase/backups"
mkdir -p ${BACKUP_DIR}
DATE=$(date +%Y%m%d_%H%M%S)
docker exec supabase-db pg_dump -U postgres postgres > ${BACKUP_DIR}/backup_${DATE}.sql
gzip ${BACKUP_DIR}/backup_${DATE}.sql
echo "Backup créé: ${BACKUP_DIR}/backup_${DATE}.sql.gz"
BACKUPEOF

chmod +x /usr/local/bin/supabase-*

# Setup automatic backup
echo -e "${YELLOW}Configuration des backups automatiques...${NC}"
cat > /etc/cron.daily/supabase-backup << 'CRONEOF'
#!/bin/bash
/usr/local/bin/supabase-backup
# Nettoyer les backups de plus de 7 jours
find /opt/supabase/backups -name "backup_*.sql.gz" -mtime +7 -delete
CRONEOF
chmod +x /etc/cron.daily/supabase-backup

# Configure reverse proxy for Supabase
echo -e "${YELLOW}Configuration du reverse proxy Nginx...${NC}"
cat > /etc/nginx/sites-available/supabase << EOF
# Supabase API
server {
    listen 80;
    server_name api.${DOMAIN};

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# Supabase Studio
server {
    listen 80;
    server_name studio.${DOMAIN};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/supabase /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}Installation terminée!${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo -e "${YELLOW}VOS CREDENTIALS:${NC}"
cat ${SUPABASE_DIR}/credentials.txt
echo ""
echo -e "${YELLOW}Le fichier complet est sauvegardé dans: ${SUPABASE_DIR}/credentials.txt${NC}"
echo ""
echo -e "${YELLOW}Accès:${NC}"
echo "- API: http://localhost:8000 (ou http://api.${DOMAIN} après config DNS/SSL)"
echo "- Studio: http://localhost:3000 (ou http://studio.${DOMAIN} après config DNS/SSL)"
echo ""
echo -e "${YELLOW}Commandes utiles:${NC}"
echo "- Démarrer: supabase-start"
echo "- Arrêter: supabase-stop"
echo "- Redémarrer: supabase-restart"
echo "- Voir les logs: supabase-logs"
echo "- Backup manuel: supabase-backup"
echo ""
echo -e "${YELLOW}Configuration DNS recommandée:${NC}"
echo "- Type A: api.${DOMAIN} -> 185.172.57.253"
echo "- Type A: studio.${DOMAIN} -> 185.172.57.253"
echo ""
echo -e "${YELLOW}Après configuration DNS, installez SSL:${NC}"
echo "certbot --nginx -d api.${DOMAIN} -d studio.${DOMAIN}"
