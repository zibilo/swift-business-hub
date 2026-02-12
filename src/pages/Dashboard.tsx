import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CreateCompanyDialog } from '@/components/CreateCompanyDialog';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  FileSpreadsheet, 
  MessageSquare, 
  History, 
  ShieldCheck, 
  Bell,
  Plus,
  ChevronRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const { companyUser } = useAuth();
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', companyUser?.company_id],
    queryFn: async () => {
      if (!companyUser?.company_id) return null;
      const [importsResult, messagesResult] = await Promise.all([
        supabase.from('file_imports').select('id', { count: 'exact' }).eq('company_id', companyUser.company_id),
        supabase.from('support_messages').select('id', { count: 'exact' }).eq('company_id', companyUser.company_id).is('read_at', null).eq('is_from_support', true),
      ]);
      return {
        totalImports: importsResult.count || 0,
        unreadMessages: messagesResult.count || 0,
      };
    },
    enabled: !!companyUser?.company_id,
  });

  // Écran d'attente ou d'initialisation sans scroll
  if (!companyUser && !isLoading) {
    return (
      <div className="h-screen w-full bg-[#0A0F1E] flex items-center justify-center p-6 overflow-hidden text-center">
        <div className="space-y-6 max-w-xs">
          <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20">
            <Building2 className="h-10 w-10 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Configuration</h2>
          <p className="text-slate-400 text-sm italic">Espace client non initialisé.</p>
          <CreateCompanyDialog>
            <Button className="w-full h-14 rounded-2xl bg-blue-600 text-white font-bold shadow-lg">
              Initialiser mon compte
            </Button>
          </CreateCompanyDialog>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#0A0F1E] text-slate-200 flex flex-col overflow-hidden">
      
      {/* HEADER FIXE (SANS SCROLL) */}
      <header className="px-6 pt-8 pb-4 flex justify-between items-center shrink-0">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Secure Node</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">Espace Client</h1>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center relative active:scale-90 transition-transform">
          <Bell className="h-5 w-5 text-slate-400" />
          {stats?.unreadMessages > 0 && (
            <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
          )}
        </div>
      </header>

      {/* CONTENU PRINCIPAL (ADAPTATIF) */}
      <main className="flex-1 px-6 flex flex-col justify-center space-y-6 min-h-0 overflow-hidden">
        
        {/* Wallet Card */}
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-blue-700 to-blue-900 p-6 shadow-2xl shadow-blue-900/20 shrink-0">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <span className="text-blue-100/60 text-[10px] font-bold tracking-widest uppercase">Entité Active</span>
                <p className="text-white font-bold tracking-wide truncate max-w-[180px]">Institution Partenaire</p>
              </div>
              <ShieldCheck className="h-6 w-6 text-blue-300/50" />
            </div>
            <div className="flex justify-between items-end">
              <div>
                <span className="text-blue-100/60 text-[10px] font-black uppercase tracking-widest">Flux Traités</span>
                <p className="text-4xl font-light text-white leading-none mt-1">{stats?.totalImports || 0}</p>
              </div>
              <button 
                onClick={() => navigate('/import')}
                className="h-12 w-12 rounded-xl bg-white text-blue-700 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* Quick Actions (Tient sur l'écran sans scroll) */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Accès Rapides</h3>
          
          <div className="grid gap-3">
            {/* Bouton Historique */}
            <motion.div 
              whileTap={{ scale: 0.97 }} 
              onClick={() => navigate('/history')}
              className="flex items-center p-4 rounded-2xl bg-slate-900/50 border border-slate-800 cursor-pointer"
            >
              <div className="h-11 w-11 rounded-xl bg-slate-800 flex items-center justify-center mr-4">
                <History className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-sm">Archives</p>
                <p className="text-[11px] text-slate-500">Consulter l'historique</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-700" />
            </motion.div>

            {/* Bouton Support */}
            <motion.div 
              whileTap={{ scale: 0.97 }} 
              onClick={() => navigate('/support')}
              className={`flex items-center p-4 rounded-2xl border cursor-pointer transition-colors ${
                stats?.unreadMessages ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-900/50 border-slate-800'
              }`}
            >
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center mr-4 ${stats?.unreadMessages ? 'bg-red-500/20' : 'bg-slate-800'}`}>
                <MessageSquare className={`h-5 w-5 ${stats?.unreadMessages ? 'text-red-500' : 'text-slate-400'}`} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-sm">Support Client</p>
                <p className="text-[11px] text-slate-500">
                  {stats?.unreadMessages > 0 ? `${stats.unreadMessages} nouveau message` : 'Contacter un conseiller'}
                </p>
              </div>
              {stats?.unreadMessages > 0 && <span className="mr-2 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse" />}
              <ChevronRight className="h-5 w-5 text-slate-700" />
            </motion.div>
          </div>
        </div>

        {/* Security Alert Badge (Positionné en bas du bloc principal) */}
        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-3 shrink-0">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <p className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-widest italic">
            Protocole SSL 256-bit Actif
          </p>
        </div>
      </main>

      {/* FOOTER DISCRET (SANS BARRE DE NAVIGATION) */}
      <footer className="p-6 pt-2 shrink-0 text-center">
        <p className="text-[9px] text-slate-700 font-medium uppercase tracking-[0.4em]">
          Powered by Secure Node Financial
        </p>
      </footer>

    </div>
  );
};

export default Dashboard;
