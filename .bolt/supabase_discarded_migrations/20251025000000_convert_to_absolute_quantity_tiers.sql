/*
  # Convert Price Tiers to Absolute Quantities

  ## Overview
  This migration converts the tiered pricing system from ranges (min-max quantities) to
  absolute/specific quantities. Instead of "1-10 units", "11-50 units", users will now
  define specific quantities like "10 items", "50 items", "100 items".

  ## Changes

  1. **Schema Modifications**
     - Rename `min_quantity` to `quantity` - represents the exact quantity for this price tier
     - Remove `max_quantity` column - no longer needed with absolute quantities
     - Update indexes to reflect new column name
     - Update constraints for new structure

  2. **Function Updates**
     - Update validation function to check for duplicate quantities
     - Update price calculation function to find applicable tier by quantity
     - Update helper functions to work with absolute quantities

  3. **Data Migration**
     - Existing data: Convert min_quantity to quantity and drop max_quantity

  ## Important Notes
  - Products with existing tiered pricing will need to be reviewed and adjusted
  - The system will automatically find the applicable tier based on quantity ordered
  - If exact quantity match not found, system will use the closest lower tier
  - This simplification makes the pricing model much more intuitive
*/

-- ============================================================================
-- 1. DROP EXISTING TRIGGERS AND FUNCTIONS
-- ============================================================================

DROP TRIGGER IF EXISTS validate_price_tiers_trigger ON product_price_tiers;
DROP FUNCTION IF EXISTS validate_price_tiers_no_gaps_overlaps();

-- ============================================================================
-- 2. MODIFY TABLE STRUCTURE
-- ============================================================================

-- Remove max_quantity column
ALTER TABLE product_price_tiers DROP COLUMN IF EXISTS max_quantity;

-- Rename min_quantity to quantity
ALTER TABLE product_price_tiers RENAME COLUMN min_quantity TO quantity;

-- Update constraint name
ALTER TABLE product_price_tiers DROP CONSTRAINT IF EXISTS positive_min_quantity;
ALTER TABLE product_price_tiers DROP CONSTRAINT IF EXISTS valid_max_quantity;

ALTER TABLE product_price_tiers ADD CONSTRAINT positive_quantity
  CHECK (quantity > 0);

-- Update column comment
COMMENT ON COLUMN product_price_tiers.quantity IS 'Exact quantity for this price tier (e.g., 10, 50, 100)';

-- ============================================================================
-- 3. UPDATE INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_product_price_tiers_product_quantity;

CREATE INDEX IF NOT EXISTS idx_product_price_tiers_product_quantity
  ON product_price_tiers(product_id, quantity);

-- ============================================================================
-- 4. NEW VALIDATION FUNCTION: NO DUPLICATE QUANTITIES
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_price_tiers_no_duplicates()
RETURNS TRIGGER AS $$
DECLARE
  duplicate_count integer;
BEGIN
  -- Check for duplicate quantities for this product
  SELECT COUNT(*) INTO duplicate_count
  FROM product_price_tiers
  WHERE product_id = NEW.product_id
    AND quantity = NEW.quantity
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Duplicate quantity % already exists for this product', NEW.quantity;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_price_tiers_no_duplicates IS
  'Validates that price tiers do not have duplicate quantities for the same product';

-- ============================================================================
-- 5. CREATE TRIGGER FOR VALIDATION
-- ============================================================================

CREATE TRIGGER validate_price_tiers_trigger
  BEFORE INSERT OR UPDATE ON product_price_tiers
  FOR EACH ROW
  EXECUTE FUNCTION validate_price_tiers_no_duplicates();

-- ============================================================================
-- 6. UPDATE HELPER FUNCTION: GET APPLICABLE PRICE FOR QUANTITY
-- ============================================================================

CREATE OR REPLACE FUNCTION get_applicable_price_for_quantity(
  p_product_id uuid,
  p_quantity integer
)
RETURNS decimal(12, 2) AS $$
DECLARE
  applicable_price decimal(12, 2);
BEGIN
  -- Find the tier with quantity <= requested quantity, ordered by quantity DESC
  -- This gets the highest tier that applies
  SELECT COALESCE(discounted_unit_price, unit_price)
  INTO applicable_price
  FROM product_price_tiers
  WHERE product_id = p_product_id
    AND quantity <= p_quantity
  ORDER BY quantity DESC
  LIMIT 1;

  RETURN applicable_price;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_applicable_price_for_quantity IS
  'Returns the applicable unit price for a given product and quantity (uses highest applicable tier)';

-- ============================================================================
-- 7. UPDATE HELPER FUNCTION: GET ALL TIERS FOR A PRODUCT
-- ============================================================================

CREATE OR REPLACE FUNCTION get_product_price_tiers(p_product_id uuid)
RETURNS TABLE (
  id uuid,
  quantity integer,
  unit_price decimal(12, 2),
  discounted_unit_price decimal(12, 2),
  effective_price decimal(12, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.quantity,
    t.unit_price,
    t.discounted_unit_price,
    COALESCE(t.discounted_unit_price, t.unit_price) as effective_price
  FROM product_price_tiers t
  WHERE t.product_id = p_product_id
  ORDER BY t.quantity ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_product_price_tiers IS
  'Returns all price tiers for a product ordered by quantity';
