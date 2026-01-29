/*
  # Create Core Schema for VitrineTurbo

  This migration creates the essential tables for the social media preview system:
  - users (corretores/storefronts)
  - products (itens sold)
  - product_images (product photos)
  
  Without these tables, the edge function cannot generate dynamic social media previews.

  ## Tables Created:
  1. users - Store information about corretores
  2. products - Store product listings  
  3. product_images - Store product images
  4. product_categories - Store category mappings
  5. user_product_categories - Store user-specific categories
*/

-- Create users table (corretores/storefronts)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  bio text,
  avatar_url text,
  cover_url_desktop text,
  cover_url_mobile text,
  language text DEFAULT 'pt-BR',
  currency text DEFAULT 'BRL',
  theme text DEFAULT 'light',
  phone text,
  whatsapp_number text,
  role text DEFAULT 'corretor' CHECK (role IN ('admin', 'corretor', 'moderator')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  max_images_per_product INTEGER NOT NULL DEFAULT 10,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_email_valid CHECK (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  short_description text,
  price numeric(10,2),
  discounted_price numeric(10,2),
  is_starting_price boolean DEFAULT false,
  featured_image_url text,
  colors text[],
  sizes text[],
  category text,
  has_tiered_pricing boolean DEFAULT false,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_slug_unique_per_user UNIQUE(user_id, slug),
  CONSTRAINT valid_price CHECK (price IS NULL OR price >= 0),
  CONSTRAINT valid_discounted_price CHECK (discounted_price IS NULL OR discounted_price >= 0)
);

-- Create product_images table
CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url text NOT NULL,
  is_featured boolean DEFAULT false,
  media_type text DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'document')),
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT valid_display_order CHECK (display_order >= 0)
);

-- Create product_categories table
CREATE TABLE IF NOT EXISTS public.product_categories (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create user_product_categories table (user-specific categories)
CREATE TABLE IF NOT EXISTS public.user_product_categories (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unique_category_per_user UNIQUE(user_id, name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_slug ON public.users(slug);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_featured ON public.product_images(product_id, is_featured);
CREATE INDEX IF NOT EXISTS idx_user_categories_user_id ON public.user_product_categories(user_id);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_product_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users are publicly readable for previews" ON public.users
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own account" ON public.users
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for products table
CREATE POLICY "Products are publicly readable" ON public.products
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own products" ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" ON public.products
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" ON public.products
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for product_images table
CREATE POLICY "Product images are publicly readable" ON public.product_images
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their product images" ON public.product_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_images.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their product images" ON public.product_images
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_images.product_id
      AND products.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_images.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their product images" ON public.product_images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_images.product_id
      AND products.user_id = auth.uid()
    )
  );

-- RLS Policies for product_categories table
CREATE POLICY "Categories are publicly readable" ON public.product_categories
  FOR SELECT
  USING (true);

-- RLS Policies for user_product_categories table
CREATE POLICY "User categories are publicly readable" ON public.user_product_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their categories" ON public.user_product_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their categories" ON public.user_product_categories
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their categories" ON public.user_product_categories
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
