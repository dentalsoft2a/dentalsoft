/*
  # Remove obsolete trigger on auth.users

  1. Problem
    - There's a trigger on auth.users that tries to insert into user_profiles
    - This trigger fails due to RLS policies and blocks user signup
    - We already have a proper trigger on profiles table
  
  2. Solution
    - Drop the trigger on auth.users
    - Drop the obsolete function
    - Keep only the trigger on profiles table that creates user_profiles
  
  3. Flow after this fix
    - User signs up → auth.users entry created ✅
    - App inserts into profiles ✅
    - Trigger on profiles creates user_profiles ✅
*/

-- Drop the problematic trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the obsolete function
DROP FUNCTION IF EXISTS create_user_profile();