import React, { useState, useEffect } from 'react';
import { NumericFormat } from 'react-number-format';
import { FormLabel, FormDescription } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { getCurrencySymbol, getLocaleConfig, type SupportedLanguage, type SupportedCurrency } from '@/lib/i18n';

interface DiscountPriceInputPropsOld {
  originalPrice: string;
  discountedPrice: string;
  onOriginalPriceChange: (value: string) => void;
  onDiscountedPriceChange: (value: string) => void;
  currency?: SupportedCurrency;
  locale?: SupportedLanguage;
  isOptional?: boolean;
}

interface DiscountPriceInputPropsNew {
  value?: number;
  onChange?: (value: number | undefined) => void;
  originalPrice: number;
  placeholder?: string;
  currency?: SupportedCurrency;
  locale?: SupportedLanguage;
}

type DiscountPriceInputProps = DiscountPriceInputPropsOld | DiscountPriceInputPropsNew;

function isOldProps(props: DiscountPriceInputProps): props is DiscountPriceInputPropsOld {
  return 'discountedPrice' in props;
}

export function DiscountPriceInput(props: DiscountPriceInputProps) {
  if (isOldProps(props)) {
    return <DiscountPriceInputOld {...props} />;
  }
  return <DiscountPriceInputNew {...props} />;
}

function DiscountPriceInputOld({
  originalPrice,
  discountedPrice,
  onOriginalPriceChange,
  onDiscountedPriceChange,
  currency = 'BRL',
  locale = 'pt-BR',
  isOptional = false
}: DiscountPriceInputPropsOld) {
  // Get locale configuration and currency symbol
  const localeConfig = getLocaleConfig(locale);
  const currencySymbol = getCurrencySymbol(currency, locale);

  // Number format configuration - stable object to prevent re-renders
  const numberFormatConfig = React.useMemo(() => ({
    thousandSeparator: localeConfig.thousandsSeparator,
    decimalSeparator: localeConfig.decimalSeparator,
    prefix: currencySymbol + ' ',
    decimalScale: 2,
    fixedDecimalScale: true,
    allowNegative: false,
    allowLeadingZeros: false,
  }), [localeConfig.thousandsSeparator, localeConfig.decimalSeparator, currencySymbol]);

  // Calculate discount information
  const originalValue = parseFloat(originalPrice) || 0;
  const discountedValue = parseFloat(discountedPrice) || 0;
  
  const hasDiscount = discountedValue > 0 && originalValue > 0;
  const isValidDiscount = hasDiscount && discountedValue < originalValue;
  const discountPercentage = isValidDiscount 
    ? Math.round(((originalValue - discountedValue) / originalValue) * 100)
    : 0;
  const savings = isValidDiscount ? originalValue - discountedValue : 0;

  // Stable handlers to prevent re-renders
  const handleOriginalPriceChange = React.useCallback((values: any) => {
    const { value } = values;
    onOriginalPriceChange(value || '');
  }, [onOriginalPriceChange]);

  const handleDiscountedPriceChange = React.useCallback((values: any) => {
    const { value } = values;
    onDiscountedPriceChange(value || '');
  }, [onDiscountedPriceChange]);

  return (
    <div className="space-y-4">
      {/* Original Price Field */}
      <div className="space-y-2">
        <FormLabel>
          Preço original do produto
          {!isOptional && <span className="text-destructive ml-1">*</span>}
        </FormLabel>
        <NumericFormat
          {...numberFormatConfig}
          value={originalPrice}
          onValueChange={handleOriginalPriceChange}
          placeholder={`${currencySymbol} 0,00`}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <FormDescription>
          {isOptional 
            ? 'Deixe em branco se o produto não tiver preço fixo. Produtos sem preço não poderão ser adicionados ao carrinho.'
            : 'Preço de venda do produto'
          }
        </FormDescription>
      </div>

      {/* Discounted Price Field */}
      <div className="space-y-2">
        <FormLabel>Preço promocional (deve ser menor que o preço original)</FormLabel>
        <NumericFormat
          {...numberFormatConfig}
          value={discountedPrice}
          onValueChange={handleDiscountedPriceChange}
          placeholder={`${currencySymbol} 0,00`}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <FormDescription>
          Preço promocional opcional. Se preenchido, será exibido como oferta especial.
        </FormDescription>
      </div>

      {/* Discount Preview */}
      {hasDiscount && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          {isValidDiscount ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-600 text-white">
                  -{discountPercentage}% OFF
                </Badge>
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Economia de {currencySymbol} {savings.toLocaleString(locale, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                O desconto será destacado na vitrine com um badge verde
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">O preço com desconto deve ser menor que o preço original</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DiscountPriceInputNew({
  value,
  onChange,
  originalPrice,
  placeholder = 'R$ 0,00',
  currency = 'BRL',
  locale = 'pt-BR'
}: DiscountPriceInputPropsNew) {
  const localeConfig = getLocaleConfig(locale);
  const currencySymbol = getCurrencySymbol(currency, locale);

  const numberFormatConfig = React.useMemo(() => ({
    thousandSeparator: localeConfig.thousandsSeparator,
    decimalSeparator: localeConfig.decimalSeparator,
    prefix: currencySymbol + ' ',
    decimalScale: 2,
    fixedDecimalScale: true,
    allowNegative: false,
    allowLeadingZeros: false,
  }), [localeConfig.thousandsSeparator, localeConfig.decimalSeparator, currencySymbol]);

  const discountedValue = value ?? 0;
  const originalValue = originalPrice || 0;

  const hasDiscount = discountedValue > 0 && originalValue > 0;
  const isValidDiscount = hasDiscount && discountedValue < originalValue;
  const discountPercentage = isValidDiscount
    ? Math.round(((originalValue - discountedValue) / originalValue) * 100)
    : 0;
  const savings = isValidDiscount ? originalValue - discountedValue : 0;

  const handleDiscountedPriceChange = React.useCallback((values: any) => {
    const { floatValue } = values;
    if (onChange) {
      onChange(floatValue);
    }
  }, [onChange]);

  const displayValue = value !== undefined && value !== null ? value : '';

  return (
    <div className="space-y-2">
      <NumericFormat
        {...numberFormatConfig}
        value={displayValue}
        onValueChange={handleDiscountedPriceChange}
        placeholder={placeholder}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <FormDescription>
        Preço promocional opcional. Se preenchido, será exibido como oferta especial.
      </FormDescription>

      {hasDiscount && (
        <div className="mt-2 p-3 bg-muted rounded-lg">
          {isValidDiscount ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-600 text-white">
                  -{discountPercentage}% OFF
                </Badge>
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Economia de {currencySymbol} {savings.toLocaleString(locale, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                O desconto será destacado na vitrine com um badge verde
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">O preço promocional deve ser menor que o preço original</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}