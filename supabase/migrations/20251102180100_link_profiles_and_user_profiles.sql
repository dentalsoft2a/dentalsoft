/*
  # Link profiles and user_profiles tables

  1. Changes
    - Create trigger to automatically create user_profiles entry when profiles is created
    - Ensure new users get their 30-day trial automatically
  
  2. Notes
    - When a profile is created (during signup), a user_profile is also created
    - The trigger from previous migration handles trial assignment
    - This ensures seamless integration between authentication and subscription systems
*/

-- Function to create user_profile when profile is created
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user_profile entry with trial
  INSERT INTO user_profiles (
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user_profile when profile is created
DROP TRIGGER IF EXISTS create_user_profile_trigger ON profiles;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile_on_signup();

-- Ensure existing profiles have user_profiles
INSERT INTO user_profiles (
  id,
  role,
  subscription_status,
  subscription_start_date,
  subscription_end_date,
  trial_used
)
SELECT 
  p.id,
  'user',
  'trial',
  now(),
  now() + interval '30 days',
  true
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.id = p.id
)
ON CONFLICT (id) DO NOTHING;