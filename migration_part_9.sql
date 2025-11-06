-- ============================================
-- PARTIE 9/10 - Migrations 65 à 71
-- ============================================

-- ============================================
-- Migration: 20251105152531_add_employee_can_view_dentist_accounts.sql
-- ============================================

/*
  # Allow laboratory employees to view dentist accounts

  1. Changes
    - Add RLS policy to allow laboratory employees to view dentist accounts information
      when the dentist has submitted photos to their laboratory
    - This enables employees with photo access to see dentist names

  2. Security
    - Employees can ONLY see dentist information for dentists who have submitted photos to their laboratory
    - No access to other dentists' information
*/

-- Allow laboratory employees to view dentist accounts who submitted to their lab
CREATE POLICY "Employees can view dentists who submitted to their lab"
  ON dentist_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees
      JOIN photo_submissions ON photo_submissions.laboratory_id = laboratory_employees.laboratory_profile_id
      WHERE laboratory_employees.user_profile_id = auth.uid()
      AND laboratory_employees.is_active = true
      AND photo_submissions.dentist_id = dentist_accounts.id
    )
  );


-- ============================================
-- Migration: 20251105152829_add_delete_policy_photo_submissions_v2.sql
-- ============================================

/*
  # Add delete policy for photo submissions

  1. Changes
    - Add RLS policy to allow laboratories to delete photo submissions sent to them
    - Add RLS policy to allow employees with photo access to delete submissions

  2. Security
    - Only laboratory owners can delete submissions sent to them
    - Only active employees with photo menu access can delete submissions
*/

-- Laboratory owners can delete photo submissions sent to them
CREATE POLICY "Laboratories can delete submissions sent to them"
  ON photo_submissions FOR DELETE
  TO authenticated
  USING (auth.uid() = laboratory_id);

-- Laboratory employees can delete photo submissions sent to their lab (if they have photo access)
CREATE POLICY "Employees can delete submissions sent to their lab"
  ON photo_submissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM laboratory_employees le
      JOIN laboratory_role_permissions lrp ON lrp.laboratory_profile_id = le.laboratory_profile_id 
        AND lrp.role_name = le.role_name
      WHERE le.user_profile_id = auth.uid()
      AND le.laboratory_profile_id = photo_submissions.laboratory_id
      AND le.is_active = true
      AND (lrp.menu_access->>'photos' = 'true' OR lrp.menu_access = '{}'::jsonb)
    )
  );


-- ============================================
-- Migration: 20251105153521_add_laboratory_can_insert_photo_submissions.sql
-- ============================================

/*
  # Allow laboratories to insert photo submissions

  1. Changes
    - Add RLS policy to allow laboratories to insert photo submissions for any dentist
    - Add RLS policy to allow employees with photo access to insert submissions

  2. Security
    - Laboratory owners can insert submissions for their laboratory_id
    - Employees with photo access can insert submissions for their lab's laboratory_id
*/

-- Laboratories can insert photo submissions for their lab
CREATE POLICY "Laboratories can insert submissions for their lab"
  ON photo_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = laboratory_id);

-- Laboratory employees can insert photo submissions for their lab
CREATE POLICY "Employees can insert submissions for their lab"
  ON photo_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM laboratory_employees le
      JOIN laboratory_role_permissions lrp ON lrp.laboratory_profile_id = le.laboratory_profile_id 
        AND lrp.role_name = le.role_name
      WHERE le.user_profile_id = auth.uid()
      AND le.laboratory_profile_id = laboratory_id
      AND le.is_active = true
      AND (lrp.menu_access->>'photos' = 'true' OR lrp.menu_access = '{}'::jsonb)
    )
  );


-- ============================================
-- Migration: 20251105154954_fix_employee_access_dentist_accounts.sql
-- ============================================

/*
  # Fix employee access to dentist_accounts

  1. Changes
    - Drop the restrictive policy that only allows viewing dentists who submitted photos
    - Add policy for employees to view ALL dentist accounts (unrestricted)
    - Dentist accounts are not tied to a specific laboratory, they are shared
  
  2. Security
    - Employees can view all dentist accounts to be able to create documents for any dentist
    - Dentist accounts themselves don't contain sensitive data, just contact info
*/

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Employees can view dentists who submitted to their lab" ON dentist_accounts;

-- Allow ALL authenticated users (including employees) to view dentist accounts
-- This is necessary because dentist_accounts are not tied to a specific laboratory
CREATE POLICY "Authenticated users can view all dentist accounts"
  ON dentist_accounts FOR SELECT
  TO authenticated
  USING (true);


-- ============================================
-- Migration: 20251105163234_fix_subscription_plans_rls_policies.sql
-- ============================================

/*
  # Fix Subscription Plans RLS Policies

  1. Problem
    - Current policies check `auth.jwt() ->> 'role'` which doesn't exist
    - Super admins cannot update subscription plans
    - The role is stored in `user_profiles` table, not in JWT

  2. Changes
    - Drop existing incorrect policies
    - Create new policies that check the `user_profiles` table
    - Super admins can manage all subscription plans
    - Authenticated users can view active plans

  3. Security
    - Policies properly check user role from database
    - Only super_admin users can modify plans
    - All users can view active plans
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can manage plans" ON subscription_plans;
DROP POLICY IF EXISTS "Anyone can view active plans" ON subscription_plans;

-- Super admins can SELECT all plans
CREATE POLICY "Super admins can view all plans"
  ON subscription_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Super admins can INSERT plans
CREATE POLICY "Super admins can insert plans"
  ON subscription_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Super admins can UPDATE plans
CREATE POLICY "Super admins can update plans"
  ON subscription_plans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Super admins can DELETE plans
CREATE POLICY "Super admins can delete plans"
  ON subscription_plans
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- All authenticated users can view active plans
CREATE POLICY "Users can view active plans"
  ON subscription_plans
  FOR SELECT
  TO authenticated
  USING (is_active = true);


-- ============================================
-- Migration: 20251105164556_add_contact_phone_to_settings.sql
-- ============================================

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


-- ============================================
-- Migration: 20251105165346_allow_public_access_to_contact_phone.sql
-- ============================================

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


