/*
  # Create quote requests system

  1. New Tables
    - `quote_requests`
      - `id` (uuid, primary key)
      - `laboratory_id` (uuid) - The laboratory receiving the quote request
      - `dentist_account_id` (uuid) - The dentist account making the request
      - `dentist_id` (uuid) - The dentist record in the laboratory's system
      - `patient_name` (text) - Patient name
      - `work_description` (text) - Description of the work
      - `tooth_numbers` (text) - Tooth numbers
      - `shade` (text) - Shade/color
      - `notes` (text) - Additional notes
      - `requested_delivery_date` (date) - Requested delivery date
      - `status` (text) - Status: 'pending', 'approved', 'rejected', 'converted'
      - `rejection_reason` (text) - Reason for rejection if applicable
      - `estimated_price` (decimal) - Estimated price from laboratory
      - `delivery_note_id` (uuid) - Reference to delivery note if converted
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on quote_requests table
    - Dentist accounts can view their own requests
    - Laboratories can view requests sent to them
    - Laboratories can update status and price
*/

-- Create quote_requests table
CREATE TABLE IF NOT EXISTS quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  dentist_account_id uuid NOT NULL REFERENCES dentist_accounts(id) ON DELETE CASCADE,
  dentist_id uuid NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  work_description text NOT NULL,
  tooth_numbers text,
  shade text,
  notes text,
  requested_delivery_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'converted')),
  rejection_reason text,
  estimated_price decimal(10, 2),
  delivery_note_id uuid REFERENCES delivery_notes(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

-- Dentist accounts can view their own quote requests
CREATE POLICY "Dentist accounts can view own quote requests"
  ON quote_requests FOR SELECT
  TO authenticated
  USING (dentist_account_id = auth.uid());

-- Dentist accounts can insert their own quote requests
CREATE POLICY "Dentist accounts can create quote requests"
  ON quote_requests FOR INSERT
  TO authenticated
  WITH CHECK (dentist_account_id = auth.uid());

-- Laboratories can view quote requests sent to them
CREATE POLICY "Laboratories can view their quote requests"
  ON quote_requests FOR SELECT
  TO authenticated
  USING (laboratory_id = auth.uid());

-- Laboratories can update quote requests sent to them
CREATE POLICY "Laboratories can update their quote requests"
  ON quote_requests FOR UPDATE
  TO authenticated
  USING (laboratory_id = auth.uid())
  WITH CHECK (laboratory_id = auth.uid());

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_quote_requests_laboratory_id ON quote_requests(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_dentist_account_id ON quote_requests(dentist_account_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quote_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on changes
DROP TRIGGER IF EXISTS update_quote_requests_updated_at_trigger ON quote_requests;
CREATE TRIGGER update_quote_requests_updated_at_trigger
  BEFORE UPDATE ON quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_requests_updated_at();
