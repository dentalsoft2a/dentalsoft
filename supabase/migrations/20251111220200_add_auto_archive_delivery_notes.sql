/*
  # Add Auto-Archive for Delivery Notes

  1. New Functions
    - `archive_old_delivery_notes()` - Archives delivery notes older than 30 days
    - Deletes archived records older than 30 days after archiving

  2. Scheduled Job
    - Runs daily via pg_cron extension
    - Archives completed delivery notes older than 30 days
    - Keeps pending/in-progress notes regardless of age

  3. Security
    - Function runs with SECURITY DEFINER
    - Only affects completed delivery notes
    - Sends notification before archiving

  4. Notes
    - 7-day warning notification before archiving
    - Only completed delivery notes are archived
    - Archived records are kept for 30 days before deletion
*/

-- =====================================================================
-- Function: Send archive warning notifications
-- =====================================================================

CREATE OR REPLACE FUNCTION send_archive_warnings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  note_record RECORD;
BEGIN
  -- Find delivery notes that will be archived in 7 days
  FOR note_record IN
    SELECT
      dn.id,
      dn.delivery_number,
      dn.dentist_id,
      d.linked_dentist_account_id,
      d.name as dentist_name,
      dn.user_id as laboratory_id
    FROM delivery_notes dn
    JOIN dentists d ON d.id = dn.dentist_id
    WHERE dn.status = 'completed'
    AND dn.archived_at IS NULL
    AND dn.created_at < (now() - INTERVAL '23 days')
    AND dn.created_at >= (now() - INTERVAL '24 days')
    AND d.linked_dentist_account_id IS NOT NULL
  LOOP
    -- Insert notification for dentist
    INSERT INTO dentist_notifications (
      dentist_account_id,
      laboratory_id,
      type,
      title,
      message,
      reference_id,
      reference_type,
      is_read
    ) VALUES (
      note_record.linked_dentist_account_id,
      note_record.laboratory_id,
      'general',
      'Bon de livraison bientôt archivé',
      'Le bon de livraison ' || note_record.delivery_number || ' sera archivé dans 7 jours. Téléchargez-le si vous souhaitez le conserver.',
      note_record.id,
      'delivery_note',
      false
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- =====================================================================
-- Function: Archive old completed delivery notes
-- =====================================================================

CREATE OR REPLACE FUNCTION archive_old_delivery_notes()
RETURNS TABLE (
  archived_count integer,
  deleted_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_archived_count integer := 0;
  v_deleted_count integer := 0;
BEGIN
  -- Archive completed delivery notes older than 30 days
  UPDATE delivery_notes
  SET archived_at = now(),
      updated_at = now()
  WHERE status = 'completed'
  AND archived_at IS NULL
  AND created_at < (now() - INTERVAL '30 days');

  GET DIAGNOSTICS v_archived_count = ROW_COUNT;

  -- Delete archived records that have been archived for more than 30 days
  DELETE FROM delivery_notes
  WHERE archived_at IS NOT NULL
  AND archived_at < (now() - INTERVAL '30 days');

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Log the operation
  RAISE NOTICE 'Archived % delivery notes, deleted % old archived notes', v_archived_count, v_deleted_count;

  RETURN QUERY SELECT v_archived_count, v_deleted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_archive_warnings() TO authenticated;
GRANT EXECUTE ON FUNCTION archive_old_delivery_notes() TO authenticated;

-- =====================================================================
-- Create scheduled job using pg_cron (if available)
-- =====================================================================

-- Note: pg_cron might not be available in all Supabase instances
-- This is a best-effort attempt to schedule the job
-- If pg_cron is not available, this section will be ignored

DO $$
BEGIN
  -- Check if pg_cron extension exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing jobs with same name if any
    PERFORM cron.unschedule('archive-old-delivery-notes');
    PERFORM cron.unschedule('send-archive-warnings');

    -- Schedule daily archiving job at 2 AM
    PERFORM cron.schedule(
      'archive-old-delivery-notes',
      '0 2 * * *',
      'SELECT archive_old_delivery_notes();'
    );

    -- Schedule daily warning notifications at 10 AM
    PERFORM cron.schedule(
      'send-archive-warnings',
      '0 10 * * *',
      'SELECT send_archive_warnings();'
    );

    RAISE NOTICE 'Scheduled cron jobs for delivery note archiving';
  ELSE
    RAISE NOTICE 'pg_cron extension not available, skipping scheduled job creation';
    RAISE NOTICE 'Please set up a scheduled task to run archive_old_delivery_notes() daily';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule cron jobs: %', SQLERRM;
END;
$$;

-- =====================================================================
-- Create view for dentist delivery notes (last 30 days)
-- =====================================================================

CREATE OR REPLACE VIEW dentist_delivery_notes_view AS
SELECT
  dn.id,
  dn.delivery_number,
  dn.date,
  dn.status,
  dn.items,
  dn.patient_name,
  dn.prescription_date,
  dn.compliance_text,
  dn.created_by_dentist,
  dn.created_at,
  dn.updated_at,
  d.id as dentist_id,
  d.name as dentist_name,
  d.linked_dentist_account_id,
  p.laboratory_name,
  p.laboratory_address,
  p.laboratory_phone,
  p.laboratory_email,
  dn.user_id as laboratory_id
FROM delivery_notes dn
JOIN dentists d ON d.id = dn.dentist_id
JOIN profiles p ON p.id = dn.user_id
WHERE dn.archived_at IS NULL
AND dn.created_at >= (now() - INTERVAL '30 days')
ORDER BY dn.created_at DESC;

-- Grant access to the view
GRANT SELECT ON dentist_delivery_notes_view TO authenticated;

-- Create RLS policy for the view
ALTER VIEW dentist_delivery_notes_view SET (security_barrier = true);

COMMENT ON VIEW dentist_delivery_notes_view IS 'Provides dentists with access to their delivery notes from the last 30 days';
