/*
  # Create promotional phrases table

  1. New Tables
    - `user_promotional_phrases`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `phrase` (text, the promotional phrase)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on `user_promotional_phrases` table
    - Add policy for users to read their own phrases
    - Add policy for users to insert their own phrases
    - Add policy for users to delete their own phrases
*/

CREATE TABLE IF NOT EXISTS user_promotional_phrases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phrase text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_promotional_phrases_user_id 
  ON user_promotional_phrases(user_id);

ALTER TABLE user_promotional_phrases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own promotional phrases"
  ON user_promotional_phrases
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own promotional phrases"
  ON user_promotional_phrases
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own promotional phrases"
  ON user_promotional_phrases
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
