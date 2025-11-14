/*
  # Correction des politiques RLS pour les fichiers STL des comptes dentistes
  
  Le problème identifié:
  - Les politiques RLS vérifient `dentists.user_id = auth.uid()`
  - Mais `dentists.user_id` contient l'ID du LABORATOIRE (celui qui a créé le dentiste)
  - Les comptes dentistes sont liés via `dentists.linked_dentist_account_id`
  
  Solution:
  - Remplacer les politiques pour vérifier `linked_dentist_account_id` au lieu de `user_id`
  - Cela permettra aux comptes dentistes d'uploader leurs fichiers STL
  
  Tables affectées:
  - stl_files (politiques SELECT, INSERT, DELETE pour les dentistes)
*/

-- Supprimer les anciennes politiques pour les dentistes
DROP POLICY IF EXISTS "Dentists can view their own STL files" ON stl_files;
DROP POLICY IF EXISTS "Dentists can upload STL files" ON stl_files;
DROP POLICY IF EXISTS "Dentists can delete their own STL files" ON stl_files;

-- Nouvelle politique: Les comptes dentistes peuvent voir leurs propres fichiers
-- Vérifie via linked_dentist_account_id au lieu de user_id
CREATE POLICY "Dentist accounts can view their own STL files"
  ON stl_files FOR SELECT
  TO authenticated
  USING (
    dentist_id IN (
      SELECT id FROM dentists 
      WHERE linked_dentist_account_id = auth.uid()
    )
  );

-- Nouvelle politique: Les comptes dentistes peuvent uploader des fichiers
-- Vérifie via linked_dentist_account_id au lieu de user_id
CREATE POLICY "Dentist accounts can upload STL files"
  ON stl_files FOR INSERT
  TO authenticated
  WITH CHECK (
    dentist_id IN (
      SELECT id FROM dentists 
      WHERE linked_dentist_account_id = auth.uid()
    )
  );

-- Nouvelle politique: Les comptes dentistes peuvent supprimer leurs propres fichiers
-- Vérifie via linked_dentist_account_id au lieu de user_id
CREATE POLICY "Dentist accounts can delete their own STL files"
  ON stl_files FOR DELETE
  TO authenticated
  USING (
    dentist_id IN (
      SELECT id FROM dentists 
      WHERE linked_dentist_account_id = auth.uid()
    )
  );

-- Commentaires
COMMENT ON POLICY "Dentist accounts can view their own STL files" ON stl_files IS 
  'Permet aux comptes dentistes (dentist_accounts) de voir leurs propres fichiers STL via linked_dentist_account_id';

COMMENT ON POLICY "Dentist accounts can upload STL files" ON stl_files IS 
  'Permet aux comptes dentistes (dentist_accounts) d''uploader des fichiers STL via linked_dentist_account_id';

COMMENT ON POLICY "Dentist accounts can delete their own STL files" ON stl_files IS 
  'Permet aux comptes dentistes (dentist_accounts) de supprimer leurs propres fichiers STL via linked_dentist_account_id';
