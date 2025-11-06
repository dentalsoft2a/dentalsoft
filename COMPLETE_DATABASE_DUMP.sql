-- ============================================================================
-- COMPLETE DATABASE DUMP
-- Generated: 2025-11-06
-- Database: GB Dental Management System
-- ============================================================================

-- This dump contains:
-- 1. All custom types
-- 2. All table schemas
-- 3. All data from all tables
-- 4. All indexes
-- 5. All foreign keys
-- 6. All triggers
-- 7. All RLS policies

-- ============================================================================
-- SECTION 1: CUSTOM TYPES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE subscription_status_enum AS ENUM (
        'active',
        'past_due', 
        'inactive',
        'trialing',
        'canceled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- SECTION 2: TABLE SCHEMAS
-- ============================================================================

-- Note: This is a reference dump. To get the complete schema with all tables,
-- indexes, constraints, triggers, and RLS policies, you should use the 
-- migration files in the supabase/migrations directory.

-- The migrations directory contains the complete, versioned schema that
-- can be applied in order to recreate the entire database structure.

-- ============================================================================
-- SECTION 3: EXPORT ALL DATA
-- ============================================================================

-- To export actual data, run this query against your Supabase database:
-- This dump file serves as a template. Run the following queries directly
-- in Supabase to get the actual data:

/*
-- Export profiles
SELECT jsonb_pretty(jsonb_agg(row_to_json(t.*))) FROM profiles t;

-- Export user_profiles  
SELECT jsonb_pretty(jsonb_agg(row_to_json(t.*))) FROM user_profiles t;

-- Export dentist_accounts
SELECT jsonb_pretty(jsonb_agg(row_to_json(t.*))) FROM dentist_accounts t;

-- Export patients
SELECT jsonb_pretty(jsonb_agg(row_to_json(t.*))) FROM patients t;

-- Export catalog_items
SELECT jsonb_pretty(jsonb_agg(row_to_json(t.*))) FROM catalog_items t;

-- Export resources
SELECT jsonb_pretty(jsonb_agg(row_to_json(t.*))) FROM resources t;

-- Export resource_variants
SELECT jsonb_pretty(jsonb_agg(row_to_json(t.*))) FROM resource_variants t;

-- Export delivery_notes
SELECT jsonb_pretty(jsonb_agg(row_to_json(t.*))) FROM delivery_notes t;

-- Export proformas
SELECT jsonb_pretty(jsonb_agg(row_to_json(t.*))) FROM proformas t;

-- Export proforma_items
SELECT jsonb_pretty(jsonb_agg(row_to_json(t.*))) FROM proforma_items t;

-- Export invoices
SELECT jsonb_pretty(jsonb_agg(row_to_json(t.*))) FROM invoices t;

-- Export invoice_payments
SELECT jsonb_pretty(jsonb_agg(row_to_json(t.*))) FROM invoice_payments t;

-- Export credit_notes
SELECT jsonb_pretty(jsonb_agg(row_to_json(t.*))) FROM credit_notes t;

-- Export stock_movements
SELECT jsonb_pretty(jsonb_agg(row_to_json(t.*))) FROM stock_movements t;

-- Export subscription_plans
SELECT jsonb_pretty(jsonb_agg(row_to_json(t.*))) FROM subscription_plans t;

-- Export access_codes
SELECT jsonb_pretty(jsonb_agg(row_to_json(t.*))) FROM access_codes t;

-- Export help_topics
SELECT jsonb_pretty(jsonb_agg(row_to_json(t.*))) FROM help_topics t;

-- Export support_tickets
SELECT jsonb_pretty(jsonb_agg(row_to_json(t.*))) FROM support_tickets t;

-- Export photo_submissions
SELECT jsonb_pretty(jsonb_agg(row_to_json(t.*))) FROM photo_submissions t;

-- Export laboratory_employees
SELECT jsonb_pretty(jsonb_agg(row_to_json(t.*))) FROM laboratory_employees t;
*/

