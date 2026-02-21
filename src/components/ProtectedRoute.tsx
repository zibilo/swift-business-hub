import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Liste des messages de réassurance
const LOADING_MESSAGES = [
  "Bienvenue sur l'Espace Entreprise...",
  "Initialisation du protocole de sécurité...",
  "Vérification de vos accès bancaires...",
  "Sécurisation de la connexion TLS/SSL...",
  "Chargement de votre environnement de paie...",
  "Presque prêt..."
];

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (loading) {
      // 1. Faire défiler les messages toutes les 2 secondes
      const messageInterval = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);

      // 2. Simuler une barre de progression fluide
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return prev; // On bloque à 95% tant que c'est pas fini
          return prev + 1;
        });
      }, 50);

      return () => {
        clearInterval(messageInterval);
        clearInterval(progressInterval);
      };
    }
  }, [loading]);

  // --- ÉCRAN DE CHARGEMENT STRATÉGIQUE ---
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm flex flex-col items-center space-y-8"
        >
          {/* Logo / Icône Animée */}
          <div className="relative">
            <div className="h-20 w-20 bg-blue-50 rounded-3xl flex items-center justify-center">
              <ShieldCheck className="h-10 w-10 text-[#00204E]" />
            </div>
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="absolute -inset-2 border-2 border-dashed border-blue-200 rounded-full -z-10"
            />
          </div>

          {/* Messages de statut avec animation de fondu */}
          <div className="h-12 flex items-center justify-center text-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={currentMessageIndex}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-sm font-bold text-slate-600 uppercase tracking-tight"
              >
                {LOADING_MESSAGES[currentMessageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Barre de progression MUCODEC */}
          <div className="w-full space-y-2">
            <Progress value={progress} className="h-1.5 bg-slate-100" />
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">
                <Lock size={10} /> Cryptage AES-256
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {progress}%
              </span>
            </div>
          </div>
        </motion.div>

        {/* Footer discret */}
        <div className="absolute bottom-10 flex flex-col items-center opacity-30">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-900">
            MUCODEC Core Systems
          </p>
        </div>
      </div>
    );
  }

  // Si pas de user après le chargement -> Login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Sinon -> Le contenu de l'application
  return <>{children}</>;
          }
