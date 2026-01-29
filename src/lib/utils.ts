import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from './supabase';
import { sanitizeCategoryName, categoriesEqual, logCategoryOperation, normalizeCategoryNameForComparison } from './categoryUtils';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Get initials from a name
export function getInitials(name: string): string {
  if (!name) return '';
  
  const names = name.split(' ');
  if (names.length === 1) return names[0][0].toUpperCase();
  
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
}

// Format currency value
export function formatCurrency(value: number, currency: string = 'BRL', locale: string = 'pt-BR'): string {
  console.log('💰 FORMAT CURRENCY CALLED:', {
    value,
    currency,
    locale,
    valueType: typeof value,
    isNaN: isNaN(value)
  });
  
  // Validate inputs
  if (typeof value !== 'number' || isNaN(value)) {
    console.warn('Invalid currency value:', value);
    // Return formatted zero based on currency
    try {
      return new Intl.NumberFormat(locale || 'pt-BR', {
        style: 'currency',
        currency: currency || 'BRL',
      }).format(0);
    } catch {
      return 'R$ 0,00'; // Ultimate fallback
    }
  }
  
  // Ensure we have valid currency and locale
  const validCurrency = currency || 'BRL';
  const validLocale = locale || 'pt-BR';
  
  console.log('💰 FORMATTING CURRENCY:', { 
    value, 
    currency: validCurrency, 
    locale: validLocale,
    inputCurrency: currency,
    inputLocale: locale
  });
  
  try {
    const formatted = new Intl.NumberFormat(validLocale, {
      style: 'currency',
      currency: validCurrency,
    }).format(value);
    
    console.log('💰 CURRENCY FORMATTED SUCCESSFULLY:', {
      input: value,
      output: formatted,
      currency: validCurrency,
      locale: validLocale
    });
    return formatted;
  } catch (error) {
    console.error('💰 ERROR FORMATTING CURRENCY:', error, { 
      value, 
      currency: validCurrency, 
      locale: validLocale 
    });
    // Fallback to BRL formatting
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }
}

// Country phone formatting rules
const COUNTRY_PHONE_FORMATS: Record<string, {
  format: (numbers: string) => string;
  minLength: number;
  maxLength: number;
}> = {
  '55': { // Brazil
    format: (numbers) => {
      if (numbers.length === 11) {
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
      } else if (numbers.length === 10) {
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
      }
      return numbers;
    },
    minLength: 10,
    maxLength: 11
  },
  '1': { // USA
    format: (numbers) => {
      if (numbers.length === 10) {
        return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`;
      }
      return numbers;
    },
    minLength: 10,
    maxLength: 10
  },
  '54': { // Argentina
    format: (numbers) => {
      if (numbers.length === 10) {
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
      }
      return numbers;
    },
    minLength: 9,
    maxLength: 10
  },
  '351': { // Portugal
    format: (numbers) => {
      if (numbers.length === 9) {
        return `${numbers.slice(0, 3)} ${numbers.slice(3, 6)} ${numbers.slice(6)}`;
      }
      return numbers;
    },
    minLength: 9,
    maxLength: 9
  },
  '52': { // Mexico
    format: (numbers) => {
      if (numbers.length === 10) {
        return `${numbers.slice(0, 2)} ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
      }
      return numbers;
    },
    minLength: 10,
    maxLength: 10
  },
  '34': { // Spain
    format: (numbers) => {
      if (numbers.length === 9) {
        return `${numbers.slice(0, 3)} ${numbers.slice(3, 6)} ${numbers.slice(6)}`;
      }
      return numbers;
    },
    minLength: 9,
    maxLength: 9
  },
};

// Format phone number for display based on country code
export function formatPhone(phone: string, countryCode: string = '55'): string {
  if (!phone) return '';

  const numbers = phone.replace(/\D/g, '');
  if (!numbers) return '';

  const formatter = COUNTRY_PHONE_FORMATS[countryCode];
  if (formatter) {
    return formatter.format(numbers);
  }

  // Fallback to Brazil format if country not found
  return COUNTRY_PHONE_FORMATS['55'].format(numbers);
}

// Clean and validate WhatsApp number based on country code
export function cleanWhatsAppNumber(phone: string, countryCode: string = '55'): string {
  if (!phone) return '';

  let numbers = phone.replace(/\D/g, '');

  if (numbers.length === 0) return '';

  // Get country-specific formatting rules
  const formatter = COUNTRY_PHONE_FORMATS[countryCode];
  const minLength = formatter?.minLength || 10;
  const maxLength = formatter?.maxLength || 11;

  // Check if number already contains country code
  const countryCodeLength = countryCode.length;
  if (numbers.length === maxLength + countryCodeLength && numbers.startsWith(countryCode)) {
    // Remove country code - return only the local number
    numbers = numbers.slice(countryCodeLength);
    return numbers;
  }

  // For Brazil, handle legacy formats with leading 55
  if (countryCode === '55') {
    if (numbers.length === 13 && numbers.startsWith('55')) {
      numbers = numbers.slice(2);
      return numbers;
    } else if (numbers.length === 12 && numbers.startsWith('55')) {
      numbers = numbers.slice(2);
      return numbers;
    }
  }

  // Validate length
  if (numbers.length < minLength || numbers.length > maxLength) {
    console.warn(`Invalid phone number for country ${countryCode}:`, {
      input: phone,
      cleaned: numbers,
      length: numbers.length,
      expectedRange: `${minLength}-${maxLength}`
    });
  }

  return numbers;
}

// Generate WhatsApp URL with country code support
export function generateWhatsAppUrl(phone: string, message: string = '', countryCode: string = '55'): string {
  if (!phone) {
    console.warn('No phone number provided for WhatsApp URL');
    return '#';
  }

  // Clean the number with country code
  const cleanNumber = cleanWhatsAppNumber(phone, countryCode);

  if (!cleanNumber) {
    console.warn('Could not clean phone number:', phone);
    return '#';
  }

  // Add country code to the clean number
  const whatsappNumber = countryCode + cleanNumber;

  console.log('WhatsApp URL generation:', {
    original: phone,
    countryCode,
    cleaned: cleanNumber,
    final: whatsappNumber
  });

  // Encode message
  const encodedMessage = message ? encodeURIComponent(message) : '';

  // Generate URL
  const url = `https://wa.me/${whatsappNumber}${encodedMessage ? `?text=${encodedMessage}` : ''}`;

  console.log('Generated WhatsApp URL:', url);
  return url;
}

// Format WhatsApp number for display with country code support
export function formatWhatsAppForDisplay(phone: string, countryCode: string = '55'): string {
  if (!phone) return '';

  const cleaned = cleanWhatsAppNumber(phone, countryCode);
  return formatPhone(cleaned, countryCode);
}

// Format phone with country code prefix for full international display
export function formatPhoneWithCountryCode(phone: string, countryCode: string = '55'): string {
  if (!phone) return '';

  const cleaned = cleanWhatsAppNumber(phone, countryCode);
  if (!cleaned) return '';

  const formatted = formatPhone(cleaned, countryCode);
  return `+${countryCode} ${formatted}`;
}

// Validate phone number by country code
export function validatePhoneByCountry(phone: string, countryCode: string = '55'): {
  isValid: boolean;
  errors: string[];
} {
  if (!phone) {
    return { isValid: false, errors: ['Phone number is required'] };
  }

  const numbers = phone.replace(/\D/g, '');

  if (numbers.length === 0) {
    return { isValid: false, errors: ['Phone number must contain digits'] };
  }

  const formatter = COUNTRY_PHONE_FORMATS[countryCode];
  if (!formatter) {
    return { isValid: false, errors: [`Country code ${countryCode} not supported`] };
  }

  const errors: string[] = [];

  // Check minimum length
  if (numbers.length < formatter.minLength) {
    errors.push(`Phone number must be at least ${formatter.minLength} digits`);
  }

  // Check maximum length
  if (numbers.length > formatter.maxLength) {
    errors.push(`Phone number must be at most ${formatter.maxLength} digits`);
  }

  // For Brazil, validate area code (11-99)
  if (countryCode === '55' && numbers.length >= 2) {
    const areaCode = parseInt(numbers.slice(0, 2));
    if (areaCode < 11 || areaCode > 99) {
      errors.push('Invalid Brazilian area code (must be 11-99)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Generate URL-friendly slug
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Sync user categories with storefront settings - IMPROVED VERSION
export async function syncUserCategoriesWithStorefrontSettings(userId: string): Promise<void> {
  if (!userId) {
    logCategoryOperation('SYNC_ERROR', 'userId is required');
    return;
  }

  try {
    logCategoryOperation('SYNC_START', { userId });

    // 1. Get all unique categories from user's visible products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('category')
      .eq('user_id', userId)
      .eq('is_visible_on_storefront', true);

    if (productsError) {
      logCategoryOperation('SYNC_ERROR', { step: 'fetch_products', error: productsError });
      throw productsError;
    }

    // Extract unique categories with proper sanitization
    const categoriesMap = new Map<string, string>(); // normalized -> original
    products?.forEach(product => {
      if (product.category && Array.isArray(product.category)) {
        product.category.forEach(cat => {
          const sanitized = sanitizeCategoryName(cat);
          if (sanitized) {
            const normalized = normalizeCategoryNameForComparison(sanitized);
            // Keep the first occurrence of each normalized category (preserves original formatting)
            if (!categoriesMap.has(normalized)) {
              categoriesMap.set(normalized, sanitized);
            }
          }
        });
      }
    });

    const categoriesList = Array.from(categoriesMap.values()).sort();
    logCategoryOperation('CATEGORIES_EXTRACTED', { count: categoriesList.length, categories: categoriesList });

    if (categoriesList.length === 0) {
      logCategoryOperation('NO_CATEGORIES', 'clearing category settings');
      
      // Clear category settings if no categories exist
      const { data: currentSettings } = await supabase
        .from('user_storefront_settings')
        .select('settings')
        .eq('user_id', userId)
        .maybeSingle();

      if (currentSettings?.settings) {
        const updatedSettings = {
          ...currentSettings.settings,
          categoryDisplaySettings: [],
        };

        await supabase
          .from('user_storefront_settings')
          .upsert({
            user_id: userId,
            settings: updatedSettings
          }, {
            onConflict: 'user_id'
          });
      }
      
      return;
    }

    // 2. Get current storefront settings with retry logic
    let settings, settingsError;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      const result = await supabase
        .from('user_storefront_settings')
        .select('settings')
        .eq('user_id', userId)
        .maybeSingle();
      
      settings = result.data;
      settingsError = result.error;
      
      if (!settingsError) break;
      
      retryCount++;
      logCategoryOperation('RETRY_SETTINGS', { attempt: retryCount, maxRetries });
      await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
    }

    if (settingsError && settingsError.code !== 'PGRST116') {
      logCategoryOperation('SETTINGS_ERROR', { error: settingsError, retries: retryCount });
      throw settingsError;
    }

    // 3. Get current category display settings or create empty array
    const currentSettings = settings?.settings || {};
    const currentCategorySettings = currentSettings.categoryDisplaySettings || [];

    logCategoryOperation('CURRENT_SETTINGS', { count: currentCategorySettings.length, settings: currentCategorySettings });

    // 4. Create a map of existing categories for quick lookup
    const existingCategoriesMap = new Map();
    currentCategorySettings.forEach((setting: any) => {
      if (setting.category) {
        const sanitized = sanitizeCategoryName(setting.category);
        const normalized = normalizeCategoryNameForComparison(sanitized);
        existingCategoriesMap.set(normalized, { ...setting, category: sanitized });
      }
    });

    // 5. Build the updated category settings
    const updatedCategorySettings: any[] = [];

    // First, add existing categories in their current order (if they still exist in products) with normalized comparison
    currentCategorySettings.forEach((setting: any) => {
      if (setting.category) {
        const sanitizedSetting = sanitizeCategoryName(setting.category);
        const foundCategory = categoriesList.find(cat => categoriesEqual(cat, sanitizedSetting));
        
        if (foundCategory) {
          updatedCategorySettings.push({
            ...setting,
            category: foundCategory, // Use the original formatted version from products
            order: updatedCategorySettings.length
          });
        }
      }
    });

    // Then, add new categories that don't exist in settings yet (with normalized comparison)
    categoriesList.forEach((category) => {
      const existsInSettings = updatedCategorySettings.some(setting => 
        categoriesEqual(setting.category, category)
      );
      
      if (!existsInSettings) {
        updatedCategorySettings.push({
          category,
          order: updatedCategorySettings.length, // Ensure sequential order
          enabled: true // NEW CATEGORIES ARE ENABLED BY DEFAULT
        });
      }
    });

    // Ensure proper order values (0, 1, 2, 3...)
    updatedCategorySettings.forEach((setting, index) => {
      setting.order = index;
    });

    logCategoryOperation('UPDATED_SETTINGS', { 
      count: updatedCategorySettings.length, 
      settings: updatedCategorySettings.map(s => ({ category: s.category, order: s.order, enabled: s.enabled }))
    });

    // 6. Update the storefront settings
    const updatedSettings = {
      ...currentSettings,
      categoryDisplaySettings: updatedCategorySettings,
      // Preserve other settings
      filters: currentSettings.filters || {
        showFilters: true,
        showSearch: true,
        showPriceRange: true,
        showCategories: true,
        showBrands: true,
        showGender: true,
        showStatus: true,
        showCondition: true,
      },
      priceRange: currentSettings.priceRange || {
        minPrice: 10,
        maxPrice: 5000,
      },
      itemsPerPage: currentSettings.itemsPerPage || 12,
    };

    // 7. Upsert the settings with immediate effect
    let upsertError;
    retryCount = 0;
    
    while (retryCount < maxRetries) {
      const result = await supabase
        .from('user_storefront_settings')
        .upsert({
          user_id: userId,
          settings: updatedSettings
        }, {
          onConflict: 'user_id'
        });
      
      upsertError = result.error;
      
      if (!upsertError) break;
      
      retryCount++;
      logCategoryOperation('RETRY_UPSERT', { attempt: retryCount, maxRetries });
      await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
    }

    if (upsertError) {
      logCategoryOperation('UPSERT_ERROR', { error: upsertError, retries: retryCount });
      throw upsertError;
    }

    // 8. CRITICAL: Force a small delay and verify the update was successful
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify the settings were actually saved
    const { data: verifySettings, error: verifyError } = await supabase
      .from('user_storefront_settings')
      .select('settings')
      .eq('user_id', userId)
      .single();
    
    if (verifyError) {
      logCategoryOperation('VERIFY_ERROR', verifyError);
    } else {
      logCategoryOperation('SYNC_SUCCESS', { 
        verified: true, 
        finalCount: verifySettings?.settings?.categoryDisplaySettings?.length || 0 
      });
    }

  } catch (error) {
    logCategoryOperation('SYNC_FATAL_ERROR', error);
    // Don't throw the error to avoid breaking the product creation/update flow
    // Just log it for debugging
  }
}

// Force refresh category sync - NEW FUNCTION
export async function forceRefreshCategorySync(userId: string): Promise<boolean> {
  try {
    console.log('Force refreshing category sync for user:', userId);
    await syncUserCategoriesWithStorefrontSettings(userId);
    return true;
  } catch (error) {
    console.error('Error in forceRefreshCategorySync:', error);
    return false;
  }
}

// Get color value for circle display
export function getColorValue(colorName: string): string {
  const colorMap: Record<string, string> = {
    // Cores básicas
    'preto': '#000000',
    'black': '#000000',
    'branco': '#FFFFFF',
    'white': '#FFFFFF',
    'cinza': '#808080',
    'cinzento': '#808080',
    'gray': '#808080',
    'grey': '#808080',
    'cinza claro': '#D3D3D3',
    'cinza escuro': '#404040',
    
    // Cores primárias
    'azul': '#0066CC',
    'blue': '#0066CC',
    'azul marinho': '#000080',
    'azul escuro': '#003366',
    'azul claro': '#87CEEB',
    'navy': '#000080',
    
    'vermelho': '#CC0000',
    'red': '#CC0000',
    'vermelho escuro': '#8B0000',
    'vermelho claro': '#FF6B6B',
    'bordô': '#800020',
    'vinho': '#722F37',
    
    'verde': '#00CC00',
    'green': '#00CC00',
    'verde escuro': '#006400',
    'verde claro': '#90EE90',
    'verde militar': '#4B5320',
    
    // Cores secundárias
    'amarelo': '#FFCC00',
    'yellow': '#FFCC00',
    'amarelo claro': '#FFFFE0',
    'amarelo escuro': '#FFD700',
    
    'rosa': '#FF69B4',
    'rosê': '#F8BBD9',
    'rose': '#F8BBD9',
    'rosa claro': '#FFB6C1',
    'rosa escuro': '#C71585',
    'rosa bebê': '#F4C2C2',
    'rosa choque': '#FF1493',
    'pink': '#FF69B4',
    
    'roxo': '#8A2BE2',
    'purple': '#8A2BE2',
    'violeta': '#8A2BE2',
    'lilás': '#DDA0DD',
    'lavanda': '#E6E6FA',
    
    'laranja': '#FF8C00',
    'orange': '#FF8C00',
    'laranja claro': '#FFA500',
    'laranja escuro': '#FF4500',
    'coral': '#FF7F50',
    
    // Tons de marrom
    'marrom': '#8B4513',
    'brown': '#8B4513',
    'marrom claro': '#D2B48C',
    'marrom escuro': '#654321',
    'chocolate': '#D2691E',
    'caramelo': '#D2691E',
    'café': '#6F4E37',
    'canela': '#D2691E',
    
    // Tons neutros
    'bege': '#F5F5DC',
    'nude': '#E3C4A8',
    'off-white': '#FAF0E6',
    'creme': '#FFFDD0',
    'champagne': '#F7E7CE',
    'areia': '#C2B280',
    'taupe': '#483C32',
    
    // Tons metálicos
    'dourado': '#FFD700',
    'gold': '#FFD700',
    'ouro': '#FFD700',
    'prateado': '#C0C0C0',
    'silver': '#C0C0C0',
    'prata': '#C0C0C0',
    'bronze': '#CD7F32',
    'cobre': '#B87333',
    'rose gold': '#E8B4B8',
    'ouro rosé': '#E8B4B8',
    
    // Cores especiais
    'turquesa': '#40E0D0',
    'salmão': '#FA8072',
    'salmon': '#FA8072',
    'magenta': '#FF00FF',
    'ciano': '#00FFFF',
    'cyan': '#00FFFF',
    'índigo': '#4B0082',
    'indigo': '#4B0082',
    'tiffany': '#0ABAB5',
    'mint': '#98FB98',
    'menta': '#98FB98',
    
    // Tons de rosa
    'fúcsia': '#FF00FF',
    'fucsia': '#FF00FF',
    'pink claro': '#FFC0CB',
    
    // Tons especiais de moda
    'mostarda': '#FFDB58',
    'oliva': '#808000',
    'olive': '#808000',
    'terra': '#A0522D',
    'terracota': '#E2725B',
    'burgundy': '#800020',
    'marsala': '#964B00',
    'militar': '#4B5320',
    'khaki': '#F0E68C',
    'cáqui': '#F0E68C',
    
    // Tons pastel
    'azul pastel': '#AEC6CF',
    'rosa pastel': '#FFD1DC',
    'verde pastel': '#77DD77',
    'amarelo pastel': '#FDFD96',
    'lilás pastel': '#DDA0DD',
    'roxo pastel': '#B19CD9',
    'laranja pastel': '#FFB347',
    
    // Tons escuros
    'preto fosco': '#1C1C1C',
    'preto brilhante': '#000000',
    'grafite': '#41424C',
    'carvão': '#36454F',
    'antracite': '#293133',
    'preto mate': '#1C1C1C',
    
    // Cores adicionais comuns no e-commerce
    'azul royal': '#4169E1',
    'azul turquesa': '#00CED1',
    'verde limão': '#32CD32',
    'verde água': '#00FFFF',
    'amarelo ouro': '#FFD700',
    'laranja queimado': '#CC5500',
    'vermelho cereja': '#DE3163',
    'roxo uva': '#6F2DA8',
    'rosa salmão': '#FF91A4',
    'bege rosado': '#F5DEB3',
  };
  
  const normalizedColor = colorName.toLowerCase().trim();
  
  // Log para debug em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log('🎨 Color mapping:', {
      input: colorName,
      normalized: normalizedColor,
      found: !!colorMap[normalizedColor],
      result: colorMap[normalizedColor] || 'fallback'
    });
  }
  
  // Primeiro, tenta encontrar uma correspondência exata
  if (colorMap[normalizedColor]) {
    return colorMap[normalizedColor];
  }
  
  // Se não encontrar, tenta encontrar uma correspondência parcial
  const partialMatch = Object.keys(colorMap).find(key => 
    normalizedColor.includes(key) || key.includes(normalizedColor)
  );
  
  if (partialMatch) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎨 Partial match found:', { input: colorName, matched: partialMatch, color: colorMap[partialMatch] });
    }
    return colorMap[partialMatch];
  }
  
  // Fallback para cor padrão (cinza)
  if (process.env.NODE_ENV === 'development') {
    console.warn(`🎨 Cor não mapeada: "${colorName}". Usando cor padrão. Considere adicionar ao mapeamento.`);
  }
  return '#6B7280';
}