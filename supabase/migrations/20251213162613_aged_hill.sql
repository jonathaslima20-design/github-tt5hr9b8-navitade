/*
  # Add max_images_per_product column to users table

  1. New Columns
    - `max_images_per_product` (integer, not null, default 10)
      - Controls the maximum number of images a user can upload per product
      - Default value of 10 images per product
      - Used by admin panel to manage user limits

  2. Changes
    - Adds the missing column that the application expects
    - Sets a reasonable default limit for all existing users
    - Ensures the column is not null to maintain data integrity

  3. Notes
    - This resolves the schema cache error in the admin panel
    - All existing users will automatically get the default limit of 10 images
    - Admins can modify this limit through the admin interface
*/

-- Add the max_images_per_product column to the users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS max_images_per_product INTEGER NOT NULL DEFAULT 10;

-- Add a comment to document the column purpose
COMMENT ON COLUMN public.users.max_images_per_product IS 'Maximum number of images allowed per product for this user';

-- Create an index for performance when querying by image limits
CREATE INDEX IF NOT EXISTS idx_users_max_images_per_product 
ON public.users (max_images_per_product);