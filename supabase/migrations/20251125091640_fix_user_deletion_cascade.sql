/*
  # Correction des contraintes de suppression d'utilisateurs

  1. Problème
    - delivery_note_stages.completed_by a NO ACTION
    - work_assignments.assigned_by a NO ACTION
    - Ces contraintes bloquent la suppression des utilisateurs

  2. Solution
    - Modifier les contraintes pour utiliser SET NULL
    - Permet la suppression sans perdre les données historiques

  3. Impact
    - Les utilisateurs peuvent être supprimés
    - Les données historiques sont préservées (completed_by et assigned_by deviennent NULL)
*/

-- Modifier la contrainte de delivery_note_stages.completed_by
ALTER TABLE delivery_note_stages
  DROP CONSTRAINT IF EXISTS delivery_note_stages_completed_by_fkey;

ALTER TABLE delivery_note_stages
  ADD CONSTRAINT delivery_note_stages_completed_by_fkey
  FOREIGN KEY (completed_by)
  REFERENCES user_profiles(id)
  ON DELETE SET NULL;

-- Modifier la contrainte de work_assignments.assigned_by
ALTER TABLE work_assignments
  DROP CONSTRAINT IF EXISTS work_assignments_assigned_by_fkey;

ALTER TABLE work_assignments
  ADD CONSTRAINT work_assignments_assigned_by_fkey
  FOREIGN KEY (assigned_by)
  REFERENCES user_profiles(id)
  ON DELETE SET NULL;
