#!/bin/bash

set -e

echo "=========================================="
echo "  Installation GB Dental avec Supabase Coolify"
echo "=========================================="
echo ""

# Vérification root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root"
    echo "   Utilisez: sudo bash install-vps-with-coolify-supabase.sh"
    exit 1
fi

# Variables à configurer
echo "📋 Configuration de l'application"
echo ""
read -p "Nom de domaine pour l'application (ex: dentalcloud.fr): " APP_DOMAIN
echo ""
echo "📋 Configuration Supabase (depuis Coolify)"
echo ""
read -p "URL de votre Supabase (ex: https://supabase.votre-domaine.com): " SUPABASE_URL
read -p "Votre SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
read -p "Votre SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_KEY

INSTALL_DIR="/opt/gb-dental"

echo ""
echo "Configuration:"
echo "  - Domaine application: ${APP_DOMAIN}"
echo "  - URL Supabase: ${SUPABASE_URL}"
echo "  - Installation: ${INSTALL_DIR}"
echo ""
read -p "Continuer? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# 1. Mise à jour du système
echo ""
echo "📦 Mise à jour du système..."
apt update && apt upgrade -y

# 2. Installation des dépendances
echo ""
echo "📦 Installation des dépendances..."
apt install -y \
    curl \
    wget \
    git \
    ca-certificates \
    gnupg \
    lsb-release \
    ufw \
    nginx \
    certbot \
    python3-certbot-nginx \
    nodejs \
    npm

# 3. Installation de Node.js 20 (LTS)
echo ""
echo "📦 Installation de Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 4. Configuration du firewall
echo ""
echo "🔒 Configuration du firewall..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload

# 5. Création du répertoire d'installation
echo ""
echo "📁 Création du répertoire d'installation..."
mkdir -p ${INSTALL_DIR}
cd ${INSTALL_DIR}

# 6. Clone du projet (si vous avez un repo Git) ou copie des fichiers
echo ""
echo "📥 Préparation des fichiers de l'application..."
echo "   Note: Vous devrez copier les fichiers de votre application dans ${INSTALL_DIR}"

# 7. Création du fichier .env
echo ""
echo "📝 Création du fichier .env..."
cat > ${INSTALL_DIR}/.env << EOF
# Supabase Configuration (depuis Coolify)
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# Application
VITE_APP_URL=https://${APP_DOMAIN}

# Backend keys (pour les edge functions si nécessaire)
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}
EOF

chmod 600 ${INSTALL_DIR}/.env

# 8. Installation des dépendances npm (sera fait quand les fichiers seront copiés)
echo ""
echo "📦 Les dépendances npm seront installées après la copie des fichiers"

# 9. Configuration de Nginx
echo ""
echo "🌐 Configuration de Nginx..."
cat > /etc/nginx/sites-available/gb-dental << EOF
server {
    listen 80;
    server_name ${APP_DOMAIN};

    root ${INSTALL_DIR}/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
EOF

# Activation du site
ln -sf /etc/nginx/sites-available/gb-dental /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test de la configuration
nginx -t

# 10. Certificat SSL avec Let's Encrypt
echo ""
echo "🔒 Configuration SSL avec Let's Encrypt..."
systemctl reload nginx
certbot --nginx -d ${APP_DOMAIN} --non-interactive --agree-tos --email admin@${APP_DOMAIN} --redirect

# 11. Création du service systemd pour auto-reload (optionnel)
echo ""
echo "🔄 Configuration du service de mise à jour automatique..."
cat > /etc/systemd/system/gb-dental-deploy.service << EOF
[Unit]
Description=GB Dental Deploy Service
After=network.target

[Service]
Type=oneshot
WorkingDirectory=${INSTALL_DIR}
ExecStart=/usr/bin/npm run build
User=root
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
EOF

# 12. Script de déploiement
echo ""
echo "📜 Création du script de déploiement..."
cat > ${INSTALL_DIR}/deploy.sh << 'EOFDEPLOY'
#!/bin/bash
set -e

echo "🚀 Déploiement de GB Dental..."

cd /opt/gb-dental

echo "📦 Installation des dépendances..."
npm ci --production=false

echo "🔨 Build de l'application..."
npm run build

echo "🔄 Rechargement de Nginx..."
systemctl reload nginx

echo "✅ Déploiement terminé!"
EOFDEPLOY

chmod +x ${INSTALL_DIR}/deploy.sh

# 13. Affichage des instructions finales
echo ""
echo "=========================================="
echo "✅ Installation terminée!"
echo "=========================================="
echo ""
echo "📋 Prochaines étapes:"
echo ""
echo "1. Copiez les fichiers de votre application dans: ${INSTALL_DIR}"
echo "   Exemple: scp -r ./dist ./src ./package.json root@votre-ip:${INSTALL_DIR}/"
echo ""
echo "2. Installez les dépendances et buildez l'application:"
echo "   cd ${INSTALL_DIR}"
echo "   npm install"
echo "   npm run build"
echo ""
echo "3. Ou utilisez le script de déploiement automatique:"
echo "   ${INSTALL_DIR}/deploy.sh"
echo ""
echo "4. Votre application sera accessible sur:"
echo "   https://${APP_DOMAIN}"
echo ""
echo "5. Configuration Supabase:"
echo "   - URL: ${SUPABASE_URL}"
echo "   - Les migrations doivent être appliquées depuis Supabase Studio de Coolify"
echo ""
echo "📁 Fichiers importants:"
echo "   - Configuration: ${INSTALL_DIR}/.env"
echo "   - Nginx: /etc/nginx/sites-available/gb-dental"
echo "   - Deploy: ${INSTALL_DIR}/deploy.sh"
echo ""
echo "🔧 Commandes utiles:"
echo "   - Rebuilder: cd ${INSTALL_DIR} && npm run build"
echo "   - Logs Nginx: tail -f /var/log/nginx/error.log"
echo "   - Test Nginx: nginx -t"
echo "   - Reload Nginx: systemctl reload nginx"
echo ""
