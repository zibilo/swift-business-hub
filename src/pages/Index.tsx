 import { useAuth } from '@/contexts/AuthContext';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Building2, LogOut, User, FileSpreadsheet, MessageSquare } from 'lucide-react';
 
 const Index = () => {
   const { user, profile, companyUser, signOut } = useAuth();
 
   return (
     <div className="min-h-screen bg-muted/30">
       {/* Header */}
       <header className="bg-background border-b">
         <div className="container mx-auto px-4 py-4 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <Building2 className="h-8 w-8 text-primary" />
             <h1 className="text-xl font-bold text-foreground">Espace Entreprise</h1>
           </div>
           <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-medium text-foreground">{profile?.full_name || user?.email}</p>
               {companyUser?.company && (
                 <p className="text-xs text-muted-foreground">{companyUser.company.name}</p>
               )}
             </div>
             <Button variant="outline" size="sm" onClick={signOut}>
               <LogOut className="h-4 w-4 mr-2" />
               Déconnexion
             </Button>
           </div>
         </div>
       </header>
 
       {/* Main Content */}
       <main className="container mx-auto px-4 py-8">
         {!companyUser ? (
           <Card className="max-w-lg mx-auto">
             <CardHeader>
               <CardTitle>Bienvenue !</CardTitle>
               <CardDescription>
                 Vous n'êtes pas encore associé à une entreprise. 
                 Créez votre entreprise ou demandez une invitation.
               </CardDescription>
             </CardHeader>
             <CardContent>
               <Button className="w-full">
                 <Building2 className="h-4 w-4 mr-2" />
                 Créer mon entreprise
               </Button>
             </CardContent>
           </Card>
         ) : (
           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <User className="h-5 w-5" />
                   Mon Profil
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="space-y-2 text-sm">
                   <p><span className="text-muted-foreground">Nom:</span> {profile?.full_name || '-'}</p>
                   <p><span className="text-muted-foreground">Email:</span> {user?.email}</p>
                   <p><span className="text-muted-foreground">Rôle:</span> {companyUser.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</p>
                 </div>
               </CardContent>
             </Card>
 
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Building2 className="h-5 w-5" />
                   Mon Entreprise
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="space-y-2 text-sm">
                   <p><span className="text-muted-foreground">Nom:</span> {companyUser.company?.name}</p>
                   <p><span className="text-muted-foreground">SIRET:</span> {companyUser.company?.siret || '-'}</p>
                 </div>
               </CardContent>
             </Card>
 
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <FileSpreadsheet className="h-5 w-5" />
                   Fichiers Excel
                 </CardTitle>
                 <CardDescription>Envoyez vos fichiers de données</CardDescription>
               </CardHeader>
               <CardContent>
                 <Button className="w-full" variant="outline">
                   Envoyer un fichier
                 </Button>
               </CardContent>
             </Card>
 
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <MessageSquare className="h-5 w-5" />
                   Support
                 </CardTitle>
                 <CardDescription>Contactez notre équipe</CardDescription>
               </CardHeader>
               <CardContent>
                 <Button className="w-full" variant="outline">
                   Ouvrir le chat
                 </Button>
               </CardContent>
             </Card>
           </div>
         )}
       </main>
     </div>
   );
 };
 
 export default Index;
