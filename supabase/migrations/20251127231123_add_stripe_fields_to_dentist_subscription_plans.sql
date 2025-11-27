/*
  # Add Stripe integration fields to dentist subscription plans
  
  1. Changes
    - Add stripe_price_id_monthly column for Stripe monthly price ID
    - Add stripe_price_id_yearly column for Stripe yearly price ID
    - Add price_yearly column for yearly pricing
    - Add is_active column to enable/disable plans
    - Add display_order column for sorting
  
  2. Notes
    - Stripe price IDs will need to be configured manually in Stripe dashboard
    - Yearly pricing typically offers a discount (e.g., 10 months for price of 12)
*/

-- Add Stripe integration columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dentist_subscription_plans' AND column_name = 'stripe_price_id_monthly'
  ) THEN
    ALTER TABLE dentist_subscription_plans ADD COLUMN stripe_price_id_monthly text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dentist_subscription_plans' AND column_name = 'stripe_price_id_yearly'
  ) THEN
    ALTER TABLE dentist_subscription_plans ADD COLUMN stripe_price_id_yearly text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dentist_subscription_plans' AND column_name = 'price_yearly'
  ) THEN
    ALTER TABLE dentist_subscription_plans ADD COLUMN price_yearly numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dentist_subscription_plans' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE dentist_subscription_plans ADD COLUMN is_active boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dentist_subscription_plans' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE dentist_subscription_plans ADD COLUMN display_order integer DEFAULT 0;
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN dentist_subscription_plans.stripe_price_id_monthly IS 'Stripe Price ID for monthly billing';
COMMENT ON COLUMN dentist_subscription_plans.stripe_price_id_yearly IS 'Stripe Price ID for yearly billing';
COMMENT ON COLUMN dentist_subscription_plans.price_yearly IS 'Yearly subscription price (typically 10-12 months worth)';
COMMENT ON COLUMN dentist_subscription_plans.is_active IS 'Whether this plan is available for new subscriptions';
COMMENT ON COLUMN dentist_subscription_plans.display_order IS 'Order to display plans (lower numbers first)';
