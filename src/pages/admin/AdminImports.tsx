
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { mockImports } from '@/lib/mockData';
import { format } from 'date-fns';

export default function AdminImports() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-100 text-green-800 border-green-200">Terminé</Badge>;
      case 'pending': return <Badge className="bg-amber-100 text-amber-800 border-amber-200">En cours</Badge>;
      case 'failed': return <Badge className="bg-red-100 text-red-800 border-red-200">Échec</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Historique des Flux</h1>
        <p className="text-slate-500">Supervision de tous les imports de fichiers</p>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fichier</TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date d'import</TableHead>
              <TableHead className="text-right">Rapport</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockImports.map((imp) => (
              <TableRow key={imp.id}>
                <TableCell className="font-medium">{imp.file_name}</TableCell>
                <TableCell>{imp.company_name}</TableCell>
                <TableCell>{getStatusBadge(imp.status)}</TableCell>
                <TableCell>{format(new Date(imp.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                <TableCell className="text-right">
                  <button className="text-sm text-blue-600 hover:underline">Consulter</button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
