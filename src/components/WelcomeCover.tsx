import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Coins, FileText, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WelcomeCoverProps {
  onFinished: () => void;
}

export const WelcomeCover = ({ onFinished }: WelcomeCoverProps) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleEnter = () => {
    setIsExiting(true);
    setTimeout(() => {
      onFinished();
    }, 600);
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, x: '-100%', transition: { duration: 0.5, ease: "circIn" } }}
          // "fixed inset-0" empêche tout scroll et prend tout l'écran mobile
          className="fixed inset-0 w-full h-full bg-white overflow-hidden flex flex-col z-[9999] safe-area-padding"
        >
          {/* EFFET PARTICULES DISCRET */}
          <div className="absolute inset-0 pointer-events-none opacity-30">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-[#002664] rounded-full"
                initial={{ y: '110vh', x: `${Math.random() * 100}%` }}
                animate={{ y: '-10vh' }}
                transition={{ duration: 5 + Math.random() * 5, repeat: Infinity, ease: "linear" }}
              />
            ))}
          </div>

          {/* SECTION HAUTE : LOGO (30% de l'écran) */}
          <div className="flex-[1.5] flex flex-col items-center justify-center px-6">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="flex gap-2 mb-1">
                <motion.div 
                  className="w-8 h-4 border-t-[5px] border-r-[5px] border-[#e30613]" 
                  style={{ transform: 'skewX(-40deg)' }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div 
                  className="w-8 h-4 border-t-[5px] border-r-[5px] border-[#e30613]" 
                  style={{ transform: 'skewX(40deg) scaleX(-1)' }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                />
              </div>
              <h1 className="text-[#002664] text-4xl font-black tracking-tighter flex">
                {"MUCODEC".split("").map((char, i) => (
                  <motion.span 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    {char}
                  </motion.span>
                ))}
              </h1>
              <div className="h-[2px] w-12 bg-[#e30613] rounded-full" />
            </motion.div>
          </div>

          {/* SECTION CENTRALE : ARGUMENTAIRE (40% de l'écran) */}
          <div className="flex-[2] px-8 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <h2 className="text-2xl font-black text-slate-900 leading-tight">
                 <span className="text-[#e30613]"> 📁</span>
              </h2>
              <p className="text-slate-500 text-sm mt-3 font-medium">
                 <br/>  
              </p>
            </motion.div>

            <div className="grid grid-cols-3 gap-3">
              <FeatureCard icon={<Coins size={20} />} label="Solde" delay={0.5} />
              <FeatureCard icon={<ShieldCheck size={20} />} label="Sécurité" delay={0.6} />
              <FeatureCard icon={<FileText size={20} />} label="Relevés" delay={0.7} />
            </div>

            <motion.div className="space-y-2 pt-2">
              <SecurityBadge text="Cryptage militaire AES-256" />
              <SecurityBadge text="Garantie des dépôts" />
            </motion.div>
          </div>

          {/* SECTION BASSE : ACTION (Cible du pouce) */}
          <div className="flex-1 flex flex-col justify-end px-8 pb-10">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <Button 
                onClick={handleEnter}
                whileTap={{ scale: 0.96 }} // Feedback tactile
                className="w-full h-16 bg-[#002664] text-white rounded-2xl font-bold text-lg shadow-xl active:bg-[#001a45] flex items-center justify-between px-8 transition-colors"
              >
                Ouvrir ma session
                <div className="bg-white/10 p-2 rounded-xl">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </Button>
              
              <p className="text-[9px] text-center text-slate-400 mt-6 uppercase tracking-[0.2em] font-bold">
                Congo • Membre du réseau MUCODEC
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const FeatureCard = ({ icon, label, delay }: { icon: React.ReactNode, label: string, delay: number }) => (
  <motion.div 
    initial={{ scale: 0.5, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay, type: "spring", stiffness: 200 }}
    className="flex flex-col items-center p-3 bg-slate-50 rounded-2xl border border-slate-100"
  >
    <div className="text-[#002664] mb-1 opacity-80">{icon}</div>
    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-tight">{label}</span>
  </motion.div>
);

const SecurityBadge = ({ text }: { text: string }) => (
  <div className="flex items-center gap-3 px-4 py-3 bg-green-50/50 rounded-xl border border-green-100">
    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
      <Lock className="h-3 w-3 text-white" />
    </div>
    <span className="text-xs font-bold text-green-800">{text}</span>
  </div>
);
