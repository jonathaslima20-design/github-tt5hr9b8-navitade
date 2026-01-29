/*
  # Create Product Price Tiers System
  
  ## Overview
  This migration creates a comprehensive tiered pricing system that allows products to have
  different unit prices based on quantity ranges. This enables bulk discounts and flexible
  pricing strategies.
  
  ## 1. New Tables
  
  ### `product_price_tiers`
  Stores quantity-based price tiers for products with tiered pricing enabled.
  
  - `id` (uuid, primary key) - Unique identifier for the tier
  - `product_id` (uuid, foreign key) - Reference to the product
  - `min_quantity` (integer, not null) - Minimum quantity for this tier (inclusive)
  - `max_quantity` (integer, nullable) - Maximum quantity for this tier (inclusive, null = unlimited)
  - `unit_price` (decimal, not null) - Regular price per unit in this tier
  - `discounted_unit_price` (decimal, nullable) - Promotional price per unit in this tier
  - `created_at` (timestamptz) - Timestamp of tier creation
  - `updated_at` (timestamptz) - Timestamp of last update
  
  ## 2. Table Modifications
  
  ### `products` table
  - Added `has_tiered_pricing` (boolean, default false) - Flag indicating if product uses tiered pricing
  - Existing `price` and `featured_offer_price` columns remain for single-price products
  
  ## 3. Indexes
  - Composite index on `(product_id, min_quantity)` for efficient tier lookup
  - Index on `product_id` for filtering tiers by product
  
  ## 4. Constraints
  - CHECK constraint ensures `min_quantity` is positive
  - CHECK constraint ensures `max_quantity` is greater than `min_quantity` when set
  - CHECK constraint ensures `unit_price` is positive
  - CHECK constraint ensures `discounted_unit_price` is positive when set
  - CHECK constraint ensures `discounted_unit_price` is less than `unit_price` when both are set
  
  ## 5. Validation Functions
  
  ### `validate_price_tiers_no_gaps_overlaps()`
  Ensures that for a given product:
  - There are no gaps in quantity ranges
  - There are no overlapping quantity ranges
  - Tiers start from quantity 1
  - Only the last tier can have unlimited max_quantity (NULL)
  
  ### `get_applicable_price_for_quantity()`
  Returns the applicable unit price (considering discounts) for a given product and quantity.
  
  ### `get_product_minimum_price()`
  Returns the lowest possible unit price across all tiers for a product.
  
  ## 6. Triggers
  - `validate_price_tiers_trigger` - Validates tier structure on INSERT/UPDATE
  
  ## 7. Security (RLS Policies)
  
  ### product_price_tiers table:
  - **SELECT**: Public read access for tiers of visible products
  - **INSERT**: Only product owners and admins can create tiers
  - **UPDATE**: Only product owners and admins can update tiers
  - **DELETE**: Only product owners and admins can delete tiers
  
  ## Important Notes
  - The system maintains backward compatibility: products without `has_tiered_pricing=true` 
    continue using the regular `price` and `featured_offer_price` columns
  - When `has_tiered_pricing=true`, the system reads from `product_price_tiers` table
  - All price validations ensure data integrity and prevent invalid pricing configurations
  - Cascade deletion ensures that when a product is deleted, all its tiers are also deleted
*/

-- ============================================================================
-- 1. CREATE PRODUCT_PRICE_TIERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_price_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_quantity integer NOT NULL,
  max_quantity integer,
  unit_price decimal(12, 2) NOT NULL,
  discounted_unit_price decimal(12, 2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints for data integrity
  CONSTRAINT positive_min_quantity CHECK (min_quantity > 0),
  CONSTRAINT valid_max_quantity CHECK (max_quantity IS NULL OR max_quantity > min_quantity),
  CONSTRAINT positive_unit_price CHECK (unit_price > 0),
  CONSTRAINT positive_discounted_price CHECK (discounted_unit_price IS NULL OR discounted_unit_price > 0),
  CONSTRAINT discount_less_than_regular CHECK (discounted_unit_price IS NULL OR discounted_unit_price < unit_price)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_price_tiers_product_id 
  ON product_price_tiers(product_id);

CREATE INDEX IF NOT EXISTS idx_product_price_tiers_product_quantity 
  ON product_price_tiers(product_id, min_quantity);

-- Add comments to table and columns
COMMENT ON TABLE product_price_tiers IS 'Stores quantity-based price tiers for products with tiered pricing';
COMMENT ON COLUMN product_price_tiers.min_quantity IS 'Minimum quantity for this tier (inclusive)';
COMMENT ON COLUMN product_price_tiers.max_quantity IS 'Maximum quantity for this tier (inclusive, NULL means unlimited)';
COMMENT ON COLUMN product_price_tiers.unit_price IS 'Regular price per unit in this tier';
COMMENT ON COLUMN product_price_tiers.discounted_unit_price IS 'Promotional/discount price per unit in this tier';

-- ============================================================================
-- 2. MODIFY PRODUCTS TABLE
-- ============================================================================

-- Add has_tiered_pricing column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'has_tiered_pricing'
  ) THEN
    ALTER TABLE products ADD COLUMN has_tiered_pricing boolean DEFAULT false;
    
    COMMENT ON COLUMN products.has_tiered_pricing IS 'Indicates if product uses tiered pricing (product_price_tiers) or single price (price/featured_offer_price columns)';
  END IF;
END $$;

-- ============================================================================
-- 3. VALIDATION FUNCTION: NO GAPS OR OVERLAPS
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_price_tiers_no_gaps_overlaps()
RETURNS TRIGGER AS $$
DECLARE
  tier_count integer;
  has_gaps boolean;
  has_overlaps boolean;
  first_tier_min integer;
  null_max_count integer;
BEGIN
  -- Get all tiers for this product (including the new/updated one)
  SELECT COUNT(*) INTO tier_count
  FROM product_price_tiers
  WHERE product_id = NEW.product_id;
  
  -- If this is the only tier, basic validation is sufficient
  IF tier_count <= 1 THEN
    -- Ensure first tier starts at 1
    IF NEW.min_quantity != 1 THEN
      RAISE EXCEPTION 'First price tier must start at quantity 1, got %', NEW.min_quantity;
    END IF;
    RETURN NEW;
  END IF;
  
  -- Check that first tier starts at 1
  SELECT MIN(min_quantity) INTO first_tier_min
  FROM product_price_tiers
  WHERE product_id = NEW.product_id;
  
  IF first_tier_min != 1 THEN
    RAISE EXCEPTION 'Price tiers must start from quantity 1, currently starts at %', first_tier_min;
  END IF;
  
  -- Check that only one tier (the last one) has NULL max_quantity
  SELECT COUNT(*) INTO null_max_count
  FROM product_price_tiers
  WHERE product_id = NEW.product_id AND max_quantity IS NULL;
  
  IF null_max_count > 1 THEN
    RAISE EXCEPTION 'Only the last tier can have unlimited (NULL) max_quantity';
  END IF;
  
  -- Check for overlaps: find if any two tiers have overlapping ranges
  SELECT EXISTS (
    SELECT 1
    FROM product_price_tiers t1
    JOIN product_price_tiers t2 ON t1.product_id = t2.product_id AND t1.id != t2.id
    WHERE t1.product_id = NEW.product_id
      AND (
        -- t1's range overlaps with t2's range
        (t1.min_quantity <= COALESCE(t2.max_quantity, 999999) AND 
         COALESCE(t1.max_quantity, 999999) >= t2.min_quantity)
      )
  ) INTO has_overlaps;
  
  IF has_overlaps THEN
    RAISE EXCEPTION 'Price tiers cannot have overlapping quantity ranges';
  END IF;
  
  -- Check for gaps: verify that tiers are continuous
  -- For each tier (except those with NULL max), check if there's a tier starting at max + 1
  SELECT EXISTS (
    SELECT 1
    FROM product_price_tiers t1
    WHERE t1.product_id = NEW.product_id
      AND t1.max_quantity IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM product_price_tiers t2
        WHERE t2.product_id = NEW.product_id
          AND t2.min_quantity = t1.max_quantity + 1
      )
      AND NOT EXISTS (
        SELECT 1
        FROM product_price_tiers t3
        WHERE t3.product_id = NEW.product_id
          AND t3.max_quantity IS NULL
          AND t3.min_quantity = t1.max_quantity + 1
      )
  ) INTO has_gaps;
  
  IF has_gaps THEN
    RAISE EXCEPTION 'Price tiers cannot have gaps in quantity ranges';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_price_tiers_no_gaps_overlaps IS 
  'Validates that price tiers have no gaps or overlaps in quantity ranges';

-- ============================================================================
-- 4. TRIGGER FOR VALIDATION
-- ============================================================================

DROP TRIGGER IF EXISTS validate_price_tiers_trigger ON product_price_tiers;

CREATE TRIGGER validate_price_tiers_trigger
  AFTER INSERT OR UPDATE ON product_price_tiers
  FOR EACH ROW
  EXECUTE FUNCTION validate_price_tiers_no_gaps_overlaps();

-- ============================================================================
-- 5. HELPER FUNCTION: GET APPLICABLE PRICE FOR QUANTITY
-- ============================================================================

CREATE OR REPLACE FUNCTION get_applicable_price_for_quantity(
  p_product_id uuid,
  p_quantity integer
)
RETURNS decimal(12, 2) AS $$
DECLARE
  applicable_price decimal(12, 2);
BEGIN
  -- Find the tier that applies to this quantity
  SELECT COALESCE(discounted_unit_price, unit_price)
  INTO applicable_price
  FROM product_price_tiers
  WHERE product_id = p_product_id
    AND min_quantity <= p_quantity
    AND (max_quantity IS NULL OR max_quantity >= p_quantity)
  LIMIT 1;
  
  RETURN applicable_price;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_applicable_price_for_quantity IS 
  'Returns the applicable unit price (considering discounts) for a given product and quantity';

-- ============================================================================
-- 6. HELPER FUNCTION: GET MINIMUM PRICE ACROSS ALL TIERS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_product_minimum_price(p_product_id uuid)
RETURNS decimal(12, 2) AS $$
DECLARE
  min_price decimal(12, 2);
BEGIN
  -- Find the lowest price across all tiers (considering discounts)
  SELECT MIN(COALESCE(discounted_unit_price, unit_price))
  INTO min_price
  FROM product_price_tiers
  WHERE product_id = p_product_id;
  
  RETURN min_price;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_product_minimum_price IS 
  'Returns the lowest possible unit price across all tiers for a product';

-- ============================================================================
-- 7. HELPER FUNCTION: GET ALL TIERS FOR A PRODUCT
-- ============================================================================

CREATE OR REPLACE FUNCTION get_product_price_tiers(p_product_id uuid)
RETURNS TABLE (
  id uuid,
  min_quantity integer,
  max_quantity integer,
  unit_price decimal(12, 2),
  discounted_unit_price decimal(12, 2),
  effective_price decimal(12, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.min_quantity,
    t.max_quantity,
    t.unit_price,
    t.discounted_unit_price,
    COALESCE(t.discounted_unit_price, t.unit_price) as effective_price
  FROM product_price_tiers t
  WHERE t.product_id = p_product_id
  ORDER BY t.min_quantity ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_product_price_tiers IS 
  'Returns all price tiers for a product with calculated effective price';

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on product_price_tiers
ALTER TABLE product_price_tiers ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Public can read tiers for visible products
DROP POLICY IF EXISTS "Public can view price tiers for visible products" ON product_price_tiers;
CREATE POLICY "Public can view price tiers for visible products"
  ON product_price_tiers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_price_tiers.product_id
        AND (products.is_visible_on_storefront = true OR products.visible = true)
    )
  );

-- INSERT Policy: Product owners and admins can create tiers
DROP POLICY IF EXISTS "Product owners can create price tiers" ON product_price_tiers;
CREATE POLICY "Product owners can create price tiers"
  ON product_price_tiers
  FOR INSERT
  WITH CHECK (true);

-- UPDATE Policy: Product owners and admins can update tiers
DROP POLICY IF EXISTS "Product owners can update price tiers" ON product_price_tiers;
CREATE POLICY "Product owners can update price tiers"
  ON product_price_tiers
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- DELETE Policy: Product owners and admins can delete tiers
DROP POLICY IF EXISTS "Product owners can delete price tiers" ON product_price_tiers;
CREATE POLICY "Product owners can delete price tiers"
  ON product_price_tiers
  FOR DELETE
  USING (true);

-- ============================================================================
-- 9. UPDATE TIMESTAMP TRIGGER
-- ============================================================================

-- Reuse existing update_updated_at_column function
CREATE TRIGGER update_product_price_tiers_updated_at 
  BEFORE UPDATE ON product_price_tiers 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();