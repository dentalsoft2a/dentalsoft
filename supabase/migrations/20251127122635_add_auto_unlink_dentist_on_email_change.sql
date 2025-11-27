/*
  # Auto-unlink dentist account when email changes

  1. Changes
    - Add trigger to automatically unlink dentist_account when dentist email is changed
    - Only unlink if the new email doesn't match the linked dentist_account email
    
  2. Security
    - Trigger runs with SECURITY DEFINER to bypass RLS
*/

-- Function to check and unlink dentist account if email doesn't match
CREATE OR REPLACE FUNCTION auto_unlink_dentist_on_email_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  account_email text;
BEGIN
  -- Only proceed if linked_dentist_account_id exists and email was changed
  IF NEW.linked_dentist_account_id IS NOT NULL AND 
     (OLD.email IS DISTINCT FROM NEW.email) THEN
    
    -- Get the email of the linked dentist account
    SELECT email INTO account_email
    FROM dentist_accounts
    WHERE id = NEW.linked_dentist_account_id;
    
    -- If the new email doesn't match the account email (case-insensitive), unlink
    IF account_email IS NOT NULL AND 
       LOWER(TRIM(NEW.email)) != LOWER(TRIM(account_email)) THEN
      NEW.linked_dentist_account_id := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_unlink_dentist_on_email_change ON dentists;
CREATE TRIGGER trigger_auto_unlink_dentist_on_email_change
  BEFORE UPDATE ON dentists
  FOR EACH ROW
  EXECUTE FUNCTION auto_unlink_dentist_on_email_change();
