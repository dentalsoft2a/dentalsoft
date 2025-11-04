#!/bin/bash

# Configuration
DOMAIN="dentalcloud.fr"
VPS_IP="185.172.57.253"
APP_NAME="dentalcloud"
APP_DIR="/var/www/${APP_NAME}"
NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${APP_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Déploiement de DentalCloud ===${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Ce script doit être exécuté en tant que root${NC}"
    echo "Utilisez: sudo bash deploy.sh"
    exit 1
fi

# Update system
echo -e "${YELLOW}Mise à jour du système...${NC}"
apt update && apt upgrade -y

# Install required packages
echo -e "${YELLOW}Installation des packages requis...${NC}"
apt install -y nginx nodejs npm certbot python3-certbot-nginx git curl ufw postgresql postgresql-contrib

# Configure firewall
echo -e "${YELLOW}Configuration du pare-feu...${NC}"
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw allow 5432/tcp
ufw --force enable

# Configure PostgreSQL
echo -e "${YELLOW}Configuration de PostgreSQL...${NC}"
systemctl start postgresql
systemctl enable postgresql

# Generate random password for database
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
DB_NAME="${APP_NAME}_db"
DB_USER="${APP_NAME}_user"

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE ${DB_NAME};
CREATE USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
EOF

# Configure PostgreSQL to accept connections
echo -e "${YELLOW}Configuration de l'accès PostgreSQL...${NC}"
PG_VERSION=$(ls /etc/postgresql/)
PG_CONF="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"
PG_HBA="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"

# Backup original configs
cp ${PG_HBA} ${PG_HBA}.backup
cp ${PG_CONF} ${PG_CONF}.backup

# Allow local connections
echo "host    ${DB_NAME}    ${DB_USER}    127.0.0.1/32    scram-sha-256" >> ${PG_HBA}
echo "host    ${DB_NAME}    ${DB_USER}    ::1/128         scram-sha-256" >> ${PG_HBA}

# Restart PostgreSQL
systemctl restart postgresql

echo -e "${GREEN}Base de données PostgreSQL configurée avec succès${NC}"

# Create app directory
echo -e "${YELLOW}Création du répertoire de l'application...${NC}"
mkdir -p ${APP_DIR}

# Create .env file with database credentials
echo -e "${YELLOW}Création du fichier .env...${NC}"
cat > .env.local << EOF
# Database Configuration
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
EOF

# Copy application files
echo -e "${YELLOW}Copie des fichiers de l'application...${NC}"
cp -r ./* ${APP_DIR}/
cp .env.local ${APP_DIR}/.env
cd ${APP_DIR}

# Install dependencies
echo -e "${YELLOW}Installation des dépendances...${NC}"
npm install

# Install psql node module for migrations
echo -e "${YELLOW}Installation du client PostgreSQL pour Node.js...${NC}"
npm install pg

# Run database migrations
echo -e "${YELLOW}Exécution des migrations de base de données...${NC}"
if [ -d "supabase/migrations" ]; then
    for migration in supabase/migrations/*.sql; do
        if [ -f "$migration" ]; then
            echo "Exécution de $(basename $migration)..."
            PGPASSWORD=${DB_PASSWORD} psql -h localhost -U ${DB_USER} -d ${DB_NAME} -f "$migration"
            if [ $? -ne 0 ]; then
                echo -e "${RED}Erreur lors de l'exécution de la migration: $(basename $migration)${NC}"
                exit 1
            fi
        fi
    done
    echo -e "${GREEN}Migrations exécutées avec succès${NC}"
else
    echo -e "${YELLOW}Aucun dossier de migrations trouvé${NC}"
fi

# Build application
echo -e "${YELLOW}Build de l'application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Erreur lors du build de l'application${NC}"
    exit 1
fi

# Configure Nginx
echo -e "${YELLOW}Configuration de Nginx...${NC}"
cat > ${NGINX_CONF} << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name dentalcloud.fr www.dentalcloud.fr;

    root /var/www/dentalcloud/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Disable logging for favicon
    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }

    # Disable logging for robots.txt
    location = /robots.txt {
        log_not_found off;
        access_log off;
    }
}
EOF

# Enable site
ln -sf ${NGINX_CONF} ${NGINX_ENABLED}

# Test Nginx configuration
echo -e "${YELLOW}Test de la configuration Nginx...${NC}"
nginx -t

if [ $? -ne 0 ]; then
    echo -e "${RED}Erreur dans la configuration Nginx${NC}"
    exit 1
fi

# Restart Nginx
echo -e "${YELLOW}Redémarrage de Nginx...${NC}"
systemctl restart nginx

# Check if DNS is properly configured
echo -e "${YELLOW}Vérification de la configuration DNS...${NC}"
DNS_CHECK=$(host ${DOMAIN} | grep "has address ${VPS_IP}")

if [ -z "$DNS_CHECK" ]; then
    echo -e "${YELLOW}ATTENTION: Le DNS ne semble pas correctement configuré${NC}"
    echo "Veuillez vous assurer que ${DOMAIN} pointe vers ${VPS_IP}"
    echo -e "${YELLOW}Configuration DNS requise:${NC}"
    echo "  Type A: ${DOMAIN} -> ${VPS_IP}"
    echo "  Type A: www.${DOMAIN} -> ${VPS_IP}"
    echo ""
    read -p "Appuyez sur Entrée une fois le DNS configuré pour continuer avec SSL, ou Ctrl+C pour annuler..."
fi

# Install SSL certificate
echo -e "${YELLOW}Installation du certificat SSL avec Let's Encrypt...${NC}"
certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} --redirect

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Certificat SSL installé avec succès${NC}"
else
    echo -e "${YELLOW}L'installation SSL a échoué. Vous pourrez la relancer manuellement avec:${NC}"
    echo "certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
fi

# Setup automatic SSL renewal
echo -e "${YELLOW}Configuration du renouvellement automatique SSL...${NC}"
systemctl enable certbot.timer
systemctl start certbot.timer

# Set proper permissions
echo -e "${YELLOW}Configuration des permissions...${NC}"
chown -R www-data:www-data ${APP_DIR}
chmod -R 755 ${APP_DIR}

# Create deployment info file
cat > ${APP_DIR}/deployment-info.txt << EOF
Deployment Date: $(date)
Domain: ${DOMAIN}
Server IP: ${VPS_IP}
App Directory: ${APP_DIR}
Nginx Config: ${NGINX_CONF}

Database Information:
- Database Name: ${DB_NAME}
- Database User: ${DB_USER}
- Database Password: ${DB_PASSWORD}
- Connection String: postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
- Host: localhost
- Port: 5432
EOF

# Save database credentials securely
echo -e "${YELLOW}Sauvegarde sécurisée des identifiants de base de données...${NC}"
cat > ${APP_DIR}/.db-credentials << EOF
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
EOF

chmod 600 ${APP_DIR}/.db-credentials
chown www-data:www-data ${APP_DIR}/.db-credentials

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}Déploiement terminé avec succès!${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo -e "Votre application est maintenant disponible sur:"
echo -e "${GREEN}https://${DOMAIN}${NC}"
echo ""
echo -e "${YELLOW}Informations importantes:${NC}"
echo "1. Fichiers de l'application: ${APP_DIR}"
echo "2. Configuration Nginx: ${NGINX_CONF}"
echo "3. Logs Nginx: /var/log/nginx/"
echo "4. Renouvellement SSL: automatique via certbot"
echo "5. Base de données PostgreSQL: ${DB_NAME}"
echo "6. Identifiants DB: ${APP_DIR}/.db-credentials"
echo ""
echo -e "${YELLOW}Informations de base de données:${NC}"
echo "- Database: ${DB_NAME}"
echo "- User: ${DB_USER}"
echo "- Password: ${DB_PASSWORD}"
echo "- Host: localhost"
echo "- Port: 5432"
echo "- Connection: postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
echo ""
echo -e "${YELLOW}Pour mettre à jour l'application:${NC}"
echo "1. Modifier les fichiers dans ${APP_DIR}"
echo "2. cd ${APP_DIR}"
echo "3. npm run build"
echo "4. systemctl reload nginx"
echo ""
echo -e "${YELLOW}Commandes utiles:${NC}"
echo "- Redémarrer Nginx: systemctl restart nginx"
echo "- Voir les logs Nginx: tail -f /var/log/nginx/error.log"
echo "- Tester la config Nginx: nginx -t"
echo "- Renouveler SSL manuellement: certbot renew"
echo "- Se connecter à la DB: PGPASSWORD=${DB_PASSWORD} psql -h localhost -U ${DB_USER} -d ${DB_NAME}"
echo "- Backup DB: pg_dump -h localhost -U ${DB_USER} ${DB_NAME} > backup.sql"
echo "- Restore DB: PGPASSWORD=${DB_PASSWORD} psql -h localhost -U ${DB_USER} -d ${DB_NAME} < backup.sql"
