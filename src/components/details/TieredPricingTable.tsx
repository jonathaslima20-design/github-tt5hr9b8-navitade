import { TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrencyI18n, type SupportedCurrency, type SupportedLanguage } from '@/lib/i18n';
import type { PriceTier } from '@/types';

interface TieredPricingTableProps {
  tiers: PriceTier[];
  basePrice: number;
  baseDiscountedPrice?: number;
  currency?: SupportedCurrency;
  language?: SupportedLanguage;
}

export default function TieredPricingTable({
  tiers,
  basePrice,
  baseDiscountedPrice,
  currency = 'BRL',
  language = 'pt-BR',
}: TieredPricingTableProps) {
  if (!tiers || tiers.length === 0) return null;

  const sortedTiers = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
  const baseUnitPrice = baseDiscountedPrice || basePrice;

  const calculateSavingsPercentage = (originalPrice: number, newPrice: number): number => {
    if (originalPrice <= 0) return 0;
    return Math.round(((originalPrice - newPrice) / originalPrice) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-blue-600" />
          <CardTitle>Preços por Quantidade</CardTitle>
        </div>
        <CardDescription>
          Quanto mais você compra, menos paga por unidade!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-1 sm:px-2 font-semibold text-xs sm:text-sm">Quantidade</th>
                <th className="text-right py-3 px-1 sm:px-2 font-semibold text-xs sm:text-sm">Preço Unit.</th>
                <th className="text-right py-3 px-1 sm:px-2 font-semibold text-xs sm:text-sm">Preço Promo.</th>
                <th className="text-right py-3 px-1 sm:px-2 font-semibold text-xs sm:text-sm hidden sm:table-cell">Total</th>
              </tr>
            </thead>
            <tbody>
              {sortedTiers.map((tier) => {
                const unitPrice = tier.unit_price;
                const discountedPrice = tier.discounted_unit_price || null;
                const effectivePrice = discountedPrice && discountedPrice > 0 && discountedPrice < unitPrice
                  ? discountedPrice
                  : unitPrice;
                const totalAtQty = effectivePrice * tier.min_quantity;
                const baseTotal = baseUnitPrice * tier.min_quantity;
                const savings = baseTotal - totalAtQty;
                const savingsPercentage = calculateSavingsPercentage(baseUnitPrice, effectivePrice);
                const discountPercentage = discountedPrice && discountedPrice > 0 && discountedPrice < unitPrice
                  ? calculateSavingsPercentage(unitPrice, discountedPrice)
                  : 0;

                return (
                  <tr
                    key={tier.id}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <td className="py-2 sm:py-3 px-1 sm:px-2">
                      <span className="text-xs sm:text-sm">
                        {tier.min_quantity} {tier.min_quantity === 1 ? 'unidade' : 'unidades'}
                      </span>
                    </td>
                    <td className="text-right py-2 sm:py-3 px-1 sm:px-2">
                      <div className="flex flex-col items-end">
                        <span className={`text-xs sm:text-sm ${discountedPrice && discountedPrice > 0 && discountedPrice < unitPrice ? 'line-through text-muted-foreground' : 'font-semibold'}`}>
                          {formatCurrencyI18n(unitPrice, currency, language)}
                        </span>
                      </div>
                    </td>
                    <td className="text-right py-2 sm:py-3 px-1 sm:px-2">
                      <div className="flex flex-col items-end">
                        {discountedPrice && discountedPrice > 0 && discountedPrice < unitPrice ? (
                          <>
                            <span className="font-semibold text-xs sm:text-sm text-green-600">
                              {formatCurrencyI18n(discountedPrice, currency, language)}
                            </span>
                            <span className="text-xs text-green-600 font-medium">
                              -{discountPercentage}%
                            </span>
                          </>
                        ) : (
                          <span className="text-xs sm:text-sm text-muted-foreground">-</span>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-2 sm:py-3 px-1 sm:px-2 hidden sm:table-cell">
                      <span className="text-sm font-medium">
                        {formatCurrencyI18n(totalAtQty, currency, language)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
