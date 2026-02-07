import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateCompanyDialog } from '@/components/CreateCompanyDialog';
import { Button } from '@/components/ui/button';
import { Building2, FileSpreadsheet, MessageSquare, History, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const { companyUser } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', companyUser?.company_id],
    queryFn: async () => {
      if (!companyUser?.company_id) return null;
      
      const [importsResult, messagesResult] = await Promise.all([
        supabase
          .from('file_imports')
          .select('id, status', { count: 'exact' })
          .eq('company_id', companyUser.company_id),
        supabase
          .from('support_messages')
          .select('id', { count: 'exact' })
          .eq('company_id', companyUser.company_id)
          .is('read_at', null)
          .eq('is_from_support', true),
      ]);

      return {
        totalImports: importsResult.count || 0,
        pendingImports: importsResult.data?.filter(i => i.status === 'pending').length || 0,
        unreadMessages: messagesResult.count || 0,
      };
    },
    enabled: !!companyUser?.company_id,
  });

  if (!companyUser) {
    return (
      <div className="p-4 md:p-6">
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Bienvenue !</CardTitle>
            <CardDescription>
              Vous n'êtes pas encore associé à une entreprise. 
              Créez votre entreprise ou demandez une invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateCompanyDialog>
              <Button className="w-full">
                <Building2 className="h-4 w-4 mr-2" />
                Créer mon entreprise
              </Button>
            </CreateCompanyDialog>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Bienvenue dans votre espace entreprise
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Quick action: Import */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Import Excel
            </CardTitle>
            <CardDescription>
              Envoyez vos fichiers de paie
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/import">
              <Button className="w-full" variant="outline">
                Importer un fichier
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Stats: Imports */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-primary" />
              Historique
            </CardTitle>
            <CardDescription>
              {stats?.totalImports || 0} fichier(s) importé(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/history">
              <Button className="w-full" variant="outline">
                Voir l'historique
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Support messages */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
              Support
              {stats?.unreadMessages ? (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                  {stats.unreadMessages}
                </span>
              ) : null}
            </CardTitle>
            <CardDescription>
              Contactez notre équipe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/support">
              <Button className="w-full" variant="outline">
                Ouvrir le chat
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
