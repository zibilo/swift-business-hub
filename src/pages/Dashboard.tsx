import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateCompanyDialog } from '@/components/CreateCompanyDialog';
import { Button } from '@/components/ui/button';
import { Building2, FileSpreadsheet, MessageSquare, History, ArrowRight, ShieldCheck, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const { companyUser } = useAuth();

  // Couleurs de la charte "Grande Banque"
  const colors = {
    deepBlue: "#00204E",
    actionBlue: "#0056D2",
    crimson: "#D32F2F"
  };

  const { data: stats } = useQuery({
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

  // Animation variants pour le chargement des cartes
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  if (!companyUser) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6 bg-[#F8F9FA]">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="max-w-lg mx-auto border-none shadow-xl bg-white/90 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Building2 className="h-8 w-8 text-slate-400" />
              </div>
              <CardTitle className="text-2xl font-bold" style={{ color: colors.deepBlue }}>Initialisation requise</CardTitle>
              <CardDescription className="text-base">
                Votre profil n'est rattaché à aucune entité juridique. 
                Veuillez enregistrer votre entreprise pour accéder aux services bancaires.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreateCompanyDialog>
                <Button className="w-full h-12 text-md transition-all hover:brightness-110" style={{ backgroundColor: colors.deepBlue }}>
                  <Building2 className="h-5 w-5 mr-2" />
                  Enregistrer mon entreprise
                </Button>
              </CreateCompanyDialog>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Header avec ligne de confiance */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-8">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-2">
            <ShieldCheck className="h-3 w-3" />
            Connexion Sécurisée
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: colors.deepBlue }}>
            Tableau de Bord
          </h1>
          <p className="text-slate-500 mt-1">
            Gestion des actifs et flux de données pour <span className="font-semibold text-slate-700">Institution Partenaire</span>
          </p>
        </div>
        <div className="flex gap-2">
            <div className="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Systèmes Opérationnels
            </div>
        </div>
      </div>

      {/* Grid de Cartes animées */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {/* Action: Import */}
        <motion.div variants={item}>
            <Card className="group border-none shadow-sm hover:shadow-md transition-all duration-300 bg-white">
            <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-2 group-hover:bg-blue-600 transition-colors">
                    <FileSpreadsheet className="h-5 w-5 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <CardTitle className="text-lg font-semibold text-slate-800">Transfert de Flux</CardTitle>
                <CardDescription>Transmission sécurisée de vos fichiers Excel</CardDescription>
            </CardHeader>
            <CardContent>
                <Link to="/import">
                <Button className="w-full justify-between hover:bg-slate-50" variant="outline">
                    Nouvel import
                    <ArrowRight className="h-4 w-4" />
                </Button>
                </Link>
            </CardContent>
            </Card>
        </motion.div>

        {/* Stats: Historique */}
        <motion.div variants={item}>
            <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-2">
                    <History className="h-5 w-5 text-slate-600" />
                </div>
                <CardTitle className="text-lg font-semibold text-slate-800">Archives</CardTitle>
                <CardDescription>
                    <span className="text-2xl font-bold block text-slate-900 mt-1">{stats?.totalImports || 0}</span>
                    Documents traités au total
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Link to="/history">
                <Button className="w-full justify-between" variant="ghost">
                    Consulter les archives
                    <ArrowRight className="h-4 w-4" />
                </Button>
                </Link>
            </CardContent>
            </Card>
        </motion.div>

        {/* Support: Messages */}
        <motion.div variants={item}>
            <Card className="border-none shadow-sm bg-white overflow-hidden relative">
              {stats?.unreadMessages ? (
                <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-red-50 rounded-full flex items-end justify-center pb-4 pr-4">
                     <span className="text-red-600 font-bold text-sm animate-bounce">!</span>
                </div>
              ) : null}
            <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-2">
                    <MessageSquare className="h-5 w-5 text-red-600" />
                </div>
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    Assistance 24/7
                </CardTitle>
                <CardDescription>
                    {stats?.unreadMessages 
                        ? `${stats.unreadMessages} message(s) en attente de lecture`
                        : "Votre conseiller est disponible"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Link to="/support">
                <Button 
                    className="w-full text-white" 
                    style={{ backgroundColor: stats?.unreadMessages ? colors.crimson : colors.deepBlue }}
                >
                    Accéder au Support
                </Button>
                </Link>
            </CardContent>
            </Card>
        </motion.div>
      </motion.div>

      {/* Footer minimaliste style Windows */}
      <footer className="pt-10 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-slate-400 border-t border-slate-100">
        <div className="flex gap-6">
          <span className="hover:text-slate-600 cursor-pointer transition-colors">POLITIQUE DE CONFIDENTIALITÉ</span>
          <span className="hover:text-slate-600 cursor-pointer transition-colors">CONDITIONS GÉNÉRALES</span>
          <span className="hover:text-slate-600 cursor-pointer transition-colors">SÉCURITÉ</span>
        </div>
        <p>© 2026 GROUPE FINANCIER INTERNATIONAL. TOUS DROITS RÉSERVÉS.</p>
      </footer>
    </div>
  );
};

export default Dashboard;
