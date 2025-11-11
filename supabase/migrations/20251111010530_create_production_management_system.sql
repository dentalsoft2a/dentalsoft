/*
  # Système de Gestion de Production et des Travaux

  1. Nouvelles Tables
    - `production_tasks` - Tâches de production détaillées
      - `id` (uuid, primary key)
      - `delivery_note_id` (uuid, foreign key vers delivery_notes)
      - `employee_id` (uuid, foreign key vers laboratory_employees)
      - `stage_id` (uuid, foreign key vers production_stages)
      - `priority` (text: urgent, high, normal, low)
      - `estimated_duration` (integer, en minutes)
      - `actual_duration` (integer, en minutes)
      - `progress_percentage` (integer, 0-100)
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `production_stages` - Étapes de production personnalisables
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key vers auth.users)
      - `name` (text, nom de l'étape)
      - `description` (text)
      - `order_index` (integer, ordre d'affichage)
      - `color` (text, code couleur)
      - `requires_approval` (boolean, nécessite validation)
      - `created_at` (timestamptz)

    - `production_time_logs` - Journaux de temps de travail
      - `id` (uuid, primary key)
      - `task_id` (uuid, foreign key vers production_tasks)
      - `employee_id` (uuid, foreign key vers laboratory_employees)
      - `clock_in` (timestamptz)
      - `clock_out` (timestamptz)
      - `duration_minutes` (integer)
      - `notes` (text)
      - `created_at` (timestamptz)

    - `production_notes` - Notes et commentaires sur les travaux
      - `id` (uuid, primary key)
      - `delivery_note_id` (uuid, foreign key vers delivery_notes)
      - `user_id` (uuid, foreign key vers auth.users)
      - `employee_id` (uuid, foreign key vers laboratory_employees, nullable)
      - `content` (text)
      - `is_internal` (boolean, note interne ou visible au dentiste)
      - `created_at` (timestamptz)

    - `production_photos` - Photos de progression des travaux
      - `id` (uuid, primary key)
      - `delivery_note_id` (uuid, foreign key vers delivery_notes)
      - `stage_id` (uuid, foreign key vers production_stages, nullable)
      - `employee_id` (uuid, foreign key vers laboratory_employees, nullable)
      - `photo_url` (text)
      - `description` (text)
      - `created_at` (timestamptz)

    - `task_assignments` - Affectation des tâches aux employés
      - `id` (uuid, primary key)
      - `delivery_note_id` (uuid, foreign key vers delivery_notes)
      - `employee_id` (uuid, foreign key vers laboratory_employees)
      - `assigned_by` (uuid, foreign key vers auth.users)
      - `assigned_at` (timestamptz)
      - `status` (text: assigned, accepted, declined, completed)
      - `notes` (text)

    - `employee_availability` - Disponibilité des employés
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key vers laboratory_employees)
      - `date` (date)
      - `availability_type` (text: available, vacation, sick, other)
      - `notes` (text)
      - `created_at` (timestamptz)

    - `production_alerts` - Alertes et notifications de production
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key vers auth.users)
      - `delivery_note_id` (uuid, foreign key vers delivery_notes, nullable)
      - `alert_type` (text: deadline_approaching, overdue, quality_issue, resource_conflict)
      - `priority` (text: low, normal, high, urgent)
      - `message` (text)
      - `is_read` (boolean)
      - `created_at` (timestamptz)

  2. Modifications des Tables Existantes
    - Ajout de colonnes à `delivery_notes`:
      - `priority` (text: urgent, high, normal, low)
      - `assigned_employee_id` (uuid, foreign key vers laboratory_employees)
      - `current_stage_id` (uuid, foreign key vers production_stages)
      - `progress_percentage` (integer)
      - `estimated_completion_date` (date)

  3. Sécurité
    - Activer RLS sur toutes les nouvelles tables
    - Politiques pour les laboratoires (propriétaires des données)
    - Politiques pour les employés (accès selon leurs droits)
    - Politiques pour les super admins
*/

-- Créer la table production_stages
CREATE TABLE IF NOT EXISTS production_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  color text DEFAULT '#3B82F6',
  requires_approval boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Créer la table production_tasks
CREATE TABLE IF NOT EXISTS production_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id uuid REFERENCES delivery_notes(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES laboratory_employees(id) ON DELETE SET NULL,
  stage_id uuid REFERENCES production_stages(id) ON DELETE SET NULL,
  priority text CHECK (priority IN ('urgent', 'high', 'normal', 'low')) DEFAULT 'normal',
  estimated_duration integer,
  actual_duration integer,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Créer la table production_time_logs
CREATE TABLE IF NOT EXISTS production_time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES production_tasks(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES laboratory_employees(id) ON DELETE CASCADE NOT NULL,
  clock_in timestamptz NOT NULL,
  clock_out timestamptz,
  duration_minutes integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Créer la table production_notes
CREATE TABLE IF NOT EXISTS production_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id uuid REFERENCES delivery_notes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES laboratory_employees(id) ON DELETE SET NULL,
  content text NOT NULL,
  is_internal boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Créer la table production_photos
CREATE TABLE IF NOT EXISTS production_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id uuid REFERENCES delivery_notes(id) ON DELETE CASCADE NOT NULL,
  stage_id uuid REFERENCES production_stages(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES laboratory_employees(id) ON DELETE SET NULL,
  photo_url text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Créer la table task_assignments
CREATE TABLE IF NOT EXISTS task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id uuid REFERENCES delivery_notes(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES laboratory_employees(id) ON DELETE CASCADE NOT NULL,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  status text CHECK (status IN ('assigned', 'accepted', 'declined', 'completed')) DEFAULT 'assigned',
  notes text
);

-- Créer la table employee_availability
CREATE TABLE IF NOT EXISTS employee_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES laboratory_employees(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  availability_type text CHECK (availability_type IN ('available', 'vacation', 'sick', 'other')) DEFAULT 'available',
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Créer la table production_alerts
CREATE TABLE IF NOT EXISTS production_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  delivery_note_id uuid REFERENCES delivery_notes(id) ON DELETE CASCADE,
  alert_type text CHECK (alert_type IN ('deadline_approaching', 'overdue', 'quality_issue', 'resource_conflict')) NOT NULL,
  priority text CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Ajouter des colonnes à delivery_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'priority'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN priority text CHECK (priority IN ('urgent', 'high', 'normal', 'low')) DEFAULT 'normal';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'assigned_employee_id'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN assigned_employee_id uuid REFERENCES laboratory_employees(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'current_stage_id'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN current_stage_id uuid REFERENCES production_stages(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'progress_percentage'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'estimated_completion_date'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN estimated_completion_date date;
  END IF;
END $$;

-- Activer RLS sur toutes les tables
ALTER TABLE production_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_alerts ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour production_stages
CREATE POLICY "Les utilisateurs peuvent voir leurs propres étapes"
  ON production_stages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent créer leurs propres étapes"
  ON production_stages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier leurs propres étapes"
  ON production_stages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres étapes"
  ON production_stages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Politiques RLS pour production_tasks
CREATE POLICY "Les utilisateurs peuvent voir leurs tâches"
  ON production_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes
      WHERE delivery_notes.id = production_tasks.delivery_note_id
      AND delivery_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent créer des tâches"
  ON production_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_notes
      WHERE delivery_notes.id = production_tasks.delivery_note_id
      AND delivery_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent modifier leurs tâches"
  ON production_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes
      WHERE delivery_notes.id = production_tasks.delivery_note_id
      AND delivery_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent supprimer leurs tâches"
  ON production_tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes
      WHERE delivery_notes.id = production_tasks.delivery_note_id
      AND delivery_notes.user_id = auth.uid()
    )
  );

-- Politiques RLS pour production_time_logs
CREATE POLICY "Les utilisateurs peuvent voir leurs journaux de temps"
  ON production_time_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM production_tasks pt
      JOIN delivery_notes dn ON dn.id = pt.delivery_note_id
      WHERE pt.id = production_time_logs.task_id
      AND dn.user_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent créer des journaux de temps"
  ON production_time_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM production_tasks pt
      JOIN delivery_notes dn ON dn.id = pt.delivery_note_id
      WHERE pt.id = production_time_logs.task_id
      AND dn.user_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent modifier leurs journaux de temps"
  ON production_time_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM production_tasks pt
      JOIN delivery_notes dn ON dn.id = pt.delivery_note_id
      WHERE pt.id = production_time_logs.task_id
      AND dn.user_id = auth.uid()
    )
  );

-- Politiques RLS pour production_notes
CREATE POLICY "Les utilisateurs peuvent voir leurs notes"
  ON production_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes
      WHERE delivery_notes.id = production_notes.delivery_note_id
      AND delivery_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent créer des notes"
  ON production_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_notes
      WHERE delivery_notes.id = production_notes.delivery_note_id
      AND delivery_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent modifier leurs notes"
  ON production_notes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Les utilisateurs peuvent supprimer leurs notes"
  ON production_notes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Politiques RLS pour production_photos
CREATE POLICY "Les utilisateurs peuvent voir leurs photos"
  ON production_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes
      WHERE delivery_notes.id = production_photos.delivery_note_id
      AND delivery_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent créer des photos"
  ON production_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_notes
      WHERE delivery_notes.id = production_photos.delivery_note_id
      AND delivery_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent supprimer leurs photos"
  ON production_photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes
      WHERE delivery_notes.id = production_photos.delivery_note_id
      AND delivery_notes.user_id = auth.uid()
    )
  );

-- Politiques RLS pour task_assignments
CREATE POLICY "Les utilisateurs peuvent voir leurs affectations"
  ON task_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes
      WHERE delivery_notes.id = task_assignments.delivery_note_id
      AND delivery_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent créer des affectations"
  ON task_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_notes
      WHERE delivery_notes.id = task_assignments.delivery_note_id
      AND delivery_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent modifier leurs affectations"
  ON task_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_notes
      WHERE delivery_notes.id = task_assignments.delivery_note_id
      AND delivery_notes.user_id = auth.uid()
    )
  );

-- Politiques RLS pour employee_availability
CREATE POLICY "Les utilisateurs peuvent voir la disponibilité de leurs employés"
  ON employee_availability FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.id = employee_availability.employee_id
      AND laboratory_employees.laboratory_profile_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent gérer la disponibilité de leurs employés"
  ON employee_availability FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.id = employee_availability.employee_id
      AND laboratory_employees.laboratory_profile_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent modifier la disponibilité"
  ON employee_availability FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.id = employee_availability.employee_id
      AND laboratory_employees.laboratory_profile_id = auth.uid()
    )
  );

CREATE POLICY "Les utilisateurs peuvent supprimer la disponibilité"
  ON employee_availability FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      WHERE laboratory_employees.id = employee_availability.employee_id
      AND laboratory_employees.laboratory_profile_id = auth.uid()
    )
  );

-- Politiques RLS pour production_alerts
CREATE POLICY "Les utilisateurs peuvent voir leurs alertes"
  ON production_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent créer leurs alertes"
  ON production_alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier leurs alertes"
  ON production_alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs alertes"
  ON production_alerts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_production_tasks_delivery_note ON production_tasks(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_employee ON production_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_stage ON production_tasks(stage_id);
CREATE INDEX IF NOT EXISTS idx_production_time_logs_task ON production_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_production_time_logs_employee ON production_time_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_production_notes_delivery_note ON production_notes(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_production_photos_delivery_note ON production_photos(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_delivery_note ON task_assignments(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_employee ON task_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_availability_employee ON employee_availability(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_availability_date ON employee_availability(date);
CREATE INDEX IF NOT EXISTS idx_production_alerts_user ON production_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_production_alerts_is_read ON production_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_priority ON delivery_notes(priority);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_assigned_employee ON delivery_notes(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_current_stage ON delivery_notes(current_stage_id);
