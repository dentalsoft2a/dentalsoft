#!/bin/bash

# Script de déploiement automatique pour DentalCloud
# Domaine: dentalcloud.fr
# Serveur: 185.172.57.253

set -e

echo "=========================================="
echo "Déploiement de DentalCloud"
echo "=========================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Variables
DOMAIN="dentalcloud.fr"
WWW_DOMAIN="www.dentalcloud.fr"
APP_DIR="/var/www/dentalcloud"
NGINX_CONF="/etc/nginx/sites-available/dentalcloud"
EMAIL="admin@dentalcloud.fr"

echo -e "${GREEN}1. Mise à jour du système...${NC}"
sudo apt update
sudo apt upgrade -y

echo -e "${GREEN}2. Installation des dépendances...${NC}"
sudo apt install -y nginx certbot python3-certbot-nginx curl git ufw

# Installation de Node.js 20.x
echo -e "${GREEN}3. Installation de Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo -e "${GREEN}4. Configuration du pare-feu...${NC}"
sudo ufw --force enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5432/tcp  # PostgreSQL
sudo ufw reload

echo -e "${GREEN}5. Création du répertoire de l'application...${NC}"
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

echo -e "${GREEN}6. Copie des fichiers de l'application...${NC}"
cp -r ./* $APP_DIR/
cd $APP_DIR

echo -e "${GREEN}7. Installation des dépendances npm...${NC}"
npm install

echo -e "${GREEN}8. Build de l'application...${NC}"
npm run build

echo -e "${GREEN}9. Configuration de Nginx...${NC}"
sudo tee $NGINX_CONF > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN $WWW_DOMAIN;

    root $APP_DIR/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
EOF

echo -e "${GREEN}10. Activation du site Nginx...${NC}"
sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo -e "${GREEN}11. Configuration SSL avec Let's Encrypt...${NC}"
sudo certbot --nginx -d $DOMAIN -d $WWW_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

echo -e "${GREEN}12. Configuration du renouvellement automatique SSL...${NC}"
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

echo -e "${GREEN}13. Installation de PostgreSQL...${NC}"
sudo apt install -y postgresql postgresql-contrib

echo -e "${GREEN}14. Configuration de PostgreSQL...${NC}"
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Configuration PostgreSQL pour autoriser les connexions externes
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/*/main/postgresql.conf

# Ajout de la règle d'accès
echo "host    all             all             0.0.0.0/0               md5" | sudo tee -a /etc/postgresql/*/main/pg_hba.conf

# Redémarrage de PostgreSQL
sudo systemctl restart postgresql

# Création de la base de données et de l'utilisateur
DB_PASSWORD=$(openssl rand -base64 32)
sudo -u postgres psql <<EOSQL
CREATE DATABASE dentalcloud;
CREATE USER dentalcloud_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE dentalcloud TO dentalcloud_user;
ALTER DATABASE dentalcloud OWNER TO dentalcloud_user;
\c dentalcloud
GRANT ALL ON SCHEMA public TO dentalcloud_user;
EOSQL

echo -e "${GREEN}15. Sauvegarde des informations de connexion...${NC}"
cat > $APP_DIR/.env.production <<EOF
VITE_SUPABASE_URL=http://185.172.57.253:5432
VITE_SUPABASE_ANON_KEY=$DB_PASSWORD
DATABASE_URL=postgresql://dentalcloud_user:$DB_PASSWORD@localhost:5432/dentalcloud
EOF

echo -e "${GREEN}16. Installation de PostgREST pour l'API...${NC}"
cd /tmp
wget https://github.com/PostgREST/postgrest/releases/download/v12.0.2/postgrest-v12.0.2-linux-static-x64.tar.xz
tar xJf postgrest-v12.0.2-linux-static-x64.tar.xz
sudo mv postgrest /usr/local/bin/
sudo chmod +x /usr/local/bin/postgrest

# Configuration PostgREST
sudo mkdir -p /etc/postgrest
sudo tee /etc/postgrest/config <<EOF
db-uri = "postgres://dentalcloud_user:$DB_PASSWORD@localhost:5432/dentalcloud"
db-schemas = "public"
db-anon-role = "dentalcloud_user"
server-port = 3000
EOF

# Service systemd pour PostgREST
sudo tee /etc/systemd/system/postgrest.service <<EOF
[Unit]
Description=PostgREST API Server
After=postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=postgres
ExecStart=/usr/local/bin/postgrest /etc/postgrest/config
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl start postgrest
sudo systemctl enable postgrest

# Configuration Nginx pour proxy l'API
sudo tee /etc/nginx/sites-available/dentalcloud-api > /dev/null <<EOF
server {
    listen 80;
    server_name api.dentalcloud.fr;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/dentalcloud-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

echo -e "${GREEN}17. Configuration des sauvegardes automatiques...${NC}"
sudo mkdir -p /var/backups/dentalcloud

sudo tee /usr/local/bin/backup-dentalcloud.sh > /dev/null <<'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/dentalcloud"
DATE=$(date +%Y%m%d_%H%M%S)
sudo -u postgres pg_dump dentalcloud | gzip > "$BACKUP_DIR/dentalcloud_$DATE.sql.gz"
find $BACKUP_DIR -name "dentalcloud_*.sql.gz" -mtime +7 -delete
EOF

sudo chmod +x /usr/local/bin/backup-dentalcloud.sh

# Cron pour sauvegarde quotidienne à 2h du matin
(sudo crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-dentalcloud.sh") | sudo crontab -

echo -e "${GREEN}=========================================="
echo -e "Déploiement terminé avec succès!"
echo -e "==========================================${NC}"
echo ""
echo -e "${YELLOW}Informations importantes:${NC}"
echo ""
echo -e "URL de l'application: https://$DOMAIN"
echo -e "URL API: http://api.dentalcloud.fr"
echo ""
echo -e "Base de données:"
echo -e "  - Nom: dentalcloud"
echo -e "  - Utilisateur: dentalcloud_user"
echo -e "  - Mot de passe: $DB_PASSWORD"
echo -e "  - Port: 5432"
echo ""
echo -e "${RED}IMPORTANT: Sauvegardez ces informations de manière sécurisée!${NC}"
echo ""
echo -e "Fichier de configuration: $APP_DIR/.env.production"
echo -e "Sauvegardes: /var/backups/dentalcloud"
echo ""
echo -e "${YELLOW}Prochaines étapes:${NC}"
echo "1. Configurez vos DNS pour pointer $DOMAIN vers 185.172.57.253"
echo "2. Configurez api.dentalcloud.fr pour pointer vers 185.172.57.253"
echo "3. Exécutez les migrations de la base de données"
echo ""
echo -e "${GREEN}Vérification des services:${NC}"
sudo systemctl status nginx --no-pager | grep Active
sudo systemctl status postgresql --no-pager | grep Active
sudo systemctl status postgrest --no-pager | grep Active
