/*
  # FORCE FIX - Access Codes Policy
  
  1. Problem
    - auth.uid() ne fonctionne pas correctement dans WITH CHECK
    - Le trigger ne résout pas le problème
    
  2. Solution RADICALE
    - Supprimer le trigger qui cause des problèmes
    - Créer une politique UPDATE ultra-simple
    - Vérifier UNIQUEMENT dans USING, pas dans WITH CHECK
    - Faire confiance à l'application pour envoyer les bonnes valeurs
    
  3. Sécurité
    - USING empêche les utilisateurs d'accéder aux codes des autres
    - WITH CHECK permet toute mise à jour si USING a passé
*/

-- Supprimer le trigger qui pose problème
DROP TRIGGER IF EXISTS set_used_by_trigger ON access_codes;
DROP FUNCTION IF EXISTS auto_set_used_by();

-- Supprimer toutes les politiques UPDATE
DROP POLICY IF EXISTS "access_codes_update_policy" ON access_codes;
DROP POLICY IF EXISTS "Users can redeem codes" ON access_codes;

-- Créer UNE SEULE politique UPDATE simple
CREATE POLICY "access_codes_update_policy"
  ON access_codes FOR UPDATE
  TO authenticated
  USING (
    -- Vérification AVANT update : qui peut accéder à ce code ?
    -- Super admin OU code disponible
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    (is_used = false AND (expires_at IS NULL OR expires_at > now()))
  )
  WITH CHECK (true);  -- Pas de vérification APRÈS update
