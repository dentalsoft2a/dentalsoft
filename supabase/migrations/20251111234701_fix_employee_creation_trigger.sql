/*
  # Fix Employee Creation - Handle Triggers

  1. Changes
    - Modify handle_new_user trigger to only create profile for laboratory owners
    - Skip profile creation if user_metadata contains 'is_employee' flag
  
  2. Security
    - Maintains existing RLS policies
    - No changes to data access control
*/

-- Drop and recreate the trigger function to handle employees
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create profile if this is NOT an employee
  -- Employees will have 'is_employee' in their metadata
  IF (NEW.raw_user_meta_data->>'is_employee') IS NULL THEN
    -- Insert into profiles (laboratory owner)
    INSERT INTO public.profiles (id, first_name, last_name, laboratory_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'laboratory_name', '')
    );
  END IF;

  RETURN NEW;
END;
$function$;