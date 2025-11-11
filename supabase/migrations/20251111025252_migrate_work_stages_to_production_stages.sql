/*
  # Migrate Work Stages System to Use Existing Production Stages

  ## Description
  The system already has a production_stages table. This migration:
  1. Drops the duplicate work_stages table
  2. Updates delivery_note_stages to reference production_stages
  3. Adds weight field to production_stages for progress calculation
  4. Migrates any data from work_stages to production_stages
  5. Ensures delivery_notes.current_stage_id references production_stages

  ## Changes
  - Add weight and is_active fields to production_stages
  - Drop work_stages table (after migrating data)
  - Update delivery_note_stages foreign key to use production_stages
  - Update triggers to use production_stages

  ## Security
  - Maintains existing RLS policies
*/

-- First, add missing fields to production_stages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_stages' AND column_name = 'weight'
  ) THEN
    ALTER TABLE production_stages ADD COLUMN weight integer DEFAULT 100 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_stages' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE production_stages ADD COLUMN is_active boolean DEFAULT true NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_stages' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE production_stages ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Migrate data from work_stages to production_stages if work_stages exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_stages') THEN
    -- Insert work_stages data into production_stages (avoiding duplicates)
    INSERT INTO production_stages (user_id, name, description, order_index, weight, color, is_active, created_at, updated_at)
    SELECT 
      ws.user_id,
      ws.name,
      ws.description,
      ws.order_index,
      ws.weight,
      ws.color,
      ws.is_active,
      ws.created_at,
      ws.updated_at
    FROM work_stages ws
    WHERE NOT EXISTS (
      SELECT 1 FROM production_stages ps
      WHERE ps.user_id = ws.user_id AND ps.name = ws.name
    );

    -- Update delivery_note_stages to reference production_stages
    UPDATE delivery_note_stages dns
    SET stage_id = ps.id
    FROM work_stages ws
    JOIN production_stages ps ON ps.user_id = ws.user_id AND ps.name = ws.name
    WHERE dns.stage_id = ws.id;

    -- Update delivery_notes current_stage_id
    UPDATE delivery_notes dn
    SET current_stage_id = ps.id
    FROM work_stages ws
    JOIN production_stages ps ON ps.user_id = ws.user_id AND ps.name = ws.name
    WHERE dn.current_stage_id = ws.id;
  END IF;
END $$;

-- Drop the work_stages constraint on delivery_note_stages if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'delivery_note_stages_stage_id_fkey'
      AND table_name = 'delivery_note_stages'
  ) THEN
    ALTER TABLE delivery_note_stages DROP CONSTRAINT delivery_note_stages_stage_id_fkey;
  END IF;
END $$;

-- Add correct foreign key to production_stages
ALTER TABLE delivery_note_stages
ADD CONSTRAINT delivery_note_stages_stage_id_fkey
FOREIGN KEY (stage_id) REFERENCES production_stages(id) ON DELETE CASCADE;

-- Update the delivery_notes constraint to point to production_stages
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'delivery_notes_current_stage_id_fkey'
      AND table_name = 'delivery_notes'
  ) THEN
    ALTER TABLE delivery_notes DROP CONSTRAINT delivery_notes_current_stage_id_fkey;
  END IF;
END $$;

ALTER TABLE delivery_notes
ADD CONSTRAINT delivery_notes_current_stage_id_fkey
FOREIGN KEY (current_stage_id) REFERENCES production_stages(id) ON DELETE SET NULL;

-- Update the progress calculation function to use production_stages
CREATE OR REPLACE FUNCTION calculate_delivery_note_progress(p_delivery_note_id uuid)
RETURNS integer AS $$
DECLARE
  v_total_weight integer;
  v_completed_weight integer;
  v_progress integer;
BEGIN
  -- Get total weight of all stages for this delivery note's user
  SELECT COALESCE(SUM(ps.weight), 0) INTO v_total_weight
  FROM production_stages ps
  INNER JOIN delivery_notes dn ON dn.user_id = ps.user_id
  WHERE dn.id = p_delivery_note_id
    AND ps.is_active = true;

  -- If no stages defined, return 0
  IF v_total_weight = 0 THEN
    RETURN 0;
  END IF;

  -- Get weight of completed stages
  SELECT COALESCE(SUM(ps.weight), 0) INTO v_completed_weight
  FROM delivery_note_stages dns
  INNER JOIN production_stages ps ON dns.stage_id = ps.id
  WHERE dns.delivery_note_id = p_delivery_note_id
    AND dns.is_completed = true
    AND ps.is_active = true;

  -- Calculate percentage
  v_progress := ROUND((v_completed_weight::numeric / v_total_weight::numeric) * 100);

  RETURN v_progress;
END;
$$ LANGUAGE plpgsql;

-- Update the trigger function to use production_stages
CREATE OR REPLACE FUNCTION update_delivery_note_progress_trigger()
RETURNS trigger AS $$
DECLARE
  v_progress integer;
  v_current_stage_id uuid;
BEGIN
  -- Calculate new progress
  v_progress := calculate_delivery_note_progress(NEW.delivery_note_id);

  -- Find the first incomplete stage as current stage
  SELECT ps.id INTO v_current_stage_id
  FROM production_stages ps
  LEFT JOIN delivery_note_stages dns ON dns.stage_id = ps.id AND dns.delivery_note_id = NEW.delivery_note_id
  INNER JOIN delivery_notes dn ON dn.user_id = ps.user_id
  WHERE dn.id = NEW.delivery_note_id
    AND ps.is_active = true
    AND (dns.is_completed IS NULL OR dns.is_completed = false)
  ORDER BY ps.order_index
  LIMIT 1;

  -- Update delivery note with new progress and current stage
  UPDATE delivery_notes
  SET 
    progress_percentage = v_progress,
    current_stage_id = v_current_stage_id,
    updated_at = now()
  WHERE id = NEW.delivery_note_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop work_stages table if it exists
DROP TABLE IF EXISTS work_stages CASCADE;

-- Add default production stages for users who don't have any
INSERT INTO production_stages (user_id, name, description, order_index, weight, color, is_active)
SELECT 
  up.id,
  stage.name,
  stage.description,
  stage.order_index,
  stage.weight,
  stage.color,
  true
FROM user_profiles up
CROSS JOIN (
  VALUES 
    ('Réception', 'Réception et vérification de la commande', 1, 10, '#8B5CF6'),
    ('Préparation', 'Préparation des matériaux et outils', 2, 15, '#3B82F6'),
    ('Fabrication', 'Fabrication de la prothèse', 3, 40, '#F59E0B'),
    ('Finition', 'Finition et polissage', 4, 20, '#10B981'),
    ('Contrôle qualité', 'Contrôle qualité final', 5, 10, '#EC4899'),
    ('Prêt à livrer', 'Emballage et prêt pour livraison', 6, 5, '#06B6D4')
) AS stage(name, description, order_index, weight, color)
WHERE up.role != 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM production_stages ps
    WHERE ps.user_id = up.id AND ps.name = stage.name
  )
ON CONFLICT DO NOTHING;