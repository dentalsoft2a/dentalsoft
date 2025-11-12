/*
  # Ajouter la fonction get_table_sizes pour le monitoring
  
  Cette migration ajoute une fonction RPC pour récupérer les tailles des tables
  et les statistiques pour le dashboard d'optimisation.
*/

-- Fonction pour obtenir les tailles de toutes les tables
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE (
  table_name TEXT,
  row_count BIGINT,
  size TEXT,
  size_bytes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT,
    COALESCE((
      SELECT n_live_tup 
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public' AND relname = t.tablename
    ), 0)::BIGINT as row_count,
    pg_size_pretty(pg_total_relation_size('public.' || t.tablename))::TEXT as size,
    pg_total_relation_size('public.' || t.tablename)::BIGINT as size_bytes
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  ORDER BY pg_total_relation_size('public.' || t.tablename) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les statistiques de base de données
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE (
  total_size BIGINT,
  total_tables INTEGER,
  total_rows BIGINT,
  last_vacuum TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    SUM(pg_total_relation_size('public.' || tablename))::BIGINT as total_size,
    COUNT(*)::INTEGER as total_tables,
    SUM(COALESCE(n_live_tup, 0))::BIGINT as total_rows,
    MAX(last_vacuum)::TIMESTAMPTZ as last_vacuum
  FROM pg_tables t
  LEFT JOIN pg_stat_user_tables s ON s.schemaname = t.schemaname AND s.relname = t.tablename
  WHERE t.schemaname = 'public';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les métriques d'optimisation récentes
CREATE OR REPLACE FUNCTION get_optimization_summary()
RETURNS TABLE (
  total_operations INTEGER,
  total_cleaned_rows BIGINT,
  total_space_saved BIGINT,
  last_maintenance TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_operations,
    COALESCE(SUM(rows_affected), 0)::BIGINT as total_cleaned_rows,
    COALESCE(SUM(GREATEST(size_before_bytes - size_after_bytes, 0)), 0)::BIGINT as total_space_saved,
    MAX(executed_at)::TIMESTAMPTZ as last_maintenance
  FROM database_optimization_log
  WHERE status = 'success' AND operation_type IN ('cleanup', 'archive');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ajouter des commentaires
COMMENT ON FUNCTION get_table_sizes() IS 'Retourne les tailles et nombres de lignes de toutes les tables';
COMMENT ON FUNCTION get_database_stats() IS 'Retourne les statistiques globales de la base de données';
COMMENT ON FUNCTION get_optimization_summary() IS 'Retourne un résumé des opérations d''optimisation récentes';
