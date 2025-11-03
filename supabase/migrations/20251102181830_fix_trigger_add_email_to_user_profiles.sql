/*
  # Fix trigger to include email in user_profiles

  1. Problem
    - The trigger creates user_profiles but doesn't include email
    - email is NOT NULL in user_profiles, causing silent failure
  
  2. Solution
    - Update trigger to get email from auth.users
    - Include email in the INSERT
  
  3. Security
    - Trigger runs as SECURITY DEFINER to bypass RLS
    - Email is fetched from auth.users table
*/

-- Drop and recreate the trigger function with email
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

-- Manually create user_profile for the existing user
INSERT INTO user_profiles (
  id,
  email,
  role,
  subscription_status,
  subscription_start_date,
  subscription_end_date,
  trial_used
)
SELECT 
  id,
  email,
  'user',
  'trial',
  now(),
  now() + interval '30 days',
  true
FROM auth.users
WHERE id = '6a0e255f-ac1c-42cd-8298-6a10409b6870'
ON CONFLICT (id) DO NOTHING;