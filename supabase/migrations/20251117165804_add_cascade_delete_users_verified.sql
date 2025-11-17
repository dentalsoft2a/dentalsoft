/*
  # Suppression en cascade complète pour tous les utilisateurs

  1. Principe
    - Quand on supprime un compte auth.users, tout doit être supprimé en cascade
    - profiles -> toutes les données du laboratoire
    - dentist_accounts -> toutes les données du dentiste
    - user_profiles -> profil utilisateur
  
  2. Tables modifiées
    - archived_documents
    - audit_log
    - data_seals
    - digital_certificates
    - fiscal_periods
    - threeshape_dentist_mapping
    - dentists (linked_dentist_account_id)
  
  3. Important
    - ON DELETE CASCADE garantit l'intégrité référentielle
    - La suppression de auth.users déclenche toute la cascade
*/

-- ============================================================================
-- Tables liées à profiles (laboratoires)
-- ============================================================================

ALTER TABLE archived_documents 
  DROP CONSTRAINT IF EXISTS archived_documents_laboratory_id_fkey,
  ADD CONSTRAINT archived_documents_laboratory_id_fkey 
    FOREIGN KEY (laboratory_id) 
    REFERENCES profiles(id) 
    ON DELETE CASCADE;

ALTER TABLE audit_log 
  DROP CONSTRAINT IF EXISTS audit_log_laboratory_id_fkey,
  ADD CONSTRAINT audit_log_laboratory_id_fkey 
    FOREIGN KEY (laboratory_id) 
    REFERENCES profiles(id) 
    ON DELETE CASCADE;

ALTER TABLE data_seals 
  DROP CONSTRAINT IF EXISTS data_seals_laboratory_id_fkey,
  ADD CONSTRAINT data_seals_laboratory_id_fkey 
    FOREIGN KEY (laboratory_id) 
    REFERENCES profiles(id) 
    ON DELETE CASCADE;

ALTER TABLE digital_certificates 
  DROP CONSTRAINT IF EXISTS digital_certificates_laboratory_id_fkey,
  ADD CONSTRAINT digital_certificates_laboratory_id_fkey 
    FOREIGN KEY (laboratory_id) 
    REFERENCES profiles(id) 
    ON DELETE CASCADE;

ALTER TABLE fiscal_periods 
  DROP CONSTRAINT IF EXISTS fiscal_periods_laboratory_id_fkey,
  ADD CONSTRAINT fiscal_periods_laboratory_id_fkey 
    FOREIGN KEY (laboratory_id) 
    REFERENCES profiles(id) 
    ON DELETE CASCADE;

-- ============================================================================
-- Tables liées à dentist_accounts
-- ============================================================================

ALTER TABLE threeshape_dentist_mapping 
  DROP CONSTRAINT IF EXISTS threeshape_dentist_mapping_local_dentist_id_fkey,
  ADD CONSTRAINT threeshape_dentist_mapping_local_dentist_id_fkey 
    FOREIGN KEY (local_dentist_id) 
    REFERENCES dentist_accounts(id) 
    ON DELETE CASCADE;

-- Table dentists - cascade aussi
ALTER TABLE dentists 
  DROP CONSTRAINT IF EXISTS dentists_linked_dentist_account_id_fkey,
  ADD CONSTRAINT dentists_linked_dentist_account_id_fkey 
    FOREIGN KEY (linked_dentist_account_id) 
    REFERENCES dentist_accounts(id) 
    ON DELETE CASCADE;
