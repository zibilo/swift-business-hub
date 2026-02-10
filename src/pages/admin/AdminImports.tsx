import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Download, Loader2, FileDown } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function AdminImports() {
  const { toast } = useToast();

  const { data: imports, isLoading } = useQuery({
    queryKey: ['admin-imports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('file_imports')
        .select(`
          *,
          companies ( name )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fonction pour télécharger le fichier original depuis Supabase Storage
  const handleDownloadFile = async (storagePath: string, fileName: string) => {
    if (!storagePath) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Chemin du fichier introuvable."
      });
      return;
    }
try {
      toast({
        title: "Téléchargement...",
        description: "Récupération du fichier en cours."
      });

      const { data, error } = await supabase.storage
        .from('excel-imports') // Nom du bucket défini dans ImportExcel.tsx
        .download(storagePath);

      if (error) throw error;

      saveAs(data, fileName);
      
      toast({
        title: "Succès",
        description: "Fichier téléchargé."
      });
    } catch (error: any) {
      console.error('Erreur de téléchargement:', error);
      toast({
        variant: "destructive",
        title: "Erreur de téléchargement",
        description: error.message || "Impossible de récupérer le fichier sur le serveur."
      });
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'validated':
      case 'completed': return <Badge className="bg-green-100 text-green-800 border-green-200">Terminé</Badge>;
      case 'pending': return <Badge className="bg-amber-100 text-amber-800 border-amber-200">En cours</Badge>;
      case 'failed': return <Badge className="bg-red-100 text-red-800 border-red-200">Échec</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const handleExportLogs = async () => {
    if (!imports) return;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Logs d\'importation');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Fichier', key: 'file_name', width: 30 },
      { header: 'Entreprise', key: 'company_name', width: 30 },
      { header: 'Période', key: 'period', width: 15 },
      { header: 'Lignes', key: 'row_count', width: 10 },
      { header: 'Statut', key: 'status', width: 15 },
      { header: 'Date', key: 'date', width: 25 },
    ];

    imports.forEach(imp => {
      worksheet.addRow({
        id: imp.id,
        file_name: imp.filename,
        company_name: imp.companies?.name || 'Inconnu',
        period: imp.period,
        row_count: imp.row_count,
        status: imp.status,
        date: format(new Date(imp.created_at), 'dd/MM/yyyy HH:mm'),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `imports_history_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Historique des Flux</h1>
          <p className="text-slate-500">Supervision de tous les imports de fichiers</p>
        </div>
        <Button onClick={handleExportLogs} className="gap-2">
          <Download className="h-4 w-4" />
          Exporter logs (Excel)
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
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {imports?.map((imp) => (
              <TableRow key={imp.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{imp.filename}</div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">#{imp.id.split('-')[0]}</div>
                </TableCell>
                <TableCell className="text-sm">{imp.companies?.name || 'N/A'}</TableCell>
                <TableCell className="text-sm font-medium">{imp.period}</TableCell>
                <TableCell className="text-sm">{imp.row_count || 0} lignes</TableCell>
                <TableCell>{getStatusBadge(imp.status || 'pending')}</TableCell>
                <TableCell className="text-xs">
                  {format(new Date(imp.created_at), 'dd/MM/yy HH:mm')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      title="Télécharger le fichier source"
                      onClick={() => handleDownloadFile(imp.storage_path, imp.filename)}
                    >
                      <FileDown className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {imports?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun import trouvé</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
        }
