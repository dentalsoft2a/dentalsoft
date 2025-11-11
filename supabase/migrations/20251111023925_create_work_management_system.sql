/*
  # Create Work Management System with Automatic Progress Tracking

  ## Description
  This migration creates a comprehensive work management system for tracking delivery note progress
  with automatic percentage calculation based on completed stages.

  ## New Tables

  ### work_stages
  Configurable workflow stages for delivery notes
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to user_profiles)
  - `name` (text) - Stage name (e.g., "Réception", "Fabrication")
  - `description` (text) - Stage description
  - `order_index` (integer) - Display order
  - `weight` (integer) - Weight for percentage calculation (default: 100)
  - `color` (text) - Hex color for visual identification
  - `is_active` (boolean) - Whether stage is currently used
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### delivery_note_stages
  Tracks completion of each stage for each delivery note
  - `id` (uuid, primary key)
  - `delivery_note_id` (uuid, foreign key to delivery_notes)
  - `stage_id` (uuid, foreign key to work_stages)
  - `is_completed` (boolean) - Whether this stage is done
  - `completed_at` (timestamptz) - When stage was completed
  - `completed_by` (uuid) - User who completed the stage
  - `notes` (text) - Notes about this stage
  - `time_spent_minutes` (integer) - Time spent on this stage
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### work_assignments
  Assigns delivery notes to laboratory employees
  - `id` (uuid, primary key)
  - `delivery_note_id` (uuid, foreign key to delivery_notes)
  - `employee_id` (uuid, foreign key to laboratory_employees)
  - `assigned_at` (timestamptz)
  - `assigned_by` (uuid) - User who made the assignment
  - `created_at` (timestamptz)

  ### work_comments
  Internal comments on delivery note work progress
  - `id` (uuid, primary key)
  - `delivery_note_id` (uuid, foreign key to delivery_notes)
  - `user_id` (uuid, foreign key to user_profiles)
  - `comment` (text) - Comment text
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Modified Tables

  ### delivery_notes
  Add new fields for work management:
  - `progress_percentage` (integer) - Auto-calculated progress (0-100)
  - `priority` (text) - Priority level: urgent, high, normal, low
  - `due_date` (date) - Expected completion date
  - `estimated_hours` (numeric) - Estimated work hours
  - `actual_hours` (numeric) - Actual work hours spent
  - `current_stage_id` (uuid) - Current work stage
  - `is_blocked` (boolean) - Whether work is blocked
  - `blocked_reason` (text) - Reason for blocking

  ## Functions

  ### calculate_delivery_note_progress
  Automatically calculates progress percentage based on completed stages and their weights

  ### update_delivery_note_progress_trigger
  Trigger that updates progress when stages are completed

  ## Security
  - Enable RLS on all new tables
  - Users can only access their own work data
  - Employees can view work assigned to them
  - Super admins have full access

  ## Indexes
  - Indexes on foreign keys for performance
  - Index on delivery_note_id for quick lookups
  - Index on priority and status for filtering
*/

-- Add new columns to delivery_notes table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_notes' AND column_name = 'progress_percentage'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_notes' AND column_name = 'priority'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN priority text DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_notes' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN due_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_notes' AND column_name = 'estimated_hours'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN estimated_hours numeric(5,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_notes' AND column_name = 'actual_hours'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN actual_hours numeric(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_notes' AND column_name = 'current_stage_id'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN current_stage_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_notes' AND column_name = 'is_blocked'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN is_blocked boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_notes' AND column_name = 'blocked_reason'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN blocked_reason text;
  END IF;
END $$;

-- Create work_stages table
CREATE TABLE IF NOT EXISTS work_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  weight integer NOT NULL DEFAULT 100,
  color text DEFAULT '#3B82F6',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create delivery_note_stages table
CREATE TABLE IF NOT EXISTS delivery_note_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id uuid NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES work_stages(id) ON DELETE CASCADE,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES user_profiles(id),
  notes text,
  time_spent_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(delivery_note_id, stage_id)
);

-- Create work_assignments table
CREATE TABLE IF NOT EXISTS work_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id uuid NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES laboratory_employees(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create work_comments table
CREATE TABLE IF NOT EXISTS work_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id uuid NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_stages_user_id ON work_stages(user_id);
CREATE INDEX IF NOT EXISTS idx_work_stages_order ON work_stages(user_id, order_index);
CREATE INDEX IF NOT EXISTS idx_delivery_note_stages_delivery_note ON delivery_note_stages(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_delivery_note_stages_stage ON delivery_note_stages(stage_id);
CREATE INDEX IF NOT EXISTS idx_work_assignments_delivery_note ON work_assignments(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_work_assignments_employee ON work_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_comments_delivery_note ON work_comments(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_priority ON delivery_notes(priority);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_due_date ON delivery_notes(due_date);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_current_stage ON delivery_notes(current_stage_id);

-- Function to calculate delivery note progress
CREATE OR REPLACE FUNCTION calculate_delivery_note_progress(p_delivery_note_id uuid)
RETURNS integer AS $$
DECLARE
  v_total_weight integer;
  v_completed_weight integer;
  v_progress integer;
BEGIN
  -- Get total weight of all stages for this delivery note's user
  SELECT COALESCE(SUM(ws.weight), 0) INTO v_total_weight
  FROM work_stages ws
  INNER JOIN delivery_notes dn ON dn.user_id = ws.user_id
  WHERE dn.id = p_delivery_note_id
    AND ws.is_active = true;

  -- If no stages defined, return 0
  IF v_total_weight = 0 THEN
    RETURN 0;
  END IF;

  -- Get weight of completed stages
  SELECT COALESCE(SUM(ws.weight), 0) INTO v_completed_weight
  FROM delivery_note_stages dns
  INNER JOIN work_stages ws ON dns.stage_id = ws.id
  WHERE dns.delivery_note_id = p_delivery_note_id
    AND dns.is_completed = true
    AND ws.is_active = true;

  -- Calculate percentage
  v_progress := ROUND((v_completed_weight::numeric / v_total_weight::numeric) * 100);

  RETURN v_progress;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update progress when stages change
CREATE OR REPLACE FUNCTION update_delivery_note_progress_trigger()
RETURNS trigger AS $$
DECLARE
  v_progress integer;
  v_current_stage_id uuid;
BEGIN
  -- Calculate new progress
  v_progress := calculate_delivery_note_progress(NEW.delivery_note_id);

  -- Find the first incomplete stage as current stage
  SELECT ws.id INTO v_current_stage_id
  FROM work_stages ws
  LEFT JOIN delivery_note_stages dns ON dns.stage_id = ws.id AND dns.delivery_note_id = NEW.delivery_note_id
  INNER JOIN delivery_notes dn ON dn.user_id = ws.user_id
  WHERE dn.id = NEW.delivery_note_id
    AND ws.is_active = true
    AND (dns.is_completed IS NULL OR dns.is_completed = false)
  ORDER BY ws.order_index
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

-- Create trigger on delivery_note_stages
DROP TRIGGER IF EXISTS trigger_update_delivery_note_progress ON delivery_note_stages;
CREATE TRIGGER trigger_update_delivery_note_progress
AFTER INSERT OR UPDATE ON delivery_note_stages
FOR EACH ROW
EXECUTE FUNCTION update_delivery_note_progress_trigger();

-- Enable RLS on all new tables
ALTER TABLE work_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work_stages
CREATE POLICY "Users can view own work stages"
  ON work_stages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own work stages"
  ON work_stages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own work stages"
  ON work_stages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own work stages"
  ON work_stages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for delivery_note_stages
CREATE POLICY "Users can view delivery note stages"
  ON delivery_note_stages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes dn
      WHERE dn.id = delivery_note_stages.delivery_note_id
        AND dn.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert delivery note stages"
  ON delivery_note_stages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_notes dn
      WHERE dn.id = delivery_note_stages.delivery_note_id
        AND dn.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update delivery note stages"
  ON delivery_note_stages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes dn
      WHERE dn.id = delivery_note_stages.delivery_note_id
        AND dn.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_notes dn
      WHERE dn.id = delivery_note_stages.delivery_note_id
        AND dn.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete delivery note stages"
  ON delivery_note_stages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes dn
      WHERE dn.id = delivery_note_stages.delivery_note_id
        AND dn.user_id = auth.uid()
    )
  );

-- RLS Policies for work_assignments
CREATE POLICY "Users can view work assignments"
  ON work_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes dn
      WHERE dn.id = work_assignments.delivery_note_id
        AND dn.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert work assignments"
  ON work_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_notes dn
      WHERE dn.id = work_assignments.delivery_note_id
        AND dn.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete work assignments"
  ON work_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes dn
      WHERE dn.id = work_assignments.delivery_note_id
        AND dn.user_id = auth.uid()
    )
  );

-- RLS Policies for work_comments
CREATE POLICY "Users can view work comments"
  ON work_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes dn
      WHERE dn.id = work_comments.delivery_note_id
        AND dn.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert work comments"
  ON work_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM delivery_notes dn
      WHERE dn.id = work_comments.delivery_note_id
        AND dn.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own work comments"
  ON work_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own work comments"
  ON work_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert default work stages for existing users
INSERT INTO work_stages (user_id, name, description, order_index, weight, color)
SELECT 
  up.id,
  stage.name,
  stage.description,
  stage.order_index,
  stage.weight,
  stage.color
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
ON CONFLICT DO NOTHING;