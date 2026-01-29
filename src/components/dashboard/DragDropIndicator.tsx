import { motion } from 'framer-motion';
import { ArrowDown, Target } from 'lucide-react';

interface DragDropIndicatorProps {
  isVisible: boolean;
  position: 'top' | 'bottom' | 'middle';
  index: number;
}

export function DragDropIndicator({ isVisible, position, index }: DragDropIndicatorProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      className={`absolute z-30 pointer-events-none ${
        position === 'top' ? '-top-2' : position === 'bottom' ? '-bottom-2' : 'top-1/2 -translate-y-1/2'
      } left-1/2 -translate-x-1/2`}
    >
      <div className="flex flex-col items-center">
        {/* Drop indicator line */}
        <motion.div 
          className="w-16 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full shadow-lg"
          animate={{ 
            width: [64, 80, 64],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Position number */}
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0],
            y: [0, -2, 0]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mt-2 bg-gradient-to-br from-primary to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold shadow-xl border-2 border-white"
        >
          {index + 1}
        </motion.div>
      </div>
    </motion.div>
  );
}

export function DragDropZone({ isActive, children }: { isActive: boolean; children: React.ReactNode }) {
  return (
    <div className={`relative transition-all duration-300 ${
      isActive 
        ? 'bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl border-2 border-dashed border-primary/50 shadow-inner' 
        : ''
    }`}>
      {children}
      
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 pointer-events-none"
        >
          <div className="absolute top-4 left-4 right-4 flex justify-center">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.8, 1, 0.8],
                y: [0, -2, 0]
              }}
              transition={{ 
                duration: 1.8, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="bg-gradient-to-r from-primary to-blue-600 text-white px-6 py-3 rounded-full text-sm font-bold shadow-xl flex items-center gap-2 border-2 border-white/20"
            >
              <Target className="h-5 w-5" />
              🧩 Zona de Reordenação Ativa
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}