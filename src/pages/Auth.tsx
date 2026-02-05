 import { useState } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { useAuth } from '@/contexts/AuthContext';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Alert, AlertDescription } from '@/components/ui/alert';
 import { Loader2, Building2, Mail, Lock, User } from 'lucide-react';
 
 export default function Auth() {
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [success, setSuccess] = useState<string | null>(null);
   const { signIn, signUp } = useAuth();
   const navigate = useNavigate();
 
   // Login form state
   const [loginEmail, setLoginEmail] = useState('');
   const [loginPassword, setLoginPassword] = useState('');
 
   // Signup form state
   const [signupEmail, setSignupEmail] = useState('');
   const [signupPassword, setSignupPassword] = useState('');
   const [signupFullName, setSignupFullName] = useState('');
   const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
 
   const handleLogin = async (e: React.FormEvent) => {
     e.preventDefault();
     setError(null);
     setIsLoading(true);
 
     const { error } = await signIn(loginEmail, loginPassword);
     
     if (error) {
       setError(error.message);
       setIsLoading(false);
     } else {
       navigate('/');
     }
   };
 
   const handleSignup = async (e: React.FormEvent) => {
     e.preventDefault();
     setError(null);
     setSuccess(null);
 
     if (signupPassword !== signupConfirmPassword) {
       setError('Les mots de passe ne correspondent pas');
       return;
     }
 
     if (signupPassword.length < 6) {
       setError('Le mot de passe doit contenir au moins 6 caractères');
       return;
     }
 
     setIsLoading(true);
 
     const { error } = await signUp(signupEmail, signupPassword, signupFullName);
     
     if (error) {
       setError(error.message);
     } else {
       setSuccess('Compte créé ! Vérifiez votre email pour confirmer votre inscription.');
     }
     setIsLoading(false);
   };
 
   return (
     <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
       <div className="w-full max-w-md">
         <div className="flex items-center justify-center mb-8">
           <Building2 className="h-10 w-10 text-primary mr-3" />
           <h1 className="text-2xl font-bold text-foreground">Espace Entreprise</h1>
         </div>
 
         <Card>
           <Tabs defaultValue="login" className="w-full">
             <CardHeader>
               <TabsList className="grid w-full grid-cols-2">
                 <TabsTrigger value="login">Connexion</TabsTrigger>
                 <TabsTrigger value="signup">Inscription</TabsTrigger>
               </TabsList>
             </CardHeader>
 
             <TabsContent value="login">
               <form onSubmit={handleLogin}>
                 <CardContent className="space-y-4">
                   <CardDescription className="text-center">
                     Connectez-vous à votre compte entreprise
                   </CardDescription>
 
                   {error && (
                     <Alert variant="destructive">
                       <AlertDescription>{error}</AlertDescription>
                     </Alert>
                   )}
 
                   <div className="space-y-2">
                     <Label htmlFor="login-email">Email</Label>
                     <div className="relative">
                       <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                       <Input
                         id="login-email"
                         type="email"
                         placeholder="votre@email.com"
                         value={loginEmail}
                         onChange={(e) => setLoginEmail(e.target.value)}
                         className="pl-10"
                         required
                       />
                     </div>
                   </div>
 
                   <div className="space-y-2">
                     <Label htmlFor="login-password">Mot de passe</Label>
                     <div className="relative">
                       <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                       <Input
                         id="login-password"
                         type="password"
                         placeholder="••••••••"
                         value={loginPassword}
                         onChange={(e) => setLoginPassword(e.target.value)}
                         className="pl-10"
                         required
                       />
                     </div>
                   </div>
                 </CardContent>
 
                 <CardFooter>
                   <Button type="submit" className="w-full" disabled={isLoading}>
                     {isLoading ? (
                       <>
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                         Connexion...
                       </>
                     ) : (
                       'Se connecter'
                     )}
                   </Button>
                 </CardFooter>
               </form>
             </TabsContent>
 
             <TabsContent value="signup">
               <form onSubmit={handleSignup}>
                 <CardContent className="space-y-4">
                   <CardDescription className="text-center">
                     Créez votre compte pour accéder à l'espace entreprise
                   </CardDescription>
 
                   {error && (
                     <Alert variant="destructive">
                       <AlertDescription>{error}</AlertDescription>
                     </Alert>
                   )}
 
                   {success && (
                     <Alert>
                       <AlertDescription>{success}</AlertDescription>
                     </Alert>
                   )}
 
                   <div className="space-y-2">
                     <Label htmlFor="signup-name">Nom complet</Label>
                     <div className="relative">
                       <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                       <Input
                         id="signup-name"
                         type="text"
                         placeholder="Jean Dupont"
                         value={signupFullName}
                         onChange={(e) => setSignupFullName(e.target.value)}
                         className="pl-10"
                         required
                       />
                     </div>
                   </div>
 
                   <div className="space-y-2">
                     <Label htmlFor="signup-email">Email</Label>
                     <div className="relative">
                       <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                       <Input
                         id="signup-email"
                         type="email"
                         placeholder="votre@email.com"
                         value={signupEmail}
                         onChange={(e) => setSignupEmail(e.target.value)}
                         className="pl-10"
                         required
                       />
                     </div>
                   </div>
 
                   <div className="space-y-2">
                     <Label htmlFor="signup-password">Mot de passe</Label>
                     <div className="relative">
                       <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                       <Input
                         id="signup-password"
                         type="password"
                         placeholder="••••••••"
                         value={signupPassword}
                         onChange={(e) => setSignupPassword(e.target.value)}
                         className="pl-10"
                         required
                       />
                     </div>
                   </div>
 
                   <div className="space-y-2">
                     <Label htmlFor="signup-confirm">Confirmer le mot de passe</Label>
                     <div className="relative">
                       <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                       <Input
                         id="signup-confirm"
                         type="password"
                         placeholder="••••••••"
                         value={signupConfirmPassword}
                         onChange={(e) => setSignupConfirmPassword(e.target.value)}
                         className="pl-10"
                         required
                       />
                     </div>
                   </div>
                 </CardContent>
 
                 <CardFooter>
                   <Button type="submit" className="w-full" disabled={isLoading}>
                     {isLoading ? (
                       <>
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                         Création...
                       </>
                     ) : (
                       "Créer mon compte"
                     )}
                   </Button>
                 </CardFooter>
               </form>
             </TabsContent>
           </Tabs>
         </Card>
       </div>
     </div>
   );
 }