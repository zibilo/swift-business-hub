import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CreateCompanyDialog } from '@/components/CreateCompanyDialog';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  FileSpreadsheet, 
  MessageSquare, 
  History, 
  Plus, 
  ShieldCheck, 
  Bell 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const { companyUser } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', companyUser?.company_id],
    queryFn: async () => {
      if (!companyUser?.company_id) return null;
      const [importsResult, messagesResult] = await Promise.all([
        supabase.from('file_imports').select('id', { count: 'exact' }).eq('company_id', companyUser.company_id),
        supabase.from('support_messages').select('id', { count: 'exact' }).eq('company_id', companyUser.company_id).is('read_at', null).eq('is_from_support', true),
      ]);
      return { total: importsResult.count || 0, unread: messagesResult.count || 0 };
    },
    enabled: !!companyUser?.company_id,
  });

  // Animation de flottement pour les icônes
  const floatingIcon = {
    animate: {
      y: [0, -8, 0],
      transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
    }
  };

  if (!companyUser) {
    return (
      <div className="h-screen w-full bg-[#050A18] flex items-center justify-center p-8 overflow-hidden">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <Building2 className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-2">Configuration</h2>
          <CreateCompanyDialog>
            <Button className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 rounded-2xl">Activer l'Espace</Button>
          </CreateCompanyDialog>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#050A18] text-white overflow-hidden flex flex-col p-6">
      
      {/* HEADER COMPACT */}
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-red-600 p-[2px]">
            <div className="w-full h-full bg-[#050A18] rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-blue-400" />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black tracking-tighter text-blue-500 uppercase">Terminal</p>
            <h2 className="text-sm font-bold leading-none">Institution Partenaire</h2>
          </div>
        </div>
        <div className="relative">
          <Bell className="h-6 w-6 text-slate-500" />
          {stats?.unread > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse" />}
        </div>
      </header>

      {/* MAIN BENTO GRID (S'adapte à la hauteur restante) */}
      <div className="flex-1 grid grid-cols-2 grid-rows-4 gap-4 mb-4">
        
        {/* CARD : NOUVEL IMPORT (Grand format horizontal) */}
        <motion.div 
          whileTap={{ scale: 0.96 }}
          className="col-span-2 row-span-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-[32px] p-6 relative overflow-hidden flex flex-col justify-between"
        >
          <Link to="/import" className="absolute inset-0 z-10" />
          <div className="flex justify-between items-start">
            <motion.div variants={floatingIcon} animate="animate" className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
              <FileSpreadsheet className="h-8 w-8 text-white" />
            </motion.div>
            <Plus className="text-white/50 h-6 w-6" />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tight">Nouvel Import</h3>
            <p className="text-blue-100/60 text-xs">Transférer vos flux Excel sécurisés</p>
          </div>
          {/* Décoration en fond */}
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-red-600/20 rounded-full blur-3xl" />
        </motion.div>

        {/* CARD : HISTORIQUE */}
        <motion.div 
          whileTap={{ scale: 0.96 }}
          className="bg-slate-900/50 border border-slate-800 rounded-[32px] p-5 flex flex-col justify-between"
        >
          <Link to="/history" className="absolute inset-0 z-10" />
          <History className="h-6 w-6 text-blue-500" />
          <div>
            <span className="text-3xl font-light">{stats?.total || 0}</span>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Archives</p>
          </div>
        </motion.div>

        {/* CARD : SUPPORT (ROUGE) */}
        <motion.div 
          whileTap={{ scale: 0.96 }}
          className={`rounded-[32px] p-5 flex flex-col justify-between transition-all ${
            stats?.unread > 0 ? 'bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.3)]' : 'bg-slate-900/50 border border-slate-800'
          }`}
        >
          <Link to="/support" className="absolute inset-0 z-10" />
          <motion.div animate={stats?.unread > 0 ? { scale: [1, 1.2, 1] } : {}} transition={{ repeat: Infinity, duration: 2 }}>
            <MessageSquare className={`h-6 w-6 ${stats?.unread > 0 ? 'text-white' : 'text-red-500'}`} />
          </motion.div>
          <div>
            <span className="text-3xl font-light">{stats?.unread || 0}</span>
            <p className={`text-[10px] font-bold uppercase tracking-widest leading-none mt-1 ${stats?.unread > 0 ? 'text-white/70' : 'text-slate-500'}`}>
              Messages
            </p>
          </div>
        </motion.div>

        {/* FOOTER STATUT (Dernière ligne) */}
        <div className="col-span-2 bg-slate-900/30 border border-white/5 rounded-2xl flex items-center justify-between px-6 py-4">
           <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Système Opérationnel</span>
           </div>
           <p className="text-[10px] text-slate-600 font-mono">v2.0.26</p>
        </div>
      </div>

      {/* TEXTE DE SECURITÉ BAS DE PAGE */}
      <footer className="text-center py-2">
        <div className="flex items-center justify-center gap-2 text-slate-700">
           <ShieldCheck className="h-3 w-3" />
           <span className="text-[9px] font-bold uppercase tracking-widest">End-to-End Encrypted</span>
        </div>
      </footer>

    </div>
  );
};

export default Dashboard;
