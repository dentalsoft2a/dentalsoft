/*
  # FORCER LA SUPPRESSION EN CASCADE DE TOUTES LES DONNÉES UTILISATEUR

  1. Objectif
    - Permettre la suppression complète d'un utilisateur depuis le super admin
    - Supprimer TOUTES les données associées automatiquement
    - Ne plus avoir d'erreurs de contraintes de clés étrangères

  2. Stratégie
    - Modifier TOUTES les contraintes vers profiles et user_profiles
    - Utiliser CASCADE pour supprimer les données liées
    - Utiliser SET NULL uniquement pour les champs historiques non critiques

  3. Tables affectées
    - Toutes les tables avec des références vers profiles ou user_profiles
*/

-- ============================================================================
-- CONTRAINTES VERS user_profiles
-- ============================================================================

-- admin_impersonation_sessions -> CASCADE (supprimer les sessions)
ALTER TABLE admin_impersonation_sessions DROP CONSTRAINT IF EXISTS admin_impersonation_sessions_admin_user_id_fkey;
ALTER TABLE admin_impersonation_sessions ADD CONSTRAINT admin_impersonation_sessions_admin_user_id_fkey 
  FOREIGN KEY (admin_user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

ALTER TABLE admin_impersonation_sessions DROP CONSTRAINT IF EXISTS admin_impersonation_sessions_target_user_id_fkey;
ALTER TABLE admin_impersonation_sessions ADD CONSTRAINT admin_impersonation_sessions_target_user_id_fkey 
  FOREIGN KEY (target_user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- delivery_note_stages.completed_by -> SET NULL (historique)
ALTER TABLE delivery_note_stages DROP CONSTRAINT IF EXISTS delivery_note_stages_completed_by_fkey;
ALTER TABLE delivery_note_stages ADD CONSTRAINT delivery_note_stages_completed_by_fkey 
  FOREIGN KEY (completed_by) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- dentist_notifications -> CASCADE
ALTER TABLE dentist_notifications DROP CONSTRAINT IF EXISTS dentist_notifications_laboratory_id_fkey;
ALTER TABLE dentist_notifications ADD CONSTRAINT dentist_notifications_laboratory_id_fkey 
  FOREIGN KEY (laboratory_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- dentist_quote_requests -> CASCADE
ALTER TABLE dentist_quote_requests DROP CONSTRAINT IF EXISTS dentist_quote_requests_laboratory_id_fkey;
ALTER TABLE dentist_quote_requests ADD CONSTRAINT dentist_quote_requests_laboratory_id_fkey 
  FOREIGN KEY (laboratory_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- laboratory_employees.created_by -> SET NULL (historique)
ALTER TABLE laboratory_employees DROP CONSTRAINT IF EXISTS laboratory_employees_created_by_fkey;
ALTER TABLE laboratory_employees ADD CONSTRAINT laboratory_employees_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- laboratory_employees.user_profile_id -> CASCADE
ALTER TABLE laboratory_employees DROP CONSTRAINT IF EXISTS laboratory_employees_user_profile_id_fkey;
ALTER TABLE laboratory_employees ADD CONSTRAINT laboratory_employees_user_profile_id_fkey 
  FOREIGN KEY (user_profile_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- onboarding_progress -> CASCADE
ALTER TABLE onboarding_progress DROP CONSTRAINT IF EXISTS onboarding_progress_user_id_fkey;
ALTER TABLE onboarding_progress ADD CONSTRAINT onboarding_progress_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- photo_submissions -> CASCADE
ALTER TABLE photo_submissions DROP CONSTRAINT IF EXISTS photo_submissions_laboratory_id_fkey;
ALTER TABLE photo_submissions ADD CONSTRAINT photo_submissions_laboratory_id_fkey 
  FOREIGN KEY (laboratory_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- quote_requests -> CASCADE
ALTER TABLE quote_requests DROP CONSTRAINT IF EXISTS quote_requests_laboratory_id_fkey;
ALTER TABLE quote_requests ADD CONSTRAINT quote_requests_laboratory_id_fkey 
  FOREIGN KEY (laboratory_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- referral_rewards -> CASCADE
ALTER TABLE referral_rewards DROP CONSTRAINT IF EXISTS referral_rewards_user_id_fkey;
ALTER TABLE referral_rewards ADD CONSTRAINT referral_rewards_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- referrals -> CASCADE
ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referee_id_fkey;
ALTER TABLE referrals ADD CONSTRAINT referrals_referee_id_fkey 
  FOREIGN KEY (referee_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referrer_id_fkey;
ALTER TABLE referrals ADD CONSTRAINT referrals_referrer_id_fkey 
  FOREIGN KEY (referrer_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- subscription_invoices -> CASCADE
ALTER TABLE subscription_invoices DROP CONSTRAINT IF EXISTS subscription_invoices_user_id_fkey;
ALTER TABLE subscription_invoices ADD CONSTRAINT subscription_invoices_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- user_profiles.impersonated_by -> SET NULL
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_impersonated_by_fkey;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_impersonated_by_fkey 
  FOREIGN KEY (impersonated_by) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- work_assignments.assigned_by -> SET NULL (historique)
ALTER TABLE work_assignments DROP CONSTRAINT IF EXISTS work_assignments_assigned_by_fkey;
ALTER TABLE work_assignments ADD CONSTRAINT work_assignments_assigned_by_fkey 
  FOREIGN KEY (assigned_by) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- work_comments -> CASCADE
ALTER TABLE work_comments DROP CONSTRAINT IF EXISTS work_comments_user_id_fkey;
ALTER TABLE work_comments ADD CONSTRAINT work_comments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- ============================================================================
-- CONTRAINTES VERS profiles
-- ============================================================================

-- archived_documents -> CASCADE
ALTER TABLE archived_documents DROP CONSTRAINT IF EXISTS archived_documents_laboratory_id_fkey;
ALTER TABLE archived_documents ADD CONSTRAINT archived_documents_laboratory_id_fkey 
  FOREIGN KEY (laboratory_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- audit_log -> CASCADE
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_laboratory_id_fkey;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_laboratory_id_fkey 
  FOREIGN KEY (laboratory_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- credit_notes -> CASCADE
ALTER TABLE credit_notes DROP CONSTRAINT IF EXISTS credit_notes_user_id_fkey;
ALTER TABLE credit_notes ADD CONSTRAINT credit_notes_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- data_seals -> CASCADE
ALTER TABLE data_seals DROP CONSTRAINT IF EXISTS data_seals_laboratory_id_fkey;
ALTER TABLE data_seals ADD CONSTRAINT data_seals_laboratory_id_fkey 
  FOREIGN KEY (laboratory_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- delivery_notes -> CASCADE
ALTER TABLE delivery_notes DROP CONSTRAINT IF EXISTS delivery_notes_user_id_fkey;
ALTER TABLE delivery_notes ADD CONSTRAINT delivery_notes_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- dentist_favorite_laboratories -> CASCADE
ALTER TABLE dentist_favorite_laboratories DROP CONSTRAINT IF EXISTS dentist_favorite_laboratories_laboratory_profile_id_fkey;
ALTER TABLE dentist_favorite_laboratories ADD CONSTRAINT dentist_favorite_laboratories_laboratory_profile_id_fkey 
  FOREIGN KEY (laboratory_profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- dentists -> CASCADE
ALTER TABLE dentists DROP CONSTRAINT IF EXISTS dentists_user_id_fkey;
ALTER TABLE dentists ADD CONSTRAINT dentists_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- digital_certificates -> CASCADE
ALTER TABLE digital_certificates DROP CONSTRAINT IF EXISTS digital_certificates_laboratory_id_fkey;
ALTER TABLE digital_certificates ADD CONSTRAINT digital_certificates_laboratory_id_fkey 
  FOREIGN KEY (laboratory_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- fiscal_periods -> CASCADE
ALTER TABLE fiscal_periods DROP CONSTRAINT IF EXISTS fiscal_periods_laboratory_id_fkey;
ALTER TABLE fiscal_periods ADD CONSTRAINT fiscal_periods_laboratory_id_fkey 
  FOREIGN KEY (laboratory_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- help_replies -> CASCADE
ALTER TABLE help_replies DROP CONSTRAINT IF EXISTS help_replies_user_id_fkey;
ALTER TABLE help_replies ADD CONSTRAINT help_replies_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- help_topics -> CASCADE
ALTER TABLE help_topics DROP CONSTRAINT IF EXISTS help_topics_user_id_fkey;
ALTER TABLE help_topics ADD CONSTRAINT help_topics_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- help_votes -> CASCADE
ALTER TABLE help_votes DROP CONSTRAINT IF EXISTS help_votes_user_id_fkey;
ALTER TABLE help_votes ADD CONSTRAINT help_votes_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- invoices -> CASCADE
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_user_id_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- laboratory_employees.laboratory_profile_id -> CASCADE
ALTER TABLE laboratory_employees DROP CONSTRAINT IF EXISTS laboratory_employees_laboratory_profile_id_fkey;
ALTER TABLE laboratory_employees ADD CONSTRAINT laboratory_employees_laboratory_profile_id_fkey 
  FOREIGN KEY (laboratory_profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- laboratory_role_permissions -> CASCADE
ALTER TABLE laboratory_role_permissions DROP CONSTRAINT IF EXISTS laboratory_role_permissions_laboratory_profile_id_fkey;
ALTER TABLE laboratory_role_permissions ADD CONSTRAINT laboratory_role_permissions_laboratory_profile_id_fkey 
  FOREIGN KEY (laboratory_profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- proformas -> CASCADE
ALTER TABLE proformas DROP CONSTRAINT IF EXISTS proformas_user_id_fkey;
ALTER TABLE proformas ADD CONSTRAINT proformas_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- stl_files -> CASCADE
ALTER TABLE stl_files DROP CONSTRAINT IF EXISTS stl_files_laboratory_id_fkey;
ALTER TABLE stl_files ADD CONSTRAINT stl_files_laboratory_id_fkey 
  FOREIGN KEY (laboratory_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- user_extensions -> CASCADE
ALTER TABLE user_extensions DROP CONSTRAINT IF EXISTS user_extensions_profile_id_fkey;
ALTER TABLE user_extensions ADD CONSTRAINT user_extensions_profile_id_fkey 
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
