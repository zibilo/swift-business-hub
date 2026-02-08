import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AdminCompanies() {
  const { data: companies, isLoading } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Mock status function logic based on data availability
  const getStatusBadge = (company: any) => {
    // Logic simulated: if siret exists -> active, else pending
    const status = company.siret ? 'active' : 'pending';
    
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-800 border-green-200">Actif</Badge>;
      case 'pending': return <Badge className="bg-amber-100 text-amber-800 border-amber-200">En attente</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Gestion des Entreprises</h1>
        <p className="text-slate-500">Liste des entités juridiques enregistrées</p>
      </div>
      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>SIRET</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date de création</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies?.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell className="font-mono text-xs">{company.siret || '-'}</TableCell>
                <TableCell>{company.city || '-'}</TableCell>
                <TableCell>{getStatusBadge(company)}</TableCell>
                <TableCell>{format(new Date(company.created_at), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="text-right">
                  <button className="text-sm text-blue-600 hover:underline">Modifier</button>
                </TableCell>
              </TableRow>
            ))}
            {companies?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune entreprise trouvée</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
          }
