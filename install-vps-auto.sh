#!/bin/bash

set -e

echo "=========================================="
echo "  GB Dental - Installation VPS Automatique"
echo "=========================================="
echo ""

# Vérification root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root"
    echo "   Utilisez: sudo bash install-vps-auto.sh"
    exit 1
fi

# Variables à configurer
echo "📋 Configuration de l'application"
echo ""
read -p "Nom de domaine pour l'application (ex: dentalcloud.fr): " APP_DOMAIN
echo ""
echo "📋 Configuration Supabase"
echo ""
read -p "URL de votre Supabase (ex: https://supabase.votre-domaine.com): " SUPABASE_URL
read -p "Votre SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
read -p "Votre SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_KEY

INSTALL_DIR="/opt/gb-dental"
NODE_VERSION="20"

echo ""
echo "Configuration:"
echo "  - Domaine application: ${APP_DOMAIN}"
echo "  - URL Supabase: ${SUPABASE_URL}"
echo "  - Installation: ${INSTALL_DIR}"
echo "  - Node.js: v${NODE_VERSION}"
echo ""
read -p "Continuer? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Fonction pour logger
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Fonction pour gérer les erreurs
handle_error() {
    log "❌ ERREUR: $1"
    exit 1
}

# 1. Mise à jour du système
log "📦 Mise à jour du système..."
apt update || handle_error "Échec de apt update"
DEBIAN_FRONTEND=noninteractive apt upgrade -y || handle_error "Échec de apt upgrade"

# 2. Nettoyage complet de Node.js existant
log "🧹 Nettoyage complet de Node.js existant..."

# Arrêter tous les processus Node.js
pkill -9 node 2>/dev/null || true
pkill -9 npm 2>/dev/null || true

# Supprimer tous les paquets Node.js
log "  → Suppression des paquets Node.js..."
dpkg --remove --force-remove-reinstreq libnode-dev 2>/dev/null || true
dpkg --remove --force-remove-reinstreq libnode72 2>/dev/null || true
dpkg --remove --force-remove-reinstreq nodejs 2>/dev/null || true
dpkg --remove --force-remove-reinstreq npm 2>/dev/null || true

apt-get remove --purge -y nodejs npm libnode-dev libnode72 node-* 2>/dev/null || true
apt-get autoremove -y || true
apt-get autoclean || true

# Nettoyer les fichiers résiduels
log "  → Nettoyage des fichiers résiduels..."
rm -rf /usr/local/bin/node 2>/dev/null || true
rm -rf /usr/local/bin/npm 2>/dev/null || true
rm -rf /usr/local/bin/npx 2>/dev/null || true
rm -rf /usr/local/lib/node_modules 2>/dev/null || true
rm -rf /usr/lib/node_modules 2>/dev/null || true
rm -rf /var/cache/apt/archives/nodejs*.deb 2>/dev/null || true
rm -rf /var/cache/apt/archives/libnode*.deb 2>/dev/null || true
rm -rf /etc/apt/sources.list.d/nodesource.list 2>/dev/null || true
rm -rf /usr/share/doc/nodejs 2>/dev/null || true
rm -rf /usr/include/node 2>/dev/null || true

# Nettoyer dpkg
log "  → Nettoyage de dpkg..."
dpkg --configure -a || true
apt-get install -f -y || true

log "✅ Nettoyage terminé"

# 3. Installation des dépendances de base
log "📦 Installation des dépendances de base..."
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
    build-essential \
    software-properties-common || handle_error "Échec de l'installation des dépendances"

# 4. Installation de Node.js 20
log "📦 Installation de Node.js ${NODE_VERSION}..."

# Télécharger et ajouter le dépôt NodeSource
log "  → Ajout du dépôt NodeSource..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x -o /tmp/nodesource_setup.sh || handle_error "Échec du téléchargement du script NodeSource"
bash /tmp/nodesource_setup.sh || handle_error "Échec de l'ajout du dépôt NodeSource"

# Installer Node.js
log "  → Installation de Node.js..."
apt update || handle_error "Échec de apt update après ajout du dépôt"
apt install -y nodejs || handle_error "Échec de l'installation de Node.js"

# Vérifier l'installation
log "  → Vérification de l'installation..."
if ! command -v node &> /dev/null; then
    handle_error "Node.js n'a pas été installé correctement"
fi

if ! command -v npm &> /dev/null; then
    handle_error "npm n'a pas été installé correctement"
fi

NODE_INSTALLED_VERSION=$(node --version)
NPM_INSTALLED_VERSION=$(npm --version)

log "✅ Node.js ${NODE_INSTALLED_VERSION} installé"
log "✅ npm ${NPM_INSTALLED_VERSION} installé"

# 5. Configuration du firewall
log "🔒 Configuration du firewall..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload
log "✅ Firewall configuré"

# 6. Création du répertoire d'installation
log "📁 Création du répertoire d'installation..."
mkdir -p ${INSTALL_DIR}
cd ${INSTALL_DIR}

# 7. Création du fichier .env
log "📝 Création du fichier .env..."
cat > ${INSTALL_DIR}/.env << EOF
# Supabase Configuration
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# Application
VITE_APP_URL=https://${APP_DOMAIN}

# Backend keys (pour les edge functions)
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}
EOF

chmod 600 ${INSTALL_DIR}/.env
log "✅ Fichier .env créé"

# 8. Configuration de Nginx
log "🌐 Configuration de Nginx..."
cat > /etc/nginx/sites-available/gb-dental << 'EOF'
server {
    listen 80;
    server_name APP_DOMAIN_PLACEHOLDER;

    root /opt/gb-dental/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json image/svg+xml;

    # Main location
    location / {
        try_files $uri $uri/ /index.html;
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

    # Disable access logs for static files
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        access_log off;
    }
}
EOF

# Remplacer le placeholder par le vrai domaine
sed -i "s/APP_DOMAIN_PLACEHOLDER/${APP_DOMAIN}/g" /etc/nginx/sites-available/gb-dental

# Activation du site
ln -sf /etc/nginx/sites-available/gb-dental /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test de la configuration
nginx -t || handle_error "Configuration Nginx invalide"
systemctl reload nginx || handle_error "Échec du rechargement de Nginx"

log "✅ Nginx configuré"

# 9. Configuration SSL avec Let's Encrypt
log "🔒 Configuration SSL avec Let's Encrypt..."
certbot --nginx -d ${APP_DOMAIN} --non-interactive --agree-tos --email admin@${APP_DOMAIN} --redirect || log "⚠️  SSL non configuré (vérifiez le DNS)"

# 10. Création du script de déploiement
log "📜 Création du script de déploiement..."
cat > ${INSTALL_DIR}/deploy.sh << 'EOFDEPLOY'
#!/bin/bash
set -e

echo "🚀 Déploiement de GB Dental..."
echo ""

cd /opt/gb-dental

# Vérifier que les fichiers sont présents
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: package.json introuvable"
    echo "   Copiez d'abord les fichiers de l'application dans /opt/gb-dental"
    exit 1
fi

echo "📦 Installation des dépendances..."
npm ci --production=false || npm install

echo "🔨 Build de l'application..."
NODE_ENV=production npm run build

echo "🔄 Rechargement de Nginx..."
systemctl reload nginx

echo ""
echo "✅ Déploiement terminé!"
echo "   Application accessible sur: https://$(grep VITE_APP_URL .env | cut -d'=' -f2 | sed 's|https://||')"
EOFDEPLOY

chmod +x ${INSTALL_DIR}/deploy.sh
log "✅ Script de déploiement créé"

# 11. Création d'un script de mise à jour
log "📜 Création du script de mise à jour..."
cat > ${INSTALL_DIR}/update.sh << 'EOFUPDATE'
#!/bin/bash
set -e

echo "🔄 Mise à jour de GB Dental..."
echo ""

cd /opt/gb-dental

# Pull depuis Git si c'est un repo
if [ -d ".git" ]; then
    echo "📥 Pull depuis Git..."
    git pull
fi

# Redéployer
./deploy.sh
EOFUPDATE

chmod +x ${INSTALL_DIR}/update.sh
log "✅ Script de mise à jour créé"

# 12. Création du service systemd
log "🔧 Création du service systemd..."
cat > /etc/systemd/system/gb-dental.service << EOF
[Unit]
Description=GB Dental Application
After=network.target

[Service]
Type=oneshot
WorkingDirectory=${INSTALL_DIR}
ExecStart=${INSTALL_DIR}/deploy.sh
RemainAfterExit=yes
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
log "✅ Service systemd créé"

# 13. Affichage des instructions finales
echo ""
echo "=========================================="
echo "✅ Installation terminée avec succès!"
echo "=========================================="
echo ""
echo "📋 PROCHAINES ÉTAPES:"
echo ""
echo "1️⃣  Copiez les fichiers de votre application:"
echo "   scp -r ./* root@votre-ip:${INSTALL_DIR}/"
echo ""
echo "   OU clonez depuis Git:"
echo "   cd ${INSTALL_DIR}"
echo "   git clone https://votre-repo.git ."
echo ""
echo "2️⃣  Déployez l'application:"
echo "   ${INSTALL_DIR}/deploy.sh"
echo ""
echo "3️⃣  Votre application sera accessible sur:"
echo "   https://${APP_DOMAIN}"
echo ""
echo "=========================================="
echo "📁 FICHIERS IMPORTANTS:"
echo "=========================================="
echo ""
echo "  Configuration:"
echo "    ${INSTALL_DIR}/.env"
echo ""
echo "  Scripts:"
echo "    ${INSTALL_DIR}/deploy.sh    - Déployer l'application"
echo "    ${INSTALL_DIR}/update.sh    - Mettre à jour depuis Git"
echo ""
echo "  Nginx:"
echo "    /etc/nginx/sites-available/gb-dental"
echo ""
echo "  Logs:"
echo "    journalctl -u gb-dental -f"
echo "    tail -f /var/log/nginx/error.log"
echo ""
echo "=========================================="
echo "🔧 COMMANDES UTILES:"
echo "=========================================="
echo ""
echo "  Déployer:           ${INSTALL_DIR}/deploy.sh"
echo "  Mettre à jour:      ${INSTALL_DIR}/update.sh"
echo "  Logs Nginx:         tail -f /var/log/nginx/error.log"
echo "  Test Nginx:         nginx -t"
echo "  Reload Nginx:       systemctl reload nginx"
echo "  Status service:     systemctl status gb-dental"
echo ""
echo "=========================================="
echo "✅ CONFIGURATION SUPABASE:"
echo "=========================================="
echo ""
echo "  URL: ${SUPABASE_URL}"
echo "  Les migrations doivent être appliquées depuis"
echo "  le dashboard Supabase"
echo ""
echo "=========================================="
echo ""
log "Installation terminée à $(date)"
