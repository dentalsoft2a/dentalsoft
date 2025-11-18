/*
  # Fix RLS Policies for Demo Data Generation V2

  ## Problem
  Demo data generation fails due to missing RLS policies on various tables.

  ## Solution
  Add INSERT policies for authenticated users on all tables needed for demo.
*/

-- 1. Fix resource_variants INSERT policy
DROP POLICY IF EXISTS "Users can insert own resource variants" ON resource_variants;
DROP POLICY IF EXISTS "Users can insert variants for own resources" ON resource_variants;

CREATE POLICY "Users can insert variants for own resources"
  ON resource_variants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM resources
      WHERE resources.id = resource_variants.resource_id
      AND resources.user_id = auth.uid()
    )
  );

-- 2. Fix proforma_items INSERT policy
DROP POLICY IF EXISTS "Users can insert own proforma items" ON proforma_items;
DROP POLICY IF EXISTS "Users can insert items for own proformas" ON proforma_items;

CREATE POLICY "Users can insert items for own proformas"
  ON proforma_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proformas
      WHERE proformas.id = proforma_items.proforma_id
      AND proformas.user_id = auth.uid()
    )
  );

-- 3. Ensure all core tables have INSERT policies

-- Dentists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'dentists' 
    AND policyname = 'Users can insert own dentists'
  ) THEN
    CREATE POLICY "Users can insert own dentists"
      ON dentists FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Patients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'patients' 
    AND policyname = 'Users can insert own patients'
  ) THEN
    CREATE POLICY "Users can insert own patients"
      ON patients FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Catalog items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'catalog_items' 
    AND policyname = 'Users can insert own catalog items'
  ) THEN
    CREATE POLICY "Users can insert own catalog items"
      ON catalog_items FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Resources
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'resources' 
    AND policyname = 'Users can insert own resources'
  ) THEN
    CREATE POLICY "Users can insert own resources"
      ON resources FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Delivery notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'delivery_notes' 
    AND policyname = 'Users can insert own delivery notes'
  ) THEN
    CREATE POLICY "Users can insert own delivery notes"
      ON delivery_notes FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Proformas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'proformas' 
    AND policyname = 'Users can insert own proformas'
  ) THEN
    CREATE POLICY "Users can insert own proformas"
      ON proformas FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'invoices' 
    AND policyname = 'Users can insert own invoices'
  ) THEN
    CREATE POLICY "Users can insert own invoices"
      ON invoices FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
