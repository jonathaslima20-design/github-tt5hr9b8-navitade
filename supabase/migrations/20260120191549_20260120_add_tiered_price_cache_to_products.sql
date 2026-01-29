/*
  # Add Tiered Price Caching to Products Table

  ## Overview
  Adds cached min and max price fields to products table to support efficient filtering
  with tiered pricing. When products have tiered pricing, these fields store the range
  of prices available across all tiers.

  ## Changes
  1. Add min_tiered_price column to cache minimum price from tiers
  2. Add max_tiered_price column to cache maximum price from tiers
  3. Create function to update tiered price cache when tiers change
  4. Create trigger to auto-update cache on tier insert/update/delete
  5. Backfill existing products with tiered pricing

  ## Security
  - No RLS changes needed (existing policies apply)
  - Only affects product queries for filtering

  ## Performance
  - Enables direct price filtering without joining price_tiers table
  - Improves query performance for paginated product lists
  - Reduces database load by avoiding expensive joins
*/

DO $$
BEGIN
  -- Add min_tiered_price column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'min_tiered_price'
  ) THEN
    ALTER TABLE public.products ADD COLUMN min_tiered_price numeric(10,2);
  END IF;

  -- Add max_tiered_price column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'max_tiered_price'
  ) THEN
    ALTER TABLE public.products ADD COLUMN max_tiered_price numeric(10,2);
  END IF;
END $$;

-- Create function to update tiered price cache
CREATE OR REPLACE FUNCTION update_product_tiered_price_cache(p_product_id uuid)
RETURNS void AS $$
DECLARE
  v_min_price numeric(10,2);
  v_max_price numeric(10,2);
BEGIN
  -- Calculate min and max prices from tiers
  SELECT 
    MIN(LEAST(unit_price, COALESCE(discounted_unit_price, unit_price))),
    MAX(GREATEST(unit_price, COALESCE(discounted_unit_price, unit_price)))
  INTO v_min_price, v_max_price
  FROM public.product_price_tiers
  WHERE product_id = p_product_id;

  -- Update product with calculated values
  UPDATE public.products
  SET 
    min_tiered_price = v_min_price,
    max_tiered_price = v_max_price
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update cache when tiers are inserted
CREATE OR REPLACE FUNCTION trigger_update_tiered_price_cache_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_product_tiered_price_cache(NEW.product_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update cache when tiers are updated
CREATE OR REPLACE FUNCTION trigger_update_tiered_price_cache_on_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_product_tiered_price_cache(NEW.product_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update cache when tiers are deleted
CREATE OR REPLACE FUNCTION trigger_update_tiered_price_cache_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_product_tiered_price_cache(OLD.product_id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_tiered_price_cache_insert ON public.product_price_tiers;
DROP TRIGGER IF EXISTS trigger_update_tiered_price_cache_update ON public.product_price_tiers;
DROP TRIGGER IF EXISTS trigger_update_tiered_price_cache_delete ON public.product_price_tiers;

-- Create new triggers
CREATE TRIGGER trigger_update_tiered_price_cache_insert
  AFTER INSERT ON public.product_price_tiers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_tiered_price_cache_on_insert();

CREATE TRIGGER trigger_update_tiered_price_cache_update
  AFTER UPDATE ON public.product_price_tiers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_tiered_price_cache_on_update();

CREATE TRIGGER trigger_update_tiered_price_cache_delete
  AFTER DELETE ON public.product_price_tiers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_tiered_price_cache_on_delete();

-- Backfill existing products with tiered pricing
DO $$
DECLARE
  v_product_id uuid;
BEGIN
  FOR v_product_id IN 
    SELECT DISTINCT product_id FROM public.product_price_tiers
  LOOP
    PERFORM update_product_tiered_price_cache(v_product_id);
  END LOOP;
END $$;
