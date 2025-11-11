/*
  # Fix trigger to bypass RLS

  1. Changes
    - Recreate trigger function with explicit RLS bypass
    - Use explicit schema qualification
    - Add better error handling
  
  2. Security
    - SECURITY DEFINER allows bypassing RLS (required for triggers)
    - Only affects automatic user creation, not manual operations
*/

-- Recreate function with explicit RLS bypass
CREATE OR REPLACE FUNCTION public.handle_auth_user_creation()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  is_employee boolean;
BEGIN
  -- Check if this is an employee
  is_employee := (NEW.raw_user_meta_data->>'is_employee')::boolean;
  
  -- ALWAYS create user_profile for everyone (bypass RLS)
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
  
  -- Only create profile if this is NOT an employee (bypass RLS)
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
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error in handle_auth_user_creation: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;