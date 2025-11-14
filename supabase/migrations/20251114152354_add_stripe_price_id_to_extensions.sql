/*
  # Ajouter Stripe Price ID aux extensions
  
  Cette migration ajoute les champs nécessaires pour intégrer Stripe
  aux extensions individuelles.
  
  ## Modifications
  
  1. Ajout de Colonnes
    - `stripe_price_id` (text) - ID du prix récurrent Stripe
    - `stripe_product_id` (text) - ID du produit Stripe
  
  2. Index
    - Index sur stripe_price_id pour les recherches rapides
  
  ## Utilisation
  
  Ces champs permettent de lier chaque extension à un produit Stripe
  pour gérer les paiements récurrents automatiquement.
*/

-- Ajouter les colonnes Stripe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'extensions' AND column_name = 'stripe_price_id'
  ) THEN
    ALTER TABLE extensions 
    ADD COLUMN stripe_price_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'extensions' AND column_name = 'stripe_product_id'
  ) THEN
    ALTER TABLE extensions 
    ADD COLUMN stripe_product_id text;
  END IF;
END $$;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_extensions_stripe_price 
  ON extensions(stripe_price_id);

-- Commentaires
COMMENT ON COLUMN extensions.stripe_price_id IS 'ID du prix récurrent Stripe pour cette extension';
COMMENT ON COLUMN extensions.stripe_product_id IS 'ID du produit Stripe pour cette extension';
