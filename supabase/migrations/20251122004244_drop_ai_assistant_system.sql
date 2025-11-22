/*
  # Suppression complète du système d'assistant IA

  1. Actions
    - Suppression de toutes les tables IA
    - Suppression de toutes les fonctions IA
    - Suppression de tous les index IA
    - Nettoyage complet du système

  2. Tables supprimées
    - ai_conversations
    - ai_messages
    - ai_function_logs
    - ai_usage_stats
    - ai_user_preferences

  3. Raison
    - Système non fonctionnel
    - Nettoyage demandé par l'utilisateur
*/

-- Supprimer les tables dans l'ordre inverse des dépendances
DROP TABLE IF EXISTS ai_function_logs CASCADE;
DROP TABLE IF EXISTS ai_messages CASCADE;
DROP TABLE IF EXISTS ai_conversations CASCADE;
DROP TABLE IF EXISTS ai_usage_stats CASCADE;
DROP TABLE IF EXISTS ai_user_preferences CASCADE;

-- Supprimer les index associés (si non supprimés automatiquement)
DROP INDEX IF EXISTS idx_ai_conversations_user_id;
DROP INDEX IF EXISTS idx_ai_conversations_laboratory_id;
DROP INDEX IF EXISTS idx_ai_conversations_last_message_at;
DROP INDEX IF EXISTS idx_ai_messages_conversation_id;
DROP INDEX IF EXISTS idx_ai_messages_created_at;
DROP INDEX IF EXISTS idx_ai_function_logs_conversation_id;
DROP INDEX IF EXISTS idx_ai_function_logs_executed_at;
DROP INDEX IF EXISTS idx_ai_usage_stats_user_date;
DROP INDEX IF EXISTS idx_ai_usage_stats_laboratory_date;
