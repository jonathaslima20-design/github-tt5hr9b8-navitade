import { TrendingDown, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrencyI18n, type SupportedCurrency, type SupportedLanguage } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TieredPricingIndicatorProps {
  currentQuantity: number;
  nextTierQuantity: number;
  nextTierSavings: number;
  appliedTierSavings: number;
  currency?: SupportedCurrency;
  language?: SupportedLanguage;
  className?: string;
}

export default function TieredPricingIndicator({
  currentQuantity,
  nextTierQuantity,
  nextTierSavings,
  appliedTierSavings,
  currency = 'BRL',
  language = 'pt-BR',
  className = '',
}: TieredPricingIndicatorProps) {
  const unitsToNext = nextTierQuantity - currentQuantity;
  const hasCurrentSavings = appliedTierSavings > 0;
  const hasNextTier = unitsToNext > 0 && nextTierSavings > 0;

  return (
    <div className={`space-y-2 ${className}`}>
      <AnimatePresence mode="wait">
        {hasCurrentSavings && (
          <motion.div
            key="current-savings"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg"
          >
            <TrendingDown className="h-4 w-4 text-green-600" />
            <div className="flex-1">
              <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                Você está economizando {formatCurrencyI18n(appliedTierSavings, currency, language)}
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-green-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Desconto aplicado pela quantidade comprada</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        )}

        {hasNextTier && (
          <motion.div
            key="next-tier"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, delay: hasCurrentSavings ? 0.1 : 0 }}
            className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg"
          >
            <TrendingDown className="h-4 w-4 text-blue-600 animate-pulse" />
            <div className="flex-1">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <span className="font-semibold">Dica:</span> Adicione mais{' '}
                <Badge className="bg-blue-600 text-white mx-1">{unitsToNext}</Badge>
                {unitsToNext === 1 ? 'unidade' : 'unidades'} para economizar{' '}
                <span className="font-bold">
                  {formatCurrencyI18n(nextTierSavings, currency, language)}
                </span>
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-blue-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Próximo desconto disponível</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
