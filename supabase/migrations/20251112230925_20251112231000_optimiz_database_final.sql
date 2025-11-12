/*
  # Système d'Optimisation de la Base de Données - Version Finale
  
  Cette migration crée un système complet et fonctionnel d'optimisation incluant :
  - Tables de monitoring et d'archivage
  - Fonctions de nettoyage automatique adaptées aux tables réelles
  - Jobs automatiques de maintenance
  - Index optimisés
  
  Toutes les fonctions sont adaptées à la structure réelle de votre base de données.
*/

-- =============================================================================
-- 1. TABLES DE MONITORING ET D'ARCHIVAGE
-- =============================================================================

CREATE TABLE IF NOT EXISTS database_optimization_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('cleanup', 'archive', 'optimize', 'vacuum')),
  table_name TEXT NOT NULL,
  rows_affected BIGINT DEFAULT 0,
  size_before_bytes BIGINT,
  size_after_bytes BIGINT,
  execution_time_ms INTEGER,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_optimization_log_date ON database_optimization_log(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_optimization_log_table ON database_optimization_log(table_name);

CREATE TABLE IF NOT EXISTS archived_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  data JSONB NOT NULL,
  archived_at TIMESTAMPTZ DEFAULT now(),
  archived_reason TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_archived_data_source ON archived_data(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_archived_data_date ON archived_data(archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_archived_data_user ON archived_data(user_id) WHERE user_id IS NOT NULL;

-- =============================================================================
-- 2. FONCTION UTILITAIRE DE LOG
-- =============================================================================

CREATE OR REPLACE FUNCTION log_optimization_operation(
  p_operation_type TEXT,
  p_table_name TEXT,
  p_rows_affected BIGINT,
  p_size_before BIGINT,
  p_size_after BIGINT,
  p_execution_time INTEGER,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO database_optimization_log (
    operation_type, table_name, rows_affected, size_before_bytes,
    size_after_bytes, execution_time_ms, status, error_message
  ) VALUES (
    p_operation_type, p_table_name, p_rows_affected, p_size_before,
    p_size_after, p_execution_time, p_status, p_error_message
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 3. FONCTIONS DE NETTOYAGE AUTOMATIQUE
-- =============================================================================

-- Nettoyage des codes d'accès expirés ou utilisés > 6 mois
CREATE OR REPLACE FUNCTION cleanup_old_access_codes()
RETURNS INTEGER AS $$
DECLARE
  v_rows_deleted INTEGER;
  v_size_before BIGINT;
  v_size_after BIGINT;
  v_start_time TIMESTAMPTZ;
  v_execution_time INTEGER;
BEGIN
  v_start_time := clock_timestamp();
  v_size_before := pg_total_relation_size('access_codes');
  
  -- Archiver avant suppression
  INSERT INTO archived_data (source_table, source_id, data, archived_reason, user_id)
  SELECT 
    'access_codes', id, to_jsonb(access_codes.*),
    'Expired or used more than 6 months ago', used_by
  FROM access_codes
  WHERE (is_used = true AND used_at < NOW() - INTERVAL '6 months')
     OR (expires_at IS NOT NULL AND expires_at < NOW() - INTERVAL '6 months');
  
  DELETE FROM access_codes
  WHERE (is_used = true AND used_at < NOW() - INTERVAL '6 months')
     OR (expires_at IS NOT NULL AND expires_at < NOW() - INTERVAL '6 months');
  
  GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
  v_size_after := pg_total_relation_size('access_codes');
  v_execution_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
  
  PERFORM log_optimization_operation('cleanup', 'access_codes', v_rows_deleted, v_size_before, v_size_after, v_execution_time, 'success');
  RETURN v_rows_deleted;
EXCEPTION WHEN OTHERS THEN
  PERFORM log_optimization_operation('cleanup', 'access_codes', 0, v_size_before, v_size_before, 0, 'failed', SQLERRM);
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nettoyage des alertes expirées > 3 mois
CREATE OR REPLACE FUNCTION cleanup_old_alerts()
RETURNS INTEGER AS $$
DECLARE
  v_rows_deleted INTEGER;
  v_size_before BIGINT;
  v_size_after BIGINT;
  v_start_time TIMESTAMPTZ;
  v_execution_time INTEGER;
BEGIN
  v_start_time := clock_timestamp();
  v_size_before := pg_total_relation_size('alerts');
  
  -- Archiver les alertes expirées depuis plus de 3 mois
  INSERT INTO archived_data (source_table, source_id, data, archived_reason, user_id)
  SELECT 
    'alerts', id, to_jsonb(alerts.*),
    'Alert expired more than 3 months ago', created_by
  FROM alerts
  WHERE end_date IS NOT NULL AND end_date < NOW() - INTERVAL '3 months';
  
  DELETE FROM alerts
  WHERE end_date IS NOT NULL AND end_date < NOW() - INTERVAL '3 months';
  
  GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
  v_size_after := pg_total_relation_size('alerts');
  v_execution_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
  
  PERFORM log_optimization_operation('cleanup', 'alerts', v_rows_deleted, v_size_before, v_size_after, v_execution_time, 'success');
  RETURN v_rows_deleted;
EXCEPTION WHEN OTHERS THEN
  PERFORM log_optimization_operation('cleanup', 'alerts', 0, v_size_before, v_size_before, 0, 'failed', SQLERRM);
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Archivage des logs d'audit > 24 mois (sauf scellés)
CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  v_rows_archived INTEGER;
  v_size_before BIGINT;
  v_size_after BIGINT;
  v_start_time TIMESTAMPTZ;
  v_execution_time INTEGER;
BEGIN
  v_start_time := clock_timestamp();
  v_size_before := pg_total_relation_size('audit_log');
  
  INSERT INTO archived_data (source_table, source_id, data, archived_reason, user_id)
  SELECT 
    'audit_log', id, to_jsonb(audit_log.*),
    'Audit log older than 24 months', user_id
  FROM audit_log
  WHERE created_at < NOW() - INTERVAL '24 months' AND is_sealed = false;
  
  GET DIAGNOSTICS v_rows_archived = ROW_COUNT;
  
  -- Supprimer uniquement les logs NON scellés
  DELETE FROM audit_log
  WHERE created_at < NOW() - INTERVAL '24 months' AND is_sealed = false;
  
  v_size_after := pg_total_relation_size('audit_log');
  v_execution_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
  
  PERFORM log_optimization_operation('archive', 'audit_log', v_rows_archived, v_size_before, v_size_after, v_execution_time, 'success');
  RETURN v_rows_archived;
EXCEPTION WHEN OTHERS THEN
  PERFORM log_optimization_operation('archive', 'audit_log', 0, v_size_before, v_size_before, 0, 'failed', SQLERRM);
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nettoyage des photos > 1 mois
CREATE OR REPLACE FUNCTION cleanup_old_photo_submissions()
RETURNS INTEGER AS $$
DECLARE
  v_rows_deleted INTEGER;
  v_size_before BIGINT;
  v_size_after BIGINT;
  v_start_time TIMESTAMPTZ;
  v_execution_time INTEGER;
BEGIN
  v_start_time := clock_timestamp();
  v_size_before := pg_total_relation_size('photo_submissions');
  
  -- Archivage léger (métadonnées uniquement)
  INSERT INTO archived_data (source_table, source_id, data, archived_reason, user_id)
  SELECT 
    'photo_submissions', id,
    jsonb_build_object('id', id, 'dentist_account_id', dentist_account_id, 'laboratory_id', laboratory_id, 'created_at', created_at, 'status', status),
    'Photo older than 1 month', NULL
  FROM photo_submissions
  WHERE created_at < NOW() - INTERVAL '1 month';
  
  DELETE FROM photo_submissions WHERE created_at < NOW() - INTERVAL '1 month';
  
  GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
  v_size_after := pg_total_relation_size('photo_submissions');
  v_execution_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
  
  PERFORM log_optimization_operation('cleanup', 'photo_submissions', v_rows_deleted, v_size_before, v_size_after, v_execution_time, 'success');
  RETURN v_rows_deleted;
EXCEPTION WHEN OTHERS THEN
  PERFORM log_optimization_operation('cleanup', 'photo_submissions', 0, v_size_before, v_size_before, 0, 'failed', SQLERRM);
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Archivage des mouvements de stock > 12 mois
CREATE OR REPLACE FUNCTION archive_old_stock_movements()
RETURNS INTEGER AS $$
DECLARE
  v_rows_archived INTEGER;
  v_size_before BIGINT;
  v_size_after BIGINT;
  v_start_time TIMESTAMPTZ;
  v_execution_time INTEGER;
BEGIN
  v_start_time := clock_timestamp();
  v_size_before := pg_total_relation_size('stock_movements');
  
  INSERT INTO archived_data (source_table, source_id, data, archived_reason, user_id)
  SELECT 
    'stock_movements', id, to_jsonb(stock_movements.*),
    'Stock movement older than 12 months', created_by
  FROM stock_movements
  WHERE created_at < NOW() - INTERVAL '12 months';
  
  GET DIAGNOSTICS v_rows_archived = ROW_COUNT;
  
  DELETE FROM stock_movements WHERE created_at < NOW() - INTERVAL '12 months';
  
  v_size_after := pg_total_relation_size('stock_movements');
  v_execution_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
  
  PERFORM log_optimization_operation('archive', 'stock_movements', v_rows_archived, v_size_before, v_size_after, v_execution_time, 'success');
  RETURN v_rows_archived;
EXCEPTION WHEN OTHERS THEN
  PERFORM log_optimization_operation('archive', 'stock_movements', 0, v_size_before, v_size_before, 0, 'failed', SQLERRM);
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nettoyage des sessions d'impersonation terminées > 30 jours
CREATE OR REPLACE FUNCTION cleanup_old_impersonation_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_rows_deleted INTEGER;
  v_size_before BIGINT;
  v_size_after BIGINT;
  v_start_time TIMESTAMPTZ;
  v_execution_time INTEGER;
BEGIN
  v_start_time := clock_timestamp();
  v_size_before := pg_total_relation_size('admin_impersonation_sessions');
  
  INSERT INTO archived_data (source_table, source_id, data, archived_reason, user_id)
  SELECT 
    'admin_impersonation_sessions', id, to_jsonb(admin_impersonation_sessions.*),
    'Impersonation session ended more than 30 days ago', admin_id
  FROM admin_impersonation_sessions
  WHERE ended_at IS NOT NULL AND ended_at < NOW() - INTERVAL '30 days';
  
  DELETE FROM admin_impersonation_sessions
  WHERE ended_at IS NOT NULL AND ended_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
  v_size_after := pg_total_relation_size('admin_impersonation_sessions');
  v_execution_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
  
  PERFORM log_optimization_operation('cleanup', 'admin_impersonation_sessions', v_rows_deleted, v_size_before, v_size_after, v_execution_time, 'success');
  RETURN v_rows_deleted;
EXCEPTION WHEN OTHERS THEN
  PERFORM log_optimization_operation('cleanup', 'admin_impersonation_sessions', 0, v_size_before, v_size_before, 0, 'failed', SQLERRM);
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nettoyage des enregistrements orphelins
CREATE OR REPLACE FUNCTION cleanup_orphaned_records()
RETURNS INTEGER AS $$
DECLARE
  v_total_deleted INTEGER := 0;
  v_rows_deleted INTEGER;
BEGIN
  -- delivery_note_stages orphelines
  DELETE FROM delivery_note_stages WHERE delivery_note_id NOT IN (SELECT id FROM delivery_notes);
  GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_rows_deleted;
  
  -- stock_movements orphelins
  DELETE FROM stock_movements WHERE catalog_item_id NOT IN (SELECT id FROM catalog_items);
  GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_rows_deleted;
  
  -- resource_batch_link orphelins
  DELETE FROM resource_batch_link
  WHERE (resource_id IS NOT NULL AND resource_id NOT IN (SELECT id FROM resources))
     OR (variant_id IS NOT NULL AND variant_id NOT IN (SELECT id FROM resource_variants));
  GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_rows_deleted;
  
  -- delivery_note_batches orphelins
  DELETE FROM delivery_note_batches WHERE delivery_note_id NOT IN (SELECT id FROM delivery_notes);
  GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
  v_total_deleted := v_total_deleted + v_rows_deleted;
  
  PERFORM log_optimization_operation('cleanup', 'orphaned_records', v_total_deleted, 0, 0, 0, 'success');
  RETURN v_total_deleted;
EXCEPTION WHEN OTHERS THEN
  PERFORM log_optimization_operation('cleanup', 'orphaned_records', 0, 0, 0, 0, 'failed', SQLERRM);
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- VACUUM et ANALYZE sur toutes les tables
CREATE OR REPLACE FUNCTION vacuum_and_analyze_all()
RETURNS TEXT AS $$
DECLARE
  v_table_name TEXT;
  v_start_time TIMESTAMPTZ;
  v_execution_time INTEGER;
  v_tables_processed INTEGER := 0;
BEGIN
  v_start_time := clock_timestamp();
  
  FOR v_table_name IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('VACUUM ANALYZE %I', v_table_name);
    v_tables_processed := v_tables_processed + 1;
  END LOOP;
  
  v_execution_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER;
  PERFORM log_optimization_operation('vacuum', 'all_tables', v_tables_processed, 0, 0, v_execution_time, 'success');
  
  RETURN format('VACUUM ANALYZE completed on %s tables in %s ms', v_tables_processed, v_execution_time);
EXCEPTION WHEN OTHERS THEN
  PERFORM log_optimization_operation('vacuum', 'all_tables', v_tables_processed, 0, 0, 0, 'failed', SQLERRM);
  RETURN 'VACUUM ANALYZE failed: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. FONCTIONS DE MAINTENANCE PRINCIPALES
-- =============================================================================

-- Maintenance quotidienne
CREATE OR REPLACE FUNCTION run_daily_maintenance()
RETURNS TEXT AS $$
DECLARE
  v_result TEXT := '';
  v_count INTEGER;
BEGIN
  v_count := cleanup_old_access_codes();
  v_result := v_result || format('Access codes cleaned: %s\n', v_count);
  
  v_count := cleanup_old_alerts();
  v_result := v_result || format('Alerts cleaned: %s\n', v_count);
  
  v_count := cleanup_old_photo_submissions();
  v_result := v_result || format('Photos cleaned: %s\n', v_count);
  
  v_count := cleanup_old_impersonation_sessions();
  v_result := v_result || format('Impersonation sessions cleaned: %s\n', v_count);
  
  v_count := cleanup_orphaned_records();
  v_result := v_result || format('Orphaned records cleaned: %s\n', v_count);
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Maintenance hebdomadaire
CREATE OR REPLACE FUNCTION run_weekly_maintenance()
RETURNS TEXT AS $$
DECLARE
  v_result TEXT := '';
  v_count INTEGER;
BEGIN
  v_count := archive_old_audit_logs();
  v_result := v_result || format('Audit logs archived: %s\n', v_count);
  
  v_count := archive_old_stock_movements();
  v_result := v_result || format('Stock movements archived: %s\n', v_count);
  
  v_result := v_result || vacuum_and_analyze_all();
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 5. OPTIMISATION DES INDEX
-- =============================================================================

-- Index partiels pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_batch_numbers_current 
  ON batch_numbers(material_id, batch_number) WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_delivery_notes_active 
  ON delivery_notes(user_id, created_at DESC) WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_invoices_unpaid 
  ON invoices(dentist_id, date) WHERE status IN ('pending', 'partial');

CREATE INDEX IF NOT EXISTS idx_alerts_active 
  ON alerts(created_at DESC) WHERE is_active = true;

-- Index composites pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_delivery_note_batches_lookup 
  ON delivery_note_batches(delivery_note_id, material_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_tracking 
  ON stock_movements(catalog_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_lab_date 
  ON audit_log(laboratory_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_note_stages_note 
  ON delivery_note_stages(delivery_note_id, stage_id);

-- =============================================================================
-- 6. JOBS AUTOMATIQUES (pg_cron)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Supprimer anciens jobs s'ils existent
DO $$
BEGIN
  PERFORM cron.unschedule('daily-maintenance');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('weekly-maintenance');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Job quotidien à 2h
SELECT cron.schedule('daily-maintenance', '0 2 * * *', 'SELECT run_daily_maintenance();');

-- Job hebdomadaire dimanche 3h
SELECT cron.schedule('weekly-maintenance', '0 3 * * 0', 'SELECT run_weekly_maintenance();');

-- =============================================================================
-- 7. RLS ET PERMISSIONS
-- =============================================================================

ALTER TABLE database_optimization_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can view optimization logs"
  ON database_optimization_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Users can view own archived data"
  ON archived_data FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Super admin can view all archived data"
  ON archived_data FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- =============================================================================
-- 8. SNAPSHOT INITIAL
-- =============================================================================

INSERT INTO database_optimization_log (operation_type, table_name, rows_affected, size_before_bytes, status)
SELECT 'optimize', tablename, 0, pg_total_relation_size('public.' || tablename), 'success'
FROM pg_tables WHERE schemaname = 'public';

-- Commentaires
COMMENT ON TABLE database_optimization_log IS 'Log de toutes les opérations d''optimisation effectuées sur la base';
COMMENT ON TABLE archived_data IS 'Stockage sécurisé des données archivées avant suppression - possibilité de restauration';
COMMENT ON FUNCTION run_daily_maintenance() IS 'Maintenance quotidienne automatique - s''exécute tous les jours à 2h';
COMMENT ON FUNCTION run_weekly_maintenance() IS 'Maintenance hebdomadaire automatique - s''exécute le dimanche à 3h';
