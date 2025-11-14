/*
  # Système de gestion des fichiers STL pour les dentistes
  
  Cette migration ajoute la possibilité pour les dentistes d'envoyer des fichiers STL
  (scans 3D) avec leurs demandes de bons de livraison. Les fichiers seront stockés dans
  Supabase Storage et référencés dans une table dédiée.
  
  1. Nouvelles Tables
    - `stl_files` - Stocke les métadonnées des fichiers STL uploadés
      - `id` (uuid, primary key)
      - `delivery_note_id` (uuid) - Référence au bon de livraison
      - `dentist_id` (uuid) - Référence au dentiste qui a uploadé
      - `laboratory_id` (uuid) - Référence au laboratoire destinataire
      - `file_name` (text) - Nom original du fichier
      - `file_path` (text) - Chemin du fichier dans Supabase Storage
      - `file_size` (bigint) - Taille du fichier en bytes
      - `mime_type` (text) - Type MIME du fichier
      - `uploaded_at` (timestamptz) - Date et heure d'upload
      - `notes` (text) - Notes optionnelles du dentiste
      - `viewed_by_lab` (boolean) - Indique si le laboratoire a consulté le fichier
      - `viewed_at` (timestamptz) - Date de première consultation par le labo
  
  2. Storage Bucket
    - Création du bucket 'stl-files' pour stocker les fichiers STL
  
  3. Sécurité
    - RLS activé sur la table stl_files
    - Politiques pour permettre aux dentistes d'uploader leurs fichiers
    - Politiques pour permettre aux laboratoires de voir les fichiers qui leur sont destinés
    - Politiques de storage simplifiées pour Supabase
  
  4. Indexes
    - Index sur delivery_note_id pour recherche rapide
    - Index sur dentist_id pour lister les fichiers d'un dentiste
    - Index sur laboratory_id pour lister les fichiers d'un laboratoire
*/

-- Créer la table stl_files
CREATE TABLE IF NOT EXISTS stl_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id uuid REFERENCES delivery_notes(id) ON DELETE CASCADE,
  dentist_id uuid REFERENCES dentists(id) ON DELETE CASCADE NOT NULL,
  laboratory_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  uploaded_at timestamptz DEFAULT now() NOT NULL,
  notes text,
  viewed_by_lab boolean DEFAULT false NOT NULL,
  viewed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_stl_files_delivery_note 
  ON stl_files(delivery_note_id);

CREATE INDEX IF NOT EXISTS idx_stl_files_dentist 
  ON stl_files(dentist_id);

CREATE INDEX IF NOT EXISTS idx_stl_files_laboratory 
  ON stl_files(laboratory_id);

CREATE INDEX IF NOT EXISTS idx_stl_files_uploaded_at 
  ON stl_files(uploaded_at DESC);

-- Activer RLS
ALTER TABLE stl_files ENABLE ROW LEVEL SECURITY;

-- Politique: Les dentistes peuvent voir leurs propres fichiers
CREATE POLICY "Dentists can view their own STL files"
  ON stl_files FOR SELECT
  TO authenticated
  USING (
    dentist_id IN (
      SELECT id FROM dentists WHERE dentists.user_id = auth.uid()
    )
  );

-- Politique: Les dentistes peuvent uploader des fichiers
CREATE POLICY "Dentists can upload STL files"
  ON stl_files FOR INSERT
  TO authenticated
  WITH CHECK (
    dentist_id IN (
      SELECT id FROM dentists WHERE dentists.user_id = auth.uid()
    )
  );

-- Politique: Les dentistes peuvent supprimer leurs propres fichiers
CREATE POLICY "Dentists can delete their own STL files"
  ON stl_files FOR DELETE
  TO authenticated
  USING (
    dentist_id IN (
      SELECT id FROM dentists WHERE dentists.user_id = auth.uid()
    )
  );

-- Politique: Les laboratoires peuvent voir les fichiers qui leur sont destinés
CREATE POLICY "Laboratories can view STL files sent to them"
  ON stl_files FOR SELECT
  TO authenticated
  USING (laboratory_id = auth.uid());

-- Politique: Les laboratoires peuvent mettre à jour le statut de consultation
CREATE POLICY "Laboratories can update viewed status"
  ON stl_files FOR UPDATE
  TO authenticated
  USING (laboratory_id = auth.uid())
  WITH CHECK (laboratory_id = auth.uid());

-- Politique: Les employés peuvent voir les fichiers du laboratoire
CREATE POLICY "Employees can view laboratory STL files"
  ON stl_files FOR SELECT
  TO authenticated
  USING (
    laboratory_id IN (
      SELECT laboratory_profile_id FROM laboratory_employees 
      WHERE laboratory_employees.user_profile_id = auth.uid()
    )
  );

-- Politique: Les employés peuvent mettre à jour le statut de consultation
CREATE POLICY "Employees can update viewed status"
  ON stl_files FOR UPDATE
  TO authenticated
  USING (
    laboratory_id IN (
      SELECT laboratory_profile_id FROM laboratory_employees 
      WHERE laboratory_employees.user_profile_id = auth.uid()
    )
  )
  WITH CHECK (
    laboratory_id IN (
      SELECT laboratory_profile_id FROM laboratory_employees 
      WHERE laboratory_employees.user_profile_id = auth.uid()
    )
  );

-- Politique: Super admin peut tout voir
CREATE POLICY "Super admin can view all STL files"
  ON stl_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() AND role = 'super_admin'
    )
  );

-- Fonction pour créer le bucket de storage
DO $$
BEGIN
  -- Insérer le bucket s'il n'existe pas
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'stl-files',
    'stl-files',
    false, -- Privé, nécessite authentification
    104857600, -- 100 MB max par fichier
    ARRAY[
      'application/octet-stream',
      'application/sla',
      'model/stl',
      'application/vnd.ms-pki.stl',
      'application/x-navistyle'
    ]
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Politique de storage: Utilisateurs authentifiés peuvent uploader dans stl-files
CREATE POLICY "Authenticated users can upload STL files to storage"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'stl-files');

-- Politique de storage: Utilisateurs authentifiés peuvent lire les fichiers STL
CREATE POLICY "Authenticated users can read STL files from storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'stl-files');

-- Politique de storage: Utilisateurs authentifiés peuvent supprimer leurs fichiers STL
CREATE POLICY "Authenticated users can delete STL files from storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'stl-files');

-- Politique de storage: Utilisateurs authentifiés peuvent mettre à jour les fichiers STL
CREATE POLICY "Authenticated users can update STL files in storage"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'stl-files');

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_stl_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stl_files_updated_at_trigger
  BEFORE UPDATE ON stl_files
  FOR EACH ROW
  EXECUTE FUNCTION update_stl_files_updated_at();

-- Fonction pour marquer un fichier comme consulté
CREATE OR REPLACE FUNCTION mark_stl_file_as_viewed(p_file_id uuid)
RETURNS json AS $$
BEGIN
  UPDATE stl_files
  SET 
    viewed_by_lab = true,
    viewed_at = COALESCE(viewed_at, now()),
    updated_at = now()
  WHERE id = p_file_id AND viewed_by_lab = false;
  
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vue pour faciliter la consultation des fichiers STL avec toutes les infos
CREATE OR REPLACE VIEW stl_files_view AS
SELECT 
  sf.id,
  sf.delivery_note_id,
  sf.dentist_id,
  d.name as dentist_name,
  sf.laboratory_id,
  p.laboratory_name,
  sf.file_name,
  sf.file_path,
  sf.file_size,
  sf.mime_type,
  sf.uploaded_at,
  sf.notes,
  sf.viewed_by_lab,
  sf.viewed_at,
  dn.delivery_number,
  dn.patient_name,
  dn.status as delivery_note_status
FROM stl_files sf
LEFT JOIN dentists d ON d.id = sf.dentist_id
LEFT JOIN profiles p ON p.id = sf.laboratory_id
LEFT JOIN delivery_notes dn ON dn.id = sf.delivery_note_id;

-- Permissions pour la vue
GRANT SELECT ON stl_files_view TO authenticated;

-- Commentaires
COMMENT ON TABLE stl_files IS 'Stocke les métadonnées des fichiers STL (scans 3D) uploadés par les dentistes';
COMMENT ON COLUMN stl_files.delivery_note_id IS 'Référence optionnelle au bon de livraison associé';
COMMENT ON COLUMN stl_files.dentist_id IS 'ID du dentiste qui a uploadé le fichier';
COMMENT ON COLUMN stl_files.laboratory_id IS 'ID du laboratoire destinataire';
COMMENT ON COLUMN stl_files.file_path IS 'Chemin du fichier dans Supabase Storage (bucket stl-files)';
COMMENT ON COLUMN stl_files.file_size IS 'Taille du fichier en bytes';
COMMENT ON COLUMN stl_files.viewed_by_lab IS 'Indique si le laboratoire a consulté le fichier';
COMMENT ON COLUMN stl_files.viewed_at IS 'Date de première consultation par le laboratoire';
COMMENT ON FUNCTION mark_stl_file_as_viewed(uuid) IS 'Marque un fichier STL comme consulté par le laboratoire';
COMMENT ON VIEW stl_files_view IS 'Vue complète des fichiers STL avec informations du dentiste, laboratoire et bon de livraison';
