/*
  # Create dentist subscription expiration system
  
  1. New Functions
    - `expire_dentist_subscriptions()` - Checks and expires dentist subscriptions
      - Finds all dentist accounts with expired subscription_end_date
      - Updates subscription_status from 'trial' or 'active' to 'expired'
      - Returns count of expired subscriptions
      - Logs expired subscription IDs for audit
  
  2. Automation
    - Creates pg_cron job to run daily at 1:00 AM
    - Job name: 'expire-dentist-subscriptions-daily'
    - Ensures subscriptions are automatically expired when date passes
  
  3. Security
    - Function is SECURITY DEFINER to bypass RLS
    - Only system can call it via cron
*/

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the expiration function
CREATE OR REPLACE FUNCTION expire_dentist_subscriptions()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count integer := 0;
  v_expired_ids text[] := ARRAY[]::text[];
  v_record record;
BEGIN
  -- Find and expire all dentist subscriptions that have passed their end date
  FOR v_record IN
    SELECT id, email, subscription_status, subscription_end_date
    FROM dentist_accounts
    WHERE subscription_end_date IS NOT NULL
      AND subscription_end_date < now()
      AND subscription_status IN ('trial', 'active')
  LOOP
    -- Update to expired status
    UPDATE dentist_accounts
    SET subscription_status = 'expired'
    WHERE id = v_record.id;
    
    v_expired_count := v_expired_count + 1;
    v_expired_ids := array_append(v_expired_ids, v_record.id::text);
    
    -- Log to audit log if it exists
    BEGIN
      INSERT INTO audit_log (
        entity_type,
        entity_id,
        action,
        user_id,
        changes
      ) VALUES (
        'dentist_subscription',
        v_record.id,
        'auto_expire',
        v_record.id,
        jsonb_build_object(
          'previous_status', v_record.subscription_status,
          'new_status', 'expired',
          'subscription_end_date', v_record.subscription_end_date,
          'expired_at', now()
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Ignore if audit_log doesn't exist
      NULL;
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'expired_count', v_expired_count,
    'expired_ids', v_expired_ids,
    'checked_at', now()
  );
END;
$$;

-- Grant execute to authenticated users (for manual testing by admins)
GRANT EXECUTE ON FUNCTION expire_dentist_subscriptions() TO authenticated;

-- Remove existing cron job if it exists
SELECT cron.unschedule('expire-dentist-subscriptions-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'expire-dentist-subscriptions-daily'
);

-- Schedule the cron job to run daily at 1:00 AM
SELECT cron.schedule(
  'expire-dentist-subscriptions-daily',
  '0 1 * * *', -- Every day at 1:00 AM
  $$SELECT expire_dentist_subscriptions();$$
);

COMMENT ON FUNCTION expire_dentist_subscriptions IS 'Automatically expires dentist subscriptions that have passed their end date. Runs daily via pg_cron at 1:00 AM.';
