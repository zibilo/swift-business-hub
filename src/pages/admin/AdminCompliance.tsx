import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ShieldAlert, Fingerprint, AlertCircle, 
  History, FileWarning, Download, CheckCircle2, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// LIBRAIRIES D'EXPORT
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const AdminCompliance = () => {
  const [isExporting, setIsExporting] = useState(false);

  // 1. RÉCUPÉRATION DES ATYPISMES
  const { data: outliers, isLoading: loadingOutliers } = useQuery({
    queryKey: ['admin-outliers-real'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('file_import_rows')
        .select(`*, file_imports!inner ( filename, companies!inner ( name ) )`)
        .order('montant', { ascending: false });

      if (error) return [];
      if (!data || data.length === 0) return [];

      const average = data.reduce((acc, curr) => acc + curr.montant, 0) / data.length;
      return data.filter(row => row.montant > 5000000 || row.montant > (average * 3));
    }
  });

  // 2. RÉCUPÉRATION DU JOURNAL D'AUDIT
  const { data: auditLogs, isLoading: loadingLogs } = useQuery({
    queryKey: ['admin-audit-logs-real'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      return error ? [] : data;
    }
  });

  // 3. FONCTION D'EXPORTATION EXCEL
  const handleExportAudit = async () => {
    try {
      setIsExporting(true);
      const workbook = new ExcelJS.Workbook();
      
      // FEUILLE 1 : ATYPISMES
      const sheet1 = workbook.addWorksheet('Alertes Atypismes');
      sheet1.columns = [
        { header: 'SALARIÉ', key: 'nom', width: 30 },
        { header: 'ENTREPRISE', key: 'entreprise', width: 30 },
        { header: 'MONTANT (FCFA)', key: 'montant', width: 20 },
        { header: 'DIAGNOSTIC', key: 'diag', width: 40 },
      ];

      outliers?.forEach(row => {
        sheet1.addRow({
          nom: row.nom_prenom,
          entreprise: row.file_imports?.companies?.name,
          montant: row.montant,
          diag: row.montant > 5000000 ? "Dépassement seuil 5M" : "Écart atypique (3x moyenne)"
        });
      });

      // FEUILLE 2 : JOURNAL D'AUDIT
      const sheet2 = workbook.addWorksheet('Journal Audit');
      sheet2.columns = [
        { header: 'DATE', key: 'date', width: 20 },
        { header: 'UTILISATEUR', key: 'user', width: 20 },
        { header: 'ACTION', key: 'action', width: 25 },
        { header: 'CIBLE', key: 'target', width: 40 },
      ];

      auditLogs?.forEach(log => {
        sheet2.addRow({
          date: format(new Date(log.created_at), 'dd/MM/yyyy HH:mm'),
          user: log.user_name,
          action: log.action,
          target: log.target
        });
      });

      // Style des en-têtes (Bleu MUCODEC)
      [sheet1, sheet2].forEach(sheet => {
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00204E' } };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Audit_Conformite_MUCODEC_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
      toast.success("Rapport d'audit exporté avec succès");
    } catch (error) {
      toast.error("Erreur lors de l'exportation");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-red-600 uppercase tracking-widest mb-2">
            <ShieldAlert className="h-3 w-3" />
            Vigilance Risques Opérationnels
          </div>
          <h1 className="text-3xl font-black text-[#00204E] tracking-tight">Audit & Conformité</h1>
          <p className="text-slate-500">Scan des anomalies financières et traçabilité SQL</p>
        </div>
        <Button 
          onClick={handleExportAudit} 
          disabled={isExporting}
          className="h-12 gap-2 bg-slate-900 hover:bg-black text-white rounded-xl shadow-lg font-bold text-xs uppercase"
        >
          {isExporting ? <Loader2 className="animate-spin h-4 w-4" /> : <Download className="h-4 w-4" />}
          Rapport d'Audit Complet (XLSX)
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LE RESTE DU CODE (TABLEAUX) EST IDENTIQUE A VOTRE VERSION PRÉCÉDENTE */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
            <CardHeader className="bg-red-50/50 border-b border-red-100 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-red-500" />
                Alertes Montants Atypiques
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead className="pl-6">Salarié</TableHead><TableHead>Montant</TableHead><TableHead>Diagnostic</TableHead></TableRow></TableHeader>
                <TableBody>
                  {outliers?.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="pl-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{row.nom_prenom}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">
                            {row.file_imports?.companies?.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-black text-red-600">{row.montant.toLocaleString()} FCFA</TableCell>
                      <TableCell><Badge className="bg-red-100 text-red-700 text-[9px] uppercase border-none">Alerte</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-slate-900 text-white rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-white/10 bg-black/20">
              <CardTitle className="text-xs uppercase tracking-widest text-blue-400 flex items-center gap-2">
                <Fingerprint className="h-4 w-4" /> Journal d'Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                {auditLogs?.map((log) => (
                    <div key={log.id} className="p-4 hover:bg-white/5 border-b border-white/5">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black text-blue-400 uppercase">{log.action}</span>
                        <span className="text-[9px] text-slate-500 font-mono">{format(new Date(log.created_at), 'HH:mm')}</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{log.target}</p>
                    </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminCompliance;
