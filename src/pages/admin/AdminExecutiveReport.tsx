import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  FileText, TrendingUp, Wallet, 
  Download, Printer, ArrowUpRight, CheckCircle2, Building2, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { fr } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

// LIBRAIRIES POUR LE PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdminExecutiveReport = () => {
  
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['admin-exec-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('file_imports')
        .select(`
          *,
          companies ( name ),
          file_import_rows ( montant )
        `)
        .eq('status', 'validated');

      if (error) throw error;

      const totalCompanies = data.length;
      const totalEmployees = data.reduce((acc, curr) => acc + (curr.row_count || 0), 0);
      const totalAmount = data.reduce((acc, curr) => {
        const fileSum = curr.file_import_rows.reduce((s: number, r: any) => s + r.montant, 0);
        return acc + fileSum;
      }, 0);
      const totalCommissions = totalEmployees * 2000;

      return {
        totalCompanies,
        totalEmployees,
        totalAmount,
        totalCommissions,
        recentActivity: data.slice(0, 10) // On prend les 10 derniers pour le rapport
      };
    }
  });

  // FONCTION D'IMPRESSION
  const handlePrint = () => {
    window.print();
  };

  // FONCTION EXPORT PDF
  const handleDownloadPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const dateStr = format(new Date(), 'dd/MM/yyyy HH:mm');

    // 1. Entête MUCODEC
    doc.setFillColor(0, 32, 78); // Bleu #00204E
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('MUCODEC - RAPPORT DE DIRECTION', 15, 25);
    doc.setFontSize(10);
    doc.text(`Généré le : ${dateStr}`, 15, 35);

    // 2. Section KPI (Chiffres clés)
    doc.setTextColor(0, 32, 78);
    doc.setFontSize(14);
    doc.text('SYNTHÈSE DE L\'ACTIVITÉ', 15, 55);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Entreprises traitées : ${reportData.totalCompanies}`, 15, 65);
    doc.text(`Salariés impactés : ${reportData.totalEmployees}`, 15, 72);
    doc.text(`Masse salariale totale : ${reportData.totalAmount.toLocaleString()} FCFA`, 15, 79);
    doc.setFont(undefined, 'bold');
    doc.text(`Revenus commissions : ${reportData.totalCommissions.toLocaleString()} FCFA`, 15, 86);

    // 3. Tableau de l'activité récente
    doc.setFontSize(14);
    doc.text('DÉTAIL DES DERNIERS DOSSIERS', 15, 100);

    const tableRows = reportData.recentActivity.map((item: any) => [
      format(new Date(item.created_at), 'dd/MM/yyyy'),
      item.companies?.name || 'Inconnu',
      `${item.row_count} pers.`,
      `${(item.row_count * 2000).toLocaleString()} FCFA`
    ]);

    autoTable(doc, {
      startY: 105,
      head: [['Date', 'Entreprise', 'Effectif', 'Commission']],
      body: tableRows,
      headStyles: { fillStyle: 'solid', fillColor: [0, 32, 78] },
      styles: { fontSize: 9 }
    });

    // 4. Pied de page
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Certification Numérique MUCODEC - Document confidentiel pour usage interne uniquement.', 105, 285, { align: 'center' });

    doc.save(`Rapport_DG_MUCODEC_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-6 space-y-8 max-w-[1200px] mx-auto bg-[#F8FAFC] min-h-screen print:bg-white print:p-0">
      
      {/* HEADER : ACTIONS RAPIDES DG */}
      <div className="flex justify-between items-center border-b pb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-[#00204E] flex items-center gap-3">
            <FileText className="text-red-600" />
            Compte-rendu d'Activité
          </h1>
          <p className="text-sm text-slate-500 font-medium italic">Tableau de bord stratégique</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handlePrint} variant="outline" className="rounded-xl border-slate-200 gap-2 text-xs font-bold uppercase shadow-sm hover:bg-slate-50">
            <Printer className="h-4 w-4" /> Imprimer
          </Button>
          <Button onClick={handleDownloadPDF} className="rounded-xl bg-[#00204E] hover:bg-blue-900 gap-2 text-xs font-bold uppercase shadow-lg transition-all active:scale-95">
            <Download className="h-4 w-4" /> Télécharger PDF
          </Button>
        </div>
      </div>

      {/* ZONE 1 : LES 3 INDICATEURS CLÉS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard title="Flux Entreprises" value={reportData?.totalCompanies || 0} unit="Entités" icon={<Building2 className="text-blue-600" />} description="Dossiers validés" />
        <KPICard title="Masse Salariale" value={(reportData?.totalAmount || 0).toLocaleString()} unit="FCFA" icon={<Wallet className="text-emerald-600" />} description="Volume distribué" highlight />
        <KPICard title="Revenus Banque" value={(reportData?.totalCommissions || 0).toLocaleString()} unit="FCFA" icon={<TrendingUp className="text-red-600" />} description="Commissions perçues" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* GRAPHIQUE */}
        <Card className="border-none shadow-xl rounded-[32px] overflow-hidden bg-white">
          <CardHeader className="bg-slate-50 border-b"><CardTitle className="text-sm font-black uppercase text-slate-400">Volume par type</CardTitle></CardHeader>
          <CardContent className="pt-8 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: 'G.E', value: 70 }, { name: 'PME', value: 30 }]}>
                <XAxis dataKey="name" />
                <Bar dataKey="value" fill="#00204E" radius={[10, 10, 0, 0]} />
                <Tooltip />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* TABLEAU RÉSUMÉ */}
        <Card className="border-none shadow-xl rounded-[32px] overflow-hidden bg-white">
          <CardHeader className="bg-slate-50 border-b"><CardTitle className="text-sm font-black uppercase text-slate-400">Derniers Dossiers</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {reportData?.recentActivity.map((item: any) => (
                  <TableRow key={item.id} className="border-none hover:bg-slate-50">
                    <TableCell className="py-4 pl-6 font-bold">{item.companies?.name}</TableCell>
                    <TableCell className="text-right py-4 pr-6">
                      <p className="text-sm font-black text-[#00204E]">{(item.row_count * 2000).toLocaleString()} FCFA</p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="pt-12 flex flex-col items-center opacity-50">
         <div className="w-16 h-[2px] bg-slate-200 mb-4" />
         <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.3em]">Certification Digitale MUCODEC</p>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, unit, icon, description, highlight }: any) => (
  <Card className={cn(
    "border-none shadow-xl rounded-[32px] p-6 transition-all",
    highlight ? "bg-[#00204E] text-white" : "bg-white text-slate-900"
  )}>
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-3 rounded-2xl", highlight ? "bg-white/10" : "bg-slate-50")}>{icon}</div>
      <ArrowUpRight className="h-5 w-5 opacity-30" />
    </div>
    <p className={cn("text-[10px] font-black uppercase tracking-widest", highlight ? "text-blue-200" : "text-slate-400")}>{title}</p>
    <div className="flex items-baseline gap-2 mt-1">
      <span className="text-2xl font-black tracking-tight">{value}</span>
      <span className="text-[10px] font-bold opacity-60">{unit}</span>
    </div>
    <p className="text-[9px] mt-4 font-medium opacity-50">{description}</p>
  </Card>
);

export default AdminExecutiveReport;
