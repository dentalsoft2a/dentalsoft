-- =============================================================================
-- SCRIPT DE NETTOYAGE ET IMPORT - DentalCloud
-- =============================================================================
-- Ce script nettoie les policies existantes avant d'importer le schéma complet
-- Utilisez ce script si vous obtenez des erreurs "policy already exists"
-- =============================================================================

-- Étape 1: Supprimer toutes les policies existantes
-- =============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies from all tables in public schema
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE 'Dropped policy % on table %.%', r.policyname, r.schemaname, r.tablename;
    END LOOP;
END $$;

-- Étape 2: Supprimer toutes les tables (ATTENTION: Cela supprime toutes les données!)
-- =============================================================================
-- Décommentez uniquement si vous voulez repartir de zéro

/*
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
*/

-- =============================================================================
-- Étape 3: Maintenant, importez le fichier supabase_complete_dump.sql
-- =============================================================================
-- Dans le SQL Editor de Supabase:
-- 1. Exécutez d'abord ce script (clean_and_import.sql)
-- 2. Puis exécutez le fichier supabase_complete_dump.sql
-- =============================================================================

-- Confirmation
SELECT 'Nettoyage terminé. Vous pouvez maintenant importer supabase_complete_dump.sql' as message;
