/*
  # Create User Custom Sizes Table

  This migration creates the table for storing user-defined custom sizes that will be
  reused across multiple product listings.

  1. New Tables
    - `user_custom_sizes`
      - `id` (uuid, primary key) - Unique identifier for each custom size record
      - `user_id` (uuid, foreign key) - References the user who created the size
      - `size_name` (text) - The custom size value (e.g., "XS", "4XL", "Único")
      - `size_type` (text) - Type of size: 'apparel', 'shoe', or 'custom'
      - `created_at` (timestamp) - When the size was created

  2. Security
    - Enable RLS on `user_custom_sizes` table
    - Users can only view their own custom sizes
    - Users can only insert their own custom sizes
    - Users can only delete their own custom sizes
    - Composite unique constraint on (user_id, size_name) to prevent duplicates

  3. Indexes
    - Index on user_id for fast lookups by user
    - Index on size_type for filtering by type
    - Composite index on (user_id, size_type) for combined queries

  4. Important Notes
    - Sizes are user-specific and isolated for security and data integrity
    - Duplicate sizes per user are prevented at the database level
    - RLS ensures users cannot access other users' custom sizes
*/

CREATE TABLE IF NOT EXISTS user_custom_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  size_name text NOT NULL,
  size_type text NOT NULL DEFAULT 'custom' CHECK (size_type IN ('apparel', 'shoe', 'custom')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT user_sizes_unique UNIQUE(user_id, size_name),
  CONSTRAINT size_name_not_empty CHECK (size_name ~ '^[^\s][^\r\n]*[^\s]$' OR length(trim(size_name)) = 1)
);

CREATE INDEX IF NOT EXISTS idx_user_custom_sizes_user_id ON user_custom_sizes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_sizes_type ON user_custom_sizes(size_type);
CREATE INDEX IF NOT EXISTS idx_user_custom_sizes_user_type ON user_custom_sizes(user_id, size_type);

ALTER TABLE user_custom_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own custom sizes"
  ON user_custom_sizes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom sizes"
  ON user_custom_sizes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom sizes"
  ON user_custom_sizes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON user_custom_sizes TO authenticated;