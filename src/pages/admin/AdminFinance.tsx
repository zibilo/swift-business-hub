import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Calculator, Download, Search, Loader2, 
  TrendingUp, CreditCard, Landmark, CircleDollarSign,
  AlertCircle, CheckCircle2, HelpCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Constante tarifaire MUCODEC
const FEE_PER_LINE = 2000; 

const AdminFinance = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // 1. RÉCUPÉRATION DES DONNÉES (Jointure Imports + Entreprises)
  const { data: billingData, isLoading } = useQuery({
    queryKey: ['admin-billing-data'],
    queryFn: async () => {
      // Note: On récupère les données de file_imports avec les infos entreprises
      const { data, error } = await supabase
        .from('file_imports')
        .select(`
          *,
          companies ( id, name, siret )
        `)
        .eq('status', 'validated')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // 2. LOGIQUE DE CALCUL DES FRAIS
  // Liste fictive des statuts entreprises (à terme, cela viendra d'une colonne 'fee_status' dans la table companies)
  const getCompanyFeeStatus = (companyId: string) => {
    // Simulation : Les IDs pairs sont en liste verte, les impairs en orange, les autres standards
    const lastChar = companyId.slice(-1);
    if (['0', '2', '4'].includes(lastChar)) return 'GREEN'; // Pas de frais
    if (['1', '3', '5'].includes(lastChar)) return 'ORANGE'; // Frais au 2ème virement
    return 'STANDARD'; // Frais immédiats
  };

  const calculateFrais = (lines: number, status: string) => {
    if (status === 'GREEN') return 0;
    // Pour Orange, on pourrait ajouter une logique de vérification du nombre de virements ici
    return lines * FEE_PER_LINE;
  };

  // Filtrage
  const filteredData = billingData?.filter(item => 
    item.companies?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 3. GÉNÉRATEUR DE PRÉ-FACTURATION (EXPORT EXCEL)
  const handleExportAccounting = async () => {
    if (!filteredData) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pre-Facturation Paie');

    worksheet.columns = [
      { header: 'DATE', key: 'date', width: 15 },
      { header: 'ENTREPRISE', key: 'company', width: 30 },
      { header: 'STATUT LISTE', key: 'status', width: 15 },
      { header: 'NB LIGNES', key: 'lines', width: 12 },
      { header: 'MONTANT TOTAL VIREMENTS', key: 'total', width: 25 },
      { header: 'COMMISSIONS (2000/L)', key: 'fees', width: 20 },
    ];

    filteredData.forEach(item => {
      const status = getCompanyFeeStatus(item.companies?.id || '');
      const fees = calculateFrais(item.row_count || 0, status);
      
      worksheet.addRow({
        date: format(new Date(item.created_at), 'dd/MM/yyyy'),
        company: item.companies?.name,
        status: status,
        lines: item.row_count,
        total: "Calcul en cours...", // Nécessite somme des montants des lignes
        fees: fees
      });
    });

    // Style
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00204E' } };

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Facturation_MUCODEC_${format(new Date(), 'MMM_yyyy')}.xlsx`);
    toast.success("État de pré-facturation exporté");
  };

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">
            <Calculator className="h-3 w-3" />
            Pôle Pilotage Financier
          </div>
          <h1 className="text-3xl font-black text-[#00204E] tracking-tight">Calculateur de Frais</h1>
          <p className="text-slate-500">Commissions de mouvement et facturation automatisée</p>
        </div>
        <Button onClick={handleExportAccounting} className="h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2 shadow-lg shadow-emerald-100">
          <Download className="h-4 w-4" />
          État mensuel Comptabilité
        </Button>
      </div>

      {/* CARDS STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Revenus théoriques" value="--" icon={<CircleDollarSign className="text-blue-600" />} subtitle="Base 2000 FCFA / ligne" />
        <StatCard title="Liste Verte" value="--" icon={<CheckCircle2 className="text-emerald-500" />} subtitle="Entreprises exonérées" />
        <StatCard title="Liste Orange" value="--" icon={<AlertCircle className="text-orange-500" />} subtitle="Frais au 2ème virement" />
        <StatCard title="Total à Virer" value="--" icon={<Landmark className="text-slate-600" />} subtitle="Masse salariale consolidée" />
      </div>

      {/* TABLEAU DE FACTURATION */}
      <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
        <div className="p-6 border-b flex items-center gap-3">
          <Search className="h-5 w-5 text-slate-400" />
          <Input 
            placeholder="Rechercher une entreprise..." 
            className="border-none shadow-none focus-visible:ring-0 text-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-bold text-[#00204E] pl-6">Client</TableHead>
                <TableHead className="font-bold text-[#00204E]">Catégorie Frais</TableHead>
                <TableHead className="font-bold text-[#00204E]">Volume</TableHead>
                <TableHead className="font-bold text-[#00204E]">Commission Due</TableHead>
                <TableHead className="font-bold text-[#00204E]">Date Flux</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
              ) : filteredData?.map((item) => {
                const status = getCompanyFeeStatus(item.companies?.id || '');
                const fees = calculateFrais(item.row_count || 0, status);
                
                return (
                  <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="pl-6 font-bold text-slate-900">{item.companies?.name}</TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "rounded-full px-3 py-0.5 text-[10px] font-black uppercase border-none",
                        status === 'GREEN' ? "bg-emerald-100 text-emerald-700" : 
                        status === 'ORANGE' ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {status === 'GREEN' ? 'Liste Verte' : status === 'ORANGE' ? 'Liste Orange' : 'Standard'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.row_count} lignes</TableCell>
                    <TableCell className="font-black text-blue-900">
                      {status === 'GREEN' ? "Exonéré" : `${fees.toLocaleString()} FCFA`}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {format(new Date(item.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({ title, value, icon, subtitle }: any) => (
  <Card className="border-none shadow-sm bg-white rounded-2xl p-6">
    <CardHeader className="p-0 flex flex-row items-center justify-between mb-4">
      <CardTitle className="text-[10px] uppercase tracking-widest text-slate-400 font-black">{title}</CardTitle>
      {icon}
    </CardHeader>
    <div className="text-2xl font-black text-slate-900">{value}</div>
    <p className="text-[9px] text-slate-500 font-medium mt-1">{subtitle}</p>
  </Card>
);

export default AdminFinance;
