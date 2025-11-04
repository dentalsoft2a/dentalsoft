/*
  # Fix Duplicate Triggers Causing 500 Error on Signup

  1. Problem
    - Two triggers on profiles table both try to create user_profiles
    - `create_user_profile_trigger` calls `create_user_profile_on_signup()`
    - `on_profile_created` calls `create_user_profile_on_profile_insert()`
    - This causes conflicts and 500 errors during signup
  
  2. Solution
    - Keep only ONE trigger: `create_user_profile_trigger`
    - Drop the duplicate trigger `on_profile_created`
    - Drop the unused function `create_user_profile_on_profile_insert()`
    - Ensure the remaining function works correctly with SECURITY DEFINER
  
  3. Final Flow
    - User signs up → auth.users entry created
    - App inserts into profiles table
    - Single trigger creates user_profiles entry
    - RLS allows trigger to bypass restrictions via SECURITY DEFINER
*/

-- Drop the duplicate trigger
DROP TRIGGER IF EXISTS on_profile_created ON profiles;

-- Drop the unused function
DROP FUNCTION IF EXISTS create_user_profile_on_profile_insert();

-- Ensure the correct function exists and is properly configured
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  -- Get email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Insert into user_profiles with elevated privileges
  INSERT INTO public.user_profiles (
    id,
    email,
    role,
    subscription_status,
    subscription_start_date,
    subscription_end_date,
    trial_used
  ) VALUES (
    NEW.id,
    user_email,
    'user',
    'trial',
    now(),
    now() + interval '30 days',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the profile creation
    RAISE WARNING 'Error creating user_profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS create_user_profile_trigger ON profiles;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile_on_signup();
