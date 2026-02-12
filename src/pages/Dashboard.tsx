import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
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
  Bell
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

const Dashboard = () => {
  const { companyUser } = useAuth();
  const navigate = useNavigate();

  // Couleurs de la charte "Grande Banque"
  const colors = {
    deepBlue: "#00204E",
    actionBlue: "#0056D2",
    crimson: "#D32F2F",
    bgLight: "#F8F9FA"
  };

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', companyUser?.company_id],
    queryFn: async () => {
      if (!companyUser?.company_id) return null;
      
      const [importsResult, messagesResult] = await Promise.all([
        supabase
          .from('file_imports')
          .select('id, status', { count: 'exact' })
          .eq('company_id', companyUser.company_id),
        supabase
          .from('support_messages')
          .select('id', { count: 'exact' })
          .eq('company_id', companyUser.company_id)
          .is('read_at', null)
          .eq('is_from_support', true),
      ]);

      return {
        totalImports: importsResult.count || 0,
        pendingImports: importsResult.data?.filter(i => i.status === 'pending').length || 0,
        unreadMessages: messagesResult.count || 0,
      };
    },
    enabled: !!companyUser?.company_id,
  });

  // État de chargement (Skeleton mobile)
  if (isLoading && companyUser) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] p-4 space-y-4">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded mb-8" />
        <div className="h-32 w-full bg-white rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-white rounded-xl animate-pulse" />
          <div className="h-24 bg-white rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Écran d'initialisation (Entreprise manquante)
  if (!companyUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8F9FA]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-none shadow-2xl bg-white overflow-hidden">
            <div className="h-2 bg-[#00204E]" />
            <div className="p-8 text-center">
              <div className="mx-auto w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <Building2 className="h-10 w-10 text-slate-400" />
              </div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: colors.deepBlue }}>Initialisation</h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                Pour accéder à vos services bancaires sécurisés, veuillez enregistrer votre entité juridique.
              </p>
              <CreateCompanyDialog>
                <Button className="w-full h-14 text-lg rounded-xl shadow-lg transition-transform active:scale-95" style={{ backgroundColor: colors.deepBlue }}>
                  Enregistrer l'entreprise
                </Button>
              </CreateCompanyDialog>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-28">
      {/* Barre de Status Mobile */}
      <div className="bg-white px-6 pt-6 pb-4 flex justify-between items-end border-b border-slate-100 sticky top-0 z-20">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Espace Sécurisé
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: colors.deepBlue }}>
            Tableau de Bord
          </h1>
        </div>
        <div className="relative p-2 bg-slate-50 rounded-full">
          <Bell className="h-6 w-6 text-slate-400" />
          {stats?.unreadMessages > 0 && (
            <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-red-500 border-2 border-white rounded-full" />
          )}
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-md mx-auto">
        
        {/* Info Société */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <p className="text-sm text-slate-600 font-medium truncate">
            Connecté : <span className="text-slate-900">Institution Partenaire</span>
          </p>
        </div>

        {/* Action Principale : Import */}
        <motion.div 
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link to="/import">
            <Card className="border-none shadow-md bg-white active:bg-slate-50 transition-colors">
              <CardContent className="p-5 flex items-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mr-4 shadow-inner">
                  <FileSpreadsheet className="h-7 w-7 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-slate-800 leading-tight">Transfert de Flux</h3>
                  <p className="text-sm text-slate-500">Nouveau fichier Excel</p>
                </div>
                <div className="bg-slate-50 p-2 rounded-full">
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        {/* Grid Stats & Support */}
        <div className="grid grid-cols-2 gap-4">
          {/* Historique */}
          <motion.div 
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Link to="/history">
              <Card className="border-none shadow-sm p-5 bg-white h-full flex flex-col justify-between">
                <History className="h-6 w-6 text-slate-400 mb-4" />
                <div>
                  <span className="text-3xl font-black block text-slate-900">{stats?.totalImports || 0}</span>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Archives</span>
                </div>
              </Card>
            </Link>
          </motion.div>

          {/* Support */}
          <motion.div 
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link to="/support">
              <Card className={`border-none shadow-sm p-5 h-full flex flex-col justify-between transition-colors ${stats?.unreadMessages ? 'bg-red-50 ring-1 ring-red-100' : 'bg-white'}`}>
                <MessageSquare className={`h-6 w-6 ${stats?.unreadMessages ? 'text-red-600' : 'text-slate-400'} mb-4`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black block text-slate-900">
                      {stats?.unreadMessages || 0}
                    </span>
                    {stats?.unreadMessages > 0 && (
                       <span className="flex h-2 w-2 rounded-full bg-red-600 animate-ping" />
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Messages</span>
                </div>
              </Card>
            </Link>
          </motion.div>
        </div>

        {/* Aide Rapide / Footer */}
        <div className="pt-4 px-1">
          <p className="text-[11px] text-slate-400 uppercase font-bold tracking-widest mb-4">Assistance Rapide</p>
          <div className="space-y-3">
             {['Guide de sécurité', 'Contacter mon conseiller', 'FAQ'].map((item) => (
               <div key={item} className="flex items-center justify-between p-3 bg-white rounded-lg text-sm font-medium text-slate-700 shadow-sm">
                 {item}
                 <ArrowRight className="h-4 w-4 text-slate-300" />
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Navigation Bar (Mobile Bottom Nav) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 px-8 py-3 flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button onClick={() => navigate('/')} className="flex flex-col items-center gap-1 group">
          <LayoutDashboard className="h-6 w-6 text-[#00204E]" />
          <span className="text-[10px] font-bold text-[#00204E]">Dashboard</span>
        </button>
        <button onClick={() => navigate('/import')} className="flex flex-col items-center gap-1 group">
          <FileSpreadsheet className="h-6 w-6 text-slate-400 group-active:text-[#0056D2]" />
          <span className="text-[10px] font-medium text-slate-400">Flux</span>
        </button>
        <button onClick={() => navigate('/history')} className="flex flex-col items-center gap-1 group">
          <History className="h-6 w-6 text-slate-400 group-active:text-[#0056D2]" />
          <span className="text-[10px] font-medium text-slate-400">Archives</span>
        </button>
        <button onClick={() => navigate('/support')} className="flex flex-col items-center gap-1 group relative">
          <MessageSquare className="h-6 w-6 text-slate-400 group-active:text-[#0056D2]" />
          <span className="text-[10px] font-medium text-slate-400">Support</span>
          {stats?.unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
              {stats.unreadMessages}
            </span>
          )}
        </button>
      </nav>
    </div>
  );
};

export default Dashboard;
