/*
  # Add Tax Rate Configuration to Company Settings

  ## Overview
  Add tax rate configuration to company settings so it can be managed from super admin panel.
  The subscription price is already in TTC, we need to calculate HT based on the configured tax rate.

  ## Changes
  1. Add tax_rate column to company_settings
    - Default value: 20.00 (20% TVA in France)
    - Used to calculate HT from TTC prices

  2. Update trigger function to use configured tax rate
    - Calculate HT from TTC: HT = TTC / (1 + tax_rate/100)
    - Use the tax rate from company_settings
*/

-- Add tax_rate column to company_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'tax_rate'
  ) THEN
    ALTER TABLE company_settings ADD COLUMN tax_rate decimal(5, 2) DEFAULT 20.00;
  END IF;
END $$;

-- Update the trigger function to calculate HT from TTC properly
CREATE OR REPLACE FUNCTION create_subscription_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invoice_num text;
  subscription_price decimal;
  tax_rate_value decimal;
  amount_ht decimal;
  amount_ttc decimal;
  start_date date;
  end_date date;
BEGIN
  -- Only create invoice if subscription status changed to 'active' and payment is made
  IF NEW.subscription_status = 'active' AND 
     (OLD.subscription_status IS NULL OR OLD.subscription_status != 'active') AND
     NEW.subscription_ends_at IS NOT NULL THEN

    -- Get subscription price from settings (this is TTC)
    SELECT price_monthly INTO subscription_price
    FROM subscription_plans
    LIMIT 1;

    IF subscription_price IS NULL THEN
      subscription_price := 59.99; -- Default price TTC
    END IF;

    -- Get tax rate from company settings
    SELECT tax_rate INTO tax_rate_value
    FROM company_settings
    WHERE id = '00000000-0000-0000-0000-000000000001';

    IF tax_rate_value IS NULL THEN
      tax_rate_value := 20.00; -- Default 20% TVA
    END IF;

    -- Calculate amounts: price is TTC, we need to calculate HT
    amount_ttc := subscription_price;
    amount_ht := ROUND(subscription_price / (1 + tax_rate_value/100), 2);

    -- Calculate period dates
    start_date := COALESCE(NEW.subscription_starts_at, now())::date;
    end_date := NEW.subscription_ends_at::date;

    -- Generate invoice number
    invoice_num := generate_subscription_invoice_number();

    -- Insert invoice
    INSERT INTO subscription_invoices (
      invoice_number,
      user_id,
      amount_ht,
      tax_rate,
      amount_ttc,
      period_start,
      period_end,
      payment_method,
      payment_status,
      issued_at,
      paid_at
    ) VALUES (
      invoice_num,
      NEW.id,
      amount_ht,
      tax_rate_value,
      amount_ttc,
      start_date,
      end_date,
      'card',
      'paid',
      now(),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;
