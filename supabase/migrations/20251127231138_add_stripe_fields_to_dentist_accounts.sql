/*
  # Add Stripe tracking fields to dentist accounts
  
  1. Changes
    - Add stripe_customer_id to track Stripe customer
    - Add stripe_subscription_id to track active Stripe subscription
    - Add billing_period to track monthly/yearly
  
  2. Notes
    - These fields are populated by Stripe webhooks
    - stripe_customer_id is created on first payment
    - stripe_subscription_id tracks the active subscription
*/

-- Add Stripe tracking columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dentist_accounts' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE dentist_accounts ADD COLUMN stripe_customer_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dentist_accounts' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE dentist_accounts ADD COLUMN stripe_subscription_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dentist_accounts' AND column_name = 'billing_period'
  ) THEN
    ALTER TABLE dentist_accounts ADD COLUMN billing_period text CHECK (billing_period IN ('monthly', 'yearly'));
  END IF;
END $$;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dentist_accounts_stripe_customer_id ON dentist_accounts(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_dentist_accounts_stripe_subscription_id ON dentist_accounts(stripe_subscription_id);

-- Add comments
COMMENT ON COLUMN dentist_accounts.stripe_customer_id IS 'Stripe Customer ID for this dentist';
COMMENT ON COLUMN dentist_accounts.stripe_subscription_id IS 'Active Stripe Subscription ID';
COMMENT ON COLUMN dentist_accounts.billing_period IS 'Billing period: monthly or yearly';
