/*
  # Correction finale des problèmes critiques
  
  1. Ajoute les index manquants sur quote_requests
  2. Supprime les index dupliqués
*/

-- 1. Index manquants sur quote_requests
CREATE INDEX IF NOT EXISTS idx_quote_requests_delivery_note_id 
  ON quote_requests(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_dentist_id 
  ON quote_requests(dentist_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_laboratory_id 
  ON quote_requests(laboratory_id);

-- 2. Supprimer les index dupliqués (garder les plus récents avec noms explicites)

-- audit_log
DROP INDEX IF EXISTS idx_audit_log_laboratory CASCADE;

-- dentist_notifications  
DROP INDEX IF EXISTS idx_notifications_dentist CASCADE;

-- dentist_quote_requests
DROP INDEX IF EXISTS idx_quote_requests_dentist CASCADE;
DROP INDEX IF EXISTS idx_quote_requests_laboratory CASCADE;

-- fiscal_periods
DROP INDEX IF EXISTS idx_fiscal_periods_laboratory CASCADE;

-- laboratory_employees
DROP INDEX IF EXISTS idx_laboratory_employees_lab_id CASCADE;

-- production_alerts
DROP INDEX IF EXISTS idx_production_alerts_user CASCADE;

-- production_notes
DROP INDEX IF EXISTS idx_production_notes_delivery_note CASCADE;

-- production_photos
DROP INDEX IF EXISTS idx_production_photos_delivery_note CASCADE;

-- task_assignments
DROP INDEX IF EXISTS idx_task_assignments_delivery_note CASCADE;
DROP INDEX IF EXISTS idx_task_assignments_employee CASCADE;

-- work_assignments
DROP INDEX IF EXISTS idx_work_assignments_delivery_note CASCADE;
DROP INDEX IF EXISTS idx_work_assignments_employee CASCADE;

-- work_comments
DROP INDEX IF EXISTS idx_work_comments_delivery_note CASCADE;

COMMENT ON INDEX idx_quote_requests_delivery_note_id IS 
  'Index pour améliorer les performances des jointures quote_requests-delivery_notes';
COMMENT ON INDEX idx_quote_requests_dentist_id IS 
  'Index pour améliorer les performances des requêtes par dentiste';
COMMENT ON INDEX idx_quote_requests_laboratory_id IS 
  'Index pour améliorer les performances des requêtes par laboratoire';
