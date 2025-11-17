/*
  # Add Language Preference Support

  1. Changes
    - Add `language_preference` column to `user_profiles` table
    - Add `language_preference` column to `dentist_accounts` table
    - Set default value to 'fr' (French)
    - Add check constraint to ensure only valid language codes
    - Add index for performance optimization

  2. Security
    - Users can update their own language preference
    - Maintains existing RLS policies
*/

-- Add language_preference to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'language_preference'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN language_preference text DEFAULT 'fr' CHECK (language_preference IN ('fr', 'en'));

    -- Add index for performance
    CREATE INDEX IF NOT EXISTS idx_user_profiles_language ON user_profiles(language_preference);

    COMMENT ON COLUMN user_profiles.language_preference IS 'User interface language preference (fr=French, en=English)';
  END IF;
END $$;

-- Add language_preference to dentist_accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dentist_accounts' AND column_name = 'language_preference'
  ) THEN
    ALTER TABLE dentist_accounts
    ADD COLUMN language_preference text DEFAULT 'fr' CHECK (language_preference IN ('fr', 'en'));

    -- Add index for performance
    CREATE INDEX IF NOT EXISTS idx_dentist_accounts_language ON dentist_accounts(language_preference);

    COMMENT ON COLUMN dentist_accounts.language_preference IS 'User interface language preference (fr=French, en=English)';
  END IF;
END $$;

-- Update existing records to have French as default (if NULL)
UPDATE user_profiles SET language_preference = 'fr' WHERE language_preference IS NULL;
UPDATE dentist_accounts SET language_preference = 'fr' WHERE language_preference IS NULL;
