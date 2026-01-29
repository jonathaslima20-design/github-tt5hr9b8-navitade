/**
 * Automatic Nike Products Fix Utility
 * Addresses all 5 potential causes for Nike products not appearing
 */

import { supabase } from '@/lib/supabase';
import { syncUserCategoriesWithStorefrontSettings } from '@/lib/utils';
import { sanitizeCategoryName, logCategoryOperation } from '@/lib/categoryUtils';

export interface NikeFixReport {
  totalNikeProducts: number;
  visibleProducts: number;
  hiddenProducts: number;
  availableProducts: number;
  soldProducts: number;
  reservedProducts: number;
  categoriesNormalized: number;
  settingsUpdated: boolean;
  errors: string[];
}

/**
 * Comprehensive fix for all Nike product visibility issues
 */
export async function autoFixNikeProducts(userId: string): Promise<NikeFixReport> {
  const report: NikeFixReport = {
    totalNikeProducts: 0,
    visibleProducts: 0,
    hiddenProducts: 0,
    availableProducts: 0,
    soldProducts: 0,
    reservedProducts: 0,
    categoriesNormalized: 0,
    settingsUpdated: false,
    errors: []
  };

  try {
    logCategoryOperation('AUTO_FIX_START', { userId });

    // 1. CAUSE #1: Normalize Nike category variations
    const { data: allProducts, error: fetchError } = await supabase
      .from('products')
      .select('id, title, category, status, is_visible_on_storefront')
      .eq('user_id', userId);

    if (fetchError) {
      report.errors.push(`Error fetching products: ${fetchError.message}`);
      return report;
    }

    // Find and normalize Nike products
    const nikeProducts = allProducts?.filter(product => 
      product.category && Array.isArray(product.category) && 
      product.category.some(cat => cat.toLowerCase().includes('nike'))
    ) || [];

    report.totalNikeProducts = nikeProducts.length;

    // Normalize category names
    for (const product of nikeProducts) {
      if (product.category && Array.isArray(product.category)) {
        const normalizedCategories = product.category.map(cat => {
          if (cat.toLowerCase().includes('nike') && cat !== 'Nike') {
            report.categoriesNormalized++;
            return 'Nike';
          }
          return cat;
        });

        if (JSON.stringify(normalizedCategories) !== JSON.stringify(product.category)) {
          const { error } = await supabase
            .from('products')
            .update({ category: normalizedCategories })
            .eq('id', product.id);

          if (error) {
            report.errors.push(`Error normalizing category for product ${product.id}: ${error.message}`);
          }
        }
      }
    }

    // 2. CAUSE #2: Enable visibility for available Nike products
    const { data: updatedProducts, error: visibilityError } = await supabase
      .from('products')
      .update({ is_visible_on_storefront: true })
      .eq('user_id', userId)
      .contains('category', ['Nike'])
      .eq('status', 'disponivel')
      .eq('is_visible_on_storefront', false)
      .select('id');

    if (visibilityError) {
      report.errors.push(`Error updating visibility: ${visibilityError.message}`);
    } else {
      logCategoryOperation('VISIBILITY_UPDATED', { count: updatedProducts?.length || 0 });
    }

    // 3. CAUSE #3: Get final stats after fixes
    const { data: finalNikeProducts, error: finalError } = await supabase
      .from('products')
      .select('id, status, is_visible_on_storefront')
      .eq('user_id', userId)
      .contains('category', ['Nike']);

    if (!finalError && finalNikeProducts) {
      report.visibleProducts = finalNikeProducts.filter(p => p.is_visible_on_storefront).length;
      report.hiddenProducts = finalNikeProducts.filter(p => !p.is_visible_on_storefront).length;
      report.availableProducts = finalNikeProducts.filter(p => p.status === 'disponivel').length;
      report.soldProducts = finalNikeProducts.filter(p => p.status === 'vendido').length;
      report.reservedProducts = finalNikeProducts.filter(p => p.status === 'reservado').length;
    }

    // 4. CAUSE #4: Update storefront settings
    try {
      await syncUserCategoriesWithStorefrontSettings(userId);
      
      // Ensure Nike category is enabled in settings
      const { data: settings, error: settingsError } = await supabase
        .from('user_storefront_settings')
        .select('settings')
        .eq('user_id', userId)
        .single();

      if (!settingsError && settings?.settings?.categoryDisplaySettings) {
        const categorySettings = settings.settings.categoryDisplaySettings;
        const nikeIndex = categorySettings.findIndex((cat: any) => cat.category === 'Nike');
        
        if (nikeIndex >= 0) {
          // Update existing Nike setting
          categorySettings[nikeIndex] = {
            ...categorySettings[nikeIndex],
            enabled: true,
            category: 'Nike' // Ensure exact spelling
          };
        } else {
          // Add Nike category setting
          categorySettings.push({
            category: 'Nike',
            order: categorySettings.length,
            enabled: true
          });
        }

        const { error: updateError } = await supabase
          .from('user_storefront_settings')
          .update({
            settings: {
              ...settings.settings,
              categoryDisplaySettings: categorySettings
            }
          })
          .eq('user_id', userId);

        if (updateError) {
          report.errors.push(`Error updating settings: ${updateError.message}`);
        } else {
          report.settingsUpdated = true;
        }
      }
    } catch (syncError: any) {
      report.errors.push(`Error syncing categories: ${syncError.message}`);
    }

    // 5. CAUSE #5: Clear any potential cache issues by forcing a small delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    logCategoryOperation('AUTO_FIX_COMPLETE', report);
    return report;

  } catch (error: any) {
    report.errors.push(`Unexpected error: ${error.message}`);
    logCategoryOperation('AUTO_FIX_ERROR', error);
    return report;
  }
}

/**
 * Quick diagnostic function to check Nike products status
 */
export async function diagnoseNikeProducts(userId: string): Promise<void> {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('id, title, category, status, is_visible_on_storefront, display_order')
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error fetching products:', error);
      return;
    }

    const nikeProducts = products?.filter(p => 
      p.category && Array.isArray(p.category) && 
      p.category.some(cat => cat.toLowerCase().includes('nike'))
    ) || [];

    console.log('🔍 NIKE PRODUCTS DIAGNOSTIC REPORT');
    console.log('=====================================');
    console.log(`📦 Total Nike products: ${nikeProducts.length}`);
    console.log(`👁️ Visible products: ${nikeProducts.filter(p => p.is_visible_on_storefront).length}`);
    console.log(`🚫 Hidden products: ${nikeProducts.filter(p => !p.is_visible_on_storefront).length}`);
    console.log(`✅ Available products: ${nikeProducts.filter(p => p.status === 'disponivel').length}`);
    console.log(`❌ Sold products: ${nikeProducts.filter(p => p.status === 'vendido').length}`);
    console.log(`⏳ Reserved products: ${nikeProducts.filter(p => p.status === 'reservado').length}`);
    
    const categoryVariations = [...new Set(
      nikeProducts.flatMap(p => p.category || []).filter(cat => cat.toLowerCase().includes('nike'))
    )];
    console.log(`🏷️ Category variations: ${categoryVariations.join(', ')}`);

    // Show products that should be visible but aren't
    const shouldBeVisible = nikeProducts.filter(p => 
      p.status === 'disponivel' && !p.is_visible_on_storefront
    );
    
    if (shouldBeVisible.length > 0) {
      console.log('\n⚠️ PRODUCTS THAT SHOULD BE VISIBLE:');
      shouldBeVisible.forEach(p => {
        console.log(`- ${p.title} (ID: ${p.id.substring(0, 8)})`);
      });
    }

  } catch (error) {
    console.error('❌ Diagnostic error:', error);
  }
}

// Global functions for browser console
declare global {
  interface Window {
    fixNikeProducts: (userId: string) => Promise<NikeFixReport>;
    diagnoseNike: (userId: string) => Promise<void>;
  }
}

if (typeof window !== 'undefined') {
  window.fixNikeProducts = autoFixNikeProducts;
  window.diagnoseNike = diagnoseNikeProducts;
}