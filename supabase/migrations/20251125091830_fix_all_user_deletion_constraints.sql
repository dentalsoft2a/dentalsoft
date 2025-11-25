/*
  # Correction complète des contraintes de suppression d'utilisateurs

  1. Problème
    - Plusieurs contraintes utilisent NO ACTION qui bloque la suppression
    - delivery_note_stages.completed_by
    - work_assignments.assigned_by
    - laboratory_employees.created_by
    - laboratory_employees.user_profile_id
    - user_profiles.impersonated_by

  2. Solution
    - Modifier toutes les contraintes pour utiliser SET NULL ou CASCADE
    - Permet la suppression sans perdre les données historiques

  3. Impact
    - Les utilisateurs peuvent être supprimés sans erreur
    - Les données historiques sont préservées
*/

-- delivery_note_stages.completed_by -> SET NULL
ALTER TABLE delivery_note_stages
  DROP CONSTRAINT IF EXISTS delivery_note_stages_completed_by_fkey;

ALTER TABLE delivery_note_stages
  ADD CONSTRAINT delivery_note_stages_completed_by_fkey
  FOREIGN KEY (completed_by)
  REFERENCES user_profiles(id)
  ON DELETE SET NULL;

-- work_assignments.assigned_by -> SET NULL
ALTER TABLE work_assignments
  DROP CONSTRAINT IF EXISTS work_assignments_assigned_by_fkey;

ALTER TABLE work_assignments
  ADD CONSTRAINT work_assignments_assigned_by_fkey
  FOREIGN KEY (assigned_by)
  REFERENCES user_profiles(id)
  ON DELETE SET NULL;

-- laboratory_employees.created_by -> SET NULL
ALTER TABLE laboratory_employees
  DROP CONSTRAINT IF EXISTS laboratory_employees_created_by_fkey;

ALTER TABLE laboratory_employees
  ADD CONSTRAINT laboratory_employees_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES user_profiles(id)
  ON DELETE SET NULL;

-- laboratory_employees.user_profile_id -> CASCADE (supprimer l'employé si son compte est supprimé)
ALTER TABLE laboratory_employees
  DROP CONSTRAINT IF EXISTS laboratory_employees_user_profile_id_fkey;

ALTER TABLE laboratory_employees
  ADD CONSTRAINT laboratory_employees_user_profile_id_fkey
  FOREIGN KEY (user_profile_id)
  REFERENCES user_profiles(id)
  ON DELETE CASCADE;

-- user_profiles.impersonated_by -> SET NULL
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_impersonated_by_fkey;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_impersonated_by_fkey
  FOREIGN KEY (impersonated_by)
  REFERENCES user_profiles(id)
  ON DELETE SET NULL;
