
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, FileSpreadsheet, MessageSquare, TrendingUp, AlertCircle, Zap } from 'lucide-react';
import { mockCompanies, mockUsers, mockImports, mockSupportMessages } from '@/lib/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { Button } from '@/components/ui/button';

export default function AdminDashboard() {
  const { notifyNewArrival } = useAdminNotifications();
  const stats = [
    { title: 'Entreprises', value: mockCompanies.length, icon: Building2, color: 'text-blue-600' },
    { title: 'Utilisateurs', value: mockUsers.length, icon: Users, color: 'text-green-600' },
    { title: 'Imports Totaux', value: mockImports.length, icon: FileSpreadsheet, color: 'text-purple-600' },
    { title: 'Messages Support', value: mockSupportMessages.length, icon: MessageSquare, color: 'text-orange-600' },
  ];

  const data = [
    { name: 'Jan', imports: 4 },
    { name: 'Feb', imports: 7 },
    { name: 'Mar', imports: 5 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Administration</h1>
          <p className="text-slate-500">Vue d'ensemble de la plateforme (Données simulées)</p>
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
        {stats.map((stat) => (
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
            <CardTitle>Activité des Imports</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
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
                  <p className="text-sm font-medium text-amber-900">3 Entreprises en attente</p>
                  <p className="text-xs text-amber-700">Vérification des documents SIRET requise.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                <TrendingUp className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">Pic d'activité détecté</p>
                  <p className="text-xs text-red-700">Volume d'imports supérieur à la normale.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
