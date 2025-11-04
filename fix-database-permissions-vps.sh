#!/bin/bash
set -e

echo "=========================================="
echo "  Correction des permissions de la base"
echo "=========================================="
echo ""

INSTALL_DIR="/opt/gb-dental"

cd ${INSTALL_DIR}

echo "1️⃣ Arrêt des services auth et storage..."
docker compose stop auth storage

echo ""
echo "2️⃣ Correction des permissions et création des tables auth..."
docker compose exec -T db psql -U postgres -d postgres << 'EOSQL'
-- Permissions sur le schéma public
GRANT ALL ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON SCHEMA public TO supabase_storage_admin;
GRANT ALL ON SCHEMA public TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO supabase_auth_admin;

-- Permissions sur le schéma auth
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO supabase_auth_admin;

-- Permissions sur le schéma storage
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON TABLES TO supabase_storage_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON SEQUENCES TO supabase_storage_admin;

-- Création de l'extension pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;

-- Création de la table auth.schema_migrations
CREATE TABLE IF NOT EXISTS auth.schema_migrations (
    version VARCHAR(14) NOT NULL PRIMARY KEY
);

-- Permissions pour auth.schema_migrations
GRANT ALL ON auth.schema_migrations TO supabase_auth_admin;

-- Création des tables auth principales
CREATE TABLE IF NOT EXISTS auth.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id uuid,
    aud varchar(255),
    role varchar(255),
    email varchar(255) UNIQUE,
    encrypted_password varchar(255),
    email_confirmed_at timestamptz,
    invited_at timestamptz,
    confirmation_token varchar(255),
    confirmation_sent_at timestamptz,
    recovery_token varchar(255),
    recovery_sent_at timestamptz,
    email_change_token_new varchar(255),
    email_change varchar(255),
    email_change_sent_at timestamptz,
    last_sign_in_at timestamptz,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    phone varchar(15) UNIQUE,
    phone_confirmed_at timestamptz,
    phone_change varchar(15),
    phone_change_token varchar(255),
    phone_change_sent_at timestamptz,
    confirmed_at timestamptz GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current varchar(255),
    email_change_confirm_status smallint,
    banned_until timestamptz,
    reauthentication_token varchar(255),
    reauthentication_sent_at timestamptz,
    is_sso_user boolean DEFAULT false,
    deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS auth.identities (
    id text NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (provider, id)
);

CREATE TABLE IF NOT EXISTS auth.sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    factor_id uuid,
    aal text,
    not_after timestamptz
);

CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    instance_id uuid,
    id bigserial PRIMARY KEY,
    token varchar(255) UNIQUE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    revoked boolean,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    parent varchar(255),
    session_id uuid REFERENCES auth.sessions(id) ON DELETE CASCADE
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS users_instance_id_idx ON auth.users(instance_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON auth.users(email);
CREATE INDEX IF NOT EXISTS identities_user_id_idx ON auth.identities(user_id);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_token_idx ON auth.refresh_tokens(token);
CREATE INDEX IF NOT EXISTS refresh_tokens_session_id_idx ON auth.refresh_tokens(session_id);

-- Permissions sur les tables auth
GRANT ALL ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON auth.sessions TO authenticated;

-- Permissions sur les tables storage
GRANT ALL ON ALL TABLES IN SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO supabase_storage_admin;

-- Confirmation
SELECT 'Permissions et tables corrigées avec succès!' as message;
EOSQL

echo ""
echo "3️⃣ Redémarrage des services..."
docker compose start auth storage

echo ""
echo "4️⃣ Attente de 30 secondes..."
sleep 30

echo ""
echo "5️⃣ Vérification du statut..."
docker compose ps

echo ""
echo "6️⃣ Logs du service auth..."
docker compose logs auth --tail=20

echo ""
echo "✅ Correction terminée!"
echo ""
echo "Testez maintenant:"
echo "  - Studio: https://studio.dentalcloud.fr"
echo "  - Signup: https://api.dentalcloud.fr/auth/v1/signup"
echo ""
