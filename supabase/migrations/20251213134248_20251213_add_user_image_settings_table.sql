/*
  # Create user image settings table

  This migration creates a dedicated table for storing user-specific image upload limits.
  Each user can have a different maximum number of images per product, configurable
  by administrators.

  1. New Tables
    - `user_image_settings`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key) - References auth.users, unique constraint
      - `max_images_per_product` (integer) - Default 10, range 1-50
      - `created_at` (timestamp) - When the setting was created
      - `updated_at` (timestamp) - When the setting was last updated

  2. Data Migration
    - No existing data (new table)
    - Records created automatically when users first upload images

  3. Constraints
    - UNIQUE(user_id): One settings record per user
    - CHECK: max_images_per_product between 1 and 50
    - NOT NULL: max_images_per_product always has a value
    - Foreign key cascade delete on user deletion

  4. Security
    - Enable RLS to restrict access
    - Users can view/update their own settings
    - Admins can view/update any user's settings
    - Public read access with restricted field visibility

  5. Indexes
    - Primary key index on user_id for fast lookups
    - Index on updated_at for audit queries

  6. Important Notes
    - Default value of 10 matches current ProductImageManager behavior
    - Range 1-50 provides flexibility while maintaining system stability
    - This table integrates with ProductImageManager in frontend and backend validation
    - Admins can adjust individual or bulk limits via admin panel
*/

CREATE TABLE IF NOT EXISTS user_image_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  max_images_per_product INTEGER NOT NULL DEFAULT 10 CONSTRAINT check_images_range CHECK (max_images_per_product >= 1 AND max_images_per_product <= 50),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_image_settings_user_id ON user_image_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_image_settings_updated_at ON user_image_settings(updated_at);

ALTER TABLE user_image_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own image settings"
  ON user_image_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own image settings"
  ON user_image_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all image settings"
  ON user_image_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can update all image settings"
  ON user_image_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

GRANT SELECT, UPDATE ON user_image_settings TO authenticated;
