-- Create missing PostgreSQL users for Supabase services
-- Run this inside the postgres container

-- Auth user
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'supabase_auth_admin') THEN
    CREATE USER supabase_auth_admin WITH PASSWORD 'your-super-secret-postgres-password';
  END IF;
END
$$;

-- Storage user
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'supabase_storage_admin') THEN
    CREATE USER supabase_storage_admin WITH PASSWORD 'your-super-secret-postgres-password';
  END IF;
END
$$;

-- Supabase admin user
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'supabase_admin') THEN
    CREATE USER supabase_admin WITH SUPERUSER PASSWORD 'your-super-secret-postgres-password';
  END IF;
END
$$;

-- Authenticator user (for PostgREST)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'authenticator') THEN
    CREATE USER authenticator WITH PASSWORD 'your-super-secret-postgres-password' NOINHERIT;
  END IF;
END
$$;

-- Anon role
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
END
$$;

-- Authenticated role
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;

-- Service role
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END
$$;

-- Grant privileges
GRANT anon, authenticated, service_role TO authenticator;
GRANT ALL ON DATABASE postgres TO supabase_auth_admin, supabase_storage_admin, supabase_admin;
GRANT ALL ON SCHEMA public TO supabase_auth_admin, supabase_storage_admin, supabase_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO supabase_auth_admin, supabase_storage_admin, supabase_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin, supabase_storage_admin, supabase_admin;
