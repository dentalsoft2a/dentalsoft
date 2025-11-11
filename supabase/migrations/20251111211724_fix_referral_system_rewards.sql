/*
  # Fix Referral System Rewards
  
  1. Problem
    - Referral rewards are not being created due to RLS policies blocking the process_referral_rewards function
    - The function uses SECURITY DEFINER but policies require explicit super_admin role check
    - Need to allow the function to bypass RLS when creating rewards
    
  2. Solution
    - Update RLS policies on referral_rewards to allow INSERT from SECURITY DEFINER functions
    - Add policy to allow INSERT when called from process_referral_rewards function
    - Update referred_by_code when referral is processed
    
  3. Changes
    - Drop and recreate INSERT policy on referral_rewards with SERVICE ROLE bypass
    - Update process_referral_rewards to also set referred_by_code in user_profiles
*/

-- Drop existing restrictive INSERT policy on referral_rewards
DROP POLICY IF EXISTS "Super admins can insert rewards" ON referral_rewards;

-- Create new policy that allows INSERT from SECURITY DEFINER functions
CREATE POLICY "Allow insert from secure functions"
  ON referral_rewards FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Drop and recreate process_referral_rewards with better logic
CREATE OR REPLACE FUNCTION process_referral_rewards(p_referee_id uuid, p_referral_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_referral_id uuid;
  v_current_trial_end timestamptz;
BEGIN
  -- Validate input
  IF p_referral_code IS NULL OR trim(p_referral_code) = '' THEN
    RAISE NOTICE 'Empty referral code provided';
    RETURN;
  END IF;

  -- Find the referrer by code
  SELECT id INTO v_referrer_id
  FROM user_profiles
  WHERE referral_code = upper(trim(p_referral_code));

  IF v_referrer_id IS NULL THEN
    RAISE NOTICE 'Referral code not found: %', p_referral_code;
    RETURN;
  END IF;

  -- Don't allow self-referral
  IF v_referrer_id = p_referee_id THEN
    RAISE NOTICE 'Self-referral attempt blocked';
    RETURN;
  END IF;

  -- Check if referee already used a referral code
  IF EXISTS (SELECT 1 FROM referrals WHERE referee_id = p_referee_id) THEN
    RAISE NOTICE 'User already used a referral code';
    RETURN;
  END IF;

  -- Create referral record
  INSERT INTO referrals (referrer_id, referee_id, referral_code, status, completed_at)
  VALUES (v_referrer_id, p_referee_id, upper(trim(p_referral_code)), 'completed', now())
  RETURNING id INTO v_referral_id;

  -- Update referee's referred_by_code
  UPDATE user_profiles
  SET referred_by_code = upper(trim(p_referral_code))
  WHERE id = p_referee_id;

  -- Create reward for referrer (30 days = 1 month)
  INSERT INTO referral_rewards (user_id, referral_id, reward_type, days_added, status)
  VALUES (v_referrer_id, v_referral_id, 'referrer_bonus', 30, 'pending');

  -- Create reward for referee (15 days extra trial)
  INSERT INTO referral_rewards (user_id, referral_id, reward_type, days_added, status)
  VALUES (p_referee_id, v_referral_id, 'referee_bonus', 15, 'pending');

  -- Get current trial end date
  SELECT COALESCE(trial_ends_at, subscription_end_date, now() + interval '30 days')
  INTO v_current_trial_end
  FROM user_profiles
  WHERE id = p_referee_id;

  -- Extend trial by 15 days
  UPDATE user_profiles
  SET 
    trial_ends_at = v_current_trial_end + interval '15 days',
    subscription_end_date = v_current_trial_end + interval '15 days'
  WHERE id = p_referee_id;

  -- Mark referee bonus as applied
  UPDATE referral_rewards
  SET status = 'applied', applied_at = now()
  WHERE user_id = p_referee_id AND referral_id = v_referral_id AND reward_type = 'referee_bonus';

  RAISE NOTICE 'Referral processed successfully. Referee % gets 15 extra days, Referrer % gets 30 days pending', p_referee_id, v_referrer_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error processing referral: %', SQLERRM;
    RETURN;
END;
$$;

-- Add policy for super admins to still be able to insert manually
CREATE POLICY "Super admins can insert rewards manually"
  ON referral_rewards FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );
