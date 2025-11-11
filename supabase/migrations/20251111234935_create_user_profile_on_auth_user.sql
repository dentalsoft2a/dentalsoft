/*
  # Create user_profile directly from auth.users

  1. Changes
    - Add trigger on auth.users to create user_profile for ALL users (employees included)
    - This ensures employees get a user_profile even without a profiles entry
  
  2. Security
    - Uses SECURITY DEFINER to access auth schema
    - No changes to existing RLS policies
*/

-- Create function to create user_profile from auth.users directly
CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create user_profile entry for ALL new auth users
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
    COALESCE(NEW.email, ''),
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

-- Drop the old trigger if it exists (attached to profiles)
DROP TRIGGER IF EXISTS create_user_profile_trigger ON profiles;

-- Create trigger on auth.users to create user_profile for everyone
DROP TRIGGER IF EXISTS create_user_profile_from_auth_trigger ON auth.users;
CREATE TRIGGER create_user_profile_from_auth_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_profile_from_auth();