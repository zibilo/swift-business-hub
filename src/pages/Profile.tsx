import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  X, Loader2, LogOut, ArrowLeft, Check, 
  User, Phone, ShieldCheck 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="h-screen w-full bg-[#0A0F1E] text-slate-200 flex flex-col overflow-hidden fixed inset-0">
      
      {/* HEADER FIXE */}
      <nav className="flex items-center justify-between px-6 pt-10 pb-4 shrink-0">
        <button onClick={() => window.history.back()} className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 active:scale-90 transition-transform">
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        <div className="flex items-center">
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-xl bg-blue-600 text-white shadow-lg active:scale-95 transition-all"
            >
              Modifier
            </button>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => setIsEditing(false)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 active:scale-90 transition-transform">
                <X className="h-5 w-5" />
              </button>
              <button onClick={handleSave} disabled={isSaving} className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg active:scale-90 transition-transform">
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="flex-1 px-8 flex flex-col justify-center min-h-0">
        {/* AVATAR & IDENTITÉ */}
        <section className="text-center mb-12">
          <div className="relative inline-block">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-800 rounded-[32px] flex items-center justify-center text-white text-3xl font-bold shadow-2xl mb-6 mx-auto">
              {profile?.full_name?.[0] || user?.email?.[0].toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-[#0A0F1E] p-1.5 rounded-xl">
               <div className="bg-emerald-500 h-3 w-3 rounded-full border-2 border-[#0A0F1E]" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
            {profile?.full_name || 'Utilisateur'}
          </h1>
          <p className="text-slate-500 text-xs font-medium tracking-wider">{user?.email}</p>
        </section>

        {/* FORMULAIRE (ADAPTATIF SANS SCROLL) */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {!isEditing ? (
              <motion.div 
                key="view" 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="space-y-4"
              >
                <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center gap-4">
                  <User className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Nom complet</p>
                    <p className="text-sm text-slate-200 font-semibold">{profile?.full_name || 'Non renseigné'}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center gap-4">
                  <Phone className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Téléphone</p>
                    <p className="text-sm text-slate-200 font-semibold">{profile?.phone || 'Non renseigné'}</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="edit" 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="space-y-4"
              >
                <div className="p-4 rounded-2xl bg-slate-800/30 border-2 border-blue-600/30 focus-within:border-blue-600 transition-all">
                  <label className="text-[9px] uppercase tracking-widest text-blue-500 font-black block mb-1">Nom complet</label>
                  <input 
                    autoFocus
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="w-full bg-transparent outline-none text-white font-semibold text-sm"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/30 border-2 border-blue-600/30 focus-within:border-blue-600 transition-all">
                  <label className="text-[9px] uppercase tracking-widest text-blue-500 font-black block mb-1">Téléphone</label>
                  <input 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-transparent outline-none text-white font-semibold text-sm"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* LOGOUT */}
        <button 
          onClick={() => signOut()}
          className="mt-12 flex items-center justify-center gap-2 text-red-500/80 active:text-red-500 transition-colors text-xs font-black uppercase tracking-widest"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion sécurisée
        </button>
      </main>

      {/* FOOTER INDICATEUR */}
      <footer className="p-8 shrink-0 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10">
          <ShieldCheck className="h-3 w-3 text-emerald-500" />
          <span className="text-[8px] uppercase tracking-[0.2em] text-emerald-500/80 font-bold">
            Données cryptées Mucodec
          </span>
        </div>
      </footer>

    </div>
  );
};

export default Profile;
