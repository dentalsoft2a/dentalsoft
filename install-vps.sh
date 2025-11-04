#!/bin/bash

set -e

echo "=========================================="
echo "  Installation GB Dental sur Ubuntu 22.04"
echo "=========================================="
echo ""

# Vérification root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root"
    echo "   Utilisez: sudo bash install-vps.sh"
    exit 1
fi

# Variables à configurer
read -p "Nom de domaine principal (ex: dentalcloud.fr): " DOMAIN
read -p "Sous-domaine API (ex: api): " API_SUBDOMAIN
read -p "Sous-domaine Studio (ex: studio): " STUDIO_SUBDOMAIN
read -p "Email pour les certificats SSL: " SSL_EMAIL

FULL_DOMAIN="${DOMAIN}"
API_DOMAIN="${API_SUBDOMAIN}.${DOMAIN}"
STUDIO_DOMAIN="${STUDIO_SUBDOMAIN}.${DOMAIN}"
INSTALL_DIR="/opt/gb-dental"

echo ""
echo "Configuration:"
echo "  - Domaine principal: ${FULL_DOMAIN}"
echo "  - API: ${API_DOMAIN}"
echo "  - Studio: ${STUDIO_DOMAIN}"
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
    openssl \
    apache2-utils

# 3. Installation de Docker
echo ""
echo "🐳 Installation de Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
else
    echo "   Docker déjà installé"
fi

# 4. Installation de Docker Compose
echo ""
echo "🐳 Installation de Docker Compose..."
if ! command -v docker compose &> /dev/null; then
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -SL https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
else
    echo "   Docker Compose déjà installé"
fi

# 5. Configuration du firewall
echo ""
echo "🔒 Configuration du firewall..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload

# 6. Création du répertoire d'installation
echo ""
echo "📁 Création du répertoire d'installation..."
mkdir -p ${INSTALL_DIR}
cd ${INSTALL_DIR}

# 7. Génération des secrets
echo ""
echo "🔐 Génération des secrets..."
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
JWT_SECRET=$(openssl rand -base64 64 | tr -d "\n=+/")

# Fonction pour générer JWT
generate_jwt() {
    local payload=$1
    local secret=$2

    header='{"alg":"HS256","typ":"JWT"}'
    header_b64=$(echo -n "$header" | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')
    payload_b64=$(echo -n "$payload" | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')
    signature=$(echo -n "${header_b64}.${payload_b64}" | openssl dgst -binary -sha256 -hmac "$secret" | openssl base64 -e -A | tr '+/' '-_' | tr -d '=')

    echo "${header_b64}.${payload_b64}.${signature}"
}

ANON_PAYLOAD='{"role":"anon","iss":"supabase","iat":1641769200,"exp":1957345200}'
SERVICE_PAYLOAD='{"role":"service_role","iss":"supabase","iat":1641769200,"exp":1957345200}'

SUPABASE_ANON_KEY=$(generate_jwt "$ANON_PAYLOAD" "$JWT_SECRET")
SUPABASE_SERVICE_KEY=$(generate_jwt "$SERVICE_PAYLOAD" "$JWT_SECRET")

# 8. Création du fichier .env
echo ""
echo "📝 Création du fichier .env..."
cat > ${INSTALL_DIR}/.env << EOF
# Database
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# JWT
JWT_SECRET=${JWT_SECRET}

# Supabase Keys
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}

# URLs
SUPABASE_PUBLIC_URL=https://${API_DOMAIN}
SITE_URL=https://${FULL_DOMAIN}
GOTRUE_URI_ALLOW_LIST=https://${FULL_DOMAIN}/*,https://${API_DOMAIN}/*,https://${STUDIO_DOMAIN}/*

# SMTP
SMTP_ADMIN_EMAIL=noreply@${DOMAIN}
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SENDER_NAME=GB Dental
EOF

chmod 600 ${INSTALL_DIR}/.env

# 9. Création du script d'initialisation de la base de données
echo ""
echo "💾 Création du script d'initialisation..."
cat > ${INSTALL_DIR}/init-db.sh << 'EOFINIT'
#!/bin/bash
set -e

echo "Initialisation de la base de données Supabase..."

psql -v ON_ERROR_STOP=1 --username "postgres" --dbname "postgres" <<-EOSQL
    -- Création des extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE EXTENSION IF NOT EXISTS "pgjwt";

    -- Création des schémas
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE SCHEMA IF NOT EXISTS storage;
    CREATE SCHEMA IF NOT EXISTS _realtime;
    CREATE SCHEMA IF NOT EXISTS realtime;

    -- Création des rôles
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
            CREATE ROLE anon NOLOGIN NOINHERIT;
        END IF;

        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
            CREATE ROLE authenticated NOLOGIN NOINHERIT;
        END IF;

        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
            CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
        END IF;

        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
            CREATE ROLE authenticator LOGIN PASSWORD '${POSTGRES_PASSWORD}' NOINHERIT;
        END IF;

        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
            CREATE ROLE supabase_auth_admin LOGIN PASSWORD '${POSTGRES_PASSWORD}';
        END IF;

        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
            CREATE ROLE supabase_storage_admin LOGIN PASSWORD '${POSTGRES_PASSWORD}';
        END IF;

        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
            CREATE ROLE supabase_admin LOGIN PASSWORD '${POSTGRES_PASSWORD}' SUPERUSER;
        END IF;
    END
    \$\$;

    -- Attribution des rôles
    GRANT anon, authenticated, service_role TO authenticator;
    GRANT ALL ON DATABASE postgres TO supabase_admin;
    GRANT ALL ON DATABASE postgres TO supabase_auth_admin;
    GRANT ALL ON DATABASE postgres TO supabase_storage_admin;

    -- Permissions sur les schémas
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON SCHEMA public TO supabase_admin;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_admin;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_admin;

    GRANT USAGE ON SCHEMA auth TO supabase_auth_admin, authenticated, anon;
    GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
    GRANT ALL ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;

    GRANT USAGE ON SCHEMA storage TO supabase_storage_admin, authenticated, anon;
    GRANT ALL ON SCHEMA storage TO supabase_storage_admin;

    GRANT USAGE ON SCHEMA _realtime TO supabase_admin;
    GRANT ALL ON SCHEMA _realtime TO supabase_admin;

    GRANT USAGE ON SCHEMA realtime TO supabase_admin;
    GRANT ALL ON SCHEMA realtime TO supabase_admin;

    -- Initialisation du schéma storage
    CREATE TABLE IF NOT EXISTS storage.buckets (
        id text PRIMARY KEY,
        name text NOT NULL,
        owner uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        public boolean DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS storage.objects (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        bucket_id text REFERENCES storage.buckets(id),
        name text NOT NULL,
        owner uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        last_accessed_at timestamptz DEFAULT now(),
        metadata jsonb
    );

    ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

    -- Permissions par défaut pour storage
    GRANT ALL ON storage.buckets TO supabase_storage_admin, authenticated;
    GRANT ALL ON storage.objects TO supabase_storage_admin, authenticated;

    -- Initialisation du schéma realtime
    CREATE TABLE IF NOT EXISTS _realtime.schema_migrations (
        version bigint PRIMARY KEY,
        inserted_at timestamp DEFAULT now()
    );

    INSERT INTO _realtime.schema_migrations (version) VALUES (20211116024918) ON CONFLICT DO NOTHING;

    GRANT ALL ON _realtime.schema_migrations TO supabase_admin;

    -- Confirmation
    SELECT 'Base de données initialisée avec succès!' as message;
EOSQL

echo "✅ Base de données initialisée"
EOFINIT

chmod +x ${INSTALL_DIR}/init-db.sh

# 10. Création du docker-compose.yml
echo ""
echo "🐳 Création du docker-compose.yml..."
cat > ${INSTALL_DIR}/docker-compose.yml << 'EOFCOMPOSE'
services:
  db:
    image: supabase/postgres:15.1.0.147
    container_name: gb-dental-db
    restart: unless-stopped
    ports:
      - "127.0.0.1:5432:5432"
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: postgres
    volumes:
      - db-data:/var/lib/postgresql/data
      - ./init-db.sh:/docker-entrypoint-initdb.d/01-init.sh:ro
    command: >
      postgres
      -c wal_level=logical
      -c max_replication_slots=10
      -c max_wal_senders=10
      -c listen_addresses='*'
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 10

  rest:
    image: postgrest/postgrest:v11.2.2
    container_name: gb-dental-rest
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      PGRST_DB_URI: postgres://authenticator:${POSTGRES_PASSWORD}@db:5432/postgres
      PGRST_DB_SCHEMAS: public,storage,auth
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET}
      PGRST_DB_USE_LEGACY_GUCS: "false"
    ports:
      - "127.0.0.1:3000:3000"

  auth:
    image: supabase/gotrue:v2.132.3
    container_name: gb-dental-auth
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      API_EXTERNAL_URL: ${SUPABASE_PUBLIC_URL}
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://supabase_auth_admin:${POSTGRES_PASSWORD}@db:5432/postgres
      GOTRUE_SITE_URL: ${SITE_URL}
      GOTRUE_URI_ALLOW_LIST: ${GOTRUE_URI_ALLOW_LIST}
      GOTRUE_DISABLE_SIGNUP: "false"
      GOTRUE_JWT_ADMIN_ROLES: service_role
      GOTRUE_JWT_AUD: authenticated
      GOTRUE_JWT_DEFAULT_GROUP_NAME: authenticated
      GOTRUE_JWT_EXP: 3600
      GOTRUE_JWT_SECRET: ${JWT_SECRET}
      GOTRUE_EXTERNAL_EMAIL_ENABLED: "true"
      GOTRUE_MAILER_AUTOCONFIRM: "true"
      GOTRUE_SMTP_ADMIN_EMAIL: ${SMTP_ADMIN_EMAIL}
      GOTRUE_SMTP_HOST: ${SMTP_HOST}
      GOTRUE_SMTP_PORT: ${SMTP_PORT}
      GOTRUE_SMTP_USER: ${SMTP_USER}
      GOTRUE_SMTP_PASS: ${SMTP_PASS}
      GOTRUE_SMTP_SENDER_NAME: ${SMTP_SENDER_NAME}
    ports:
      - "127.0.0.1:9999:9999"

  realtime:
    image: supabase/realtime:v2.25.50
    container_name: gb-dental-realtime
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: supabase_admin
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_NAME: postgres
      DB_AFTER_CONNECT_QUERY: 'SET search_path TO _realtime'
      DB_ENC_KEY: supabaserealtime
      API_JWT_SECRET: ${JWT_SECRET}
      FLY_ALLOC_ID: fly123
      FLY_APP_NAME: realtime
      SECRET_KEY_BASE: UpNVntn3cDxHJpq99YMc1T1AQgQpc8kfYTuRgBiYa15BLrx8etQoXz3gZv1/u2oq
      ERL_AFLAGS: -proto_dist inet_tcp
      ENABLE_TAILSCALE: "false"
      DNS_NODES: "''"
    command: >
      sh -c "/app/bin/migrate && /app/bin/realtime eval 'Realtime.Release.seeds(Realtime.Repo)' && /app/bin/server"
    ports:
      - "127.0.0.1:4000:4000"

  storage:
    image: supabase/storage-api:v0.43.11
    container_name: gb-dental-storage
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
      rest:
        condition: service_started
    environment:
      ANON_KEY: ${SUPABASE_ANON_KEY}
      SERVICE_KEY: ${SUPABASE_SERVICE_KEY}
      POSTGREST_URL: http://rest:3000
      PGRST_JWT_SECRET: ${JWT_SECRET}
      DATABASE_URL: postgres://supabase_storage_admin:${POSTGRES_PASSWORD}@db:5432/postgres
      FILE_SIZE_LIMIT: 52428800
      STORAGE_BACKEND: file
      FILE_STORAGE_BACKEND_PATH: /var/lib/storage
      TENANT_ID: stub
      REGION: stub
      GLOBAL_S3_BUCKET: stub
    volumes:
      - storage-data:/var/lib/storage
    ports:
      - "127.0.0.1:5000:5000"

  kong:
    image: kong:2.8.1
    container_name: gb-dental-kong
    restart: unless-stopped
    depends_on:
      - rest
      - auth
      - storage
      - realtime
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /usr/local/kong/kong.yml
      KONG_DNS_ORDER: LAST,A,CNAME
      KONG_PLUGINS: request-transformer,cors,key-auth,acl
      KONG_NGINX_PROXY_PROXY_BUFFER_SIZE: 160k
      KONG_NGINX_PROXY_PROXY_BUFFERS: 64 160k
    volumes:
      - ./kong.yml:/usr/local/kong/kong.yml:ro
    ports:
      - "127.0.0.1:8000:8000"

  meta:
    image: supabase/postgres-meta:v0.68.0
    container_name: gb-dental-meta
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      PG_META_PORT: 8080
      PG_META_DB_HOST: db
      PG_META_DB_PORT: 5432
      PG_META_DB_NAME: postgres
      PG_META_DB_USER: supabase_admin
      PG_META_DB_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "127.0.0.1:8080:8080"

  studio:
    image: supabase/studio:latest
    container_name: gb-dental-studio
    restart: unless-stopped
    depends_on:
      - kong
      - meta
    environment:
      STUDIO_PG_META_URL: http://meta:8080
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      DEFAULT_ORGANIZATION_NAME: "GB Dental"
      DEFAULT_PROJECT_NAME: "GB Dental"
      SUPABASE_URL: ${SUPABASE_PUBLIC_URL}
      SUPABASE_PUBLIC_URL: ${SUPABASE_PUBLIC_URL}
      SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
      SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY}
    ports:
      - "127.0.0.1:3001:3000"

volumes:
  db-data:
  storage-data:

networks:
  default:
    name: gb-dental-network
EOFCOMPOSE

# 11. Création du fichier kong.yml
echo ""
echo "🦍 Création du kong.yml..."
cat > ${INSTALL_DIR}/kong.yml << EOFKONG
_format_version: "1.1"

services:
  - name: auth-v1-open
    url: http://auth:9999/verify
    routes:
      - name: auth-v1-open
        strip_path: true
        paths:
          - /auth/v1/verify
    plugins:
      - name: cors

  - name: auth-v1-open-callback
    url: http://auth:9999/callback
    routes:
      - name: auth-v1-open-callback
        strip_path: true
        paths:
          - /auth/v1/callback
    plugins:
      - name: cors

  - name: auth-v1-open-authorize
    url: http://auth:9999/authorize
    routes:
      - name: auth-v1-open-authorize
        strip_path: true
        paths:
          - /auth/v1/authorize
    plugins:
      - name: cors

  - name: auth-v1
    url: http://auth:9999/
    routes:
      - name: auth-v1-all
        strip_path: true
        paths:
          - /auth/v1/
    plugins:
      - name: cors

  - name: rest-v1
    url: http://rest:3000/
    routes:
      - name: rest-v1-all
        strip_path: true
        paths:
          - /rest/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false

  - name: realtime-v1
    url: http://realtime:4000/socket/
    routes:
      - name: realtime-v1-all
        strip_path: true
        paths:
          - /realtime/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false

  - name: storage-v1
    url: http://storage:5000/
    routes:
      - name: storage-v1-all
        strip_path: true
        paths:
          - /storage/v1/
    plugins:
      - name: cors

  - name: meta
    url: http://meta:8080/
    routes:
      - name: meta-all
        strip_path: true
        paths:
          - /pg/

consumers:
  - username: anon
    keyauth_credentials:
      - key: ${SUPABASE_ANON_KEY}
  - username: service_role
    keyauth_credentials:
      - key: ${SUPABASE_SERVICE_KEY}

plugins:
  - name: cors
    config:
      origins:
        - "*"
      methods:
        - GET
        - HEAD
        - PUT
        - PATCH
        - POST
        - DELETE
        - OPTIONS
      headers:
        - Accept
        - Accept-Version
        - Content-Length
        - Content-MD5
        - Content-Type
        - Date
        - X-Auth-Token
        - X-Client-Info
        - apikey
        - Authorization
      exposed_headers:
        - X-Auth-Token
      credentials: true
      max_age: 3600
EOFKONG

# 12. Génération du mot de passe pour Studio
echo ""
echo "🔐 Génération du mot de passe pour Studio..."
STUDIO_PASSWORD=$(openssl rand -base64 16)
htpasswd -bc /etc/nginx/.htpasswd admin "${STUDIO_PASSWORD}"

# 13. Configuration de Nginx
echo ""
echo "🌐 Configuration de Nginx..."

# API
cat > /etc/nginx/sites-available/${API_DOMAIN} << EOFNGINX
server {
    listen 80;
    server_name ${API_DOMAIN};

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
}
EOFNGINX

# Studio
cat > /etc/nginx/sites-available/${STUDIO_DOMAIN} << EOFNGINX
server {
    listen 80;
    server_name ${STUDIO_DOMAIN};

    location / {
        auth_basic "Supabase Studio - Accès Restreint";
        auth_basic_user_file /etc/nginx/.htpasswd;

        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOFNGINX

# Activation
ln -sf /etc/nginx/sites-available/${API_DOMAIN} /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/${STUDIO_DOMAIN} /etc/nginx/sites-enabled/

nginx -t && systemctl reload nginx

# 14. Obtention des certificats SSL
echo ""
echo "🔒 Obtention des certificats SSL..."
certbot --nginx -d ${API_DOMAIN} -d ${STUDIO_DOMAIN} --non-interactive --agree-tos -m ${SSL_EMAIL}

# 15. Démarrage des services
echo ""
echo "🚀 Démarrage des services Docker..."
cd ${INSTALL_DIR}
docker compose up -d

# 16. Attente
echo ""
echo "⏳ Attente du démarrage complet (120 secondes)..."
sleep 120

# 17. Vérification
echo ""
echo "✅ Vérification de l'état des services..."
docker compose ps

# 18. Test API
echo ""
echo "🧪 Test de l'API..."
for i in {1..10}; do
    sleep 5
    RESPONSE=$(curl -s -w "\n%{http_code}" https://${API_DOMAIN}/rest/v1/ -H "apikey: ${SUPABASE_ANON_KEY}" 2>/dev/null || echo "000")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    if [ "$HTTP_CODE" = "200" ]; then
        echo "   ✅ API répond correctement"
        break
    else
        echo "   ⏳ Tentative $i/10..."
    fi
done

# 19. Fichier de config app
echo ""
echo "📝 Création du fichier .env pour l'application..."
cat > ${INSTALL_DIR}/app.env << EOF
VITE_SUPABASE_URL=https://${API_DOMAIN}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
EOF

# 20. Résumé
echo ""
echo "=========================================="
echo "  ✅ Installation terminée!"
echo "=========================================="
echo ""
echo "📋 Informations:"
echo ""
echo "API:              https://${API_DOMAIN}"
echo "Studio:           https://${STUDIO_DOMAIN}"
echo "Répertoire:       ${INSTALL_DIR}"
echo ""
echo "Studio Access:"
echo "  Username: admin"
echo "  Password: ${STUDIO_PASSWORD}"
echo ""
echo "Credentials (à sauvegarder):"
echo "  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}"
echo "  JWT_SECRET: ${JWT_SECRET}"
echo ""
echo "📝 Commandes utiles:"
echo "  Logs:      cd ${INSTALL_DIR} && docker compose logs -f"
echo "  Redémarrer: cd ${INSTALL_DIR} && docker compose restart"
echo "  Arrêter:   cd ${INSTALL_DIR} && docker compose down"
echo ""
