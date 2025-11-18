/*
  # Fix Demo Sessions RLS for Account Creation

  ## Problem
  The demo account creation fails because the user is not yet authenticated
  when trying to insert into demo_sessions table.

  ## Solution
  Allow authenticated users to insert demo sessions for their own user_id.
  The user_id is set after auth.signUp() completes.

  ## Changes
  - Update INSERT policy to allow users to create their own demo session
  - Ensure proper security by checking user_id matches auth.uid()
*/

-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert own demo session" ON demo_sessions;

-- Create new INSERT policy that allows authenticated users to insert their own sessions
CREATE POLICY "Authenticated users can insert own demo session"
  ON demo_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Also ensure service role can insert (for edge functions if needed)
CREATE POLICY "Service role can insert demo sessions"
  ON demo_sessions FOR INSERT
  TO service_role
  WITH CHECK (true);
