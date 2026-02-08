

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, FileSpreadsheet, MessageSquare, TrendingUp, AlertCircle, Zap, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function AdminDashboard() {
  const { notifyNewArrival } = useAdminNotifications();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [companies, profiles, imports, messages] = await Promise.all([
        supabase.from('companies').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('file_imports').select('id', { count: 'exact' }),
        supabase.from('support_messages').select('id', { count: 'exact' }),
      ]);

      return {
        companies: companies.count || 0,
        users: profiles.count || 0,
        imports: imports.count || 0,
        messages: messages.count || 0,
      };
    },
  });

  const { data: recentImports } = useQuery({
    queryKey: ['admin-imports-chart'],
    queryFn: async () => {
      const { data } = await supabase
        .from('file_imports')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      // Group by month (simplified logic)
      const grouped = (data || []).reduce((acc: any, curr) => {
        const date = new Date(curr.created_at);
        const key = date.toLocaleString('default', { month: 'short' });
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(grouped).map(([name, imports]) => ({ name, imports }));
    }
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const statCards = [
    { title: 'Entreprises', value: stats?.companies || 0, icon: Building2, color: 'text-blue-600' },
    { title: 'Utilisateurs', value: stats?.users || 0, icon: Users, color: 'text-green-600' },
    { title: 'Imports Totaux', value: stats?.imports || 0, icon: FileSpreadsheet, color: 'text-purple-600' },
    { title: 'Messages Support', value: stats?.messages || 0, icon: MessageSquare, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Administration</h1>
          <p className="text-slate-500">Vue d'ensemble de la plateforme (Données Réelles)</p>
        </div>
        <Button
          variant="outline"
          className="gap-2 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
          onClick={() => notifyNewArrival("Simulation_Fichier_2026.xlsx")}
        >
          <Zap className="h-4 w-4" />
          Simuler Import (Alerte Sonore)
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Activité des Imports (Derniers mois)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recentImports || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="imports" fill="#0f172a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Alertes Système</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Système opérationnel</p>
                  <p className="text-xs text-amber-700">Connexion base de données active.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Synchronisation</p>
                  <p className="text-xs text-blue-700">Dernière maj: {new Date().toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
          }
                  
