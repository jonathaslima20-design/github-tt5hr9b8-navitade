import { TrendingDown, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrencyI18n, type SupportedCurrency, type SupportedLanguage } from '@/lib/i18n';
import type { PriceTier } from '@/types';
import { motion } from 'framer-motion';

interface PriceTierBadgeProps {
  currentQuantity: number;
  tiers: PriceTier[];
  basePrice: number;
  currency: SupportedCurrency;
  language: SupportedLanguage;
}

export default function PriceTierBadge({
  currentQuantity,
  tiers,
  basePrice,
  currency,
  language,
}: PriceTierBadgeProps) {
  const sortedTiers = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);

  const applicableTier = sortedTiers
    .filter(tier => currentQuantity >= tier.min_quantity && (!tier.max_quantity || currentQuantity <= tier.max_quantity))
    .pop();

  const nextTier = sortedTiers.find(tier => tier.min_quantity > currentQuantity);

  if (!applicableTier) {
    return null;
  }

  const unitPrice = applicableTier.discounted_unit_price || applicableTier.unit_price;
  const savings = basePrice - unitPrice;
  const savingsPercentage = Math.round((savings / basePrice) * 100);

  const unitsToNextTier = nextTier ? nextTier.min_quantity - currentQuantity : 0;

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 border border-blue-200 dark:border-blue-800 rounded-lg"
      >
        <div className="flex items-center gap-2 flex-1">
          <TrendingDown className="h-5 w-5 text-blue-600" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Preço Escalonado Ativo</span>
              {savingsPercentage > 0 && (
                <Badge className="bg-green-600 hover:bg-green-700 text-white text-xs">
                  -{savingsPercentage}%
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatCurrencyI18n(unitPrice, currency, language)} por unidade
            </span>
          </div>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 cursor-help">
              <Info className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-semibold text-sm">Como funciona:</p>
              <p className="text-xs">
                Quanto mais unidades você comprar, menor o preço por unidade!
              </p>
              {nextTier && (
                <p className="text-xs text-green-600 font-medium">
                  Compre mais {unitsToNextTier} {unitsToNextTier === 1 ? 'unidade' : 'unidades'} para desbloquear o próximo desconto de{' '}
                  {formatCurrencyI18n(nextTier.discounted_unit_price || nextTier.unit_price, currency, language)}/un
                </p>
              )}
              <div className="pt-2 border-t text-xs space-y-1">
                <p className="font-medium">Tier atual:</p>
                <p>Mín: {applicableTier.min_quantity} unidades</p>
                {applicableTier.max_quantity && <p>Máx: {applicableTier.max_quantity} unidades</p>}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </motion.div>
    </TooltipProvider>
  );
}
