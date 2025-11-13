/*
  # Correction sécurité - Partie 1: Index manquants (Tables A-D)
  
  Ajoute des index sur les clés étrangères pour améliorer les performances.
*/

-- access_codes
CREATE INDEX IF NOT EXISTS idx_access_codes_created_by ON access_codes(created_by);
CREATE INDEX IF NOT EXISTS idx_access_codes_used_by ON access_codes(used_by);

-- admin_audit_log  
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_user_id ON admin_audit_log(target_user_id);

-- alerts
CREATE INDEX IF NOT EXISTS idx_alerts_created_by ON alerts(created_by);

-- audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_laboratory_id ON audit_log(laboratory_id);

-- batch_numbers
CREATE INDEX IF NOT EXISTS idx_batch_numbers_user_id ON batch_numbers(user_id);

-- data_seals
CREATE INDEX IF NOT EXISTS idx_data_seals_sealed_by ON data_seals(sealed_by);

-- delivery_note_batches
CREATE INDEX IF NOT EXISTS idx_delivery_note_batches_batch_number_id ON delivery_note_batches(batch_number_id);
CREATE INDEX IF NOT EXISTS idx_delivery_note_batches_material_id ON delivery_note_batches(material_id);
CREATE INDEX IF NOT EXISTS idx_delivery_note_batches_user_id ON delivery_note_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_note_batches_delivery_note_id ON delivery_note_batches(delivery_note_id);

-- delivery_note_stages
CREATE INDEX IF NOT EXISTS idx_delivery_note_stages_completed_by ON delivery_note_stages(completed_by);

-- delivery_notes
CREATE INDEX IF NOT EXISTS idx_delivery_notes_proforma_id ON delivery_notes(proforma_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_rejected_by ON delivery_notes(rejected_by);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_user_id ON delivery_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_dentist_id ON delivery_notes(dentist_id);

-- dentist_notifications
CREATE INDEX IF NOT EXISTS idx_dentist_notifications_laboratory_id ON dentist_notifications(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_dentist_notifications_dentist_account_id ON dentist_notifications(dentist_account_id);

-- dentist_quote_requests
CREATE INDEX IF NOT EXISTS idx_dentist_quote_requests_proforma_id ON dentist_quote_requests(proforma_id);
CREATE INDEX IF NOT EXISTS idx_dentist_quote_requests_laboratory_id ON dentist_quote_requests(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_dentist_quote_requests_dentist_account_id ON dentist_quote_requests(dentist_account_id);
