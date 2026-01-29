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

  ### 8. `subscriptions`
  User subscription tracking
  - `id` (uuid, primary key)
  - `user_id` (uuid, unique, foreign key to users)
  - `plan_name` (text) - Subscription plan name
  - `plan_duration` (text) - Trimestral, Semestral, Anual
  - `plan_price` (numeric) - Amount paid
  - `status` (text) - active, expired, cancelled
  - `start_date`, `end_date` - Subscription period
  - `payment_method` (text)
  - Timestamps

  ### 9. `payments`
  Payment transaction log
  - `id` (uuid, primary key)
  - `subscription_id` (uuid, foreign key to subscriptions)
  - `user_id` (uuid, foreign key to users)
  - `amount` (numeric)
  - `status` (text) - pending, completed, failed, refunded
  - `payment_method` (text)
  - `transaction_id` (text, unique)
  - `metadata` (jsonb)
  - Timestamps

  ### 10. `referral_commissions`
  Commission tracking for referrals
  - `id` (uuid, primary key)
  - `referrer_id` (uuid, foreign key to users) - Who referred
  - `referred_user_id` (uuid, foreign key to users) - Who was referred
  - `subscription_id` (uuid, foreign key to subscriptions) - Related subscription
  - `plan_type` (text) - Plan that generated commission
  - `amount` (numeric) - Commission amount
  - `status` (text) - pending, paid
  - `paid_at` (timestamptz)
  - Timestamps

  ### 11. `withdrawal_requests`
  User requests to withdraw commissions
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to users)
  - `amount` (numeric)
  - `pix_key`, `pix_key_type` - PIX payment info
  - `status` (text) - pending, approved, rejected, paid
  - `admin_notes` (text)
  - `processed_at`, `processed_by` - Admin processing
  - Timestamps

  ### 12. `user_pix_keys`
  User's registered PIX keys
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to users)
  - `pix_key`, `pix_key_type` - PIX key info
  - `holder_name` (text) - Account holder
  - Timestamps
  - UNIQUE: (user_id, pix_key)

  ### 13. `subscription_plans`
  Available subscription plans
  - `id` (uuid, primary key)
  - `name` (text)
  - `duration` (text) - Trimestral, Semestral, Anual
  - `price` (numeric)
  - `checkout_url` (text)
  - `is_active` (boolean)
  - `display_order` (integer)
  - Timestamps

  ### 14. `help_categories`
  Help center categories
  - `id` (uuid, primary key)
  - `name` (text, unique)
  - `slug` (text, unique)
  - `description` (text)
  - `icon` (text)
  - `display_order` (integer)
  - Timestamps

  ### 15. `help_articles`
  Help center articles
  - `id` (uuid, primary key)
  - `category_id` (uuid, foreign key to help_categories)
  - `title` (text)
  - `slug` (text, unique)
  - `content` (text)
  - `is_published` (boolean)
  - `view_count` (integer)
  - `helpful_count`, `not_helpful_count` (integer)
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