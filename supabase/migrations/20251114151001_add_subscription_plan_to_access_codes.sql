/*
  # Ajouter le choix du plan d'abonnement aux codes d'accès
  
  Cette migration permet de spécifier quel plan d'abonnement est activé 
  lorsqu'un code d'accès est utilisé.
  
  ## Modifications
  
  1. Ajout de Colonnes
    - `subscription_plan_id` (uuid) - Référence au plan d'abonnement débloqué
    - Clé étrangère vers subscription_plans
  
  2. Mise à jour
    - Définir le plan standard par défaut pour les codes existants
  
  3. Logique
    - Si subscription_plan_id est NULL, le code donne accès au plan standard (comportement par défaut)
    - Si subscription_plan_id est défini, le code donne accès au plan spécifié
*/

-- Ajouter la colonne subscription_plan_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'access_codes' AND column_name = 'subscription_plan_id'
  ) THEN
    ALTER TABLE access_codes 
    ADD COLUMN subscription_plan_id uuid REFERENCES subscription_plans(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_access_codes_subscription_plan 
  ON access_codes(subscription_plan_id);

-- Mettre à jour les codes existants pour pointer vers le plan standard
UPDATE access_codes 
SET subscription_plan_id = (
  SELECT id FROM subscription_plans 
  WHERE plan_type = 'standard' AND is_active = true 
  LIMIT 1
)
WHERE subscription_plan_id IS NULL;

-- Commentaires
COMMENT ON COLUMN access_codes.subscription_plan_id IS 'ID du plan d''abonnement que ce code d''accès débloque. NULL = plan standard par défaut';
