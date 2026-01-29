/*
  # Cart Variant Distributions System

  1. New Tables
    - `cart_variant_distributions`
      - `id` (uuid, primary key) - Unique identifier for the distribution group
      - `user_id` (uuid, foreign key) - References auth.users
      - `product_id` (uuid, foreign key) - References products table
      - `total_quantity` (integer) - Total quantity desired across all variations
      - `applied_tier_price` (numeric) - The tiered price applied to this total quantity
      - `metadata` (jsonb) - Store additional information (tier details, etc.)
      - `created_at` (timestamptz) - When the distribution was created
      - `updated_at` (timestamptz) - Last update timestamp

    - `cart_distribution_items`
      - `id` (uuid, primary key) - Unique identifier for each variation line
      - `distribution_id` (uuid, foreign key) - References cart_variant_distributions
      - `color` (text) - Color selection (nullable)
      - `size` (text) - Size selection (nullable)
      - `quantity` (integer) - Quantity for this specific variation
      - `created_at` (timestamptz) - When the item was added

  2. Security
    - Enable RLS on both tables
    - Users can only access their own distributions
    - Policies for authenticated users to manage their cart distributions

  3. Indexes
    - Index on user_id for fast cart retrieval
    - Index on distribution_id for fast item lookups
    - Composite index on distribution_id + color + size for uniqueness checks

  4. Constraints
    - Ensure total_quantity is positive
    - Ensure quantity per item is positive
    - Unique constraint on color+size per distribution
*/

-- Create cart_variant_distributions table
CREATE TABLE IF NOT EXISTS cart_variant_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  total_quantity integer NOT NULL CHECK (total_quantity > 0),
  applied_tier_price numeric(10, 2) NOT NULL CHECK (applied_tier_price >= 0),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create cart_distribution_items table
CREATE TABLE IF NOT EXISTS cart_distribution_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id uuid NOT NULL REFERENCES cart_variant_distributions(id) ON DELETE CASCADE,
  color text,
  size text,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_color_size_per_distribution UNIQUE (distribution_id, color, size)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cart_distributions_user_id ON cart_variant_distributions(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_distributions_product_id ON cart_variant_distributions(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_distribution_items_distribution_id ON cart_distribution_items(distribution_id);
CREATE INDEX IF NOT EXISTS idx_cart_distribution_items_lookup ON cart_distribution_items(distribution_id, color, size);

-- Enable RLS
ALTER TABLE cart_variant_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_distribution_items ENABLE ROW LEVEL SECURITY;

-- Policies for cart_variant_distributions
CREATE POLICY "Users can view own distributions"
  ON cart_variant_distributions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own distributions"
  ON cart_variant_distributions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own distributions"
  ON cart_variant_distributions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own distributions"
  ON cart_variant_distributions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for cart_distribution_items
CREATE POLICY "Users can view own distribution items"
  ON cart_distribution_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cart_variant_distributions
      WHERE cart_variant_distributions.id = cart_distribution_items.distribution_id
      AND cart_variant_distributions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own distribution items"
  ON cart_distribution_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cart_variant_distributions
      WHERE cart_variant_distributions.id = cart_distribution_items.distribution_id
      AND cart_variant_distributions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own distribution items"
  ON cart_distribution_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cart_variant_distributions
      WHERE cart_variant_distributions.id = cart_distribution_items.distribution_id
      AND cart_variant_distributions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cart_variant_distributions
      WHERE cart_variant_distributions.id = cart_distribution_items.distribution_id
      AND cart_variant_distributions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own distribution items"
  ON cart_distribution_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cart_variant_distributions
      WHERE cart_variant_distributions.id = cart_distribution_items.distribution_id
      AND cart_variant_distributions.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cart_distribution_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_cart_distribution_timestamp ON cart_variant_distributions;
CREATE TRIGGER update_cart_distribution_timestamp
  BEFORE UPDATE ON cart_variant_distributions
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_distribution_updated_at();

-- Function to validate total quantity matches sum of items
CREATE OR REPLACE FUNCTION validate_distribution_quantity()
RETURNS TRIGGER AS $$
DECLARE
  total_sum integer;
  expected_total integer;
BEGIN
  -- Get the sum of all items for this distribution
  SELECT COALESCE(SUM(quantity), 0) INTO total_sum
  FROM cart_distribution_items
  WHERE distribution_id = COALESCE(NEW.distribution_id, OLD.distribution_id);

  -- Get the expected total
  SELECT total_quantity INTO expected_total
  FROM cart_variant_distributions
  WHERE id = COALESCE(NEW.distribution_id, OLD.distribution_id);

  -- Allow operation if sum doesn't exceed total (partial distribution is OK)
  IF total_sum > expected_total THEN
    RAISE EXCEPTION 'Sum of distributed quantities (%) exceeds total quantity (%)', total_sum, expected_total;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate quantity on insert/update of items
DROP TRIGGER IF EXISTS validate_distribution_quantity_trigger ON cart_distribution_items;
CREATE TRIGGER validate_distribution_quantity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON cart_distribution_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_distribution_quantity();