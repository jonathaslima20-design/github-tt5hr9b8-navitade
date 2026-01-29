/*
  # Remove Real Estate and Vehicles Niches

  1. Schema Changes
    - Drop properties table and related tables
    - Drop cars table and related tables
    - Update users table to remove niche_type (everyone will be products only)
    - Update tracking and other tables to remove property/car references
    - Keep only products-related functionality

  2. Data Migration
    - Remove all property and car data
    - Update user roles and settings
    - Clean up tracking data

  3. Security
    - Update RLS policies
    - Remove unnecessary policies
*/

-- Drop property-related tables
DROP TABLE IF EXISTS property_images CASCADE;
DROP TABLE IF EXISTS properties CASCADE;

-- Drop car-related tables  
DROP TABLE IF EXISTS car_images CASCADE;
DROP TABLE IF EXISTS cars CASCADE;

-- Update users table - remove niche_type since everyone will be products only
ALTER TABLE users DROP COLUMN IF EXISTS niche_type;

-- Update property_views table to only handle products
-- Rename to product_views for clarity
ALTER TABLE property_views RENAME TO product_views;
ALTER TABLE product_views DROP CONSTRAINT IF EXISTS property_views_listing_type_check;
ALTER TABLE product_views ADD CONSTRAINT product_views_listing_type_check CHECK (listing_type = 'product');

-- Update leads table
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_listing_type_check;
ALTER TABLE leads ADD CONSTRAINT leads_listing_type_check CHECK (listing_type = 'product');

-- Update tracking_settings table - remove property/car specific fields
-- Keep it generic for products
UPDATE tracking_settings 
SET meta_events = NULL, ga_events = NULL 
WHERE meta_events::text LIKE '%property%' OR meta_events::text LIKE '%car%' 
   OR ga_events::text LIKE '%property%' OR ga_events::text LIKE '%car%';

-- Update user_storefront_settings to remove property/car specific filters
UPDATE user_storefront_settings 
SET settings = jsonb_build_object(
  'filters', jsonb_build_object(
    'showFilters', COALESCE((settings->'filters'->>'showFilters')::boolean, true),
    'showSearch', COALESCE((settings->'filters'->>'showSearch')::boolean, true),
    'showPriceRange', COALESCE((settings->'filters'->>'showPriceRange')::boolean, true),
    'showCategories', COALESCE((settings->'filters'->>'showCategories')::boolean, true),
    'showStatus', COALESCE((settings->'filters'->>'showStatus')::boolean, true),
    'showCondition', COALESCE((settings->'filters'->>'showCondition')::boolean, true)
  ),
  'itemsPerPage', COALESCE((settings->>'itemsPerPage')::integer, 12)
)
WHERE settings IS NOT NULL;

-- Clean up any orphaned data in product_views and leads
DELETE FROM product_views WHERE listing_type != 'product';
DELETE FROM leads WHERE listing_type != 'product';

-- Update RLS policies for simplified structure
-- Product views policies
DROP POLICY IF EXISTS "Users can view their own property views" ON product_views;
CREATE POLICY "Users can view their own product views"
  ON product_views
  FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
  );

-- Leads policies  
DROP POLICY IF EXISTS "Users can view their own leads" ON leads;
CREATE POLICY "Users can view their own leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM products WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can create leads" ON leads;
CREATE POLICY "Anyone can create leads"
  ON leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    property_id IN (
      SELECT id FROM products WHERE status = 'disponivel'
    )
  );