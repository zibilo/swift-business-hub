import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Coins, FileText, Lock, Play, Pause, Headphones, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const WelcomeCover = () => {
  const [isPlaying, setIsPlaying] = useState<{ [key: string]: boolean }>({ intro: false, security: false });
  const audioRefs = {
    intro: useRef<HTMLAudioElement>(null),
    security: useRef<HTMLAudioElement>(null)
  };

  const toggleAudio = (type: 'intro' | 'security') => {
    const audio = audioRefs[type].current;
    if (!audio) return;

    if (isPlaying[type]) {
      audio.pause();
    } else {
      // Arrêter l'autre audio s'il joue
      Object.keys(audioRefs).forEach(key => {
        if (key !== type && audioRefs[key as 'intro' | 'security'].current) {
          audioRefs[key as 'intro' | 'security'].current?.pause();
          setIsPlaying(prev => ({ ...prev, [key]: false }));
        }
      });
      audio.play();
    }
    setIsPlaying(prev => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <div className="relative min-h-screen w-full bg-white overflow-hidden flex flex-col items-center px-6 py-12 font-sans">
      
      {/* EFFET PARTICULES D'ARGENT */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-[#002664]/10 rounded-full"
            initial={{ y: -20, x: `${Math.random() * 100}%`, opacity: 0 }}
            animate={{ 
              y: '100vh', 
              opacity: [0, 0.6, 0.6, 0],
              scale: [0, 1, 1, 0.5]
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity, 
              delay: i * 1.5,
              ease: "linear" 
            }}
          />
        ))}
      </div>

      {/* LOGO MUCODEC ANIMÉ */}
      <div className="z-10 flex flex-col items-center gap-4 mb-12">
        <div className="flex gap-4 -mb-2">
          <motion.div 
            className="w-10 h-5 border-t-[6px] border-r-[6px] border-[#e30613]" 
            style={{ transform: 'skewX(-40deg)' }}
          />
          <motion.div 
            className="w-10 h-5 border-t-[6px] border-r-[6px] border-[#e30613]" 
            style={{ transform: 'skewX(40deg) scaleX(-1)' }}
          />
        </div>
        
        <div className="flex text-[#002664] text-5xl md:text-6xl font-black tracking-tighter">
          {"MUCODEC".split("").map((char, i) => (
            <motion.span
              key={i}
              animate={{ 
                y: [0, -15, 0],
                color: ["#002664", "#e30613", "#002664"]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                delay: i * 0.1,
                ease: "easeInOut"
              }}
            >
              {char}
            </motion.span>
          ))}
        </div>
        <p className="text-slate-400 text-[10px] uppercase tracking-[0.3em] font-bold">Banking made simple</p>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="z-10 max-w-md w-full text-center space-y-6">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-slate-900 leading-tight"
        >
          Votre argent, totalement protégé
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-slate-500 font-light"
        >
          Gérez vos finances en toute sécurité avec notre technologie de pointe.
        </motion.p>

        {/* GRILLE DE FONCTIONNALITÉS */}
        <div className="grid grid-cols-3 gap-4 pt-4">
          <FeatureCard icon={<Coins className="text-[#002664]" />} label="Argent" delay={0.4} />
          <FeatureCard icon={<ShieldCheck className="text-[#002664]" />} label="Protection" delay={0.5} />
          <FeatureCard icon={<FileText className="text-[#002664]" />} label="Document" delay={0.6} />
        </div>

        {/* BADGES DE SÉCURITÉ */}
        <div className="space-y-3 pt-6 text-left">
          <SecurityBadge text="Données totalement protégées" />
          <SecurityBadge text="Système de cryptage avancé" />
          <SecurityBadge text="Sécurité bancaire de confiance" />
        </div>

        {/* SECTION AUDIO */}
        <div className="space-y-4 pt-8">
          <AudioControl 
            title="Présentation de l'app" 
            subtitle="Découvrez les fonctionnalités"
            icon="🎯"
            isPlaying={isPlaying.intro}
            onToggle={() => toggleAudio('intro')}
          />
          <AudioControl 
            title="Infos sécurité" 
            subtitle="Comment nous vous protégeons"
            icon="🔒"
            isPlaying={isPlaying.security}
            onToggle={() => toggleAudio('security')}
          />
          
          {/* Fichiers audio cachés (doivent être dans /public) */}
          <audio ref={audioRefs.intro} src="/audio_intro.mp3" onEnded={() => setIsPlaying(p => ({...p, intro: false}))} />
          <audio ref={audioRefs.security} src="/audio_security.mp3" onEnded={() => setIsPlaying(p => ({...p, security: false}))} />
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, label, delay }: { icon: React.ReactNode, label: string, delay: number }) => (
  <motion.div 
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay }}
    whileTap={{ scale: 0.95 }}
    className="flex flex-col items-center p-4 bg-slate-50 rounded-2xl border border-slate-100"
  >
    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-2">
      {icon}
    </div>
    <span className="text-[10px] font-bold uppercase text-slate-500">{label}</span>
  </motion.div>
);

const SecurityBadge = ({ text }: { text: string }) => (
  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
    <Lock className="h-4 w-4 text-[#e30613]" />
    <span className="text-sm font-medium text-slate-700">{text}</span>
  </div>
);

const AudioControl = ({ title, subtitle, icon, isPlaying, onToggle }: any) => (
  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
    <div className="flex items-center gap-4 text-left">
      <div className="text-xl bg-white p-2 rounded-lg shadow-sm">{icon}</div>
      <div>
        <div className="text-sm font-bold text-slate-900">{title}</div>
        <div className="text-[10px] text-slate-500 uppercase font-semibold">{subtitle}</div>
      </div>
    </div>
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={onToggle}
      className={cn("rounded-full", isPlaying ? "bg-[#e30613] text-white" : "bg-white text-[#002664]")}
    >
      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
    </Button>
  </div>
);
