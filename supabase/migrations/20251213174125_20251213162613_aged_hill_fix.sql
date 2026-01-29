/*
  # Add max_images_per_product column to users table (if not already present)
  
  This ensures the users table has the column needed for image limit management.
*/

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS max_images_per_product INTEGER NOT NULL DEFAULT 10;

COMMENT ON COLUMN public.users.max_images_per_product IS 'Maximum number of images allowed per product for this user';

CREATE INDEX IF NOT EXISTS idx_users_max_images_per_product 
ON public.users (max_images_per_product);
