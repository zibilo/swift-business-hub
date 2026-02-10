import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  User, Mail, Phone, Save, Loader2, 
  X, Edit3, LogOut, ArrowLeft, Check
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
    <div className="min-h-screen bg-white text-zinc-900 font-sans antialiased">
      
      {/* HEADER MINIMALISTE */}
      <nav className="flex items-center justify-between px-6 py-8">
        <button onClick={() => window.history.back()} className="text-zinc-400 hover:text-zinc-900 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-all"
            >
              Modifier
            </button>
          ) : (
            <div className="flex gap-4">
              <button onClick={() => setIsEditing(false)} className="text-zinc-400 hover:text-zinc-900 transition-colors">
                <X className="h-5 w-5" />
              </button>
              <button onClick={handleSave} disabled={isSaving} className="text-zinc-900 hover:opacity-70 transition-colors">
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="px-8 max-w-lg mx-auto">
        {/* AVATAR & INFO DE BASE */}
        <section className="mb-12">
          <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center text-white text-2xl font-light mb-6">
            {profile?.full_name?.[0] || user?.email?.[0].toUpperCase()}
          </div>
          <h1 className="text-3xl font-medium tracking-tight mb-1">
            {profile?.full_name || 'Utilisateur'}
          </h1>
          <p className="text-zinc-400 text-sm font-light tracking-wide">{user?.email}</p>
        </section>

        {/* CHAMPS DE DONNÉES */}
        <div className="space-y-10">
          <AnimatePresence mode="wait">
            {!isEditing ? (
              <motion.div 
                key="view" 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="space-y-8"
              >
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Nom complet</p>
                  <p className="text-base text-zinc-800">{profile?.full_name || '—'}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Téléphone</p>
                  <p className="text-base text-zinc-800">{profile?.phone || '—'}</p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="edit" 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="space-y-8"
              >
                <div className="relative border-b border-zinc-200 pb-2 focus-within:border-zinc-900 transition-colors">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 block mb-1">Nom complet</label>
                  <input 
                    autoFocus
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="w-full bg-transparent outline-none text-base py-1"
                    placeholder="Votre nom"
                  />
                </div>

                <div className="relative border-b border-zinc-200 pb-2 focus-within:border-zinc-900 transition-colors">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 block mb-1">Téléphone</label>
                  <input 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-transparent outline-none text-base py-1"
                    placeholder="Votre numéro"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ACTIONS SECONDAIRES */}
        <section className="mt-24 pt-12 border-t border-zinc-50">
          <button 
            onClick={() => signOut()}
            className="flex items-center gap-3 text-red-500/80 hover:text-red-600 transition-colors text-sm font-medium"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </section>
      </main>

      {/* PETIT INDICATEUR DE SÉCURITÉ */}
      <footer className="fixed bottom-8 left-0 right-0 text-center">
        <span className="text-[9px] uppercase tracking-[0.3em] text-zinc-300">
          Chiffrement de bout en bout
        </span>
      </footer>
    </div>
  );
};

export default Profile;
