/*
  # Fix Subscription Invoice Price V2

  Corrects the subscription invoice calculation - the price_monthly is TTC not HT.
  We need to calculate HT from TTC.

  ## Changes
  - Update calculation: amount_ttc = subscription_price (which is already TTC)
  - Update calculation: amount_ht = amount_ttc / (1 + tax_rate/100)
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_create_subscription_invoice ON user_profiles;

-- Update function to calculate HT from TTC price
CREATE OR REPLACE FUNCTION create_subscription_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invoice_num text;
  subscription_price decimal;
  amount_ht decimal;
  amount_ttc decimal;
  start_date date;
  end_date date;
  tax_rate_value decimal;
BEGIN
  -- Only create invoice if subscription status changed to 'active' and payment is made
  IF NEW.subscription_status = 'active' AND
     (OLD.subscription_status IS NULL OR OLD.subscription_status != 'active') AND
     NEW.subscription_end_date IS NOT NULL THEN

    -- Get subscription price from the actual plan subscribed
    IF NEW.subscription_plan_id IS NOT NULL THEN
      SELECT price_monthly INTO subscription_price
      FROM subscription_plans
      WHERE id = NEW.subscription_plan_id;
    END IF;

    -- Fallback to default price if no plan found
    IF subscription_price IS NULL THEN
      subscription_price := 59.99;
    END IF;

    -- Get tax rate from company settings
    SELECT COALESCE(tax_rate, 20.00) INTO tax_rate_value
    FROM company_settings
    WHERE id = '00000000-0000-0000-0000-000000000001';

    IF tax_rate_value IS NULL THEN
      tax_rate_value := 20.00;
    END IF;

    -- Calculate amounts (subscription_price is TTC, we need to calculate HT)
    -- HT = TTC / (1 + tax_rate/100)
    amount_ttc := subscription_price;
    amount_ht := subscription_price / (1 + tax_rate_value / 100);

    -- Calculate period dates
    start_date := COALESCE(NEW.subscription_start_date, now())::date;
    end_date := NEW.subscription_end_date::date;

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

-- Recreate trigger
CREATE TRIGGER trigger_create_subscription_invoice
  AFTER INSERT OR UPDATE OF subscription_status, subscription_end_date ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_subscription_invoice();
