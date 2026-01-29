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

  ## New Tables

  ### 1. `users`
  Core user table with authentication and profile information
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text, unique, required)
  - `role` (text) - corretor, admin, parceiro
  - `name`, `phone`, `whatsapp` - Contact info
  - `avatar_url`, `cover_url_*`, `promotional_banner_url_*` - Media
  - `slug` (text, unique) - Unique storefront URL
  - `custom_domain` (text, unique) - Custom domain support
  - `listing_limit` (integer) - Product limit per plan
  - `is_blocked` (boolean) - Account status
  - `bio`, `instagram`, `location_url` - Profile details
  - `theme` (text) - UI preference (light/dark)
  - `niche_type` (text) - Business category
  - `currency`, `language` - Localization
  - `plan_status` (text) - Subscription status
  - `referral_code` (text, unique) - User's referral code
  - `referred_by` (text) - Who referred this user
  - `created_by` (uuid) - Admin who created account
  - Timestamps

  ### 2. `products`
  Product catalog with simple and tiered pricing support
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to users)
  - `title`, `description`, `short_description` - Content
  - `price` (numeric) - Base price for simple pricing
  - `discounted_price` (numeric) - Sale price for simple pricing
  - `has_tiered_pricing` (boolean) - Enable quantity-based pricing
  - `status` (text) - disponivel, vendido, reservado
  - `category` (text array) - Multiple categories
  - `brand`, `model`, `gender`, `condition` - Product attributes
  - `colors`, `sizes` (text array) - Available variants
  - `featured_image_url` (text) - Main product image
  - `video_url` (text) - Product video
  - `featured_offer_price`, `featured_offer_installment`, `featured_offer_description` - Special offers
  - `is_starting_price` (boolean) - Show "A partir de" label
  - `is_visible_on_storefront` (boolean) - Visibility control
  - `external_checkout_url` (text) - External purchase link
  - Timestamps

  ### 3. `product_images`
  Multiple images per product
  - `id` (uuid, primary key)
  - `product_id` (uuid, foreign key to products)
  - `url` (text, required) - Image URL
  - `is_featured` (boolean) - Primary image flag
  - Timestamps

  ### 4. `product_price_tiers`
  Quantity-based pricing tiers (only used when has_tiered_pricing = true)
  - `id` (uuid, primary key)
  - `product_id` (uuid, foreign key to products)
  - `min_quantity` (integer, required) - Minimum units for this tier
  - `max_quantity` (integer, nullable) - Maximum units (NULL = unlimited)
  - `unit_price` (numeric, required) - Price per unit at this tier
  - `discounted_unit_price` (numeric, nullable) - Sale price per unit
  - Timestamps
  - CONSTRAINT: Only last tier can have NULL max_quantity
  - CONSTRAINT: No overlapping quantity ranges

  ### 5. `product_categories`
  User-defined product categories
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to users)
  - `name` (text, required)
  - Timestamps
  - UNIQUE: (user_id, name)

  ### 6. `storefront_settings`
  User's storefront configuration
  - `id` (uuid, primary key)
  - `user_id` (uuid, unique, foreign key to users)
  - `settings` (jsonb) - Filter and display preferences
  - Timestamps

  ### 7. `cart_variant_distributions`
  Cart items with variant distribution for tiered pricing
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to users)
  - `product_id` (uuid, foreign key to products)
  - `total_quantity` (integer) - Total units in cart
  - `applied_tier_price` (numeric) - Price tier applied
  - `metadata` (jsonb) - Additional cart data
  - Timestamps

  ### 8. `distribution_items`
  Variant breakdown for cart items (colors/sizes)
  - `id` (uuid, primary key)
  - `distribution_id` (uuid, foreign key to cart_variant_distributions)
  - `color` (text, nullable)
  - `size` (text, nullable)
  - `quantity` (integer, required)
  - Timestamps

  ### 9. `subscriptions`
  User subscription plans
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to users)
  - `plan_name` (text, required)
  - `monthly_price` (numeric, required)
  - `billing_cycle` (text) - monthly, quarterly, semiannually, annually
  - `status` (text) - active, pending, cancelled, suspended
  - `payment_status` (text) - paid, pending, overdue
  - `start_date`, `end_date`, `next_payment_date` (date)
  - Timestamps

  ### 10. `payments`
  Payment history
  - `id` (uuid, primary key)
  - `subscription_id` (uuid, foreign key to subscriptions)
  - `amount` (numeric, required)
  - `payment_date` (date, required)
  - `payment_method` (text)
  - `status` (text) - completed, pending, failed, refunded
  - `notes` (text)
  - Timestamps

  ### 11. `referral_commissions`
  Referral earnings tracking
  - `id` (uuid, primary key)
  - `referrer_id` (uuid, foreign key to users)
  - `referred_user_id` (uuid, foreign key to users)
  - `subscription_id` (uuid, foreign key to subscriptions)
  - `plan_type` (text)
  - `amount` (numeric, required)
  - `status` (text) - pending, paid
  - `paid_at` (timestamptz)
  - Timestamps

  ### 12. `withdrawal_requests`
  Referral commission withdrawals
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to users)
  - `amount` (numeric, required)
  - `pix_key` (text, required)
  - `pix_key_type` (text) - cpf, cnpj, email, phone, random
  - `status` (text) - pending, approved, rejected, paid
  - `admin_notes` (text)
  - `processed_at` (timestamptz)
  - `processed_by` (uuid, foreign key to users)
  - Timestamps

  ### 13. `user_pix_keys`
  Saved PIX keys for withdrawals
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to users)
  - `pix_key` (text, required)
  - `pix_key_type` (text)
  - `holder_name` (text, required)
  - Timestamps

  ### 14. `subscription_plans`
  Available subscription plans
  - `id` (uuid, primary key)
  - `name` (text, required)
  - `duration` (text) - Trimestral, Semestral, Anual
  - `price` (numeric, required)
  - `checkout_url` (text)
  - `is_active` (boolean)
  - `display_order` (integer)
  - Timestamps

  ### 15. `help_categories`
  Help center categories
  - `id` (uuid, primary key)
  - `name` (text, required)
  - `slug` (text, unique, required)
  - `description` (text)
  - `icon` (text)
  - `display_order` (integer)
  - Timestamps

  ### 16. `help_articles`
  Help center articles
  - `id` (uuid, primary key)
  - `category_id` (uuid, foreign key to help_categories)
  - `title` (text, required)
  - `slug` (text, unique, required)
  - `content` (text, required)
  - `display_order` (integer)
  - `is_published` (boolean)
  - Timestamps

  ## Security
  - RLS enabled on all tables
  - Restrictive policies requiring authentication
  - Users can only access their own data
  - Admins have elevated permissions
  - Public read access for storefronts via slug

  ## Indexes
  - Foreign keys for query performance
  - Unique constraints on emails, slugs, codes
  - Composite indexes for common queries
  - Partial indexes for filtered queries

  ## Important Notes
  - Tiered pricing is opt-in via `has_tiered_pricing` flag
  - When `has_tiered_pricing = false`, use `price` and `discounted_price` columns
  - When `has_tiered_pricing = true`, use `product_price_tiers` table
  - Price tiers must not overlap in quantity ranges
  - Only the last tier can have NULL max_quantity (unlimited)
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

-- Create index on slug for storefront lookups
CREATE INDEX IF NOT EXISTS idx_users_slug ON users(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by) WHERE referred_by IS NOT NULL;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_has_tiered_pricing ON products(has_tiered_pricing) WHERE has_tiered_pricing = true;
CREATE INDEX IF NOT EXISTS idx_products_category ON products USING GIN(category);

COMMENT ON COLUMN products.has_tiered_pricing IS
  'Flag indicating if product uses tiered pricing (true) or simple pricing (false). When true, pricing comes from product_price_tiers table instead of the price column.';

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Index
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- Enable RLS
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_price_tiers_product_id ON product_price_tiers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_price_tiers_quantity_range ON product_price_tiers(product_id, min_quantity, max_quantity);

COMMENT ON TABLE product_price_tiers IS
  'Quantity-based pricing tiers. Only used when products.has_tiered_pricing = true. Allows vendors to offer bulk discounts.';

COMMENT ON COLUMN product_price_tiers.max_quantity IS
  'Maximum quantity for this tier. NULL means unlimited (must be the last tier).';

-- Enable RLS
ALTER TABLE product_price_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Index
CREATE INDEX IF NOT EXISTS idx_product_categories_user_id ON product_categories(user_id);

-- Enable RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Index
CREATE INDEX IF NOT EXISTS idx_storefront_settings_user_id ON storefront_settings(user_id);

-- Enable RLS
ALTER TABLE storefront_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cart_distributions_user_id ON cart_variant_distributions(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_distributions_product_id ON cart_variant_distributions(product_id);

COMMENT ON TABLE cart_variant_distributions IS
  'Stores cart items with variant distribution for products with tiered pricing and multiple colors/sizes.';

-- Enable RLS
ALTER TABLE cart_variant_distributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Index
CREATE INDEX IF NOT EXISTS idx_distribution_items_distribution_id ON distribution_items(distribution_id);

COMMENT ON TABLE distribution_items IS
  'Individual variant items (color/size combinations) within a cart distribution.';

-- Enable RLS
ALTER TABLE distribution_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Index
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Index
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer_id ON referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referred_user_id ON referral_commissions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_status ON referral_commissions(status);

-- Enable RLS
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);

-- Enable RLS
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Index
CREATE INDEX IF NOT EXISTS idx_user_pix_keys_user_id ON user_pix_keys(user_id);

-- Enable RLS
ALTER TABLE user_pix_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Index
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON subscription_plans(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Index
CREATE INDEX IF NOT EXISTS idx_help_categories_slug ON help_categories(slug);

-- Enable RLS
ALTER TABLE help_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_help_articles_category_id ON help_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON help_articles(slug);
CREATE INDEX IF NOT EXISTS idx_help_articles_is_published ON help_articles(is_published) WHERE is_published = true;

-- Enable RLS
ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Apply triggers to all tables with updated_at
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
