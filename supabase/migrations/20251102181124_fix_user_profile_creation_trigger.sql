/*
  # Fix user profile creation trigger to bypass RLS

  1. Changes
    - Drop and recreate the trigger function with proper RLS bypass
    - Use a direct INSERT that bypasses RLS policies
    - The function runs as SECURITY DEFINER with elevated privileges
  
  2. Security
    - The function is secure because it only inserts for NEW.id (the newly created user)
    - It can only be triggered by profile insertions
    - No external input is accepted
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS create_user_profile_trigger ON profiles;
DROP FUNCTION IF EXISTS create_user_profile_on_signup();

-- Create new function that properly bypasses RLS
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into user_profiles with elevated privileges
  -- This bypasses RLS because of SECURITY DEFINER
  INSERT INTO public.user_profiles (
    id,
    role,
    subscription_status,
    subscription_start_date,
    subscription_end_date,
    trial_used
  ) VALUES (
    NEW.id,
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

-- Recreate the trigger
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile_on_signup();

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_user_profile_on_signup() TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile_on_signup() TO anon;