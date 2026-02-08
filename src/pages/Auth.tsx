import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // Pour l'aspect "influence" et fluide
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, Mail, Lock, User, ShieldCheck, ArrowRight, ChevronLeft } from 'lucide-react';

export default function Auth() {
  const [step, setStep] = useState(1); // Système d'étape pour la confiance
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Couleurs Windows-style (Tailwind custom ou inline)
  const colors = {
    deepBlue: "#00204E",
    actionBlue: "#0056D2",
    crimson: "#D32F2F"
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] p-4 font-sans antialiased">
      {/* Background Decor - Effet minimaliste professionnel */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-50/50 blur-3xl" />
      </div>

      <div className="w-full max-w-[420px] z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="p-3 bg-white shadow-sm rounded-xl mb-4 border border-slate-200">
            <Building2 className="h-8 w-8" style={{ color: colors.deepBlue }} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Portail Institutionnel
          </h1>
          <p className="text-sm text-slate-500 mt-1">Sécurisé par protocole AES-256</p>
        </div>

        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-md">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-2">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100/50 p-1">
                <TabsTrigger value="login" className="data-[state=active]:shadow-sm">Connexion</TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:shadow-sm">Ouverture de compte</TabsTrigger>
              </TabsList>
            </CardHeader>

            {/* SECTION CONNEXION */}
            <TabsContent value="login">
              <form>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Identifiant Client</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input className="pl-10 border-slate-200 focus:ring-blue-600" placeholder="nom@institution.fr" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Mot de passe</Label>
                      <span className="text-xs text-blue-600 hover:underline cursor-pointer">Oublié ?</span>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input type="password" className="pl-10 border-slate-200" placeholder="••••••••" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full py-6 text-base font-medium transition-all" style={{ backgroundColor: colors.deepBlue }}>
                    Accéder à mon espace
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            {/* SECTION INSCRIPTION (Step by Step pour la confiance) */}
            <TabsContent value="signup">
              <CardContent className="pt-4">
                <AnimatePresence mode="wait">
                  {step === 1 ? (
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-4"
                    >
                      <CardDescription className="mb-4">Identité du représentant légal</CardDescription>
                      <div className="space-y-2">
                        <Label>Nom complet</Label>
                        <Input className="border-slate-200" placeholder="Jean Dupont" />
                      </div>
                      <div className="space-y-2">
                        <Label>Email professionnel</Label>
                        <Input className="border-slate-200" placeholder="j.dupont@entreprise.com" />
                      </div>
                      <Button onClick={() => setStep(2)} className="w-full mt-2" variant="outline">
                        Suivant <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }} 
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center text-blue-600 mb-2 cursor-pointer" onClick={() => setStep(1)}>
                        <ChevronLeft className="h-4 w-4" /> <span className="text-xs">Retour</span>
                      </div>
                      <CardDescription className="mb-4">Sécurisation du compte</CardDescription>
                      <div className="space-y-2">
                        <Label>Mot de passe haute sécurité</Label>
                        <Input type="password" placeholder="••••••••" />
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg flex items-start gap-3 border border-blue-100">
                        <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                        <p className="text-[11px] text-blue-800 leading-tight">
                          En créant ce compte, vous acceptez nos protocoles de conformité bancaire et de protection des données.
                        </p>
                      </div>
                      <Button className="w-full" style={{ backgroundColor: colors.actionBlue }}>
                        Confirmer la demande
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
        
        <p className="text-center text-[11px] text-slate-400 mt-8 uppercase tracking-[0.2em]">
          Membre du réseau de garantie des dépôts
        </p>
      </div>
    </div>
  );
     }
