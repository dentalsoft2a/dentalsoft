/*
  # Consolidate all auth.users triggers into one

  1. Changes
    - Remove all existing triggers on auth.users
    - Create ONE single trigger that handles both profiles and user_profiles
    - Employees get user_profiles but NOT profiles
    - Laboratory owners get BOTH profiles and user_profiles
  
  2. Security
    - Uses SECURITY DEFINER
    - No changes to RLS policies
*/

-- Drop ALL existing triggers on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_user_profile_from_auth_trigger ON auth.users;
DROP TRIGGER IF EXISTS create_user_profile_trigger ON profiles;

-- Create ONE consolidated function
CREATE OR REPLACE FUNCTION public.handle_auth_user_creation()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_employee boolean;
BEGIN
  -- Check if this is an employee
  is_employee := (NEW.raw_user_meta_data->>'is_employee')::boolean;
  
  -- ALWAYS create user_profile for everyone
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
    COALESCE(NEW.email, ''),
    'user',
    'trial',
    now(),
    now() + interval '30 days',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Only create profile if this is NOT an employee
  IF NOT COALESCE(is_employee, false) THEN
    INSERT INTO public.profiles (
      id,
      first_name,
      last_name,
      laboratory_name
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'laboratory_name', '')
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create ONE trigger on auth.users
CREATE TRIGGER handle_auth_user_creation_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_creation();