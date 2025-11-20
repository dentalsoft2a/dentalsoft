/*
  # Optimisation - Suppression des politiques restantes

  Suppression de toutes les politiques qui dépendent de current_stage_id
*/

-- Supprimer toutes les politiques employé qui utilisent current_stage_id
DROP POLICY IF EXISTS "Employees can view assigned delivery notes at allowed stages" ON delivery_notes;
DROP POLICY IF EXISTS "Employees can view stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Employees can update stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Employees can insert stages" ON delivery_note_stages;

-- Log
DO $$
BEGIN
  RAISE NOTICE 'Toutes les politiques dépendantes de current_stage_id ont été supprimées';
END $$;
