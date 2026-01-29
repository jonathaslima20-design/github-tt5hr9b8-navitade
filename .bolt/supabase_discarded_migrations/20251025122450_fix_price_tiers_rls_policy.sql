/*
  # Fix Price Tiers RLS Policy

  1. Changes
    - Drop existing SELECT policy with problematic subquery
    - Create new SELECT policy with proper table reference
    - The issue was that the policy's subquery wasn't properly scoping the table reference
    
  2. Security
    - Maintains same security: public can view price tiers for visible products
    - Uses explicit table reference to avoid column resolution issues
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Public can view price tiers for visible products" ON product_price_tiers;

-- Create new policy with explicit table reference
CREATE POLICY "Public can view price tiers for visible products"
  ON product_price_tiers
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM products p
      WHERE p.id = product_price_tiers.product_id
        AND (p.is_visible_on_storefront = true OR p.visible = true)
    )
  );
