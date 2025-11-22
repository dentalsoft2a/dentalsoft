/*
  # Système d'Assistant IA Conversationnel
  
  1. Objectif
    - Assistant IA intelligent pour gérer le laboratoire dentaire
    - Conversation en langage naturel avec OpenAI GPT-4
    - Exécution sécurisée de fonctions (créer BL, ajouter articles, stats, etc.)
    - Historique complet des conversations
    - Traçabilité de toutes les actions IA
    
  2. Tables créées
    - `ai_conversations` : Historique des conversations par utilisateur
    - `ai_messages` : Messages individuels (user, assistant, system)
    - `ai_function_logs` : Logs de toutes les fonctions exécutées par l'IA
    - `ai_usage_stats` : Statistiques d'utilisation quotidienne
    - `ai_user_preferences` : Préférences utilisateur (voice, langue, etc.)
    
  3. Sécurité
    - RLS strict : chaque utilisateur voit seulement ses conversations
    - Isolation par laboratory_id
    - Logs complets pour audit
    - Rate limiting via stats quotidiennes
    
  4. Fonctionnalités
    - Conversations persistantes avec titres auto-générés
    - Support function calling OpenAI
    - Métriques détaillées (tokens, timing, succès)
    - Archivage conversations
    - Partage conversations (futur)
*/

-- ============================================================================
-- TABLE : ai_conversations
-- Stocke les conversations entre utilisateur et IA
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  laboratory_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Métadonnées conversation
  title TEXT, -- Titre auto-généré ou personnalisé
  summary TEXT, -- Résumé court de la conversation
  
  -- État
  is_archived BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  
  -- Statistiques
  message_count INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  
  -- Métadonnées JSON
  metadata JSONB DEFAULT '{}'::jsonb, -- Tags, contexte, etc.
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id 
  ON ai_conversations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_laboratory_id 
  ON ai_conversations(laboratory_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_archived 
  ON ai_conversations(user_id, is_archived, updated_at DESC);

-- ============================================================================
-- TABLE : ai_messages
-- Messages individuels dans les conversations
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE NOT NULL,
  
  -- Contenu du message
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'function')),
  content TEXT NOT NULL,
  
  -- Function calling OpenAI
  function_call JSONB, -- { name: "create_delivery_note", arguments: {...} }
  function_response JSONB, -- Résultat de la fonction exécutée
  
  -- Métriques
  tokens_used INTEGER DEFAULT 0,
  model_used TEXT, -- "gpt-4-turbo", "gpt-3.5-turbo", etc.
  response_time_ms INTEGER, -- Temps de génération
  
  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb, -- Contexte page, data sélectionnée, etc.
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour chargement rapide conversations
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id 
  ON ai_messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_ai_messages_function_call 
  ON ai_messages(conversation_id) 
  WHERE function_call IS NOT NULL;

-- ============================================================================
-- TABLE : ai_function_logs
-- Traçabilité complète des actions effectuées par l'IA
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_function_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Références
  message_id UUID REFERENCES ai_messages(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  laboratory_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Détails fonction
  function_name TEXT NOT NULL,
  parameters JSONB NOT NULL,
  result JSONB,
  
  -- État exécution
  success BOOLEAN NOT NULL,
  error_message TEXT,
  error_code TEXT,
  
  -- Performance
  execution_time_ms INTEGER,
  
  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour analytics
CREATE INDEX IF NOT EXISTS idx_ai_function_logs_user_id 
  ON ai_function_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_function_logs_function_name 
  ON ai_function_logs(function_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_function_logs_success 
  ON ai_function_logs(success, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_function_logs_laboratory_id 
  ON ai_function_logs(laboratory_id, created_at DESC);

-- ============================================================================
-- TABLE : ai_usage_stats
-- Statistiques d'utilisation quotidienne (rate limiting)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Utilisateur
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  laboratory_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Date (UTC)
  date DATE NOT NULL,
  
  -- Compteurs
  total_messages INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  
  -- Fonctions appelées
  functions_called JSONB DEFAULT '{}'::jsonb, -- { "create_delivery_note": 5, "add_dentist": 2 }
  
  -- Coûts estimés (en cents)
  estimated_cost_cents INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte unique par utilisateur/jour
  UNIQUE(user_id, date)
);

-- Index pour rate limiting rapide
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_user_date 
  ON ai_usage_stats(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_laboratory_date 
  ON ai_usage_stats(laboratory_id, date DESC);

-- ============================================================================
-- TABLE : ai_user_preferences
-- Préférences utilisateur pour l'assistant IA
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Préférences interface
  voice_enabled BOOLEAN DEFAULT FALSE,
  voice_language TEXT DEFAULT 'fr-FR',
  theme TEXT DEFAULT 'auto' CHECK (theme IN ('auto', 'light', 'dark')),
  
  -- Préférences IA
  ai_personality TEXT DEFAULT 'friendly' CHECK (ai_personality IN ('friendly', 'professional', 'concise')),
  auto_execute_functions BOOLEAN DEFAULT FALSE, -- Exécuter sans confirmation
  show_function_details BOOLEAN DEFAULT TRUE,
  
  -- Quick actions personnalisées
  favorite_actions JSONB DEFAULT '[]'::jsonb, -- ["create_delivery_note", "get_stats"]
  
  -- Notifications
  notify_on_function_completion BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ai_user_preferences_user_id 
  ON ai_user_preferences(user_id);

-- ============================================================================
-- RLS POLICIES
-- Sécurité stricte : chaque utilisateur voit seulement ses données
-- ============================================================================

-- ai_conversations
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON ai_conversations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own conversations"
  ON ai_conversations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own conversations"
  ON ai_conversations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own conversations"
  ON ai_conversations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ai_messages
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own conversations"
  ON ai_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
        AND ai_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON ai_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
        AND ai_conversations.user_id = auth.uid()
    )
  );

-- ai_function_logs
ALTER TABLE ai_function_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own function logs"
  ON ai_function_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own function logs"
  ON ai_function_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ai_usage_stats
ALTER TABLE ai_usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage stats"
  ON ai_usage_stats FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can upsert own usage stats"
  ON ai_usage_stats FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own usage stats"
  ON ai_usage_stats FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ai_user_preferences
ALTER TABLE ai_user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON ai_user_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own preferences"
  ON ai_user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON ai_user_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- FUNCTIONS HELPER
-- ============================================================================

-- Fonction pour mettre à jour le timestamp updated_at automatiquement
CREATE OR REPLACE FUNCTION update_ai_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_updated_at();

CREATE TRIGGER ai_usage_stats_updated_at
  BEFORE UPDATE ON ai_usage_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_updated_at();

CREATE TRIGGER ai_user_preferences_updated_at
  BEFORE UPDATE ON ai_user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_updated_at();

-- Fonction pour incrémenter le compteur de messages
CREATE OR REPLACE FUNCTION increment_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_conversations
  SET 
    message_count = message_count + 1,
    last_message_at = NOW(),
    total_tokens_used = total_tokens_used + COALESCE(NEW.tokens_used, 0)
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour compter messages automatiquement
CREATE TRIGGER ai_messages_count_trigger
  AFTER INSERT ON ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_conversation_message_count();

-- ============================================================================
-- COMMENTAIRES
-- ============================================================================

COMMENT ON TABLE ai_conversations IS 
'Conversations entre utilisateurs et assistant IA. Persistantes avec historique complet.';

COMMENT ON TABLE ai_messages IS 
'Messages individuels dans conversations. Support function calling OpenAI.';

COMMENT ON TABLE ai_function_logs IS 
'Traçabilité complète de toutes les actions effectuées par l''IA pour audit et debugging.';

COMMENT ON TABLE ai_usage_stats IS 
'Statistiques quotidiennes d''utilisation pour rate limiting et monitoring.';

COMMENT ON TABLE ai_user_preferences IS 
'Préférences utilisateur pour personnaliser l''expérience avec l''IA.';
