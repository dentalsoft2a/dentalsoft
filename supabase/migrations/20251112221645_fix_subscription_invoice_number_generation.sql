/*
  # Fix Subscription Invoice Number Generation with RLS
  
  This migration creates a secure function to generate unique subscription invoice numbers
  that bypasses RLS restrictions to ensure global uniqueness.
  
  1. New Function
    - `generate_next_subscription_invoice_number()` - Returns the next available subscription invoice number
      - Runs with SECURITY DEFINER to bypass RLS
      - Ensures global uniqueness across all users
      - Returns format: SUB-YYYY-NNNN
  
  2. Security
    - Function is SECURITY DEFINER but only performs read operations
    - No user input is used in the query (SQL injection safe)
    - Only returns the next number, doesn't create records
*/

-- Drop function if exists
DROP FUNCTION IF EXISTS generate_next_subscription_invoice_number();

-- Create function to generate next subscription invoice number (bypasses RLS)
CREATE OR REPLACE FUNCTION generate_next_subscription_invoice_number()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  current_year TEXT;
  max_number INTEGER;
  next_number INTEGER;
  result TEXT;
BEGIN
  -- Get current year
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Find the highest number for this year (bypasses RLS with SECURITY DEFINER)
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(invoice_number FROM 'SUB-[0-9]{4}-([0-9]+)') 
        AS INTEGER
      )
    ),
    0
  )
  INTO max_number
  FROM subscription_invoices
  WHERE invoice_number LIKE 'SUB-' || current_year || '-%';
  
  -- Calculate next number
  next_number := max_number + 1;
  
  -- Format result
  result := 'SUB-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION generate_next_subscription_invoice_number() TO authenticated;