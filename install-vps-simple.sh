#!/bin/bash

set -e

echo "=========================================="
echo "  GB Dental - Installation VPS Complète"
echo "=========================================="
echo ""

if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root"
    echo "   Utilisez: sudo bash install-vps-simple.sh"
    exit 1
fi

echo "📋 Configuration de l'application"
echo ""
read -p "Nom de domaine (ex: dentalcloud.fr): " APP_DOMAIN
echo ""
echo "📋 Configuration Supabase Cloud"
echo ""
read -p "URL Supabase (ex: https://xxxxx.supabase.co): " SUPABASE_URL
read -sp "SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
echo ""
read -sp "SUPABASE_SERVICE_ROLE_KEY (optionnel, Enter pour ignorer): " SUPABASE_SERVICE_KEY
echo ""

INSTALL_DIR="/opt/gb-dental"
NODE_VERSION="20"

echo ""
echo "=========================================="
echo "Configuration confirmée:"
echo "  - Domaine: ${APP_DOMAIN}"
echo "  - Supabase: ${SUPABASE_URL}"
echo "  - Installation: ${INSTALL_DIR}"
echo "=========================================="
echo ""
read -p "Continuer? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

log() {
    echo "[$(date '+%H:%M:%S')] $1"
}

handle_error() {
    log "❌ ERREUR: $1"
    exit 1
}

log "🚀 Démarrage de l'installation..."

log "📦 Mise à jour du système..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq || handle_error "Échec apt update"
apt-get upgrade -y -qq || handle_error "Échec apt upgrade"

log "🧹 Nettoyage Node.js existant..."
pkill -9 node 2>/dev/null || true
apt-get remove --purge -y nodejs npm 2>/dev/null || true
apt-get autoremove -y -qq || true
rm -rf /usr/local/bin/node /usr/local/bin/npm /usr/local/bin/npx 2>/dev/null || true
rm -rf /usr/local/lib/node_modules /usr/lib/node_modules 2>/dev/null || true
rm -rf /etc/apt/sources.list.d/nodesource.list 2>/dev/null || true

log "📦 Installation des dépendances..."
apt-get install -y -qq \
    curl \
    wget \
    git \
    ca-certificates \
    gnupg \
    ufw \
    nginx \
    certbot \
    python3-certbot-nginx \
    build-essential || handle_error "Échec installation dépendances"

log "📦 Installation Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - || handle_error "Échec ajout dépôt Node"
apt-get install -y -qq nodejs || handle_error "Échec installation Node.js"

NODE_VER=$(node --version)
NPM_VER=$(npm --version)
log "✅ Node.js ${NODE_VER} et npm ${NPM_VER} installés"

log "🔒 Configuration firewall..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload
log "✅ Firewall configuré"

log "📁 Création du répertoire ${INSTALL_DIR}..."
mkdir -p ${INSTALL_DIR}
cd ${INSTALL_DIR}

log "📝 Création du fichier .env..."
cat > ${INSTALL_DIR}/.env << EOF
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
VITE_APP_URL=https://${APP_DOMAIN}
EOF

if [ ! -z "$SUPABASE_SERVICE_KEY" ]; then
    cat >> ${INSTALL_DIR}/.env << EOF

# Backend keys (pour les edge functions si nécessaire)
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}
EOF
fi

chmod 600 ${INSTALL_DIR}/.env
log "✅ Fichier .env créé"

log "🌐 Configuration Nginx..."
cat > /etc/nginx/sites-available/gb-dental << 'EOFNGINX'
server {
    listen 80;
    server_name APP_DOMAIN_PLACEHOLDER;

    root /opt/gb-dental/dist;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss image/svg+xml;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 10M;
}
EOFNGINX

sed -i "s/APP_DOMAIN_PLACEHOLDER/${APP_DOMAIN}/g" /etc/nginx/sites-available/gb-dental

ln -sf /etc/nginx/sites-available/gb-dental /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t || handle_error "Configuration Nginx invalide"
systemctl restart nginx || handle_error "Échec démarrage Nginx"
log "✅ Nginx configuré et démarré"

log "🔒 Configuration SSL avec Let's Encrypt..."
certbot --nginx -d ${APP_DOMAIN} \
    --non-interactive \
    --agree-tos \
    --email admin@${APP_DOMAIN} \
    --redirect || log "⚠️  SSL non configuré (DNS non résolu ou domaine invalide)"

log "📜 Création du script de déploiement..."
cat > ${INSTALL_DIR}/deploy.sh << 'EOFDEPLOY'
#!/bin/bash
set -e

echo "🚀 Déploiement de GB Dental..."

cd /opt/gb-dental

if [ ! -f "package.json" ]; then
    echo "❌ Erreur: package.json introuvable"
    echo "   Copiez d'abord les fichiers: scp -r * root@votre-ip:/opt/gb-dental/"
    exit 1
fi

echo "📦 Installation des dépendances..."
npm ci --production=false || npm install

echo "🔨 Build de l'application..."
NODE_ENV=production npm run build

echo "♻️  Rechargement Nginx..."
systemctl reload nginx

echo ""
echo "✅ Déploiement terminé!"
echo "   👉 https://$(grep VITE_APP_URL .env | cut -d'=' -f2 | sed 's|https://||')"
EOFDEPLOY

chmod +x ${INSTALL_DIR}/deploy.sh

log "📜 Création du script de logs..."
cat > ${INSTALL_DIR}/logs.sh << 'EOFLOGS'
#!/bin/bash
echo "📊 Logs Nginx - Appuyez sur Ctrl+C pour quitter"
tail -f /var/log/nginx/error.log /var/log/nginx/access.log
EOFLOGS

chmod +x ${INSTALL_DIR}/logs.sh

log "📜 Création du script de mise à jour..."
cat > ${INSTALL_DIR}/update.sh << 'EOFUPDATE'
#!/bin/bash
set -e

echo "🔄 Mise à jour de GB Dental..."
cd /opt/gb-dental

if [ -d ".git" ]; then
    echo "📥 Pull depuis Git..."
    git pull
fi

./deploy.sh
EOFUPDATE

chmod +x ${INSTALL_DIR}/update.sh

log "📜 Création du service systemd..."
cat > /etc/systemd/system/gb-dental.service << EOF
[Unit]
Description=GB Dental Application
After=network.target nginx.service

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

echo ""
echo "=========================================="
echo "✅ INSTALLATION TERMINÉE !"
echo "=========================================="
echo ""
echo "📋 PROCHAINES ÉTAPES:"
echo ""
echo "1️⃣  Copiez vos fichiers sur le serveur:"
echo ""
echo "    Sur votre machine locale:"
echo "    cd /chemin/vers/gb-dental"
echo "    scp -r * root@${APP_DOMAIN}:${INSTALL_DIR}/"
echo ""
echo "    OU clonez depuis Git:"
echo "    cd ${INSTALL_DIR}"
echo "    git clone https://votre-repo.git ."
echo ""
echo "2️⃣  Déployez l'application:"
echo "    ${INSTALL_DIR}/deploy.sh"
echo ""
echo "3️⃣  Votre application sera sur:"
echo "    👉 https://${APP_DOMAIN}"
echo ""
echo "=========================================="
echo "📁 FICHIERS & COMMANDES UTILES"
echo "=========================================="
echo ""
echo "  Config:      ${INSTALL_DIR}/.env"
echo "  Nginx:       /etc/nginx/sites-available/gb-dental"
echo ""
echo "  Déployer:    ${INSTALL_DIR}/deploy.sh"
echo "  Mettre à jour: ${INSTALL_DIR}/update.sh"
echo "  Voir logs:   ${INSTALL_DIR}/logs.sh"
echo ""
echo "  Test Nginx:  nginx -t"
echo "  Reload Nginx: systemctl reload nginx"
echo "  Restart Nginx: systemctl restart nginx"
echo ""
echo "=========================================="
echo "🗄️  SUPABASE"
echo "=========================================="
echo ""
echo "  URL: ${SUPABASE_URL}"
echo ""
echo "  ⚠️  IMPORTANT: Appliquez les migrations depuis"
echo "     votre dashboard Supabase Cloud:"
echo ""
echo "     1. Allez sur ${SUPABASE_URL}"
echo "     2. SQL Editor"
echo "     3. Copiez/collez chaque fichier du dossier"
echo "        supabase/migrations/ dans l'ordre"
echo ""
echo "=========================================="
echo ""
log "Installation terminée avec succès !"
