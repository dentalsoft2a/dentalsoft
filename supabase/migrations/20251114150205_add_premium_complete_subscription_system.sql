/*
  # Système d'Abonnement Premium Complet
  
  Cette migration ajoute un système à deux niveaux d'abonnement:
  1. Plan Standard - Débloque des fonctionnalités de base
  2. Plan Premium Complet - Débloque TOUTES les extensions en un seul abonnement
  
  ## Modifications
  
  1. Ajout de Colonnes
    - `unlocks_all_extensions` (boolean) - Indique si le plan débloque toutes les extensions
    - `plan_type` (text) - Type du plan: 'standard' ou 'premium_complete'
    - `display_order` (integer) - Ordre d'affichage dans l'interface
  
  2. Données
    - Modification du plan existant en 'standard'
    - Création d'un nouveau plan 'premium_complete'
  
  3. Logique Métier
    - Si un utilisateur a un abonnement avec unlocks_all_extensions = true, il a accès à TOUTES les extensions
    - Les extensions individuelles restent disponibles pour les utilisateurs du plan standard
*/

-- Ajouter les nouvelles colonnes à subscription_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription_plans' AND column_name = 'unlocks_all_extensions'
  ) THEN
    ALTER TABLE subscription_plans 
    ADD COLUMN unlocks_all_extensions boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription_plans' AND column_name = 'plan_type'
  ) THEN
    ALTER TABLE subscription_plans 
    ADD COLUMN plan_type text DEFAULT 'standard' NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription_plans' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE subscription_plans 
    ADD COLUMN display_order integer DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Créer un index sur plan_type pour des requêtes rapides
CREATE INDEX IF NOT EXISTS idx_subscription_plans_plan_type 
  ON subscription_plans(plan_type);

-- Mettre à jour le plan existant pour être de type 'standard'
UPDATE subscription_plans 
SET 
  plan_type = 'standard',
  unlocks_all_extensions = false,
  display_order = 1
WHERE is_active = true;

-- Créer le plan Premium Complet
INSERT INTO subscription_plans (
  name,
  description,
  price_monthly,
  plan_type,
  unlocks_all_extensions,
  display_order,
  features,
  is_active,
  stripe_price_id
)
VALUES (
  'Premium Complet',
  'Accès illimité à TOUTES les fonctionnalités et extensions de DentalCloud',
  99.99,
  'premium_complete',
  true,
  2,
  jsonb_build_array(
    'TOUT du Plan Standard inclus',
    'Gestion illimitée des employés',
    'Système complet de gestion des ressources',
    'Gestion avancée des lots (batches)',
    'Tableau de bord analytique avancé',
    'Exports et rapports personnalisés',
    'Toutes les futures extensions incluses',
    'Support prioritaire 24/7',
    'Formation personnalisée'
  ),
  true,
  NULL
)
ON CONFLICT DO NOTHING;

-- Ajouter une contrainte pour s'assurer qu'il n'y a qu'un seul plan premium_complete actif
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_premium_complete
  ON subscription_plans(plan_type) 
  WHERE is_active = true AND plan_type = 'premium_complete';

-- Ajouter une contrainte pour s'assurer qu'il n'y a qu'un seul plan standard actif
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_standard
  ON subscription_plans(plan_type) 
  WHERE is_active = true AND plan_type = 'standard';

-- Commentaires
COMMENT ON COLUMN subscription_plans.unlocks_all_extensions IS 'Si true, ce plan débloque TOUTES les extensions sans avoir à les acheter individuellement';
COMMENT ON COLUMN subscription_plans.plan_type IS 'Type du plan: standard (fonctionnalités de base) ou premium_complete (toutes les extensions)';
COMMENT ON COLUMN subscription_plans.display_order IS 'Ordre d''affichage dans l''interface (1 = premier)';
