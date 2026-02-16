import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Ajout de Button
import { 
  Building2, 
  FileSpreadsheet, 
  History, 
  Search, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw // Ajout de l'icône Refresh
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// --- COMPOSANT INTERNE (ActionCard) OPTIMISÉ ---
const ActionCard = ({ title, desc, icon, link, color }: any) => (
  <Link to={link} className="w-full">
    <motion.div whileTap={{ scale: 0.96 }}>
      <Card className="border-none shadow-lg rounded-[24px] overflow-hidden bg-white group">
        <CardContent className="p-5 md:p-8 flex items-center gap-4 md:gap-6">
          <div className={cn(
            "h-14 w-14 md:h-20 md:w-20 rounded-2xl md:rounded-3xl flex items-center justify-center text-white shadow-lg shrink-0", 
            color
          )}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base md:text-xl font-black text-slate-900 truncate">{title}</h3>
            <p className="text-[11px] md:text-sm text-slate-500 mt-0.5 line-clamp-2">{desc}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  </Link>
);

// --- COMPOSANT PRINCIPAL (Dashboard) ---
const Dashboard = () => {
  const { companyUser, user, refreshProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLinking, setIsLinking] = useState<string | null>(null);

  const { data: companies, isLoading, refetch } = useQuery({
    queryKey: ['available-companies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('*').order('name');
      if (error) throw error;
      return data;
    },
    enabled: !companyUser
  });

  // Fonction pour recharger la page
  const handlePageReload = () => {
    toast.info("Mise à jour des données...");
    window.location.reload();
  };

  const handleSelectCompany = async (companyId: string) => {
    if (!user) return;
    setIsLinking(companyId);
    try {
      const { error } = await supabase
        .from('company_users')
        .insert({ company_id: companyId, user_id: user.id, role: 'user' });

      if (error) throw error;
      toast.success("Entreprise sélectionnée");
      await refreshProfile(); 
    } catch (e: any) {
      toast.error("Erreur : " + e.message);
    } finally {
      setIsLinking(null);
    }
  };

  const filteredCompanies = companies?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- ÉCRAN A : SÉLECTION (MOBILE ADAPTED) ---
  if (!companyUser) {
    return (
      <div className="p-4 md:p-10 max-w-2xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
        <div className="relative text-center space-y-3 pt-4">
          {/* Bouton Reload Flottant pour l'écran de sélection */}
          <motion.button 
            whileTap={{ rotate: 180 }}
            onClick={handlePageReload}
            className="absolute top-0 right-0 p-2 text-slate-400 hover:text-blue-600 transition-colors"
          >
            <RefreshCw size={20} />
          </motion.button>

          <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 rounded-[24px] md:rounded-[30px] flex items-center justify-center mx-auto shadow-inner">
            <Building2 className="h-8 w-8 md:h-10 md:w-10 text-blue-600" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#00204E] tracking-tight">Identification</h1>
          <p className="text-sm text-slate-500 font-medium px-4">Choisissez votre entreprise partenaire MUCODEC</p>
        </div>

        <div className="relative group sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md py-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            className="w-full h-12 md:h-14 pl-12 pr-4 rounded-xl md:rounded-2xl border-none bg-white shadow-lg ring-1 ring-slate-100 focus:ring-2 focus:ring-blue-600 outline-none transition-all text-base"
            placeholder="Rechercher une entreprise..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid gap-3 overflow-y-auto max-h-[60vh] pb-10">
          {isLoading ? (
            <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600 h-8 w-8" /></div>
          ) : filteredCompanies?.map((company) => (
            <motion.div key={company.id} whileTap={{ scale: 0.98 }}>
              <Card 
                className="border-none shadow-sm active:bg-blue-50 transition-colors overflow-hidden bg-white/80"
                onClick={() => handleSelectCompany(company.id)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shadow-inner">
                      <Building2 size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{company.name}</h3>
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{company.siret || 'Référencée'}</p>
                    </div>
                  </div>
                  <div className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-slate-50 text-blue-600">
                    {isLinking === company.id ? <Loader2 className="animate-spin h-4 w-4" /> : <ArrowRight size={16} />}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // --- ÉCRAN B : DASHBOARD (MOBILE ADAPTED) ---
  return (
    <div className="p-4 md:p-10 space-y-6 md:space-y-8 max-w-7xl mx-auto animate-in zoom-in-95 duration-300">
      <div className="flex items-center justify-between border-b pb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
            <CheckCircle2 className="h-3 w-3" /> Accès Validé
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-[#00204E] tracking-tight truncate">
            {companyUser.company?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium truncate italic">{user?.email}</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* BOUTON RECHARGER (Reload) */}
          <motion.button
            whileTap={{ rotate: 180, scale: 0.9 }}
            onClick={handlePageReload}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all"
            title="Rafraîchir"
          >
            <RefreshCw size={18} />
          </motion.button>

          <div className="h-12 w-12 md:h-16 md:w-16 bg-white rounded-2xl md:rounded-[24px] shadow-lg flex items-center justify-center border border-slate-50 text-blue-600 shrink-0">
             <Building2 size={24} className="md:w-8 md:h-8" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 md:grid-cols-2">
        <ActionCard 
          title="Transmettre un Flux" 
          desc="Audit de conformité et envoi du fichier de paie." 
          icon={<FileSpreadsheet className="w-7 h-7 md:w-8 md:h-8" />} 
          link="/import" 
          color="bg-blue-600"
        />
        <ActionCard 
          title="Archives & Suivi" 
          desc="Historique de vos transmissions sécurisées." 
          icon={<History className="w-7 h-7 md:w-8 md:h-8" />} 
          link="/history" 
          color="bg-[#00204E]"
        />
      </div>

      {/* SÉCURITÉ BAS DE PAGE */}
      <div className="mt-8 p-5 bg-slate-900 rounded-[24px] md:rounded-[32px] text-white space-y-4 md:space-y-0 flex flex-col md:flex-row items-center justify-between shadow-xl">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="h-10 w-10 md:h-12 md:w-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
            <ShieldCheck size={24} className="md:w-7 md:h-7" />
          </div>
          <div>
            <p className="font-bold text-sm md:text-lg leading-tight">Sécurité Bancaire Activée</p>
            <p className="text-[9px] md:text-xs text-slate-400 uppercase tracking-widest font-medium">AES-256 Protocol</p>
          </div>
        </div>
        <p className="text-[9px] text-slate-500 text-center md:text-right font-medium max-w-xs uppercase leading-relaxed pt-2 md:pt-0 border-t border-slate-800 md:border-none w-full md:w-auto">
          Opérations enregistrées au journal d'audit MUCODEC.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
