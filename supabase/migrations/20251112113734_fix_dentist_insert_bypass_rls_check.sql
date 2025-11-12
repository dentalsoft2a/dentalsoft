/*
  # Fix dentist delivery note insertion with security definer function

  1. Changes
    - Create a SECURITY DEFINER function to handle dentist insertions
    - This bypasses RLS checks that might be causing issues
    - The function validates the dentist link before inserting
  
  2. Security
    - Function validates that the dentist account is linked to the laboratory
    - Only authenticated users can call the function
    - Returns the inserted delivery note
*/

-- Create a secure function to insert delivery notes for dentists
CREATE OR REPLACE FUNCTION insert_delivery_note_for_dentist(
  p_user_id uuid,
  p_dentist_id uuid,
  p_delivery_number text,
  p_patient_name text,
  p_date text,
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dentist_record RECORD;
  v_delivery_note_id uuid;
  v_result jsonb;
BEGIN
  -- Verify that the authenticated user is linked to this dentist
  SELECT * INTO v_dentist_record
  FROM dentists d
  WHERE d.id = p_dentist_id
    AND d.user_id = p_user_id
    AND d.linked_dentist_account_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: You are not linked to this dentist record';
  END IF;
  
  -- Insert the delivery note (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO delivery_notes (
    user_id,
    dentist_id,
    delivery_number,
    patient_name,
    date,
    status,
    created_by_dentist,
    notes
  ) VALUES (
    p_user_id,
    p_dentist_id,
    p_delivery_number,
    p_patient_name,
    p_date::date,
    p_status,
    true,
    p_notes
  )
  RETURNING id INTO v_delivery_note_id;
  
  -- Return the created delivery note
  SELECT jsonb_build_object(
    'id', dn.id,
    'user_id', dn.user_id,
    'dentist_id', dn.dentist_id,
    'delivery_number', dn.delivery_number,
    'patient_name', dn.patient_name,
    'date', dn.date,
    'status', dn.status,
    'created_by_dentist', dn.created_by_dentist,
    'notes', dn.notes,
    'created_at', dn.created_at
  ) INTO v_result
  FROM delivery_notes dn
  WHERE dn.id = v_delivery_note_id;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_delivery_note_for_dentist(uuid, uuid, text, text, text, text, text) TO authenticated;
