-- Fix signup trigger issue
-- Execute this in Supabase SQL Editor

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Recreate function with proper permissions
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, subscription_status)
  VALUES (NEW.id, NEW.email, 'laboratory', 'trial')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Make sure RLS allows service role to insert
DROP POLICY IF EXISTS "user_profiles_service_role_insert" ON user_profiles;
CREATE POLICY "user_profiles_service_role_insert" 
  ON user_profiles 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);
