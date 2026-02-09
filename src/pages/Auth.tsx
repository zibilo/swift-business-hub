import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, Mail, Lock, ShieldCheck, ArrowRight, ChevronLeft, Fingerprint } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  
  const [activeTab, setActiveTab] = useState('login');
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { error } = await signIn(loginEmail, loginPassword);
      if (error) setError('Identifiants invalides ou compte non vérifié.');
    } catch (err) {
      setError('Une erreur de connexion est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { error } = await signUp(signupEmail, signupPassword, signupName);
      if (error) setError(error.message);
      else alert('Inscription réussie !');
    } catch (err) {
      setError('Erreur lors de la création du compte.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Loader2 className="h-10 w-10 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] relative overflow-hidden font-sans antialiased">
      
      {/* Éléments de design d'arrière-plan */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -right-[5%] w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[0%] -left-[5%] w-[400px] h-[400px] bg-slate-200/50 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px] z-10 px-4"
      >
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-8">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="p-4 bg-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] rounded-2xl mb-5 border border-white"
          >
            <Building2 className="h-9 w-9 text-slate-900" />
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 italic">
            NEXUS <span className="font-light text-slate-500 not-italic uppercase text-lg tracking-[0.2em] ml-1">Enterprise</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-[1px] w-8 bg-slate-300" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Accès Sécurisé</p>
            <div className="h-[1px] w-8 bg-slate-300" />
          </div>
        </div>

        <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.06)] bg-white/70 backdrop-blur-xl ring-1 ring-white/50">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2 bg-slate-200/50 rounded-xl p-1.5 h-12">
                <TabsTrigger value="login" className="rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">Connexion</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">Inscription</TabsTrigger>
              </TabsList>
            </CardHeader>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-6 mb-2"
                >
                  <Alert variant="destructive" className="bg-red-50 border-red-100 text-red-700 py-3">
                    <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {activeTab === 'login' ? (
              <motion.form 
                key="login-form"
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                onSubmit={handleLogin}
              >
                <CardContent className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 ml-1">Email Professionnel</Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-slate-900" />
                      <Input 
                        type="email" 
                        className="pl-10 h-12 border-slate-200/60 bg-white/50 focus:bg-white transition-all rounded-xl"
                        placeholder="nom@entreprise.fr"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 ml-1">Mot de passe</Label>
                      <button type="button" className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors">Oublié ?</button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-slate-900" />
                      <Input 
                        type="password" 
                        className="pl-10 h-12 border-slate-200/60 bg-white/50 focus:bg-white transition-all rounded-xl"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 pb-8">
                  <Button 
                    type="submit"
                    className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-slate-200 active:scale-[0.98]"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Se connecter'}
                  </Button>
                </CardFooter>
              </motion.form>
            ) : (
              <motion.div 
                key="signup-form"
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                className="px-6 pb-8"
              >
                <AnimatePresence mode="wait">
                  {step === 1 ? (
                    <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 pt-2">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nom Complet</Label>
                        <Input 
                          className="h-12 border-slate-200/60 bg-white/50 rounded-xl" 
                          placeholder="Jean Dupont"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Email Direct</Label>
                        <Input 
                          type="email" 
                          className="h-12 border-slate-200/60 bg-white/50 rounded-xl" 
                          placeholder="j.dupont@entreprise.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                        />
                      </div>
                      <Button onClick={() => setStep(2)} className="w-full h-12 bg-blue-600 hover:bg-blue-700 rounded-xl" disabled={!signupName || !signupEmail}>
                        Étape suivante <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.form key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={handleSignup} className="space-y-4 pt-2">
                      <button onClick={() => setStep(1)} className="flex items-center text-[11px] font-bold text-slate-400 hover:text-slate-600 mb-2">
                        <ChevronLeft className="h-3 w-3 mr-1" /> RETOUR
                      </button>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Mot de passe de sécurité</Label>
                        <Input 
                          type="password" 
                          className="h-12 border-slate-200/60 bg-white/50 rounded-xl"
                          placeholder="••••••••"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          required
                        />
                      </div>
                      <div className="p-4 bg-slate-900 rounded-xl flex items-start gap-3 shadow-inner">
                        <ShieldCheck className="h-5 w-5 text-blue-400 mt-0.5" />
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          Votre compte sera protégé par un chiffrement de bout en bout et conforme aux normes RGPD.
                        </p>
                      </div>
                      <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200" disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Finaliser mon inscription'}
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </Tabs>
        </Card>

        {/* Footer info */}
        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="flex items-center gap-6 opacity-40">
            <ShieldCheck className="h-5 w-5" />
            <Fingerprint className="h-5 w-5" />
            <Building2 className="h-5 w-5" />
          </div>
          <p className="text-[10px] text-slate-400 text-center uppercase tracking-[0.3em] font-medium leading-loose">
            Infrastucture de Grade Bancaire <br /> © 2026 Nexus Systems International
          </p>
        </div>
      </motion.div>
    </div>
  );
                }
