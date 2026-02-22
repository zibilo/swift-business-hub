import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck, ArrowRight, ChevronLeft, Building2, UserPlus, WifiOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  
  const [loginStep, setLoginStep] = useState(1);
  const [signupStep, setSignupStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!authLoading && user) navigate('/', { replace: true });
  }, [user, authLoading, navigate]);

  // --- TRADUCTEUR D'ERREURS RÉSEAU ---
  const handleAuthError = (err: any) => {
    const msg = err?.message?.toLowerCase() || "";
    if (!navigator.onLine || msg.includes("fetch") || msg.includes("network")) {
      return "Le serveur MUCODEC est injoignable. Vérifiez votre connexion internet.";
    }
    if (msg.includes("invalid login")) return "Identifiants incorrects.";
    if (msg.includes("user already exists")) return "Cet email est déjà utilisé.";
    return "Une erreur est survenue lors de l'authentification.";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Vérification immédiate du réseau
    if (!navigator.onLine) {
      setError("Vous êtes hors-ligne. Connexion impossible.");
      return;
    }

    setIsLoading(true);
    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(handleAuthError(signInError));
      }
    } catch (err) {
      setError("Erreur de communication avec le portail.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!navigator.onLine) {
      setError("Vous êtes hors-ligne. Création de compte impossible.");
      return;
    }

    setIsLoading(true);
    try {
      const { error: signUpError } = await signUp(email, password, name);
      if (signUpError) {
        setError(handleAuthError(signUpError));
      }
    } catch (err) {
      setError("Erreur technique lors de l'inscription.");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#00204E]">
      <Loader2 className="h-10 w-10 animate-spin text-white" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center font-sans antialiased overflow-hidden bg-[#00204E]">
      
      {/* Background Decor */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-[#D32F2F]/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-[#0056D2]/30 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px] z-10 px-6"
      >
        {/* Header Institutionnel */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl mb-4 border-b-4 border-[#D32F2F]">
            <Building2 className="h-9 w-9 text-[#00204E]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Portail Sécurisé</h1>
          <div className="h-1 w-12 bg-[#D32F2F] mt-2 rounded-full" />
        </div>

        <Card className="border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden">
          <Tabs defaultValue="login" className="w-full" onValueChange={() => { setLoginStep(1); setSignupStep(1); setError(null); }}>
            <TabsList className="grid w-full grid-cols-2 bg-black/20 p-1.5 rounded-none">
              <TabsTrigger value="login" className="rounded-full text-white data-[state=active]:bg-white data-[state=active]:text-[#00204E] font-bold">Connexion</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full text-white data-[state=active]:bg-white data-[state=active]:text-[#D32F2F] font-bold">Créer un compte</TabsTrigger>
            </TabsList>

            <div className="p-8">
              {error && (
                <Alert className="mb-6 bg-red-600 border-none text-white py-3 rounded-2xl shadow-lg">
                  <div className="flex items-center gap-3">
                    <WifiOff size={16} className="shrink-0" />
                    <AlertDescription className="text-xs font-bold leading-tight">{error}</AlertDescription>
                  </div>
                </Alert>
              )}

              {/* CONNEXION EN 2 ÉTAPES */}
              <TabsContent value="login" className="mt-0 focus-visible:ring-0">
                <AnimatePresence mode="wait">
                  {loginStep === 1 ? (
                    <motion.div key="l1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/60 ml-4 uppercase tracking-widest">Identifiant</label>
                        <Input 
                          className="h-14 bg-white/10 border-white/20 text-white placeholder:text-white/30 rounded-full px-6 focus:border-[#0056D2] transition-all" 
                          placeholder="votre@email.fr"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <Button 
                        onClick={() => email.includes('@') && setLoginStep(2)}
                        className="w-full h-14 bg-[#0056D2] hover:bg-[#0044A8] text-white rounded-full font-bold shadow-lg"
                      >
                        Suivant <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.form key="l2" onSubmit={handleLogin} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                      <button type="button" onClick={() => setLoginStep(1)} className="flex items-center text-xs font-bold text-[#0056D2] hover:text-white transition-colors">
                        <ChevronLeft className="h-4 w-4" /> MODIFIER L'EMAIL
                      </button>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/60 ml-4 uppercase tracking-widest">Mot de passe</label>
                        <Input 
                          type="password"
                          autoFocus
                          className="h-14 bg-white/10 border-white/20 text-white placeholder:text-white/30 rounded-full px-6 focus:border-[#D32F2F] transition-all" 
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                      <Button 
                        type="submit"
                        disabled={isLoading || !navigator.onLine}
                        className="w-full h-14 bg-[#D32F2F] hover:bg-[#B22727] text-white rounded-full font-bold shadow-lg"
                      >
                        {isLoading ? <Loader2 className="animate-spin" /> : "Accéder à l'espace"}
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </TabsContent>

              {/* INSCRIPTION PAR ÉTAPES */}
              <TabsContent value="signup" className="mt-0 focus-visible:ring-0">
                <AnimatePresence mode="wait">
                  {signupStep === 1 ? (
                    <motion.div key="s1" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">
                      <Input 
                        className="h-14 bg-white/10 border-white/20 text-white placeholder:text-white/30 rounded-full px-6" 
                        placeholder="Nom complet"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                      <Input 
                        className="h-14 bg-white/10 border-white/20 text-white placeholder:text-white/30 rounded-full px-6" 
                        placeholder="E-mail professionnel"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <Button 
                        onClick={() => email.includes('@') && setSignupStep(2)} 
                        className="w-full h-14 bg-white text-[#00204E] hover:bg-white/90 rounded-full font-bold"
                      >
                        Étape suivante
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.form key="s2" onSubmit={handleSignup} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                      <Input 
                        type="password"
                        autoFocus
                        className="h-14 bg-white/10 border-white/20 text-white placeholder:text-white/30 rounded-full px-6" 
                        placeholder="Définir un mot de passe"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex gap-3 items-center">
                        <ShieldCheck className="h-5 w-5 text-[#D32F2F]" />
                        <p className="text-[10px] text-white/70 leading-tight">
                          Protection des données garantie par protocole AES-256.
                        </p>
                      </div>
                      <Button 
                        type="submit" 
                        disabled={isLoading || !navigator.onLine} 
                        className="w-full h-14 bg-gradient-to-r from-[#D32F2F] to-[#FF4B4B] text-white rounded-full font-black text-lg shadow-xl"
                      >
                        {isLoading ? <Loader2 className="animate-spin" /> : <><UserPlus className="mr-2 h-5 w-5" /> S'INSCRIRE MAINTENANT</>}
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </TabsContent>
            </div>
          </Tabs>
        </Card>

        <p className="mt-10 text-center text-[10px] text-white/40 font-bold uppercase tracking-[0.4em]">
          Mucodec.com
        </p>
      </motion.div>
    </div>
  );
}
