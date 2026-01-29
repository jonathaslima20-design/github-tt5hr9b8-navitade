/*
  # Add Auto-Promotion Trigger for Featured Images

  This migration adds a trigger function that automatically promotes the next image
  to featured status when a featured image is deleted from the product_images table.

  1. Function: auto_promote_next_featured_image()
     - Triggered AFTER DELETE on product_images
     - Checks if deleted image was featured (is_featured = true)
     - If yes, finds remaining image with lowest display_order
     - Promotes that image to featured and updates products.featured_image_url
     - Handles edge case where no images remain (sets featured_image_url to NULL)

  2. Trigger: trg_auto_promote_featured_image
     - Fires after each row delete on product_images
     - Ensures data consistency between product_images and products tables
     - Provides seamless user experience by never showing blank images on cards

  3. Implementation Details
     - Uses display_order to determine next featured image (lower values = higher priority)
     - Uses SECURITY DEFINER to ensure trigger runs with proper privileges
     - Atomic operation ensures no race conditions
     - Gracefully handles products with zero images after deletion

  4. Important Notes
     - This migration is safe to apply to existing databases
     - Trigger does not modify any existing data
     - Trigger only activates on DELETE operations
     - If table is missing, migration will fail gracefully
*/

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'product_images'
  ) THEN
    CREATE OR REPLACE FUNCTION auto_promote_next_featured_image()
    RETURNS TRIGGER AS $FUNC$
    DECLARE
      v_next_image_id uuid;
      v_next_image_url text;
      v_remaining_count integer;
    BEGIN
      IF OLD.is_featured = true THEN
        SELECT COUNT(*) INTO v_remaining_count
        FROM product_images
        WHERE product_id = OLD.product_id;

        IF v_remaining_count > 0 THEN
          SELECT id, url INTO v_next_image_id, v_next_image_url
          FROM product_images
          WHERE product_id = OLD.product_id
          ORDER BY display_order ASC
          LIMIT 1;

          UPDATE product_images
          SET is_featured = true
          WHERE id = v_next_image_id;

          UPDATE products
          SET featured_image_url = v_next_image_url
          WHERE id = OLD.product_id;
        ELSE
          UPDATE products
          SET featured_image_url = NULL
          WHERE id = OLD.product_id;
        END IF;
      END IF;

      RETURN OLD;
    END;
    $FUNC$ LANGUAGE plpgsql SECURITY DEFINER;

    DROP TRIGGER IF EXISTS trg_auto_promote_featured_image ON product_images;

    CREATE TRIGGER trg_auto_promote_featured_image
    AFTER DELETE ON product_images
    FOR EACH ROW
    EXECUTE FUNCTION auto_promote_next_featured_image();

  END IF;
END $$;
