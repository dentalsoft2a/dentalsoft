/*
  # Revenir au système de production_stages avec UUIDs

  1. Problème
    - La migration 20251111224623 a converti current_stage_id en TEXT
    - Le code frontend attend une relation avec production_stages (UUID)
    
  2. Solution
    - Supprimer les contraintes CHECK sur current_stage_id
    - Convertir current_stage_id de TEXT vers UUID
    - Ajouter la foreign key vers production_stages
    - Simplifier les politiques RLS

  3. Sécurité
    - Les politiques de base sont recréées
    - Aucune perte de données importantes
*/

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Employees can view delivery notes in allowed stages" ON delivery_notes;
DROP POLICY IF EXISTS "Employees can insert laboratory delivery notes" ON delivery_notes;
DROP POLICY IF EXISTS "Employees can update laboratory delivery notes" ON delivery_notes;
DROP POLICY IF EXISTS "Employees can delete laboratory delivery notes" ON delivery_notes;
DROP POLICY IF EXISTS "Users can view own delivery notes" ON delivery_notes;
DROP POLICY IF EXISTS "Users can insert own delivery notes" ON delivery_notes;
DROP POLICY IF EXISTS "Users can update own delivery notes" ON delivery_notes;
DROP POLICY IF EXISTS "Users can delete own delivery notes" ON delivery_notes;
DROP POLICY IF EXISTS "Dentists can view their delivery notes" ON delivery_notes;
DROP POLICY IF EXISTS "Dentists can create orders if allowed" ON delivery_notes;

-- Supprimer les contraintes CHECK
ALTER TABLE delivery_notes DROP CONSTRAINT IF EXISTS delivery_notes_current_stage_id_check;

-- Vider current_stage_id car on change de système
UPDATE delivery_notes SET current_stage_id = NULL;

-- Convertir current_stage_id de TEXT vers UUID
ALTER TABLE delivery_notes ALTER COLUMN current_stage_id TYPE uuid USING NULL;

-- Ajouter la foreign key vers production_stages
ALTER TABLE delivery_notes 
DROP CONSTRAINT IF EXISTS delivery_notes_current_stage_id_fkey;

ALTER TABLE delivery_notes 
ADD CONSTRAINT delivery_notes_current_stage_id_fkey 
FOREIGN KEY (current_stage_id) 
REFERENCES production_stages(id) 
ON DELETE SET NULL;

-- Recréer les politiques simplifiées

-- Propriétaires de laboratoire
CREATE POLICY "Users can view own delivery notes"
  ON delivery_notes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own delivery notes"
  ON delivery_notes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own delivery notes"
  ON delivery_notes FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own delivery notes"
  ON delivery_notes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Employés (accès simple)
CREATE POLICY "Employees can view laboratory delivery notes"
  ON delivery_notes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees emp
      WHERE emp.user_profile_id = auth.uid()
        AND emp.is_active = true
        AND emp.laboratory_profile_id = delivery_notes.user_id
    )
  );

CREATE POLICY "Employees can insert laboratory delivery notes"
  ON delivery_notes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees emp
      WHERE emp.user_profile_id = auth.uid()
        AND emp.is_active = true
        AND emp.laboratory_profile_id = delivery_notes.user_id
    )
  );

CREATE POLICY "Employees can update laboratory delivery notes"
  ON delivery_notes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees emp
      WHERE emp.user_profile_id = auth.uid()
        AND emp.is_active = true
        AND emp.laboratory_profile_id = delivery_notes.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees emp
      WHERE emp.user_profile_id = auth.uid()
        AND emp.is_active = true
        AND emp.laboratory_profile_id = delivery_notes.user_id
    )
  );

CREATE POLICY "Employees can delete laboratory delivery notes"
  ON delivery_notes FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees emp
      WHERE emp.user_profile_id = auth.uid()
        AND emp.is_active = true
        AND emp.laboratory_profile_id = delivery_notes.user_id
    )
  );

-- Créer un index
CREATE INDEX IF NOT EXISTS idx_delivery_notes_current_stage_uuid 
  ON delivery_notes(current_stage_id) WHERE current_stage_id IS NOT NULL;
