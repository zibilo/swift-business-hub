
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
              <TableHead>Fichier / ID</TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead>Période</TableHead>
              <TableHead>Volume</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockImports.map((imp) => (
              <TableRow key={imp.id}>
                <TableCell>
                  <div className="font-medium">{imp.file_name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">#{imp.id}</div>
                </TableCell>
                <TableCell className="text-sm">{imp.company_name}</TableCell>
                <TableCell className="text-sm font-medium">{imp.period}</TableCell>
                <TableCell className="text-sm">{imp.row_count} lignes</TableCell>
                <TableCell>
                  {imp.is_update ? (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 text-[10px]">MAJ</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-100 text-[10px]">INIT</Badge>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(imp.status)}</TableCell>
                <TableCell className="text-xs">
                  {format(new Date(imp.created_at), 'dd/MM/yy HH:mm')}
                </TableCell>
                <TableCell className="text-right">
                  <button className="text-xs text-blue-600 font-medium hover:underline">Détails</button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
