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
