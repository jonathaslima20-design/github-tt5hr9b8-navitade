# Database Migration Fix Instructions

## Problem Summary

The application is experiencing an error when updating products:

```
"Only the last tier can have unlimited (NULL) max_quantity for product..."
```

This error occurs because:
1. The `products` table in your Supabase database is missing the `has_tiered_pricing` column
2. The migration files exist locally but haven't been applied to the database yet
3. The database is currently empty (no tables exist)

## Root Cause

The migration file `20251023030229_20251023012612_create_product_price_tiers_system.sql` assumes the `has_tiered_pricing` column already exists on the `products` table, but no previous migration actually created this column.

## Solution

You have two options to fix this:

### Option 1: Use Supabase CLI (Recommended)

If you have the Supabase CLI installed:

```bash
# Navigate to your project directory
cd /tmp/cc-agent/59196846/project

# Link to your Supabase project (if not already linked)
supabase link --project-ref xfgwohchorfzmrfzmemm

# Push all migrations to your database
supabase db push
```

This will apply all migrations in the correct order, including the fix migration that was created at:
- `supabase/migrations/20251025130000_add_missing_has_tiered_pricing_column.sql`

### Option 2: Manual Application via Supabase Dashboard

1. Go to your Supabase Dashboard: https://app.supabase.com/project/xfgwohchorfzmrfzmemm

2. Navigate to the SQL Editor

3. Apply migrations in this **exact order** by copying and pasting the SQL content from each file:

   **Critical migrations to apply in order:**

   1. `20250609164838_autumn_recipe.sql` - Creates base schema (users, products, etc.)
   2. `20250609164906_sunny_salad.sql`
   3. `20250609164922_empty_term.sql`
   4. `20250609164928_still_violet.sql`
   5. Continue with all remaining migrations in chronological order...
   6. `20251022000000_add_has_tiered_pricing_column.sql` - **NEW: Adds the missing column**
   7. `20251023030229_20251023012612_create_product_price_tiers_system.sql` - Creates price tiers system
   8. All subsequent migrations...
   9. `20251025130000_add_missing_has_tiered_pricing_column.sql` - **Backup/idempotent fix**

## What Was Fixed

Two new migration files were created:

1. **`20251022000000_add_has_tiered_pricing_column.sql`**
   - Adds `has_tiered_pricing` boolean column to products table
   - Positioned BEFORE the tiered pricing system migration
   - This ensures the column exists when needed

2. **`20251025130000_add_missing_has_tiered_pricing_column.sql`**
   - Backup/idempotent migration that adds the column if missing
   - Can be run safely even if the column already exists
   - Also updates existing products that have price tiers

## Verification

After applying the migrations, verify the fix:

```sql
-- Check if the column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'has_tiered_pricing';

-- Should return:
-- column_name         | data_type | is_nullable | column_default
-- has_tiered_pricing  | boolean   | NO          | false

-- Check that tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should include: products, product_price_tiers, users, etc.
```

## What the Column Does

- `has_tiered_pricing` (boolean):
  - When `true`: Product uses quantity-based pricing from `product_price_tiers` table
  - When `false`: Product uses simple pricing from the `price` column
  - Default: `false` (backward compatible)

## Important Notes

- The migrations are **idempotent** - safe to run multiple times
- All existing products will default to `has_tiered_pricing = false`
- No data will be lost
- The application will work correctly after migrations are applied

## Next Steps

1. Apply the migrations using one of the methods above
2. Verify the schema is correct
3. Test creating/updating products in the application
4. The error should be resolved

## Support

If you encounter any issues:
1. Check the Supabase logs in your dashboard
2. Verify all migration files were applied in order
3. Confirm the `has_tiered_pricing` column exists in the products table
