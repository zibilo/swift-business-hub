import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  User, Mail, Phone, Loader2, 
  X, LogOut, ChevronLeft, Check, 
  ShieldCheck, Camera, Settings2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const Profile = () => {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  });

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: formData.full_name, phone: formData.phone })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      setIsEditing(false);
      toast({ title: 'Profil mis à jour' });
    } catch (error) {
      toast({ title: 'Erreur', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    // h-screen + overflow-hidden pour empêcher tout scroll
    <div className="h-screen w-full bg-[#F8FAFC] text-slate-900 flex flex-col overflow-hidden font-sans">
      
      {/* HEADER NAVIGATION */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100">
        <button 
          onClick={() => window.history.back()} 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 active:scale-90 transition-all"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Compte Client</h2>
        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={isSaving}
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90",
            isEditing ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "bg-blue-50 text-blue-600"
          )}
        >
          {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : (isEditing ? <Check className="h-5 w-5" /> : <Settings2 className="h-5 w-5" />)}
        </button>
      </header>

      {/* ZONE CENTRALE - FLEX GROW */}
      <main className="flex-1 flex flex-col items-center justify-start px-8 pt-10">
        
        {/* AVATAR DYNAMIQUE */}
        <div className="relative mb-8">
          <motion.div 
            layoutId="avatar"
            className="w-28 h-28 bg-gradient-to-tr from-[#002664] to-blue-500 rounded-[40px] flex items-center justify-center shadow-2xl shadow-blue-200"
          >
            <span className="text-white text-4xl font-bold">
              {profile?.full_name?.[0] || user?.email?.[0].toUpperCase()}
            </span>
          </motion.div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl shadow-lg flex items-center justify-center border-4 border-[#F8FAFC]">
            <Camera className="h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* FORMULAIRE / INFO */}
        <div className="w-full max-w-sm space-y-8">
          <AnimatePresence mode="wait">
            {!isEditing ? (
              <motion.div 
                key="view"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <InfoRow label="Nom de l'adhérent" value={profile?.full_name} icon={<User />} />
                <InfoRow label="Email sécurisé" value={user?.email} icon={<Mail />} />
                <InfoRow label="Téléphone" value={profile?.phone} icon={<Phone />} />
              </motion.div>
            ) : (
              <motion.div 
                key="edit"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <InputWrapper label="Nom complet">
                  <input 
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="w-full bg-transparent outline-none font-bold text-lg text-blue-900"
                    placeholder="Ex: Anthony Ngami"
                  />
                </InputWrapper>

                <InputWrapper label="Téléphone">
                  <input 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-transparent outline-none font-bold text-lg text-blue-900"
                    placeholder="+242 06 XXX XX XX"
                  />
                </InputWrapper>
                
                <Button 
                  variant="ghost" 
                  onClick={() => setIsEditing(false)}
                  className="w-full text-slate-400 text-xs uppercase font-bold tracking-widest"
                >
                  <X className="h-3 w-3 mr-2" /> Annuler les modifs
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* LOGOUT - POSITIONNÉ DANS LE FLUX MAIS FIXE VISUELLEMENT */}
        <div className="mt-auto mb-12 w-full max-w-sm">
          <button 
            onClick={() => signOut()}
            className="w-full py-4 px-6 bg-red-50 text-[#e30613] rounded-[24px] font-bold text-sm flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <LogOut className="h-5 w-5" />
            Déconnexion de l'espace
          </button>
        </div>
      </main>

      {/* FOOTER SÉCURITÉ FIXE */}
      <footer className="bg-slate-900 py-6 px-6 flex items-center justify-center gap-3">
        <ShieldCheck className="h-4 w-4 text-blue-400" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Serveur Crypté MUCODEC
        </span>
      </footer>
    </div>
  );
};

// COMPOSANTS RÉUTILISABLES INTERNES
const InfoRow = ({ label, value, icon }: { label: string, value?: string, icon: React.ReactNode }) => (
  <div className="flex items-center gap-4 p-4 bg-white rounded-[24px] shadow-sm border border-slate-50">
    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-blue-600 shadow-inner">
      {icon}
    </div>
    <div>
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-slate-700">{value || '—'}</p>
    </div>
  </div>
);

const InputWrapper = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="p-4 bg-white rounded-[24px] shadow-md border-2 border-blue-100 focus-within:border-blue-600 transition-all">
    <p className="text-[9px] font-black uppercase tracking-wider text-blue-400 mb-1">{label}</p>
    {children}
  </div>
);

export default Profile;
