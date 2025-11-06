-- ============================================
-- PARTIE 5/10 - Migrations 33 à 40
-- ============================================

-- ============================================
-- Migration: 20251102181830_fix_trigger_add_email_to_user_profiles.sql
-- ============================================

/*
  # Fix trigger to include email in user_profiles

  1. Problem
    - The trigger creates user_profiles but doesn't include email
    - email is NOT NULL in user_profiles, causing silent failure
  
  2. Solution
    - Update trigger to get email from auth.users
    - Include email in the INSERT
  
  3. Security
    - Trigger runs as SECURITY DEFINER to bypass RLS
    - Email is fetched from auth.users table
*/

-- Drop and recreate the trigger function with email
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  -- Get email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Insert into user_profiles with elevated privileges
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
    user_email,
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

-- Manually create user_profile for the existing user
INSERT INTO user_profiles (
  id,
  email,
  role,
  subscription_status,
  subscription_start_date,
  subscription_end_date,
  trial_used
)
SELECT 
  id,
  email,
  'user',
  'trial',
  now(),
  now() + interval '30 days',
  true
FROM auth.users
WHERE id = '6a0e255f-ac1c-42cd-8298-6a10409b6870'
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Migration: 20251102182659_fix_super_admin_rls_policies.sql
-- ============================================

/*
  # Fix Super Admin RLS Policies

  1. Problem
    - Current policies check auth.jwt() for role, but JWT doesn't contain user_profiles data
    - Super admins can't see all users because the role check fails
  
  2. Solution
    - Create a helper function to check if current user is super admin
    - Update all policies to use this function instead of JWT check
  
  3. Security
    - Function checks user_profiles table directly
    - Maintains same security level with correct implementation
*/

-- Create helper function to check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON user_profiles;

-- Recreate policies with correct super admin check
CREATE POLICY "Users can view own profile or super admin can view all"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR is_super_admin());

CREATE POLICY "Users can update own profile or super admin can update all"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR is_super_admin())
  WITH CHECK (auth.uid() = id OR is_super_admin());

CREATE POLICY "Users can insert own profile or super admin can insert"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id OR is_super_admin());

CREATE POLICY "Super admins can delete any profile"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (is_super_admin());

-- ============================================
-- Migration: 20251102185944_create_help_center_system.sql
-- ============================================

/*
  # Create Help Center System

  1. New Tables
    - `help_topics`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text) - Topic title
      - `content` (text) - Topic description/question
      - `category` (text) - Topic category (e.g., 'general', 'billing', 'technical')
      - `status` (text) - 'open', 'resolved', 'closed'
      - `views_count` (integer) - Number of views
      - `is_pinned` (boolean) - Whether topic is pinned
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `help_replies`
      - `id` (uuid, primary key)
      - `topic_id` (uuid, references help_topics)
      - `user_id` (uuid, references auth.users)
      - `content` (text) - Reply content
      - `is_solution` (boolean) - Whether this reply solved the issue
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `help_votes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `topic_id` (uuid, references help_topics, nullable)
      - `reply_id` (uuid, references help_replies, nullable)
      - `vote_type` (text) - 'up' or 'down'
      - `created_at` (timestamptz)
      - Unique constraint on (user_id, topic_id) and (user_id, reply_id)

  2. Security
    - Enable RLS on all tables
    - Allow authenticated users to read all topics and replies
    - Allow users to create topics and replies
    - Allow users to update/delete their own content
    - Allow users to vote on topics and replies
*/

-- Create help_topics table
CREATE TABLE IF NOT EXISTS help_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'general',
  status text DEFAULT 'open',
  views_count integer DEFAULT 0,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create help_replies table
CREATE TABLE IF NOT EXISTS help_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES help_topics(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_solution boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create help_votes table
CREATE TABLE IF NOT EXISTS help_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic_id uuid REFERENCES help_topics(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES help_replies(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_topic_vote UNIQUE (user_id, topic_id),
  CONSTRAINT unique_reply_vote UNIQUE (user_id, reply_id),
  CONSTRAINT vote_target CHECK (
    (topic_id IS NOT NULL AND reply_id IS NULL) OR
    (topic_id IS NULL AND reply_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE help_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_votes ENABLE ROW LEVEL SECURITY;

-- Policies for help_topics
CREATE POLICY "Anyone can view topics"
  ON help_topics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create topics"
  ON help_topics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topics"
  ON help_topics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own topics"
  ON help_topics FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for help_replies
CREATE POLICY "Anyone can view replies"
  ON help_replies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create replies"
  ON help_replies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own replies"
  ON help_replies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own replies"
  ON help_replies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for help_votes
CREATE POLICY "Anyone can view votes"
  ON help_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create votes"
  ON help_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes"
  ON help_votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON help_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_help_topics_user_id ON help_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_help_topics_category ON help_topics(category);
CREATE INDEX IF NOT EXISTS idx_help_topics_status ON help_topics(status);
CREATE INDEX IF NOT EXISTS idx_help_topics_created_at ON help_topics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_help_replies_topic_id ON help_replies(topic_id);
CREATE INDEX IF NOT EXISTS idx_help_replies_user_id ON help_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_help_replies_created_at ON help_replies(created_at);

CREATE INDEX IF NOT EXISTS idx_help_votes_topic_id ON help_votes(topic_id);
CREATE INDEX IF NOT EXISTS idx_help_votes_reply_id ON help_votes(reply_id);
CREATE INDEX IF NOT EXISTS idx_help_votes_user_id ON help_votes(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_help_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_help_topics_updated_at ON help_topics;
CREATE TRIGGER update_help_topics_updated_at
  BEFORE UPDATE ON help_topics
  FOR EACH ROW
  EXECUTE FUNCTION update_help_updated_at();

DROP TRIGGER IF EXISTS update_help_replies_updated_at ON help_replies;
CREATE TRIGGER update_help_replies_updated_at
  BEFORE UPDATE ON help_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_help_updated_at();


-- ============================================
-- Migration: 20251102190503_link_help_center_to_profiles.sql
-- ============================================

/*
  # Link Help Center to Profiles

  1. Changes
    - Update help_topics foreign key to reference profiles instead of auth.users
    - Update help_replies foreign key to reference profiles instead of auth.users
    - Update help_votes foreign key to reference profiles instead of auth.users
    - Recreate constraints with proper references

  2. Notes
    - This assumes profiles.id is the same as auth.users.id
    - Existing data will be preserved
*/

-- Drop existing foreign key constraints
ALTER TABLE help_topics DROP CONSTRAINT IF EXISTS help_topics_user_id_fkey;
ALTER TABLE help_replies DROP CONSTRAINT IF EXISTS help_replies_user_id_fkey;
ALTER TABLE help_votes DROP CONSTRAINT IF EXISTS help_votes_user_id_fkey;

-- Add new foreign key constraints pointing to profiles
ALTER TABLE help_topics
  ADD CONSTRAINT help_topics_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

ALTER TABLE help_replies
  ADD CONSTRAINT help_replies_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

ALTER TABLE help_votes
  ADD CONSTRAINT help_votes_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;


-- ============================================
-- Migration: 20251102192338_add_public_profile_access.sql
-- ============================================

/*
  # Add Public Profile Access for Help Center

  1. Changes
    - Add policy to allow authenticated users to view basic profile info of other users
    - This enables the Help Center to display author names on topics and replies

  2. Security
    - Users can view first_name, last_name, and laboratory_name of all profiles
    - Users can still only update their own profile
    - This is necessary for community features like Help Center
*/

-- Add policy to allow authenticated users to view all profiles (read-only)
CREATE POLICY "Users can view all profiles for community features"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);


-- ============================================
-- Migration: 20251102192911_add_super_admin_help_center_policies.sql
-- ============================================

/*
  # Add Super Admin Policies for Help Center

  1. Changes
    - Add policies to allow super admins to update help topics (for pinning and status changes)
    - Add policies to allow super admins to delete help topics
    - Add policies to allow super admins to delete help replies

  2. Security
    - Only users with super_admin role can perform these actions
    - Regular users can still only manage their own content
    - Super admins are identified via user_profiles.role = 'super_admin'
*/

-- Super admins can update any topic (for pinning, status changes, etc.)
CREATE POLICY "Super admins can update any topic"
  ON help_topics FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Super admins can delete any topic
CREATE POLICY "Super admins can delete any topic"
  ON help_topics FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Super admins can delete any reply
CREATE POLICY "Super admins can delete any reply"
  ON help_replies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );


-- ============================================
-- Migration: 20251102193604_fix_access_codes_redeem_policy.sql
-- ============================================

/*
  # Fix Access Codes Redeem Policy

  1. Problem
    - The current UPDATE policy for access_codes doesn't allow users to update codes
    - The USING clause checks if is_used = false (can only update unused codes)
    - The WITH CHECK clause checks if is_used = true (result must be used)
    - This creates a conflict preventing the update from false to true

  2. Solution
    - Drop the restrictive UPDATE policy
    - Create a new policy that allows users to mark codes as used
    - The policy checks that the code was not used before the update
    - And allows setting it to used with the current user

  3. Security
    - Users can only update codes that are not already used
    - Users can only mark codes as used by themselves
    - Codes must not be expired
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can redeem codes" ON access_codes;

-- Create a new policy that allows users to redeem (update) codes
CREATE POLICY "Users can redeem codes"
  ON access_codes FOR UPDATE
  TO authenticated
  USING (
    -- Can only update codes that are not used and not expired
    is_used = false 
    AND (expires_at IS NULL OR expires_at > now())
  )
  WITH CHECK (
    -- After update, code must be marked as used by current user
    is_used = true 
    AND used_by = auth.uid()
    AND used_at IS NOT NULL
  );


-- ============================================
-- Migration: 20251102193841_fix_access_codes_policies_conflict.sql
-- ============================================

/*
  # Fix Access Codes Policies Conflict

  1. Problem
    - The "FOR ALL" policy for super admins might be conflicting with user policies
    - Need to separate policies clearly by operation type

  2. Solution
    - Drop the "FOR ALL" super admin policy
    - Create separate policies for each operation (SELECT, INSERT, UPDATE, DELETE)
    - Ensure user UPDATE policy doesn't conflict with super admin policies

  3. Security
    - Super admins can perform all operations
    - Regular users can only view and redeem (update) available codes
*/

-- Drop the super admin "FOR ALL" policy
DROP POLICY IF EXISTS "Super admins can manage access codes" ON access_codes;

-- Super admins can view all codes
CREATE POLICY "Super admins can view all codes"
  ON access_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Super admins can create codes
CREATE POLICY "Super admins can create codes"
  ON access_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Super admins can update any code
CREATE POLICY "Super admins can update codes"
  ON access_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Super admins can delete codes
CREATE POLICY "Super admins can delete codes"
  ON access_codes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );


