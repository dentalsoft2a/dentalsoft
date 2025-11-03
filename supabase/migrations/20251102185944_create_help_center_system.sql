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
