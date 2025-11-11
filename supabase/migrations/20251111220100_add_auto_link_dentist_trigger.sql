/*
  # Add Automatic Dentist Linking Trigger

  1. New Functions
    - `auto_link_dentist_account()` - Automatically links dentist_accounts to dentists table by email
    - `link_existing_dentists()` - One-time function to link existing records

  2. Triggers
    - Creates trigger on dentist_accounts insert/update to auto-link by email
    - Creates trigger on dentists insert/update to auto-link by email

  3. Security
    - Functions run with SECURITY DEFINER to bypass RLS
    - Only operates on matching email addresses

  4. Notes
    - Case-insensitive email matching
    - Updates both directions (dentist_accounts → dentists and dentists → dentist_accounts)
    - Handles multiple matches by taking the most recent dentist record
*/

-- =====================================================================
-- Function: Auto-link dentist account when created/updated
-- =====================================================================

CREATE OR REPLACE FUNCTION auto_link_dentist_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  matching_dentist_id uuid;
BEGIN
  -- Only proceed if email is provided
  IF NEW.email IS NULL OR TRIM(NEW.email) = '' THEN
    RETURN NEW;
  END IF;

  -- Find matching dentist by email (case-insensitive)
  SELECT id INTO matching_dentist_id
  FROM dentists
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
  AND linked_dentist_account_id IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  -- If found, link the dentist to this account
  IF matching_dentist_id IS NOT NULL THEN
    UPDATE dentists
    SET linked_dentist_account_id = NEW.id,
        updated_at = now()
    WHERE id = matching_dentist_id;

    RAISE NOTICE 'Auto-linked dentist account % to dentist %', NEW.id, matching_dentist_id;
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================================
-- Function: Auto-link dentist when created/updated
-- =====================================================================

CREATE OR REPLACE FUNCTION auto_link_dentist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  matching_account_id uuid;
BEGIN
  -- Only proceed if email is provided and not already linked
  IF NEW.email IS NULL OR TRIM(NEW.email) = '' OR NEW.linked_dentist_account_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Find matching dentist account by email (case-insensitive)
  SELECT id INTO matching_account_id
  FROM dentist_accounts
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
  ORDER BY created_at DESC
  LIMIT 1;

  -- If found, link this dentist to the account
  IF matching_account_id IS NOT NULL THEN
    NEW.linked_dentist_account_id := matching_account_id;
    NEW.updated_at := now();

    RAISE NOTICE 'Auto-linked dentist % to dentist account %', NEW.id, matching_account_id;
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================================
-- Create triggers
-- =====================================================================

-- Trigger when dentist_account is created or email updated
DROP TRIGGER IF EXISTS trigger_auto_link_dentist_account ON dentist_accounts;
CREATE TRIGGER trigger_auto_link_dentist_account
  AFTER INSERT OR UPDATE OF email ON dentist_accounts
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_dentist_account();

-- Trigger when dentist is created or email updated
DROP TRIGGER IF EXISTS trigger_auto_link_dentist ON dentists;
CREATE TRIGGER trigger_auto_link_dentist
  BEFORE INSERT OR UPDATE OF email ON dentists
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_dentist();

-- =====================================================================
-- Function: Link existing dentists (one-time migration helper)
-- =====================================================================

CREATE OR REPLACE FUNCTION link_existing_dentists()
RETURNS TABLE (
  dentist_id uuid,
  dentist_account_id uuid,
  email text,
  linked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH matches AS (
    SELECT DISTINCT ON (d.id)
      d.id as dentist_id,
      da.id as dentist_account_id,
      d.email as email,
      true as linked
    FROM dentists d
    JOIN dentist_accounts da ON LOWER(TRIM(d.email)) = LOWER(TRIM(da.email))
    WHERE d.email IS NOT NULL
    AND TRIM(d.email) != ''
    AND d.linked_dentist_account_id IS NULL
    ORDER BY d.id, da.created_at DESC
  )
  UPDATE dentists d
  SET linked_dentist_account_id = m.dentist_account_id,
      updated_at = now()
  FROM matches m
  WHERE d.id = m.dentist_id
  RETURNING d.id, d.linked_dentist_account_id, d.email, true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION link_existing_dentists() TO authenticated;

-- Execute the one-time linking for existing records
SELECT * FROM link_existing_dentists();
