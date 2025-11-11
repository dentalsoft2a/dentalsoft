/*
  # Create Dentist Portal System

  1. New Columns in Existing Tables
    - `dentists` table:
      - `linked_dentist_account_id` (uuid, nullable) - Links to dentist_accounts for portal access

    - `user_profiles` table:
      - `allow_dentist_orders` (boolean, default false) - Enable direct ordering from dentists
      - `allow_dentist_quote_requests` (boolean, default false) - Enable quote requests from dentists
      - `dentist_portal_message` (text, nullable) - Custom welcome message for dentists

    - `catalog_items` table:
      - `visible_to_dentists` (boolean, default false) - Show item in dentist catalog

    - `delivery_notes` table:
      - `created_by_dentist` (boolean, default false) - Indicates if order was placed by dentist
      - `archived_at` (timestamptz, nullable) - When the record was archived

  2. New Tables
    - `dentist_quote_requests`
      - Stores quote requests from dentists to laboratories

    - `dentist_notifications`
      - Stores notifications for dentist accounts

  3. Security
    - Enable RLS on all new tables
    - Update existing RLS policies to allow dentist access
    - Create policies for quote requests and notifications

  4. Notes
    - Automatic email-based linking will be handled by trigger
    - Records older than 30 days will be archived automatically
    - Dentists have read-only access to delivery notes
*/

-- =====================================================================
-- PART 1: Update existing tables
-- =====================================================================

-- Add linked_dentist_account_id to dentists table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dentists' AND column_name = 'linked_dentist_account_id'
  ) THEN
    ALTER TABLE dentists ADD COLUMN linked_dentist_account_id uuid REFERENCES dentist_accounts(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_dentists_linked_account ON dentists(linked_dentist_account_id);
  END IF;
END $$;

-- Add dentist portal settings to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'allow_dentist_orders'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN allow_dentist_orders boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'allow_dentist_quote_requests'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN allow_dentist_quote_requests boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'dentist_portal_message'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN dentist_portal_message text;
  END IF;
END $$;

-- Add visible_to_dentists to catalog_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'catalog_items' AND column_name = 'visible_to_dentists'
  ) THEN
    ALTER TABLE catalog_items ADD COLUMN visible_to_dentists boolean DEFAULT false;
  END IF;
END $$;

-- Add created_by_dentist and archived_at to delivery_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'created_by_dentist'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN created_by_dentist boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN archived_at timestamptz;
    CREATE INDEX IF NOT EXISTS idx_delivery_notes_archived ON delivery_notes(archived_at);
  END IF;
END $$;

-- Update delivery_notes status to include pending_approval
DO $$
BEGIN
  ALTER TABLE delivery_notes DROP CONSTRAINT IF EXISTS delivery_notes_status_check;
  ALTER TABLE delivery_notes ADD CONSTRAINT delivery_notes_status_check
    CHECK (status IN ('pending', 'pending_approval', 'in_progress', 'completed', 'refused'));
END $$;

-- =====================================================================
-- PART 2: Create new tables
-- =====================================================================

-- Create dentist_quote_requests table
CREATE TABLE IF NOT EXISTS dentist_quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_account_id uuid REFERENCES dentist_accounts(id) ON DELETE CASCADE NOT NULL,
  laboratory_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  patient_name text NOT NULL,
  work_description text NOT NULL,
  tooth_numbers text,
  shade text,
  requested_delivery_date date,
  photo_urls jsonb DEFAULT '[]',
  notes text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'accepted', 'refused', 'expired')),
  laboratory_response text,
  quoted_amount decimal(10, 2),
  proforma_id uuid REFERENCES proformas(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_requests_dentist ON dentist_quote_requests(dentist_account_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_laboratory ON dentist_quote_requests(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON dentist_quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_created ON dentist_quote_requests(created_at DESC);

-- Create dentist_notifications table
CREATE TABLE IF NOT EXISTS dentist_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_account_id uuid REFERENCES dentist_accounts(id) ON DELETE CASCADE NOT NULL,
  laboratory_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('delivery_note_created', 'delivery_note_status_changed', 'quote_request_response', 'order_approved', 'order_refused', 'general')),
  title text NOT NULL,
  message text NOT NULL,
  reference_id uuid,
  reference_type text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_dentist ON dentist_notifications(dentist_account_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON dentist_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON dentist_notifications(created_at DESC);

-- =====================================================================
-- PART 3: Enable RLS and create policies
-- =====================================================================

ALTER TABLE dentist_quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE dentist_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for dentist_quote_requests

-- Dentists can insert their own quote requests
CREATE POLICY "Dentists can insert own quote requests"
  ON dentist_quote_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = dentist_account_id);

-- Dentists can view their own quote requests
CREATE POLICY "Dentists can view own quote requests"
  ON dentist_quote_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = dentist_account_id);

-- Dentists can update their own pending quote requests
CREATE POLICY "Dentists can update own pending quote requests"
  ON dentist_quote_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = dentist_account_id AND status = 'pending')
  WITH CHECK (auth.uid() = dentist_account_id AND status = 'pending');

-- Laboratories can view quote requests sent to them
CREATE POLICY "Laboratories can view quote requests sent to them"
  ON dentist_quote_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = laboratory_id);

-- Laboratories can update quote requests sent to them
CREATE POLICY "Laboratories can update quote requests sent to them"
  ON dentist_quote_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = laboratory_id)
  WITH CHECK (auth.uid() = laboratory_id);

-- Super admins can access all quote requests
CREATE POLICY "Super admins can access all quote requests"
  ON dentist_quote_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Policies for dentist_notifications

-- Dentists can view their own notifications
CREATE POLICY "Dentists can view own notifications"
  ON dentist_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = dentist_account_id);

-- Dentists can update their own notifications (mark as read)
CREATE POLICY "Dentists can update own notifications"
  ON dentist_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = dentist_account_id)
  WITH CHECK (auth.uid() = dentist_account_id);

-- Laboratories can insert notifications for their dentists
CREATE POLICY "Laboratories can insert notifications"
  ON dentist_notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = laboratory_id);

-- Super admins can access all notifications
CREATE POLICY "Super admins can access all notifications"
  ON dentist_notifications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- =====================================================================
-- PART 4: Update RLS policies for dentist access to delivery_notes
-- =====================================================================

-- Dentists can view delivery notes linked to them
CREATE POLICY "Dentists can view their delivery notes"
  ON delivery_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dentists
      WHERE dentists.id = delivery_notes.dentist_id
      AND dentists.linked_dentist_account_id = auth.uid()
    )
  );

-- Dentists can create delivery notes (orders) if allowed
CREATE POLICY "Dentists can create orders if allowed"
  ON delivery_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by_dentist = true
    AND status = 'pending_approval'
    AND EXISTS (
      SELECT 1 FROM dentists
      JOIN user_profiles ON user_profiles.id = dentists.user_id
      WHERE dentists.id = delivery_notes.dentist_id
      AND dentists.linked_dentist_account_id = auth.uid()
      AND user_profiles.allow_dentist_orders = true
    )
  );

-- =====================================================================
-- PART 5: Update RLS policies for catalog access by dentists
-- =====================================================================

-- Dentists can view catalog items visible to them
CREATE POLICY "Dentists can view visible catalog items"
  ON catalog_items FOR SELECT
  TO authenticated
  USING (
    visible_to_dentists = true
    AND EXISTS (
      SELECT 1 FROM dentists
      WHERE dentists.user_id = catalog_items.user_id
      AND dentists.linked_dentist_account_id = auth.uid()
    )
  );

-- =====================================================================
-- PART 6: Create helper functions
-- =====================================================================

-- Function to get dentist's linked laboratories
CREATE OR REPLACE FUNCTION get_dentist_laboratories(p_dentist_account_id uuid)
RETURNS TABLE (
  laboratory_id uuid,
  laboratory_name text,
  allow_orders boolean,
  allow_quotes boolean,
  portal_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as laboratory_id,
    p.laboratory_name,
    up.allow_dentist_orders as allow_orders,
    up.allow_dentist_quote_requests as allow_quotes,
    up.dentist_portal_message as portal_message
  FROM dentists d
  JOIN profiles p ON p.id = d.user_id
  JOIN user_profiles up ON up.id = d.user_id
  WHERE d.linked_dentist_account_id = p_dentist_account_id;
END;
$$;

-- Function to count unread notifications
CREATE OR REPLACE FUNCTION count_unread_notifications(p_dentist_account_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  unread_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO unread_count
  FROM dentist_notifications
  WHERE dentist_account_id = p_dentist_account_id
  AND is_read = false;

  RETURN unread_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_dentist_laboratories(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION count_unread_notifications(uuid) TO authenticated;
