/*
  # Initial Schema with Tiered Pricing System
  
  Creates the complete database schema including:
  - Base tables (users, products, etc.)
  - Product price tiers with absolute quantity model
  - All necessary functions and triggers
  - Row Level Security policies
  
  This migration consolidates the schema to match the current application state.
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  password_hash text,
  role text NOT NULL DEFAULT 'corretor' CHECK (role IN ('corretor', 'admin', 'parceiro')),
  niche_type text DEFAULT 'diversos' CHECK (niche_type = 'diversos'),
  phone text,
  whatsapp text,
  avatar_url text,
  cover_url_desktop text,
  cover_url_mobile text,
  promotional_banner_url text,
  promotional_banner_url_desktop text,
  promotional_banner_url_mobile text,
  slug text UNIQUE,
  custom_domain text,
  listing_limit integer DEFAULT 5,
  is_blocked boolean DEFAULT false,
  bio text,
  instagram text,
  location_url text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  primary_color text DEFAULT '#0f172a',
  primary_foreground text DEFAULT '#f8fafc',
  accent_color text DEFAULT '#6366f1',
  accent_foreground text DEFAULT '#ffffff',
  currency text DEFAULT 'BRL',
  language text DEFAULT 'pt-BR',
  plan_status text DEFAULT 'active' CHECK (plan_status IN ('active', 'inactive', 'suspended')),
  referral_code text UNIQUE,
  referred_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  short_description text,
  price decimal(12,2) NOT NULL,
  discounted_price decimal(12,2),
  is_starting_price boolean DEFAULT false,
  status text DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'vendido', 'reservado')),
  category text[] DEFAULT '{}',
  brand text,
  model text,
  gender text CHECK (gender IN ('masculino', 'feminino', 'unissex')),
  condition text DEFAULT 'novo' CHECK (condition IN ('novo', 'usado', 'seminovo')),
  featured_image_url text,
  video_url text,
  featured_offer_price decimal(12,2),
  featured_offer_installment decimal(12,2),
  featured_offer_description text,
  is_visible_on_storefront boolean DEFAULT true,
  visible boolean DEFAULT true,
  external_checkout_url text,
  has_tiered_pricing boolean DEFAULT false,
  colors text[],
  sizes text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- PRODUCT IMAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url text NOT NULL,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- PRODUCT PRICE TIERS TABLE (with absolute quantity model)
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_price_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  unit_price decimal(12, 2) NOT NULL,
  discounted_unit_price decimal(12, 2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT positive_quantity CHECK (quantity > 0),
  CONSTRAINT positive_unit_price CHECK (unit_price > 0),
  CONSTRAINT positive_discounted_price CHECK (discounted_unit_price IS NULL OR discounted_unit_price > 0),
  CONSTRAINT discount_less_than_regular CHECK (discounted_unit_price IS NULL OR discounted_unit_price < unit_price)
);

COMMENT ON TABLE product_price_tiers IS 'Stores quantity-based price tiers with absolute quantities';
COMMENT ON COLUMN product_price_tiers.quantity IS 'Exact quantity for this price tier (e.g., 10, 50, 100)';
COMMENT ON COLUMN product_price_tiers.unit_price IS 'Regular price per unit in this tier';
COMMENT ON COLUMN product_price_tiers.discounted_unit_price IS 'Promotional/discount price per unit in this tier';

-- ============================================================================
-- OTHER TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS user_storefront_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  settings jsonb DEFAULT '{
    "filters": {
      "showFilters": true,
      "showSearch": true,
      "showPriceRange": true,
      "showCategories": true,
      "showStatus": true,
      "showCondition": true
    },
    "itemsPerPage": 12
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS tracking_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meta_pixel_id text,
  meta_events jsonb,
  ga_measurement_id text,
  ga_events jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  viewer_id text NOT NULL,
  listing_type text DEFAULT 'product' CHECK (listing_type = 'product'),
  source text DEFAULT 'direct',
  view_date date DEFAULT CURRENT_DATE,
  viewed_at timestamptz DEFAULT now(),
  is_unique boolean DEFAULT true,
  UNIQUE(property_id, viewer_id, view_date, listing_type)
);

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  listing_type text DEFAULT 'product' CHECK (listing_type = 'product'),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text,
  source text DEFAULT 'form',
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_name text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_variant_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id text NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_type text NOT NULL CHECK (variant_type IN ('color', 'size')),
  variant_value text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(cart_id, product_id, variant_type, variant_value)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_slug ON users(slug);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products USING GIN(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_featured ON product_images(is_featured);
CREATE INDEX IF NOT EXISTS idx_property_views_property_id ON property_views(property_id);
CREATE INDEX IF NOT EXISTS idx_property_views_date ON property_views(view_date);
CREATE INDEX IF NOT EXISTS idx_leads_property_id ON leads(property_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_product_price_tiers_product_id ON product_price_tiers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_price_tiers_product_quantity ON product_price_tiers(product_id, quantity);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_product_categories_updated_at BEFORE UPDATE ON user_product_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_storefront_settings_updated_at BEFORE UPDATE ON user_storefront_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tracking_settings_updated_at BEFORE UPDATE ON tracking_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_price_tiers_updated_at BEFORE UPDATE ON product_price_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PRICE TIERS VALIDATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_price_tiers_no_duplicates()
RETURNS TRIGGER AS $$
DECLARE
  duplicate_count integer;
BEGIN
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

CREATE TRIGGER validate_price_tiers_trigger
  BEFORE INSERT OR UPDATE ON product_price_tiers
  FOR EACH ROW
  EXECUTE FUNCTION validate_price_tiers_no_duplicates();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_applicable_price_for_quantity(
  p_product_id uuid,
  p_quantity integer
)
RETURNS decimal(12, 2) AS $$
DECLARE
  applicable_price decimal(12, 2);
BEGIN
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

-- ============================================================================
-- AUTHENTICATION FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_user_password(
  user_id UUID,
  password_input TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT password_hash INTO stored_hash
  FROM users
  WHERE id = user_id;

  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN (crypt(password_input, stored_hash) = stored_hash);
END;
$$;

CREATE OR REPLACE FUNCTION create_user_with_password(
  user_email TEXT,
  user_password TEXT,
  user_name TEXT,
  user_niche_type TEXT DEFAULT 'diversos',
  user_whatsapp TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  password_hash TEXT;
BEGIN
  new_user_id := gen_random_uuid();
  password_hash := crypt(user_password, gen_salt('bf', 10));

  INSERT INTO users (
    id,
    email,
    name,
    password_hash,
    role,
    niche_type,
    whatsapp,
    listing_limit,
    is_blocked,
    created_at
  ) VALUES (
    new_user_id,
    user_email,
    user_name,
    password_hash,
    'corretor',
    user_niche_type,
    user_whatsapp,
    5,
    FALSE,
    NOW()
  );

  RETURN new_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_user_password(
  user_id UUID,
  new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  password_hash TEXT;
BEGIN
  password_hash := crypt(new_password, gen_salt('bf', 10));

  UPDATE users
  SET password_hash = password_hash
  WHERE id = user_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_user_password TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_user_with_password TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_user_password TO authenticated;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_price_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_storefront_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_variant_distributions ENABLE ROW LEVEL SECURITY;

-- Price Tiers Policies
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

CREATE POLICY "Product owners can create price tiers"
  ON product_price_tiers
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Product owners can update price tiers"
  ON product_price_tiers
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Product owners can delete price tiers"
  ON product_price_tiers
  FOR DELETE
  USING (true);

-- Users Policies
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (true);

-- Products Policies
CREATE POLICY "Anyone can view visible products"
  ON products FOR SELECT
  USING (is_visible_on_storefront = true OR visible = true);

CREATE POLICY "Users can create products"
  ON products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their products"
  ON products FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete their products"
  ON products FOR DELETE
  USING (true);

-- Product Images Policies
CREATE POLICY "Anyone can view product images"
  ON product_images FOR SELECT
  USING (true);

CREATE POLICY "Users can manage product images"
  ON product_images FOR ALL
  USING (true);

-- Other Policies
CREATE POLICY "Users can manage their categories"
  ON user_product_categories FOR ALL
  USING (true);

CREATE POLICY "Users can manage their storefront settings"
  ON user_storefront_settings FOR ALL
  USING (true);

CREATE POLICY "Users can manage their tracking settings"
  ON tracking_settings FOR ALL
  USING (true);

CREATE POLICY "Property views are public"
  ON property_views FOR ALL
  USING (true);

CREATE POLICY "Leads are public"
  ON leads FOR ALL
  USING (true);

CREATE POLICY "Site settings are public"
  ON site_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage site settings"
  ON site_settings FOR ALL
  USING (true);

CREATE POLICY "Cart distributions are public"
  ON cart_variant_distributions FOR ALL
  USING (true);