
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { mockCompanies } from '@/lib/mockData';
import { format } from 'date-fns';

export default function AdminCompanies() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-800 border-green-200">Actif</Badge>;
      case 'pending': return <Badge className="bg-amber-100 text-amber-800 border-amber-200">En attente</Badge>;
      case 'suspended': return <Badge className="bg-red-100 text-red-800 border-red-200">Suspendu</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

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
              <TableHead>Statut</TableHead>
              <TableHead>Date de création</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockCompanies.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell className="font-mono text-xs">{company.siret}</TableCell>
                <TableCell>{getStatusBadge(company.status)}</TableCell>
                <TableCell>{format(new Date(company.created_at), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="text-right">
                  <button className="text-sm text-blue-600 hover:underline">Modifier</button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
