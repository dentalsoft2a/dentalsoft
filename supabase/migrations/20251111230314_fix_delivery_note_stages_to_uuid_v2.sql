/*
  # Correction de delivery_note_stages pour utiliser des UUIDs

  1. Problème
    - La colonne stage_id dans delivery_note_stages est de type TEXT
    - Une contrainte CHECK limite les valeurs à des strings fixes
    - Des politiques RLS utilisent stage_id

  2. Solution
    - Supprimer toutes les politiques RLS
    - Supprimer la contrainte CHECK
    - Vider les données existantes
    - Convertir stage_id de TEXT vers UUID
    - Ajouter une foreign key vers production_stages
    - Recréer les politiques RLS

  3. Sécurité
    - Les politiques sont recréées immédiatement
*/

-- Supprimer toutes les politiques RLS
DROP POLICY IF EXISTS "Employees can insert stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Employees can update stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Employees can view stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Users can delete delivery note stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Users can insert delivery note stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Users can update delivery note stages" ON delivery_note_stages;
DROP POLICY IF EXISTS "Users can view delivery note stages" ON delivery_note_stages;

-- Supprimer la contrainte CHECK
ALTER TABLE delivery_note_stages DROP CONSTRAINT IF EXISTS delivery_note_stages_stage_id_check;

-- Vider les données existantes (ancien système TEXT)
DELETE FROM delivery_note_stages;

-- Convertir stage_id de TEXT vers UUID
ALTER TABLE delivery_note_stages ALTER COLUMN stage_id TYPE uuid USING NULL;

-- Ajouter la foreign key vers production_stages
ALTER TABLE delivery_note_stages 
DROP CONSTRAINT IF EXISTS delivery_note_stages_stage_id_fkey;

ALTER TABLE delivery_note_stages 
ADD CONSTRAINT delivery_note_stages_stage_id_fkey 
FOREIGN KEY (stage_id) 
REFERENCES production_stages(id) 
ON DELETE CASCADE;

-- Recréer les politiques RLS pour les propriétaires de laboratoires
CREATE POLICY "Users can view delivery note stages"
  ON delivery_note_stages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes 
      WHERE delivery_notes.id = delivery_note_stages.delivery_note_id 
      AND delivery_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert delivery note stages"
  ON delivery_note_stages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_notes 
      WHERE delivery_notes.id = delivery_note_stages.delivery_note_id 
      AND delivery_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update delivery note stages"
  ON delivery_note_stages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes 
      WHERE delivery_notes.id = delivery_note_stages.delivery_note_id 
      AND delivery_notes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_notes 
      WHERE delivery_notes.id = delivery_note_stages.delivery_note_id 
      AND delivery_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete delivery note stages"
  ON delivery_note_stages FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes 
      WHERE delivery_notes.id = delivery_note_stages.delivery_note_id 
      AND delivery_notes.user_id = auth.uid()
    )
  );

-- Recréer les politiques RLS pour les employés
CREATE POLICY "Employees can view stages"
  ON delivery_note_stages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees emp
      INNER JOIN delivery_notes dn ON dn.id = delivery_note_stages.delivery_note_id
      WHERE emp.user_profile_id = auth.uid()
        AND emp.is_active = true
        AND emp.laboratory_profile_id = dn.user_id
    )
  );

CREATE POLICY "Employees can insert stages"
  ON delivery_note_stages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees emp
      INNER JOIN delivery_notes dn ON dn.id = delivery_note_stages.delivery_note_id
      WHERE emp.user_profile_id = auth.uid()
        AND emp.is_active = true
        AND emp.laboratory_profile_id = dn.user_id
    )
  );

CREATE POLICY "Employees can update stages"
  ON delivery_note_stages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees emp
      INNER JOIN delivery_notes dn ON dn.id = delivery_note_stages.delivery_note_id
      WHERE emp.user_profile_id = auth.uid()
        AND emp.is_active = true
        AND emp.laboratory_profile_id = dn.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees emp
      INNER JOIN delivery_notes dn ON dn.id = delivery_note_stages.delivery_note_id
      WHERE emp.user_profile_id = auth.uid()
        AND emp.is_active = true
        AND emp.laboratory_profile_id = dn.user_id
    )
  );

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_delivery_note_stages_stage_id 
ON delivery_note_stages(stage_id);
