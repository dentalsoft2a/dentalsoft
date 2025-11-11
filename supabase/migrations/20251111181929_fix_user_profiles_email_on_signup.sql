/*
  # Fix user_profiles email on signup

  1. Changes
    - Update trigger to populate email field in user_profiles from auth.users
    - This ensures new users have their email in user_profiles table

  2. Security
    - Uses SECURITY DEFINER to access auth.users
*/

-- Update function to include email from auth.users
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  -- Get email from auth.users
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Create user_profile entry with trial and email
  INSERT INTO user_profiles (
    id,
    email,
    role,
    subscription_status,
    subscription_start_date,
    subscription_end_date,
    trial_used
  ) VALUES (
    NEW.id,
    COALESCE(v_email, ''),
    'user',
    'trial',
    now(),
    now() + interval '30 days',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update existing user_profiles to have correct email
UPDATE user_profiles up
SET email = au.email
FROM auth.users au
WHERE up.id = au.id
  AND (up.email IS NULL OR up.email = '' OR up.email != au.email);
