/*
  # Corriger la fonction get_database_stats
  
  Correction du conflit de nom de colonne last_vacuum
*/

-- Recréer la fonction avec qualification explicite
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
    SUM(pg_total_relation_size('public.' || t.tablename))::BIGINT as total_size,
    COUNT(*)::INTEGER as total_tables,
    SUM(COALESCE(s.n_live_tup, 0))::BIGINT as total_rows,
    MAX(s.last_vacuum)::TIMESTAMPTZ as last_vacuum
  FROM pg_tables t
  LEFT JOIN pg_stat_user_tables s ON s.schemaname = t.schemaname AND s.relname = t.tablename
  WHERE t.schemaname = 'public';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
