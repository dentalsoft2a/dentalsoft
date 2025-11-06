-- =============================================================================
-- EXPORT DES DONNÉES - DentalCloud
-- =============================================================================
-- Ce script exporte toutes les données au format INSERT
-- Exécutez ce script dans votre ANCIENNE instance Supabase
-- =============================================================================

-- Activer l'affichage des résultats
\o /tmp/data_export.sql

-- Générer les INSERT statements pour toutes les tables
SELECT 'DELETE FROM ' || tablename || ';' as sql_statement
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Profiles
SELECT format('INSERT INTO profiles VALUES (%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L);',
  id, first_name, last_name, laboratory_name, laboratory_logo_url, 
  laboratory_address, laboratory_phone, laboratory_email, created_at, updated_at, laboratory_rcs)
FROM profiles;

-- User Profiles
SELECT format('INSERT INTO user_profiles VALUES (%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L);',
  id, email, role, subscription_status, subscription_plan, stripe_customer_id,
  stripe_subscription_id, trial_ends_at, subscription_ends_at, created_at, updated_at,
  subscription_start_date, subscription_end_date, trial_used)
FROM user_profiles;

-- Dentists
SELECT format('INSERT INTO dentists VALUES (%L, %L, %L, %L, %L, %L, %L, %L);',
  id, user_id, name, email, phone, address, created_at, updated_at)
FROM dentists;

-- Catalog Items
SELECT format('INSERT INTO catalog_items VALUES (%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L);',
  id, user_id, name, description, default_unit, default_price, category, is_active,
  created_at, updated_at, stock_quantity, low_stock_threshold, track_stock, stock_unit)
FROM catalog_items;

\o
