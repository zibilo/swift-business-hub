import React from 'react';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const OfflinePage = ({ onRetry }: { onRetry: () => void }) => {
  return (
    <div className="fixed inset-0 z-[10000] bg-white flex flex-col items-center justify-center p-6 text-center">
      {/* Animation de l'icône */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative mb-8"
      >
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center">
          <WifiOff className="h-10 w-10 text-[#e30613]" />
        </div>
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 bg-red-100 rounded-full -z-10"
        />
      </motion.div>

      {/* Texte d'erreur */}
      <div className="space-y-3 max-w-xs">
        <h2 className="text-2xl font-bold text-slate-900">Connexion interrompue</h2>
        <p className="text-slate-500 text-sm leading-relaxed">
          Impossible de joindre les serveurs sécurisés. Veuillez vérifier votre connexion internet (Wifi ou Données mobiles).
        </p>
      </div>

      {/* Informations de sécurité */}
      <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 text-left">
        <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
        <p className="text-[10px] text-slate-600 uppercase font-bold tracking-wider">
          Vos informations sur les paies sont protégés .
        </p>
      </div>

      {/* Bouton de réessai */}
      <div className="mt-10 w-full max-w-xs space-y-4">
        <Button 
          onClick={onRetry}
          className="w-full h-14 bg-[#00204E] hover:bg-blue-900 text-white rounded-2xl font-bold gap-2 shadow-lg"
        >
          <RefreshCw className="h-4 w-4" />
          Réessayer la connexion
        </Button>
        <p className="text-[10px] text-slate-400 uppercase font-medium tracking-widest">
         PAS D 'INTERNET 
        </p>
      </div>
    </div>
  );
};
