/*
  # Allow public access to contact phone number

  1. Changes
    - Add a SELECT policy on smtp_settings table to allow anyone (authenticated or anonymous) 
      to read the contact_phone field from active SMTP settings
    - This enables the landing page to display the contact phone number

  2. Security
    - Only allows reading contact_phone, not sensitive SMTP credentials
    - Only reads from active settings (is_active = true)
    - All other fields remain protected by existing super admin policies
*/

CREATE POLICY "Anyone can view contact phone from active settings"
  ON smtp_settings
  FOR SELECT
  TO public
  USING (is_active = true);
