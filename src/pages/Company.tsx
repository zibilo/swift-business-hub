import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Mail, Phone, Users, ShieldCheck, Globe, Fingerprint } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

const Company = () => {
  const { companyUser } = useAuth();

  const colors = {
    deepBlue: "#00204E", // Bleu Institutionnel
    accentBlue: "#0056D2",
    slate: "#64748b",
    border: "rgba(0, 32, 78, 0.08)"
  };

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', companyUser?.company_id],
    queryFn: async () => {
      if (!companyUser?.company_id) return null;
      const { data, error } = await supabase.from('companies').select('*').eq('id', companyUser.company_id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!companyUser?.company_id,
  });

  const { data: members } = useQuery({
    queryKey: ['company-members', companyUser?.company_id],
    queryFn: async () => {
      if (!companyUser?.company_id) return [];
      const { data, error } = await supabase
        .from('company_users')
        .select(`id, role, user:profiles!company_users_user_id_fkey(full_name, email)`)
        .eq('company_id', companyUser.company_id);
      if (error) throw error;
      return data;
    },
    enabled: !!companyUser?.company_id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <ShieldCheck className="h-8 w-8 text-blue-900 opacity-20" />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto"
    >
      {/* HEADER INSTITUTIONNEL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-8">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">
            <Fingerprint className="h-3 w-3" />
            Registre d'Entité Certifié
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900" style={{ color: colors.deepBlue }}>
            Profil Entreprise
          </h1>
          <p className="text-slate-500 mt-1">Structure juridique et annuaire des accès</p>
        </div>
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 px-4 py-1.5 rounded-full text-xs font-semibold">
          Compte Vérifié
        </Badge>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* COLONNE GAUCHE : INFOS GÉNÉRALES */}
        <Card className="lg:col-span-2 border-none shadow-[0_2px_15px_rgba(0,0,0,0.03)] bg-white/70 backdrop-blur-md">
          <CardHeader className="border-b border-slate-50 pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Building2 className="h-5 w-5 text-slate-600" />
              </div>
              Détails de la Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-8 pt-6">
            <div className="space-y-6">
              <InfoBlock label="Dénomination Sociale" value={company?.name} />
              <InfoBlock label="Numéro SIRET" value={company?.siret || "Non renseigné"} />
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Siège Social</p>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 mt-1" />
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {company?.address}<br />
                    {company?.postal_code} {company?.city}<br />
                    <span className="text-xs text-slate-400 uppercase">{company?.country}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                <InfoBlock 
                  label="Contact Officiel" 
                  value={company?.contact_email} 
                  icon={<Mail className="h-3 w-3" />} 
                />
                <InfoBlock 
                  label="Ligne Directe" 
                  value={company?.contact_phone} 
                  icon={<Phone className="h-3 w-3" />} 
                />
                {/* Website field removed - not in database schema */}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* COLONNE DROITE : MEMBRES (ACCÈS) */}
        <Card className="border-none shadow-[0_2px_15px_rgba(0,0,0,0.03)] bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-lg font-semibold flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              Gestion des Accès
            </CardTitle>
            <CardDescription className="text-xs italic">
              {members?.length} utilisateur(s) autorisé(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {members?.map((member) => (
                <motion.div
                  key={member.id}
                  whileHover={{ backgroundColor: "rgba(0,0,0,0.01)" }}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-800">
                      {(member.user as any)?.full_name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {(member.user as any)?.email}
                    </span>
                  </div>
                  <Badge 
                    className={`text-[10px] font-bold px-2 py-0 h-5 rounded-md uppercase tracking-tighter ${
                      member.role === 'admin' 
                      ? 'bg-blue-900 text-white hover:bg-blue-800' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {member.role === 'admin' ? 'Admin' : 'User'}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

// Sous-composant pour garder le code propre et répétable
const InfoBlock = ({ label, value, icon }: { label: string, value?: string, icon?: React.ReactNode }) => (
  <div className="space-y-1.5">
    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
      {icon} {label}
    </p>
    <p className="text-sm font-semibold text-slate-800">{value || "—"}</p>
  </div>
);

export default Company;
