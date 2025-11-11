/*
  # Create Referral/Affiliation System

  ## Overview
  Create a complete referral system allowing users to share referral codes and earn rewards.
  - Users get 1 month free for each successful referral
  - New users get 15 extra days on top of their trial period when using a referral code

  ## Changes
  1. New Columns in user_profiles
    - `referral_code` (text, unique, not null) - Unique code for each user to share
    - `referred_by_code` (text, nullable) - Code of the user who referred them
    
  2. New Table: referrals
    - `id` (uuid, primary key)
    - `referrer_id` (uuid, foreign key to user_profiles) - User who shared the code
    - `referee_id` (uuid, foreign key to user_profiles) - User who signed up with the code
    - `referral_code` (text) - The code that was used
    - `status` (text) - Status: pending, completed, rewarded
    - `created_at` (timestamptz)
    - `completed_at` (timestamptz) - When the referee became a paying customer
    - `rewarded_at` (timestamptz) - When the referrer received their reward

  3. New Table: referral_rewards
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to user_profiles) - User receiving the reward
    - `referral_id` (uuid, foreign key to referrals) - Related referral
    - `reward_type` (text) - Type: referrer_bonus, referee_bonus
    - `days_added` (integer) - Number of days added to subscription
    - `status` (text) - Status: pending, applied, expired
    - `created_at` (timestamptz)
    - `applied_at` (timestamptz)

  ## Security
  - Enable RLS on all new tables
  - Users can view their own referrals and rewards
  - Super admins can view and manage all referrals and rewards
*/

-- Add referral_code to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN referral_code text UNIQUE;
  END IF;
END $$;

-- Add referred_by_code to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'referred_by_code'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN referred_by_code text;
  END IF;
END $$;

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  referee_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'rewarded')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz DEFAULT now(),
  rewarded_at timestamptz,
  UNIQUE(referee_id)
);

-- Create referral_rewards table
CREATE TABLE IF NOT EXISTS referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  referral_id uuid REFERENCES referrals(id) ON DELETE SET NULL,
  reward_type text NOT NULL CHECK (reward_type IN ('referrer_bonus', 'referee_bonus')),
  days_added integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'expired')),
  created_at timestamptz DEFAULT now(),
  applied_at timestamptz
);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate a random 8-character alphanumeric code
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM user_profiles WHERE referral_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Trigger to auto-generate referral code for new users
CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_generate_referral_code ON user_profiles;
CREATE TRIGGER trigger_auto_generate_referral_code
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_referral_code();

-- Update existing users to have referral codes
UPDATE user_profiles 
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- Make referral_code NOT NULL after populating existing users
ALTER TABLE user_profiles 
ALTER COLUMN referral_code SET NOT NULL;

-- Function to process referral rewards
CREATE OR REPLACE FUNCTION process_referral_rewards(p_referee_id uuid, p_referral_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id uuid;
  v_referral_id uuid;
BEGIN
  -- Find the referrer
  SELECT id INTO v_referrer_id
  FROM user_profiles
  WHERE referral_code = p_referral_code;

  IF v_referrer_id IS NULL THEN
    RETURN;
  END IF;

  -- Don't allow self-referral
  IF v_referrer_id = p_referee_id THEN
    RETURN;
  END IF;

  -- Create referral record
  INSERT INTO referrals (referrer_id, referee_id, referral_code, status, completed_at)
  VALUES (v_referrer_id, p_referee_id, p_referral_code, 'completed', now())
  ON CONFLICT (referee_id) DO NOTHING
  RETURNING id INTO v_referral_id;

  IF v_referral_id IS NULL THEN
    RETURN;
  END IF;

  -- Create reward for referrer (30 days = 1 month)
  INSERT INTO referral_rewards (user_id, referral_id, reward_type, days_added, status)
  VALUES (v_referrer_id, v_referral_id, 'referrer_bonus', 30, 'pending');

  -- Create reward for referee (15 days extra trial)
  INSERT INTO referral_rewards (user_id, referral_id, reward_type, days_added, status)
  VALUES (p_referee_id, v_referral_id, 'referee_bonus', 15, 'pending');

  -- Automatically apply referee bonus (extend trial)
  UPDATE user_profiles
  SET trial_ends_at = COALESCE(trial_ends_at, now()) + interval '15 days'
  WHERE id = p_referee_id;

  -- Mark referee bonus as applied
  UPDATE referral_rewards
  SET status = 'applied', applied_at = now()
  WHERE user_id = p_referee_id AND referral_id = v_referral_id;
END;
$$;

-- Enable RLS on referrals table
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Policies for referrals
CREATE POLICY "Users can view their own referrals as referrer"
  ON referrals FOR SELECT
  TO authenticated
  USING (referrer_id = auth.uid());

CREATE POLICY "Users can view their own referrals as referee"
  ON referrals FOR SELECT
  TO authenticated
  USING (referee_id = auth.uid());

CREATE POLICY "Super admins can view all referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update referrals"
  ON referrals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Enable RLS on referral_rewards table
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Policies for referral_rewards
CREATE POLICY "Users can view their own rewards"
  ON referral_rewards FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all rewards"
  ON referral_rewards FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can insert rewards"
  ON referral_rewards FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update rewards"
  ON referral_rewards FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete rewards"
  ON referral_rewards FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );
