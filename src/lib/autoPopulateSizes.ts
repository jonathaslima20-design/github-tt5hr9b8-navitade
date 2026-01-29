import { supabase } from '@/lib/supabase';
import { inferSizeType } from '@/lib/sizeTypeUtils';
import type { SizeType } from '@/lib/sizeTypeUtils';

interface SizeEntry {
  size_name: string;
  size_type: SizeType;
}

export async function autoPopulateSizesForUser(userId: string): Promise<void> {
  try {
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('sizes')
      .eq('user_id', userId);

    if (productsError) {
      console.warn('Error fetching products for size auto-population:', productsError);
      return;
    }

    const uniqueSizes = new Set<string>();
    products?.forEach(product => {
      if (product.sizes && Array.isArray(product.sizes)) {
        product.sizes.forEach((size: string) => {
          if (size && typeof size === 'string') {
            uniqueSizes.add(size.trim());
          }
        });
      }
    });

    if (uniqueSizes.size === 0) {
      return;
    }

    const { data: existingSizes, error: existingError } = await supabase
      .from('user_custom_sizes')
      .select('size_name')
      .eq('user_id', userId);

    if (existingError) {
      console.warn('Error fetching existing sizes:', existingError);
      return;
    }

    const existingSizeNames = new Set(
      existingSizes?.map(item => item.size_name) || []
    );

    const newSizes: SizeEntry[] = Array.from(uniqueSizes)
      .filter(size => !existingSizeNames.has(size))
      .map(size => ({
        size_name: size,
        size_type: inferSizeType(size) as SizeType
      }));

    if (newSizes.length === 0) {
      return;
    }

    const { error: insertError } = await supabase
      .from('user_custom_sizes')
      .insert(
        newSizes.map(item => ({
          user_id: userId,
          size_name: item.size_name,
          size_type: item.size_type
        }))
      );

    if (insertError) {
      console.warn('Error inserting auto-populated sizes:', insertError);
      return;
    }

    console.log(`Auto-populated ${newSizes.length} sizes for user ${userId}`);
  } catch (error) {
    console.error('Error in autoPopulateSizesForUser:', error);
  }
}
