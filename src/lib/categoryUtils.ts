/**
 * Utility functions for category management and validation
 * Handles sanitization, validation, and normalization of category data
 */

/**
 * Sanitizes a category name for display and storage
 * Preserves original casing, accents, and special characters
 * Only removes extra spaces
 */
export function sanitizeCategoryName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return name
    .trim() // Remove leading/trailing spaces
    .replace(/\s+/g, ' '); // Replace multiple spaces with single space
}

/**
 * Normalizes a category name for comparison purposes only
 * Converts to lowercase, removes accents and special characters
 * Used for duplicate detection and equality checks
 */
export function normalizeCategoryNameForComparison(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return name
    .trim() // Remove leading/trailing spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .toLowerCase() // Normalize to lowercase for comparison
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics (accents, cedillas, etc.)
}

/**
 * Validates if a category name is valid
 * Expects a sanitized category name (with original formatting preserved)
 */
export function isValidCategoryName(sanitizedName: string): boolean {
  return sanitizedName.length >= 2 && sanitizedName.length <= 50;
}

/**
 * Removes duplicate categories from an array, considering normalized names for comparison
 * but preserving original formatting for display
 */
export function removeDuplicateCategories(categories: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const category of categories) {
    const sanitized = sanitizeCategoryName(category);
    const normalized = normalizeCategoryNameForComparison(sanitized);
    
    if (sanitized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(sanitized); // Keep original formatting
    }
  }

  return result;
}

/**
 * Compares two category names for equality using normalized comparison
 * but preserves original formatting in the result
 */
export function categoriesEqual(cat1: string, cat2: string): boolean {
  if (!cat1 || !cat2) return false;
  
  const normalized1 = normalizeCategoryNameForComparison(cat1);
  const normalized2 = normalizeCategoryNameForComparison(cat2);
  
  // Direct comparison of normalized strings
  return normalized1 === normalized2;
}

/**
 * Enhanced category comparison specifically for Nike products
 * Uses normalized comparison but preserves original formatting
 */
export function isNikeCategory(category: string): boolean {
  if (!category) return false;
  const normalized = normalizeCategoryNameForComparison(category);
  return normalized === 'nike';
}

/**
 * Fix Nike category variations in a product's category array
 * Preserves the most common formatting found
 */
export function fixNikeCategoryVariations(categories: string[]): string[] {
  if (!categories || !Array.isArray(categories)) return [];
  
  return categories.map(cat => {
    const normalized = normalizeCategoryNameForComparison(cat);
    if (normalized.includes('nike')) {
      // Preserve original formatting if it's already "Nike", otherwise use "Nike"
      return cat === 'Nike' ? cat : 'Nike';
    }
    return sanitizeCategoryName(cat); // Preserve original formatting
  });
}

/**
 * Finds a category in an array using normalized comparison
 * Returns the original formatted category name
 */
export function findCategoryInArray(categories: string[], targetCategory: string): string | undefined {
  const normalizedTarget = normalizeCategoryNameForComparison(targetCategory);
  
  return categories.find(cat => {
    const normalizedCat = normalizeCategoryNameForComparison(cat);
    return normalizedCat === normalizedTarget;
  });
}

/**
 * Validates and sanitizes an array of categories
 * Preserves original formatting for valid categories
 */
export function validateAndSanitizeCategories(categories: string[]): {
  valid: string[];
  invalid: string[];
  duplicates: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  const duplicates: string[] = [];
  const seen = new Set<string>();

  for (const category of categories) {
    const sanitized = sanitizeCategoryName(category);
    const normalized = normalizeCategoryNameForComparison(sanitized);

    if (!sanitized || !isValidCategoryName(sanitized)) {
      invalid.push(category);
      continue;
    }

    if (seen.has(normalized)) {
      duplicates.push(category);
      continue;
    }

    seen.add(normalized);
    valid.push(sanitized); // Keep original formatting
  }

  return { valid, invalid, duplicates };
}

/**
 * Debug logging for category operations
 */
export function logCategoryOperation(operation: string, data: any) {
  // Only log in development mode and when explicitly enabled
  if (process.env.NODE_ENV === 'development' && localStorage.getItem('debug_categories') === 'true') {
    console.log(`🏷️ CATEGORY ${operation.toUpperCase()}:`, {
      timestamp: new Date().toISOString(),
      operation,
      data
    });
  }
}