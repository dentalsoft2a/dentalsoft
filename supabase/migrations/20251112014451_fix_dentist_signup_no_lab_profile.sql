/*
  # Fix Dentist Signup - Prevent Laboratory Profile Creation

  1. Changes
    - Modify handle_auth_user_creation function to check is_dentist flag
    - Dentists (is_dentist = true) should NOT get profiles or user_profiles
    - Dentists only get dentist_accounts (created manually in code)
    - Employees (is_employee = true) get user_profiles only
    - Laboratory owners get both profiles and user_profiles

  2. Security
    - Uses SECURITY DEFINER
    - No changes to RLS policies
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS handle_auth_user_creation_trigger ON auth.users;

-- Recreate function with dentist check
CREATE OR REPLACE FUNCTION public.handle_auth_user_creation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_employee boolean;
  is_dentist boolean;
BEGIN
  -- Check if this is an employee or dentist
  is_employee := (NEW.raw_user_meta_data->>'is_employee')::boolean;
  is_dentist := (NEW.raw_user_meta_data->>'is_dentist')::boolean;

  -- Skip profile creation entirely for dentists
  IF COALESCE(is_dentist, false) THEN
    -- Dentists don't need profiles or user_profiles
    -- They only use dentist_accounts which is created in the application code
    RETURN NEW;
  END IF;

  -- ALWAYS create user_profile for non-dentists
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

-- Recreate trigger
CREATE TRIGGER handle_auth_user_creation_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_creation();
