/*
  # Create Product Price Tiers Table

  ## Overview
  Creates the `product_price_tiers` table to support quantity-based pricing for products.

  ## New Tables
  - `product_price_tiers`
    - `id` (uuid, primary key)
    - `product_id` (uuid, foreign key to products)
    - `min_quantity` (integer) - Minimum quantity for this tier
    - `max_quantity` (integer, nullable) - Maximum quantity for this tier (NULL = unlimited)
    - `unit_price` (numeric) - Price per unit at this quantity level
    - `discounted_unit_price` (numeric, nullable) - Optional discounted price
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  ## Changes
  - Creates the table if it doesn't exist
  - Adds foreign key constraint with ON DELETE CASCADE
  - Creates indexes for query performance
  - Enables RLS with appropriate policies for secure access

  ## Security
  - RLS enabled on product_price_tiers table
  - Users can only view price tiers for products they own
  - Users can manage price tiers for their own products
*/

CREATE TABLE IF NOT EXISTS public.product_price_tiers (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  min_quantity integer NOT NULL,
  max_quantity integer,
  unit_price numeric(10,2) NOT NULL,
  discounted_unit_price numeric(10,2),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT valid_quantities CHECK (min_quantity > 0 AND (max_quantity IS NULL OR max_quantity >= min_quantity)),
  CONSTRAINT valid_prices CHECK (unit_price >= 0 AND (discounted_unit_price IS NULL OR discounted_unit_price >= 0))
);

CREATE INDEX IF NOT EXISTS idx_product_price_tiers_product_id ON public.product_price_tiers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_price_tiers_min_quantity ON public.product_price_tiers(product_id, min_quantity);

ALTER TABLE public.product_price_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view price tiers for their products"
  ON public.product_price_tiers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_price_tiers.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert price tiers for their products"
  ON public.product_price_tiers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update price tiers for their products"
  ON public.product_price_tiers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_price_tiers.product_id
      AND products.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete price tiers for their products"
  ON public.product_price_tiers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_price_tiers.product_id
      AND products.user_id = auth.uid()
    )
  );
