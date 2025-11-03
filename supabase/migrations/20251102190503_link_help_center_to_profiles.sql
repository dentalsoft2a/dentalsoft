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
