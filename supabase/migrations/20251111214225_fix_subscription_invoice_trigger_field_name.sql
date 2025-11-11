/*
  # Fix subscription invoice trigger field name

  1. Changes
    - Update `create_subscription_invoice()` function to use correct field name
    - Change `subscription_starts_at` to `subscription_start_date`
    - This fixes the error when updating user_profiles subscription data
*/

CREATE OR REPLACE FUNCTION public.create_subscription_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
     NEW.subscription_end_date IS NOT NULL THEN

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

    -- Calculate period dates - use correct field name
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
$function$;
