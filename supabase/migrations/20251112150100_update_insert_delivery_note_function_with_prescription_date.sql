/*
  # Mettre à jour la fonction insert_delivery_note_for_dentist avec prescription_date

  1. Modifications
    - Ajouter le paramètre p_prescription_date à la fonction
    - Inclure prescription_date dans l'insertion des bons de livraison
    - Mettre à jour la valeur de retour pour inclure prescription_date

  2. Sécurité
    - La fonction maintient SECURITY DEFINER pour contourner RLS
    - Validation toujours effectuée pour vérifier le lien dentiste-compte
*/

-- Supprimer l'ancienne version de la fonction
DROP FUNCTION IF EXISTS insert_delivery_note_for_dentist(uuid, uuid, text, text, text, text, text, text, text, text);

-- Créer la fonction mise à jour avec le paramètre prescription_date
CREATE OR REPLACE FUNCTION insert_delivery_note_for_dentist(
  p_user_id uuid,
  p_dentist_id uuid,
  p_delivery_number text,
  p_patient_name text,
  p_date text,
  p_status text,
  p_notes text DEFAULT NULL,
  p_work_description text DEFAULT NULL,
  p_tooth_numbers text DEFAULT NULL,
  p_shade text DEFAULT NULL,
  p_prescription_date text DEFAULT NULL
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
  -- Vérifier que l'utilisateur authentifié est lié à ce dentiste
  SELECT * INTO v_dentist_record
  FROM dentists d
  WHERE d.id = p_dentist_id
    AND d.user_id = p_user_id
    AND d.linked_dentist_account_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: You are not linked to this dentist record';
  END IF;

  -- Insérer le bon de livraison (contourne RLS avec SECURITY DEFINER)
  INSERT INTO delivery_notes (
    user_id,
    dentist_id,
    delivery_number,
    patient_name,
    date,
    status,
    created_by_dentist,
    notes,
    work_description,
    tooth_numbers,
    shade,
    prescription_date
  ) VALUES (
    p_user_id,
    p_dentist_id,
    p_delivery_number,
    p_patient_name,
    p_date::date,
    p_status,
    true,
    p_notes,
    p_work_description,
    p_tooth_numbers,
    p_shade,
    CASE WHEN p_prescription_date IS NOT NULL THEN p_prescription_date::date ELSE NULL END
  )
  RETURNING id INTO v_delivery_note_id;

  -- Retourner le bon de livraison créé
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
    'work_description', dn.work_description,
    'tooth_numbers', dn.tooth_numbers,
    'shade', dn.shade,
    'prescription_date', dn.prescription_date,
    'created_at', dn.created_at
  ) INTO v_result
  FROM delivery_notes dn
  WHERE dn.id = v_delivery_note_id;

  RETURN v_result;
END;
$$;

-- Accorder les permissions d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION insert_delivery_note_for_dentist(uuid, uuid, text, text, text, text, text, text, text, text, text) TO authenticated;
