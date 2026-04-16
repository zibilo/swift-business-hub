import { motion } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const OfflinePage = ({ onRetry }: { onRetry: () => void }) => {
  return (
    // z-[99999] garantit d'être au dessus de tout (Toasters, Dialogs, etc.)
    <div className="fixed inset-0 z-[99999] bg-white flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="space-y-6"
      >
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <WifiOff className="h-10 w-10 text-red-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">Connexion perdue</h2>
          <p className="text-sm text-slate-500 max-w-xs">
            L'accès aux services MUCODEC nécessite une connexion Internet active.
          </p>
        </div>
        <Button 
          onClick={onRetry}
          className="bg-[#00204E] text-white rounded-xl px-8 gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </Button>
      </motion.div>
    </div>
  );
};
