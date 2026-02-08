import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockImports as initialImports, MockImport } from '@/lib/mockData';
import { format } from 'date-fns';
import { BrandIcon } from '@/components/BrandIcons';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

export default function AdminImports() {
  const [imports, setImports] = useState<MockImport[]>(initialImports);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-100 text-green-800 border-green-200">Terminé</Badge>;
      case 'pending': return <Badge className="bg-amber-100 text-amber-800 border-amber-200">En cours</Badge>;
      case 'failed': return <Badge className="bg-red-100 text-red-800 border-red-200">Échec</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Logs d\'importation');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 15 },
      { header: 'Fichier', key: 'file_name', width: 30 },
      { header: 'Entreprise', key: 'company_name', width: 30 },
      { header: 'Période', key: 'period', width: 15 },
      { header: 'Lignes', key: 'row_count', width: 10 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Statut', key: 'status', width: 15 },
      { header: 'Date', key: 'date', width: 25 },
    ];

    imports.forEach(imp => {
      worksheet.addRow({
        id: imp.id,
        file_name: imp.file_name,
        company_name: imp.company_name,
        period: imp.period,
        row_count: imp.row_count,
        type: imp.is_update ? 'MAJ' : 'INIT',
        status: imp.status,
        date: format(new Date(imp.created_at), 'dd/MM/yyyy HH:mm'),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "imports_history_" + format(new Date(), 'yyyyMMdd_HHmm') + ".xlsx");
  };

  const markAsRead = (id: string) => {
    setImports(imports.map(imp => imp.id === id ? { ...imp, is_read: true } : imp));
    toast.success('Dossier marqué comme lu');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Historique des Flux</h1>
          <p className="text-slate-500">Supervision de tous les imports de fichiers</p>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <BrandIcon name="download" className="h-4 w-4" />
          Exporter logs
        </Button>
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
            {imports.map((imp) => (
              <TableRow key={imp.id} className={!imp.is_read ? 'bg-blue-50/30' : ''}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {!imp.is_read && <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />}
                    <div className="font-medium">{imp.file_name}</div>
                  </div>
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
                  <div className="flex justify-end gap-2">
                    {!imp.is_read && (
                      <Button variant="ghost" size="sm" onClick={() => markAsRead(imp.id)}>
                        <BrandIcon name="success" className="h-4 w-4 text-emerald-600" />
                      </Button>
                    )}
                    <button className="text-xs text-blue-600 font-medium hover:underline">Détails</button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
        }
