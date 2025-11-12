/*
  # Fix Referral Bonus Application
  
  1. Problem
    - The process_referral_rewards function doesn't correctly add 15 days to new users
    - The function uses incorrect logic: COALESCE(trial_ends_at, now()) which gives current time instead of the actual trial end date
    - The trial_ends_at is set BEFORE the referral function runs, so it should add 15 days to that existing date
    
  2. Solution
    - Fix the process_referral_rewards function to properly calculate the bonus
    - Get the current trial_ends_at (which is already set to now() + 30 days by the user creation trigger)
    - Add 15 days to that date (not to now())
    - Also update subscription_end_date if it exists
    - Mark the referral as rewarded after applying the bonus
    
  3. Changes
    - Recreate process_referral_rewards function with correct date calculation logic
*/

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
  v_current_subscription_end timestamptz;
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

  -- Get current trial end date and subscription end date
  SELECT trial_ends_at, subscription_end_date
  INTO v_current_trial_end, v_current_subscription_end
  FROM user_profiles
  WHERE id = p_referee_id;

  -- CRITICAL FIX: Add 15 days to the EXISTING trial_ends_at (which was already set by trigger)
  -- The user creation trigger sets trial_ends_at = now() + 30 days
  -- We need to add 15 more days to make it 45 days total
  IF v_current_trial_end IS NOT NULL THEN
    -- Extend trial by 15 days
    UPDATE user_profiles
    SET 
      trial_ends_at = v_current_trial_end + interval '15 days',
      subscription_end_date = CASE 
        WHEN v_current_subscription_end IS NOT NULL THEN v_current_subscription_end + interval '15 days'
        ELSE v_current_trial_end + interval '15 days'
      END
    WHERE id = p_referee_id;

    -- Mark referee bonus as applied
    UPDATE referral_rewards
    SET status = 'applied', applied_at = now()
    WHERE user_id = p_referee_id AND referral_id = v_referral_id AND reward_type = 'referee_bonus';

    -- Mark the referral as rewarded
    UPDATE referrals
    SET rewarded_at = now()
    WHERE id = v_referral_id;

    RAISE NOTICE 'Referral processed successfully. Referee % gets 15 extra days (trial extended to %), Referrer % gets 30 days pending', 
      p_referee_id, v_current_trial_end + interval '15 days', v_referrer_id;
  ELSE
    RAISE WARNING 'Could not apply referral bonus: trial_ends_at is NULL for user %', p_referee_id;
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error processing referral: %', SQLERRM;
    RETURN;
END;
$$;
