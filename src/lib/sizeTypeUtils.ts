import { supabase } from '@/lib/supabase';
import type { SupportedLanguage } from '@/lib/i18n';
import { t } from '@/lib/i18n';

export type SizeType = 'apparel' | 'shoe' | 'custom';

export interface SizeWithType {
  value: string;
  type: SizeType;
}

export interface SizeTypeMapping {
  [key: string]: SizeType;
}

let cachedSizeTypeMapping: SizeTypeMapping | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

export function inferSizeType(size: string): SizeType {
  const normalized = size.toUpperCase().trim();

  const shoePattern = /^(3[0-9]|4[0-6])$/;
  if (shoePattern.test(normalized)) {
    return 'shoe';
  }

  const apparelSizes = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG', 'XXXG', 'XXXXG'];
  if (apparelSizes.includes(normalized)) {
    return 'apparel';
  }

  const customKeywords = ['único', 'unico', 'personalizado', 'personalizado', 'único tamanho', 'unico tamanho'];
  if (customKeywords.some(keyword => normalized.includes(keyword.toUpperCase()))) {
    return 'custom';
  }

  return 'custom';
}

export async function loadSizeTypeMapping(userId: string): Promise<SizeTypeMapping> {
  const now = Date.now();

  if (cachedSizeTypeMapping && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedSizeTypeMapping;
  }

  try {
    const { data, error } = await supabase
      .from('user_custom_sizes')
      .select('size_name, size_type')
      .eq('user_id', userId);

    if (error) {
      console.warn('Error loading size type mapping:', error);
      return {};
    }

    const mapping: SizeTypeMapping = {};
    (data || []).forEach(item => {
      mapping[item.size_name] = item.size_type as SizeType;
    });

    cachedSizeTypeMapping = mapping;
    cacheTimestamp = now;

    return mapping;
  } catch (error) {
    console.warn('Error in loadSizeTypeMapping:', error);
    return {};
  }
}

export function getSizeTypeWithFallback(size: string, sizeTypeMapping: SizeTypeMapping): SizeType {
  return sizeTypeMapping[size] || inferSizeType(size);
}

export function formatSizeLabel(
  size: string,
  type: SizeType | undefined,
  language: SupportedLanguage = 'pt-BR'
): string {
  const resolvedType = type || inferSizeType(size);
  const typeLabel = t(`size_type.${resolvedType}`, language);
  return `${size} - ${typeLabel}`;
}

export function getSizesWithTypes(
  sizes: string[],
  sizeTypeMapping: SizeTypeMapping,
  language: SupportedLanguage = 'pt-BR'
): SizeWithType[] {
  return sizes
    .map(size => ({
      value: size,
      type: getSizeTypeWithFallback(size, sizeTypeMapping)
    }))
    .sort((a, b) => {
      if (a.type !== b.type) {
        const typeOrder = { apparel: 0, shoe: 1, custom: 2 };
        return typeOrder[a.type] - typeOrder[b.type];
      }
      return a.value.localeCompare(b.value);
    });
}

export function clearSizeTypeCache(): void {
  cachedSizeTypeMapping = null;
  cacheTimestamp = 0;
}
