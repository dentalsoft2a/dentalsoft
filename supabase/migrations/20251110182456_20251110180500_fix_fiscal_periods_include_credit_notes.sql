/*
  # Fix fiscal periods calculation to include credit notes

  1. Modifications
    - Add `credit_notes_count` column to track number of credit notes
    - Add `credit_notes_total` column to track total amount of credit notes
    - Add `net_revenue` column to show revenue after credit notes deduction
    - Add `net_tax` column to show tax after credit notes deduction
    
  2. Function Updates
    - Modify `create_fiscal_periods_for_month` to calculate credit notes statistics
    - Subtract credit note amounts from totals to show net amounts
    - Track both gross and net values for transparency
    
  3. Important Notes
    - `total_revenue` and `total_tax` now represent GROSS amounts (invoices only)
    - `net_revenue` and `net_tax` represent NET amounts (after credit notes)
    - This provides full transparency and traceability for accounting
*/

-- Add new columns to fiscal_periods table
ALTER TABLE fiscal_periods 
  ADD COLUMN IF NOT EXISTS credit_notes_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_notes_total DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_revenue DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_tax DECIMAL(12,2) DEFAULT 0;

-- Create improved function that includes credit notes
CREATE OR REPLACE FUNCTION create_fiscal_periods_for_month(
  p_laboratory_id UUID, 
  p_year INTEGER, 
  p_month INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
  v_period_id UUID;
  v_invoice_stats RECORD;
  v_credit_note_stats RECORD;
  v_net_revenue DECIMAL(12,2);
  v_net_tax DECIMAL(12,2);
BEGIN
  -- Calculate period boundaries
  v_period_start := make_date(p_year, p_month, 1);
  v_period_end := (v_period_start + INTERVAL '1 month' - INTERVAL '1 day')::date;

  -- Calculate invoice statistics (GROSS amounts)
  SELECT 
    COUNT(*) as count, 
    COALESCE(SUM(total - tax_amount), 0) as revenue,
    COALESCE(SUM(tax_amount), 0) as tax
  INTO v_invoice_stats 
  FROM invoices
  WHERE user_id = p_laboratory_id 
    AND date BETWEEN v_period_start AND v_period_end 
    AND status != 'draft';

  -- Calculate credit note statistics (amounts to SUBTRACT)
  SELECT 
    COUNT(*) as count,
    COALESCE(SUM(total), 0) as total_amount,
    COALESCE(SUM(subtotal), 0) as revenue,
    COALESCE(SUM(tax_amount), 0) as tax
  INTO v_credit_note_stats
  FROM credit_notes
  WHERE user_id = p_laboratory_id 
    AND date BETWEEN v_period_start AND v_period_end;

  -- Calculate NET amounts (invoices - credit notes)
  v_net_revenue := v_invoice_stats.revenue - COALESCE(v_credit_note_stats.revenue, 0);
  v_net_tax := v_invoice_stats.tax - COALESCE(v_credit_note_stats.tax, 0);

  -- Insert or update fiscal period with complete statistics
  INSERT INTO fiscal_periods (
    laboratory_id, 
    period_type, 
    period_start, 
    period_end, 
    status,
    invoices_count, 
    total_revenue, 
    total_tax,
    credit_notes_count,
    credit_notes_total,
    net_revenue,
    net_tax
  )
  VALUES (
    p_laboratory_id, 
    'month', 
    v_period_start, 
    v_period_end, 
    'open',
    v_invoice_stats.count, 
    v_invoice_stats.revenue, 
    v_invoice_stats.tax,
    COALESCE(v_credit_note_stats.count, 0),
    COALESCE(v_credit_note_stats.total_amount, 0),
    v_net_revenue,
    v_net_tax
  )
  ON CONFLICT (laboratory_id, period_start, period_end, period_type)
  DO UPDATE SET 
    invoices_count = v_invoice_stats.count, 
    total_revenue = v_invoice_stats.revenue,
    total_tax = v_invoice_stats.tax,
    credit_notes_count = COALESCE(v_credit_note_stats.count, 0),
    credit_notes_total = COALESCE(v_credit_note_stats.total_amount, 0),
    net_revenue = v_net_revenue,
    net_tax = v_net_tax,
    updated_at = now()
  RETURNING id INTO v_period_id;

  RETURN v_period_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing periods to calculate credit notes retroactively
DO $$
DECLARE
  v_period RECORD;
  v_credit_note_stats RECORD;
  v_net_revenue DECIMAL(12,2);
  v_net_tax DECIMAL(12,2);
BEGIN
  FOR v_period IN 
    SELECT id, laboratory_id, period_start, period_end, total_revenue, total_tax
    FROM fiscal_periods
  LOOP
    -- Calculate credit notes for this period
    SELECT 
      COUNT(*) as count,
      COALESCE(SUM(total), 0) as total_amount,
      COALESCE(SUM(subtotal), 0) as revenue,
      COALESCE(SUM(tax_amount), 0) as tax
    INTO v_credit_note_stats
    FROM credit_notes
    WHERE user_id = v_period.laboratory_id 
      AND date BETWEEN v_period.period_start AND v_period.period_end;
    
    -- Calculate net amounts
    v_net_revenue := v_period.total_revenue - COALESCE(v_credit_note_stats.revenue, 0);
    v_net_tax := v_period.total_tax - COALESCE(v_credit_note_stats.tax, 0);
    
    -- Update the period
    UPDATE fiscal_periods
    SET 
      credit_notes_count = COALESCE(v_credit_note_stats.count, 0),
      credit_notes_total = COALESCE(v_credit_note_stats.total_amount, 0),
      net_revenue = v_net_revenue,
      net_tax = v_net_tax,
      updated_at = now()
    WHERE id = v_period.id;
  END LOOP;
END $$;
