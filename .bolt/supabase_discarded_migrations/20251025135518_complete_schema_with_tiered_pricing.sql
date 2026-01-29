/*
  # Complete Database Schema with Tiered Pricing System

  ## Overview
  This migration creates the complete database schema from scratch, including:
  - User management (corretores, admins, partners)
  - Product catalog with tiered pricing support
  - Subscription and payment tracking
  - Referral system
  - Help center content
  - Cart and distribution management

  ## Security
  - RLS enabled on all tables
  - Restrictive policies requiring authentication
  - Users can only access their own data
  - Admins have elevated permissions
  - Public read access for storefronts via slug
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- USERS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'corretor' CHECK (role IN ('corretor', 'admin', 'parceiro')),
  name text NOT NULL,
  phone text,
  whatsapp text,
  avatar_url text,
  cover_url_desktop text,
  cover_url_mobile text,
  promotional_banner_url text,
  promotional_banner_url_desktop text,
  promotional_banner_url_mobile text,
  slug text UNIQUE,
  custom_domain text UNIQUE,
  listing_limit integer DEFAULT 10 NOT NULL,
  is_blocked boolean DEFAULT false NOT NULL,
  bio text,
  instagram text,
  location_url text,
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  niche_type text DEFAULT 'diversos',
  currency text DEFAULT 'BRL',
  language text DEFAULT 'pt-BR',
  plan_status text DEFAULT 'active' CHECK (plan_status IN ('active', 'inactive', 'suspended')),
  referral_code text UNIQUE,
  referred_by text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_slug ON users(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by) WHERE referred_by IS NOT NULL;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Public can read user profile by slug"
  ON users FOR SELECT
  TO anon, authenticated
  USING (slug IS NOT NULL);

-- =====================================================================
-- PRODUCTS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  short_description text,
  price numeric(10, 2) DEFAULT 0 NOT NULL,
  discounted_price numeric(10, 2),
  has_tiered_pricing boolean DEFAULT false NOT NULL,
  status text DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'vendido', 'reservado')),
  category text[] DEFAULT '{}',
  brand text,
  model text,
  gender text CHECK (gender IN ('masculino', 'feminino', 'unissex')),
  condition text DEFAULT 'novo' CHECK (condition IN ('novo', 'usado', 'seminovo')),
  colors text[] DEFAULT '{}',
  sizes text[] DEFAULT '{}',
  featured_image_url text,
  video_url text,
  featured_offer_price numeric(10, 2),
  featured_offer_installment integer,
  featured_offer_description text,
  is_starting_price boolean DEFAULT false,
  is_visible_on_storefront boolean DEFAULT true,
  external_checkout_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_has_tiered_pricing ON products(has_tiered_pricing) WHERE has_tiered_pricing = true;
CREATE INDEX IF NOT EXISTS idx_products_category ON products USING GIN(category);

COMMENT ON COLUMN products.has_tiered_pricing IS
  'Flag indicating if product uses tiered pricing (true) or simple pricing (false). When true, pricing comes from product_price_tiers table instead of the price column.';

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products"
  ON products FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view visible products"
  ON products FOR SELECT
  TO anon, authenticated
  USING (
    is_visible_on_storefront = true
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = products.user_id
      AND users.is_blocked = false
    )
  );

CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================================
-- PRODUCT IMAGES TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  is_featured boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own product images"
  ON product_images FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view product images"
  ON product_images FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.is_visible_on_storefront = true
    )
  );

-- =====================================================================
-- PRODUCT PRICE TIERS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS product_price_tiers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  min_quantity integer NOT NULL CHECK (min_quantity > 0),
  max_quantity integer CHECK (max_quantity IS NULL OR max_quantity >= min_quantity),
  unit_price numeric(10, 2) NOT NULL CHECK (unit_price >= 0),
  discounted_unit_price numeric(10, 2) CHECK (discounted_unit_price IS NULL OR discounted_unit_price >= 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_price_tiers_product_id ON product_price_tiers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_price_tiers_quantity_range ON product_price_tiers(product_id, min_quantity, max_quantity);

COMMENT ON TABLE product_price_tiers IS
  'Quantity-based pricing tiers. Only used when products.has_tiered_pricing = true. Allows vendors to offer bulk discounts.';

COMMENT ON COLUMN product_price_tiers.max_quantity IS
  'Maximum quantity for this tier. NULL means unlimited (must be the last tier).';

ALTER TABLE product_price_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own product price tiers"
  ON product_price_tiers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_price_tiers.product_id
      AND products.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_price_tiers.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view product price tiers"
  ON product_price_tiers FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_price_tiers.product_id
      AND products.is_visible_on_storefront = true
      AND products.has_tiered_pricing = true
    )
  );

-- =====================================================================
-- PRODUCT CATEGORIES TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_user_id ON product_categories(user_id);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own categories"
  ON product_categories FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- STOREFRONT SETTINGS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS storefront_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid UNIQUE REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storefront_settings_user_id ON storefront_settings(user_id);

ALTER TABLE storefront_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own storefront settings"
  ON storefront_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- CART VARIANT DISTRIBUTIONS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS cart_variant_distributions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  total_quantity integer DEFAULT 0 NOT NULL CHECK (total_quantity >= 0),
  applied_tier_price numeric(10, 2) DEFAULT 0 NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cart_distributions_user_id ON cart_variant_distributions(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_distributions_product_id ON cart_variant_distributions(product_id);

COMMENT ON TABLE cart_variant_distributions IS
  'Stores cart items with variant distribution for products with tiered pricing and multiple colors/sizes.';

ALTER TABLE cart_variant_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cart distributions"
  ON cart_variant_distributions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- DISTRIBUTION ITEMS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS distribution_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  distribution_id uuid REFERENCES cart_variant_distributions(id) ON DELETE CASCADE NOT NULL,
  color text,
  size text,
  quantity integer DEFAULT 0 NOT NULL CHECK (quantity >= 0),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_distribution_items_distribution_id ON distribution_items(distribution_id);

COMMENT ON TABLE distribution_items IS
  'Individual variant items (color/size combinations) within a cart distribution.';

ALTER TABLE distribution_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own distribution items"
  ON distribution_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cart_variant_distributions
      WHERE cart_variant_distributions.id = distribution_items.distribution_id
      AND cart_variant_distributions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cart_variant_distributions
      WHERE cart_variant_distributions.id = distribution_items.distribution_id
      AND cart_variant_distributions.user_id = auth.uid()
    )
  );

-- =====================================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  plan_name text NOT NULL,
  monthly_price numeric(10, 2) NOT NULL,
  billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'semiannually', 'annually')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'pending', 'cancelled', 'suspended')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'overdue')),
  start_date date NOT NULL,
  end_date date,
  next_payment_date date NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions"
  ON subscriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- =====================================================================
-- PAYMENTS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10, 2) NOT NULL,
  payment_date date NOT NULL,
  payment_method text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.id = payments.subscription_id
      AND subscriptions.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- =====================================================================
-- REFERRAL COMMISSIONS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS referral_commissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  referred_user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE NOT NULL,
  plan_type text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer_id ON referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referred_user_id ON referral_commissions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_status ON referral_commissions(status);

ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral commissions"
  ON referral_commissions FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id);

CREATE POLICY "Admins can manage all referral commissions"
  ON referral_commissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- =====================================================================
-- WITHDRAWAL REQUESTS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10, 2) NOT NULL,
  pix_key text NOT NULL,
  pix_key_type text NOT NULL CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  admin_notes text,
  processed_at timestamptz,
  processed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);

ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawal requests"
  ON withdrawal_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own withdrawal requests"
  ON withdrawal_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all withdrawal requests"
  ON withdrawal_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- =====================================================================
-- USER PIX KEYS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS user_pix_keys (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  pix_key text NOT NULL,
  pix_key_type text NOT NULL CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
  holder_name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, pix_key)
);

CREATE INDEX IF NOT EXISTS idx_user_pix_keys_user_id ON user_pix_keys(user_id);

ALTER TABLE user_pix_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pix keys"
  ON user_pix_keys FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- SUBSCRIPTION PLANS TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  duration text NOT NULL CHECK (duration IN ('Trimestral', 'Semestral', 'Anual')),
  price numeric(10, 2) NOT NULL,
  checkout_url text,
  is_active boolean DEFAULT true NOT NULL,
  display_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON subscription_plans(is_active) WHERE is_active = true;

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage subscription plans"
  ON subscription_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- =====================================================================
-- HELP CATEGORIES TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS help_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon text,
  display_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_help_categories_slug ON help_categories(slug);

ALTER TABLE help_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view help categories"
  ON help_categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage help categories"
  ON help_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- =====================================================================
-- HELP ARTICLES TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS help_articles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id uuid REFERENCES help_categories(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL,
  display_order integer DEFAULT 0 NOT NULL,
  is_published boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_help_articles_category_id ON help_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON help_articles(slug);
CREATE INDEX IF NOT EXISTS idx_help_articles_is_published ON help_articles(is_published) WHERE is_published = true;

ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published help articles"
  ON help_articles FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "Admins can manage help articles"
  ON help_articles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- =====================================================================
-- UPDATED_AT TRIGGERS
-- =====================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND column_name = 'updated_at'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;
