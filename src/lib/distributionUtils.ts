import { supabase } from './supabase';
import type { VariantDistribution, DistributionItem, Product, PriceTier } from '@/types';
import { calculateApplicablePrice } from './tieredPricingUtils';

export interface CreateDistributionParams {
  product_id: string;
  total_quantity: number;
  items: Array<{
    color?: string;
    size?: string;
    quantity: number;
  }>;
}

export async function createDistribution(
  params: CreateDistributionParams,
  tiers: PriceTier[],
  basePrice: number,
  discountedPrice?: number
): Promise<VariantDistribution | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if the table exists before attempting to create
    const { error: tableCheckError } = await supabase
      .from('cart_variant_distributions')
      .select('id')
      .limit(1);

    if (tableCheckError && tableCheckError.code === '42P01') {
      console.warn('Cart distribution tables not found. Please apply database migrations.');
      return null;
    }

    const priceResult = calculateApplicablePrice(
      params.total_quantity,
      tiers,
      basePrice,
      discountedPrice
    );

    const applicableTier = tiers.find(
      tier => params.total_quantity >= tier.min_quantity && (!tier.max_quantity || params.total_quantity <= tier.max_quantity)
    );

    const { data: distribution, error: distError } = await supabase
      .from('cart_variant_distributions')
      .insert({
        user_id: user.id,
        product_id: params.product_id,
        total_quantity: params.total_quantity,
        applied_tier_price: priceResult.unitPrice,
        metadata: {
          tier_id: applicableTier?.id,
          min_quantity: applicableTier?.min_quantity,
          max_quantity: applicableTier?.max_quantity,
          original_price: basePrice,
        }
      })
      .select()
      .single();

    if (distError) throw distError;

    if (params.items.length > 0) {
      const itemsToInsert = params.items.map(item => ({
        distribution_id: distribution.id,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('cart_distribution_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    return distribution;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '42P01') {
      console.warn('Cart distribution tables not found. Please apply database migrations.');
      return null;
    }
    console.error('Error creating distribution:', error);
    return null;
  }
}

export async function updateDistribution(
  distributionId: string,
  params: {
    total_quantity?: number;
    items?: Array<{
      id?: string;
      color?: string;
      size?: string;
      quantity: number;
    }>;
  },
  tiers?: PriceTier[],
  basePrice?: number,
  discountedPrice?: number
): Promise<boolean> {
  try {
    const updates: Partial<VariantDistribution> = {};

    if (params.total_quantity !== undefined && tiers && basePrice !== undefined) {
      const priceResult = calculateApplicablePrice(
        params.total_quantity,
        tiers,
        basePrice,
        discountedPrice
      );

      const applicableTier = tiers.find(
        tier => params.total_quantity >= tier.min_quantity && (!tier.max_quantity || params.total_quantity <= tier.max_quantity)
      );

      updates.total_quantity = params.total_quantity;
      updates.applied_tier_price = priceResult.unitPrice;
      updates.metadata = {
        tier_id: applicableTier?.id,
        min_quantity: applicableTier?.min_quantity,
        max_quantity: applicableTier?.max_quantity,
        original_price: basePrice,
      };
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('cart_variant_distributions')
        .update(updates)
        .eq('id', distributionId);

      if (updateError) throw updateError;
    }

    if (params.items) {
      const { error: deleteError } = await supabase
        .from('cart_distribution_items')
        .delete()
        .eq('distribution_id', distributionId);

      if (deleteError) throw deleteError;

      if (params.items.length > 0) {
        const itemsToInsert = params.items.map(item => ({
          distribution_id: distributionId,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
        }));

        const { error: insertError } = await supabase
          .from('cart_distribution_items')
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating distribution:', error);
    return false;
  }
}

export async function deleteDistribution(distributionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cart_variant_distributions')
      .delete()
      .eq('id', distributionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting distribution:', error);
    return false;
  }
}

export async function fetchUserDistributions(): Promise<VariantDistribution[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Check if the table exists by attempting a simple query
    const { error: tableCheckError } = await supabase
      .from('cart_variant_distributions')
      .select('id')
      .limit(1);

    // If table doesn't exist, return empty array instead of throwing error
    if (tableCheckError && tableCheckError.code === '42P01') {
      console.warn('Cart distribution tables not found. Please apply database migrations.');
      return [];
    }

    // First fetch distributions
    const { data: distributions, error: distError } = await supabase
      .from('cart_variant_distributions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (distError) throw distError;
    if (!distributions) return [];

    // Then fetch items for each distribution separately
    const distributionsWithItems = await Promise.all(
      distributions.map(async (dist) => {
        const { data: items, error: itemsError } = await supabase
          .from('cart_distribution_items')
          .select('*')
          .eq('distribution_id', dist.id);

        if (itemsError) {
          console.error('Error fetching distribution items:', itemsError);
          return { ...dist, items: [] };
        }

        return { ...dist, items: items || [] };
      })
    );

    return distributionsWithItems;
  } catch (error) {
    // Handle missing table error gracefully
    if (error && typeof error === 'object' && 'code' in error && error.code === '42P01') {
      console.warn('Cart distribution tables not found. Please apply database migrations.');
      return [];
    }
    console.error('Error fetching distributions:', error);
    return [];
  }
}

export function validateDistribution(
  totalQuantity: number,
  items: Array<{ color?: string; size?: string; quantity: number }>
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (totalQuantity <= 0) {
    errors.push('A quantidade total deve ser maior que zero');
  }

  const sumOfItems = items.reduce((sum, item) => sum + item.quantity, 0);

  if (sumOfItems > totalQuantity) {
    errors.push(`A soma das quantidades distribuídas (${sumOfItems}) excede o total (${totalQuantity})`);
  }

  if (sumOfItems < totalQuantity) {
    warnings.push(`Faltam ${totalQuantity - sumOfItems} unidades para completar a distribuição`);
  }

  items.forEach((item, index) => {
    if (item.quantity <= 0) {
      errors.push(`Item ${index + 1}: quantidade deve ser maior que zero`);
    }
  });

  const uniqueVariants = new Set<string>();
  items.forEach((item, index) => {
    const key = `${item.color || 'no-color'}-${item.size || 'no-size'}`;
    if (uniqueVariants.has(key)) {
      errors.push(`Item ${index + 1}: variação duplicada (${item.color || 'sem cor'}, ${item.size || 'sem tamanho'})`);
    }
    uniqueVariants.add(key);
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function calculateDistributionTotal(
  distribution: VariantDistribution,
  items: DistributionItem[]
): number {
  return distribution.applied_tier_price * distribution.total_quantity;
}

export function formatDistributionForWhatsApp(
  product: Product,
  distribution: VariantDistribution,
  items: DistributionItem[]
): string {
  const lines: string[] = [];

  lines.push(`*${product.title}*`);
  lines.push(`Quantidade Total: ${distribution.total_quantity} unidades`);
  lines.push(`Preço Unitário: R$ ${distribution.applied_tier_price.toFixed(2)}`);
  lines.push(`Subtotal: R$ ${(distribution.applied_tier_price * distribution.total_quantity).toFixed(2)}`);

  if (items.length > 0) {
    lines.push('');
    lines.push('Distribuição:');
    items.forEach(item => {
      const variant = [item.color, item.size].filter(Boolean).join(', ');
      lines.push(`  • ${item.quantity}x ${variant || 'Sem variação'}`);
    });
  }

  return lines.join('\n');
}
