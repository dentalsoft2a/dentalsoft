#!/bin/bash

# Configuration
DOMAIN="dentalcloud.fr"
VPS_IP="185.172.57.253"
APP_NAME="dentalcloud"
APP_DIR="/var/www/${APP_NAME}"
NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${APP_NAME}"
GITHUB_REPO="https://github.com/dentalsoft2a/dentalsoft.git"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Déploiement de DentalCloud depuis GitHub ===${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Ce script doit être exécuté en tant que root${NC}"
    echo "Utilisez: sudo bash deploy-from-github.sh"
    exit 1
fi

# Update system
echo -e "${YELLOW}Mise à jour du système...${NC}"
apt update && apt upgrade -y

# Install required packages
echo -e "${YELLOW}Installation des packages requis...${NC}"
apt install -y nginx nodejs npm certbot python3-certbot-nginx git curl ufw

# Configure firewall
echo -e "${YELLOW}Configuration du pare-feu...${NC}"
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw --force enable

# Clone or update repository
if [ -d "${APP_DIR}" ]; then
    echo -e "${YELLOW}Mise à jour du dépôt existant...${NC}"
    cd ${APP_DIR}
    git pull origin main || git pull origin master
else
    echo -e "${YELLOW}Clonage du dépôt GitHub...${NC}"
    git clone ${GITHUB_REPO} ${APP_DIR}
    cd ${APP_DIR}
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}ATTENTION: Le fichier .env n'existe pas${NC}"
    echo "Création d'un fichier .env template..."
    cat > .env << 'ENVEOF'
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
ENVEOF
    echo -e "${YELLOW}Veuillez éditer le fichier .env avec vos vraies valeurs Supabase:${NC}"
    echo "nano ${APP_DIR}/.env"
    read -p "Appuyez sur Entrée une fois le fichier .env configuré..."
fi

# Install dependencies
echo -e "${YELLOW}Installation des dépendances...${NC}"
npm install

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
DNS_CHECK=$(host ${DOMAIN} 2>/dev/null | grep "has address ${VPS_IP}")

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

# Create update script for future updates
cat > /usr/local/bin/update-dentalcloud.sh << 'UPDATEEOF'
#!/bin/bash
echo "Mise à jour de DentalCloud..."
cd /var/www/dentalcloud
git pull
npm install
npm run build
systemctl reload nginx
echo "Mise à jour terminée!"
UPDATEEOF

chmod +x /usr/local/bin/update-dentalcloud.sh

# Create deployment info file
cat > ${APP_DIR}/deployment-info.txt << EOF
Deployment Date: $(date)
Domain: ${DOMAIN}
Server IP: ${VPS_IP}
App Directory: ${APP_DIR}
Nginx Config: ${NGINX_CONF}
GitHub Repo: ${GITHUB_REPO}
EOF

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
echo ""
echo -e "${YELLOW}Pour mettre à jour l'application:${NC}"
echo "Exécutez simplement: update-dentalcloud.sh"
echo ""
echo -e "${YELLOW}Ou manuellement:${NC}"
echo "1. cd ${APP_DIR}"
echo "2. git pull"
echo "3. npm install"
echo "4. npm run build"
echo "5. systemctl reload nginx"
echo ""
echo -e "${YELLOW}Commandes utiles:${NC}"
echo "- Redémarrer Nginx: systemctl restart nginx"
echo "- Voir les logs Nginx: tail -f /var/log/nginx/error.log"
echo "- Tester la config Nginx: nginx -t"
echo "- Renouveler SSL manuellement: certbot renew"
