import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CreateCompanyDialog } from '@/components/CreateCompanyDialog';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  FileSpreadsheet, 
  MessageSquare, 
  History, 
  ArrowRight, 
  ShieldCheck, 
  LayoutDashboard,
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
        supabase.from('file_imports').select('id, status', { count: 'exact' }).eq('company_id', companyUser.company_id),
        supabase.from('support_messages').select('id', { count: 'exact' }).eq('company_id', companyUser.company_id).is('read_at', null).eq('is_from_support', true),
      ]);
      return {
        totalImports: importsResult.count || 0,
        unreadMessages: messagesResult.count || 0,
      };
    },
    enabled: !!companyUser?.company_id,
  });

  if (!companyUser && !isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center space-y-6">
            <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20">
              <Building2 className="h-10 w-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Bienvenue</h2>
            <p className="text-slate-400 text-sm">Configurez votre entité pour commencer à gérer vos flux financiers.</p>
            <CreateCompanyDialog>
              <Button className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                Créer mon entreprise
              </Button>
            </CreateCompanyDialog>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-slate-200 pb-32">
      {/* Top Bar - Mode Fintech */}
      <div className="px-6 pt-8 pb-6 flex justify-between items-center">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Secure Node</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">Espace Client</h1>
        </div>
        <div className="flex gap-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center relative">
                <Bell className="h-5 w-5 text-slate-400" />
                {stats?.unreadMessages > 0 && <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />}
            </div>
        </div>
      </div>

      <div className="px-6 space-y-8">
        {/* Wallet Card - Le "Header" visuel */}
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-blue-700 to-blue-900 p-6 shadow-2xl shadow-blue-900/20">
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                    <div className="space-y-1">
                        <span className="text-blue-100/60 text-xs font-medium tracking-wider">ENTITÉ ACTIVE</span>
                        <p className="text-white font-bold tracking-wide">Institution Partenaire</p>
                    </div>
                    <ShieldCheck className="h-6 w-6 text-blue-300/50" />
                </div>
                <div className="flex justify-between items-end">
                    <div>
                        <span className="text-blue-100/60 text-[10px] font-black uppercase tracking-widest">Flux Traités</span>
                        <p className="text-4xl font-light text-white leading-none mt-1">{stats?.totalImports || 0}</p>
                    </div>
                    <Link to="/import">
                        <button className="h-12 w-12 rounded-xl bg-white text-blue-700 flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                            <Plus className="h-6 w-6" />
                        </button>
                    </Link>
                </div>
            </div>
            {/* Décoration abstraite au fond de la carte */}
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* Quick Actions Sections */}
        <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] px-1">Services</h3>
            
            <div className="grid gap-3">
                {/* Item: Historique */}
                <Link to="/history">
                    <motion.div whileTap={{ scale: 0.98 }} className="flex items-center p-4 rounded-2xl bg-slate-900/50 border border-slate-800 active:bg-slate-900 transition-colors">
                        <div className="h-12 w-12 rounded-xl bg-slate-800 flex items-center justify-center mr-4">
                            <History className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-white text-sm">Historique des flux</p>
                            <p className="text-xs text-slate-500">Consulter les archives Excel</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-600" />
                    </motion.div>
                </Link>

                {/* Item: Support */}
                <Link to="/support">
                    <motion.div whileTap={{ scale: 0.98 }} className="flex items-center p-4 rounded-2xl bg-slate-900/50 border border-slate-800 active:bg-slate-900 transition-colors">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center mr-4 ${stats?.unreadMessages ? 'bg-red-500/10' : 'bg-slate-800'}`}>
                            <MessageSquare className={`h-5 w-5 ${stats?.unreadMessages ? 'text-red-500' : 'text-slate-400'}`} />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-white text-sm">Centre d'assistance</p>
                            <p className="text-xs text-slate-500">{stats?.unreadMessages > 0 ? `${stats.unreadMessages} nouveau(x) message(s)` : 'Contactez votre conseiller'}</p>
                        </div>
                        {stats?.unreadMessages > 0 && <span className="mr-2 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />}
                        <ChevronRight className="h-5 w-5 text-slate-600" />
                    </motion.div>
                </Link>
            </div>
        </div>

        {/* Sécurité Trust Box */}
        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-4">
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <p className="text-[11px] text-emerald-500/80 font-medium">Système de chiffrement de bout en bout actif</p>
        </div>
      </div>

      {/* Floating Bottom Navigation */}
      <div className="fixed bottom-6 left-6 right-6 z-50">
        <nav className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800 h-16 rounded-2xl px-6 flex justify-between items-center shadow-2xl">
          <button onClick={() => navigate('/')} className="p-2 text-blue-500">
            <LayoutDashboard className="h-6 w-6" />
          </button>
          <button onClick={() => navigate('/import')} className="p-2 text-slate-500 hover:text-white transition-colors">
            <FileSpreadsheet className="h-6 w-6" />
          </button>
          <button onClick={() => navigate('/history')} className="p-2 text-slate-500 hover:text-white transition-colors">
            <History className="h-6 w-6" />
          </button>
          <button onClick={() => navigate('/support')} className="p-2 text-slate-500 hover:text-white transition-colors relative">
            <MessageSquare className="h-6 w-6" />
            {stats?.unreadMessages > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900" />}
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Dashboard;
