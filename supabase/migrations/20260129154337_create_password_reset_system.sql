/*
  # Système de réinitialisation de mot de passe personnalisé

  1. Nouvelle table
    - `password_reset_tokens`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key vers auth.users)
      - `email` (text)
      - `token` (text, unique) - Code de 6 chiffres
      - `expires_at` (timestamp)
      - `used_at` (timestamp, nullable)
      - `created_at` (timestamp)

  2. Sécurité
    - RLS activé
    - Politiques pour permettre la création et la vérification

  3. Fonction
    - Nettoyage automatique des tokens expirés
*/

-- Créer la table des tokens de reset
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Activer RLS
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Politique : Tout le monde peut créer un token (via edge function)
CREATE POLICY "Anyone can create password reset tokens"
  ON password_reset_tokens
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Politique : Tout le monde peut lire les tokens non utilisés et non expirés (pour validation)
CREATE POLICY "Anyone can read valid tokens"
  ON password_reset_tokens
  FOR SELECT
  TO authenticated, anon
  USING (
    used_at IS NULL
    AND expires_at > now()
  );

-- Politique : Tout le monde peut mettre à jour used_at (via edge function)
CREATE POLICY "Anyone can mark token as used"
  ON password_reset_tokens
  FOR UPDATE
  TO authenticated, anon
  USING (used_at IS NULL AND expires_at > now())
  WITH CHECK (used_at IS NOT NULL);

-- Fonction pour nettoyer les tokens expirés (à appeler périodiquement)
CREATE OR REPLACE FUNCTION cleanup_expired_reset_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM password_reset_tokens
  WHERE expires_at < now() - INTERVAL '24 hours';
END;
$$;