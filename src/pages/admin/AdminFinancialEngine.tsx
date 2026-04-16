import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import { 
  Activity, Landmark, Wallet, ArrowDownCircle, Download, 
  Flame, TrendingUp, HelpCircle, Loader2, Info 
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

const AdminFinancialEngine = () => {
  const [simCount, setSimCount] = useState([10]); // Nombre de fichiers pour la simulation

  // 1. RÉCUPÉRATION DES DONNÉES FINANCIÈRES
  const { data: financialData, isLoading } = useQuery({
    queryKey: ['admin-financial-engine'],
    queryFn: async () => {
      // Récupère les imports validés avec le total des salaires par fichier
      const { data, error } = await supabase
        .from('file_imports')
        .select(`
          *,
          companies ( name ),
          file_import_rows ( montant )
        `)
        .eq('status', 'validated');

      if (error) throw error;

      // Calculer le total par import
      return data.map(imp => {
        const totalPayroll = imp.file_import_rows.reduce((sum: number, r: any) => sum + r.montant, 0);
        return {
          ...imp,
          totalPayroll,
          fees: (imp.row_count || 0) * 2000 // 2000 FCFA par ligne
        };
      });
    }
  });

  const totalCurrentLiquidityNeeds = financialData?.reduce((acc, curr) => acc + curr.totalPayroll, 0) || 0;
  const simulatedImpact = totalCurrentLiquidityNeeds * (simCount[0] / (financialData?.length || 1));

  // 2. EXPORT COMPTABILITÉ (Pré-facturation)
  const exportAccounting = async () => {
    if (!financialData) return;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pre-Facturation_Comptable');

    worksheet.columns = [
      { header: 'DATE', key: 'date', width: 15 },
      { header: 'ENTREPRISE', key: 'company', width: 30 },
      { header: 'MASSE SALARIALE (XAF)', key: 'payroll', width: 25 },
      { header: 'NB SALARIÉS', key: 'count', width: 15 },
      { header: 'COMMISSIONS (2000/L)', key: 'fees', width: 20 },
    ];

    financialData.forEach(item => {
      worksheet.addRow({
        date: format(new Date(item.created_at), 'dd/MM/yyyy'),
        company: item.companies?.name,
        payroll: item.totalPayroll,
        count: item.row_count,
        fees: item.fees
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `PRE_FACTU_MUCODEC_${Date.now()}.xlsx`);
    toast.success("État de pré-facturation généré");
  };

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
      {/* HEADER STRATÉGIQUE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">
            <Activity className="h-3 w-3" />
            Performance & Liquidité
          </div>
          <h1 className="text-3xl font-black text-[#00204E] tracking-tight">Pilotage Financier</h1>
          <p className="text-slate-500">Moteur de calcul des revenus et surveillance des réserves</p>
        </div>
        <Button onClick={exportAccounting} className="bg-emerald-600 hover:bg-emerald-700 h-12 rounded-xl gap-2 shadow-lg">
          <Download className="h-4 w-4" /> Export Comptable
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* MODULE 1 : AMORTISSEUR DE TRÉSORERIE */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-xl bg-white rounded-[32px] overflow-hidden">
            <CardHeader className="bg-[#00204E] text-white">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-blue-300" />
                  Amortisseur de Trésorerie (Liquidity Buffer)
                </CardTitle>
                <Badge className="bg-blue-500/20 text-blue-200 border-none">Temps Réel</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Besoin Immédiat</p>
                    <div className="text-4xl font-black text-[#00204E]">{totalCurrentLiquidityNeeds.toLocaleString()} <span className="text-lg font-light">XAF</span></div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                      <TrendingUp className="h-3 w-3" /> Projection du risque
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Ce montant représente la somme totale des salaires validés en attente de virement final dans le Core Banking.
                    </p>
                  </div>
                </div>
                
                {/* GRAPHIQUE DE LIQUIDITÉ */}
                <div className="w-full md:w-1/2 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={financialData || []}>
                      <defs>
                        <linearGradient id="colorPayroll" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00204E" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#00204E" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="totalPayroll" stroke="#00204E" fillOpacity={1} fill="url(#colorPayroll)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* MODULE 2 : SIMULATION D'IMPACT (STRESS TEST) */}
          <Card className="border-none shadow-xl bg-slate-900 text-white rounded-[32px] p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Flame className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Simulation d'Impact Massif</CardTitle>
                <p className="text-sm text-slate-400">Scénario : Validation simultanée de {simCount} dossiers critiques</p>
              </div>
            </div>

            <div className="space-y-8">
              <Slider 
                value={simCount} 
                onValueChange={setSimCount} 
                max={50} 
                step={1} 
                className="py-4"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Décaissement Simulé</p>
                  <div className="text-3xl font-black text-white">{simulatedImpact.toLocaleString()} XAF</div>
                </div>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Impact Liquidité Banque</p>
                  <div className="text-3xl font-black text-white">-{((simulatedImpact / 1000000000) * 100).toFixed(2)}%</div>
                  <p className="text-[9px] text-slate-500 mt-1">Sur base réserve 1 Md XAF</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* COLONNE DROITE : RENTABILITÉ (1/3) */}
        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-white rounded-[32px] p-6 text-center">
             <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Wallet className="h-8 w-8 text-emerald-600" />
             </div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Revenus de Commissions</p>
             <div className="text-3xl font-black text-slate-900 mt-2">
               {financialData?.reduce((acc, curr) => acc + curr.fees, 0).toLocaleString()} XAF
             </div>
             <p className="text-[10px] text-emerald-600 font-bold mt-1">Générés ce mois-ci</p>
             
             <div className="mt-8 pt-8 border-t border-slate-50 space-y-4">
                <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-500">Moyenne / Fichier</span>
                   <span className="font-bold">45 000 XAF</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-500">Frais de Mouvement</span>
                   <Badge className="bg-slate-100 text-slate-600 border-none">Auto</Badge>
                </div>
             </div>
          </Card>

          <Card className="border-none shadow-lg bg-blue-50 rounded-[32px] p-6">
             <div className="flex items-start gap-3">
               <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
               <p className="text-xs text-blue-900 leading-relaxed italic">
                 "L'amortisseur de trésorerie permet d'anticiper les sorties de fonds et d'éviter les ruptures de liquidité lors du pic des salaires (25 au 30 du mois)."
               </p>
             </div>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default AdminFinancialEngine;
