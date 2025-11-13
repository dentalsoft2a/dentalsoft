/*
  # Ajouter le suivi des refus aux bons de livraison
  
  Cette migration corrige le problème où les demandes refusées sont supprimées
  au lieu d'être marquées comme refusées avec une raison.
  
  1. Nouveaux Champs
    - `rejection_reason` (text) - Raison du refus de la demande
    - `rejected_at` (timestamptz) - Date et heure du refus
    - `rejected_by` (uuid) - ID de l'utilisateur qui a refusé
  
  2. Modifications
    - Les demandes refusées seront marquées avec status = 'refused'
    - Historique complet pour les dentistes
    - Traçabilité des refus
*/

-- Ajouter les nouveaux champs pour le suivi des refus
ALTER TABLE delivery_notes 
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id);

-- Créer un index sur le statut refused pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_delivery_notes_refused 
  ON delivery_notes(status) WHERE status = 'refused';

-- Créer un index sur rejected_at pour le tri chronologique
CREATE INDEX IF NOT EXISTS idx_delivery_notes_rejected_at 
  ON delivery_notes(rejected_at) WHERE rejected_at IS NOT NULL;

-- Fonction pour marquer une demande comme refusée
CREATE OR REPLACE FUNCTION reject_delivery_note_request(
  p_delivery_note_id uuid,
  p_rejection_reason text,
  p_rejected_by uuid
)
RETURNS json AS $$
DECLARE
  v_result json;
  v_note_exists boolean;
  v_current_status text;
BEGIN
  -- Vérifier que le bon de livraison existe
  SELECT EXISTS(
    SELECT 1 FROM delivery_notes WHERE id = p_delivery_note_id
  ), status
  INTO v_note_exists, v_current_status
  FROM delivery_notes
  WHERE id = p_delivery_note_id;

  IF NOT v_note_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Bon de livraison introuvable'
    );
  END IF;

  -- Vérifier que la demande est en attente d'approbation
  IF v_current_status != 'pending_approval' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Seules les demandes en attente peuvent être refusées'
    );
  END IF;

  -- Marquer comme refusé
  UPDATE delivery_notes
  SET 
    status = 'refused',
    rejection_reason = p_rejection_reason,
    rejected_at = now(),
    rejected_by = p_rejected_by,
    updated_at = now()
  WHERE id = p_delivery_note_id;

  v_result := json_build_object(
    'success', true,
    'message', 'Demande refusée avec succès'
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vue pour faciliter l'accès aux demandes refusées avec informations complètes
CREATE OR REPLACE VIEW refused_delivery_notes_view AS
SELECT 
  dn.id,
  dn.delivery_number,
  dn.dentist_id,
  d.name as dentist_name,
  dn.patient_name,
  dn.work_description,
  dn.tooth_numbers,
  dn.shade,
  dn.notes,
  dn.prescription_date,
  dn.date,
  dn.status,
  dn.rejection_reason,
  dn.rejected_at,
  dn.rejected_by,
  au.email as rejected_by_email,
  up.email as rejected_by_user_email,
  dn.created_at,
  dn.created_by_dentist,
  dn.user_id as laboratory_id,
  p.laboratory_name
FROM delivery_notes dn
LEFT JOIN dentists d ON d.id = dn.dentist_id
LEFT JOIN auth.users au ON au.id = dn.rejected_by
LEFT JOIN user_profiles up ON up.id = dn.rejected_by
LEFT JOIN profiles p ON p.id = dn.user_id
WHERE dn.status = 'refused';

-- Permissions pour la vue
GRANT SELECT ON refused_delivery_notes_view TO authenticated;

-- Commentaires
COMMENT ON COLUMN delivery_notes.rejection_reason IS 'Raison du refus de la demande par le laboratoire';
COMMENT ON COLUMN delivery_notes.rejected_at IS 'Date et heure du refus de la demande';
COMMENT ON COLUMN delivery_notes.rejected_by IS 'ID de l''utilisateur qui a refusé la demande';
COMMENT ON FUNCTION reject_delivery_note_request(uuid, text, uuid) IS 'Marque une demande de bon de livraison comme refusée au lieu de la supprimer';
COMMENT ON VIEW refused_delivery_notes_view IS 'Vue des demandes de bons de livraison refusées avec informations complètes';
