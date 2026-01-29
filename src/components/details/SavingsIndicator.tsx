import { TrendingDown, Sparkles } from 'lucide-react';
import { formatCurrencyI18n, type SupportedCurrency, type SupportedLanguage } from '@/lib/i18n';
import { motion } from 'framer-motion';

interface SavingsIndicatorProps {
  savings: number;
  currency: SupportedCurrency;
  language: SupportedLanguage;
}

export default function SavingsIndicator({
  savings,
  currency,
  language,
}: SavingsIndicatorProps) {
  if (savings <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
      className="relative overflow-hidden rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 p-4"
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 3,
          ease: "easeInOut"
        }}
      />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1,
            }}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40"
          >
            <TrendingDown className="h-5 w-5 text-green-600 dark:text-green-400" />
          </motion.div>

          <div className="flex flex-col">
            <span className="text-xs text-green-700 dark:text-green-300 font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Você está economizando
            </span>
            <motion.span
              className="text-2xl font-bold text-green-600 dark:text-green-400"
              key={savings}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {formatCurrencyI18n(savings, currency, language)}
            </motion.span>
          </div>
        </div>

        <motion.div
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 2,
          }}
          className="text-4xl"
        >
          🎉
        </motion.div>
      </div>

      <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium">
        Com o desconto por quantidade aplicado
      </div>
    </motion.div>
  );
}
