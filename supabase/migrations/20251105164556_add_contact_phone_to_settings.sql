/*
  # Add contact phone number to settings

  1. Changes
    - Add `contact_phone` column to `smtp_settings` table to store the company contact phone number
    - This phone number will be displayed on the landing page and support page
    - Default value is empty string, can be updated by super admin

  2. Security
    - No RLS changes needed as smtp_settings already has proper RLS policies for super admin access
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'smtp_settings' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE smtp_settings ADD COLUMN contact_phone text DEFAULT '';
  END IF;
END $$;
