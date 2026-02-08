import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSpreadsheet, CheckCircle, Loader2, Download, TrendingUp, BarChart3, Zap, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';

const ImportHistory = () => {
  const { companyUser } = useAuth();

  const { data: imports, isLoading } = useQuery({
    queryKey: ['file-imports', companyUser?.company_id],
    queryFn: async () => {
      if (!companyUser?.company_id) return [];
      const { data, error } = await supabase
        .from('file_imports')
        .select(`*, uploaded_by_profile:profiles!file_imports_uploaded_by_fkey(full_name)`)
        .eq('company_id', companyUser.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Identify updates (if there's a previous import for the same period)
      const periodMap = new Map<number, boolean>();
      const processedData = data.map((imp) => {
        const isUpdate = periodMap.has(imp.period);
        if (!isUpdate) {
          periodMap.set(imp.period, true);
        }
        return { ...imp, isUpdate };
      });

      return processedData.reverse().map((imp, index, array) => {
          // Re-process to mark all but the oldest as updates
          const olderImportsForSamePeriod = array.slice(0, index).filter(i => i.period === imp.period);
          return { ...imp, isUpdate: olderImportsForSamePeriod.length > 0 };
      }).reverse();
    },
    enabled: !!companyUser?.company_id,
  });

  const stats = {
    total: imports?.length || 0,
    totalRows: imports?.reduce((acc, curr) => acc + (curr.row_count || 0), 0) || 0,
    successRate: imports?.length 
      ? Math.round((imports.filter(i => i.status === 'completed').length / imports.length) * 100) 
      : 0
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 lg:p-12 space-y-8 max-w-[1600px] mx-auto">
      
      {/* HEADER RESPONSIVE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Activité des Flux</h1>
          <p className="text-sm text-slate-500">Statistiques et historique de mise à jour</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 hidden sm:flex">
                Serveur Opérationnel
            </Badge>
            <Badge variant="outline" className="bg-white text-slate-400 font-mono text-[10px]">
                v2.0.4
            </Badge>
        </div>
      </div>

      {/* KPI CARDS : 1 colonne mobile, 3 colonnes desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <StatCard 
          title="Fichiers" 
          value={stats.total} 
          icon={<FileSpreadsheet className="text-blue-600 h-5 w-5" />} 
          trend="+2 ce mois"
        />
        <StatCard 
          title="Lignes" 
          value={stats.totalRows.toLocaleString()} 
          icon={<TrendingUp className="text-emerald-600 h-5 w-5" />} 
          trend="Volume total"
        />
        <StatCard 
          title="Intégrité" 
          value={`${stats.successRate}%`} 
          icon={<CheckCircle className="text-blue-900 h-5 w-5" />} 
          trend="Validation auto"
          className="sm:col-span-2 lg:col-span-1" 
        />
      </div>

      {/* TABLEAU RESPONSIVE */}
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-50 px-4 md:px-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-slate-400" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-600">Journal des Flux</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto"> {/* Conteneur pour le scroll horizontal sur mobile */}
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="px-4 md:px-6 py-4 text-[10px] font-bold uppercase">Source / ID</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase hidden md:table-cell">Volume</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Type</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Statut</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Date</TableHead>
                  <TableHead className="text-right px-4 md:px-6 text-[10px] font-bold uppercase">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                   <TableRow><TableCell colSpan={5} className="h-32 text-center text-slate-400">Chargement...</TableCell></TableRow>
                ) : imports?.map((imp) => (
                  <TableRow key={imp.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                    <TableCell className="px-4 md:px-6 py-4">
                      <div className="font-bold text-slate-700 text-sm md:text-base truncate max-w-[120px] md:max-w-full">
                        {imp.filename}
                      </div>
                      <div className="text-[9px] font-mono text-slate-400">#{imp.id.split('-')[0]}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        <span className="text-sm font-medium text-slate-600">{imp.row_count || 0} lignes</span>
                    </TableCell>
                    <TableCell>
                      {imp.isUpdate ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 text-[9px] font-bold">MISE À JOUR</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-100 text-[9px] font-bold">INITIAL</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(imp.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-600 font-medium">{format(new Date(imp.created_at), 'dd/MM/yy', { locale: fr })}</span>
                        <span className="text-[10px] text-slate-400">{format(new Date(imp.created_at), 'HH:mm')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-4 md:px-6">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-blue-50 hover:text-blue-600">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// COMPOSANT STAT CARD RESPONSIVE
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend: string;
  className?: string;
}

const StatCard = ({ title, value, icon, trend, className }: StatCardProps) => (
  <motion.div whileHover={{ y: -2 }} className={className}>
    <Card className="border-none shadow-sm bg-white h-full">
        <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-slate-50 rounded-xl">
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
                <div className="flex items-baseline gap-2">
                    <p className="text-xl md:text-2xl font-black text-slate-900">{value}</p>
                    <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded truncate uppercase">
                        {trend}
                    </span>
                </div>
            </div>
        </CardContent>
    </Card>
  </motion.div>
);

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
    processing: "bg-blue-50 text-blue-700 border-blue-100",
    error: "bg-red-50 text-red-700 border-red-100"
  };
  const labels: Record<string, string> = { completed: "OK", processing: "LOAD", error: "ERR" };

  return (
    <Badge className={`${styles[status] || "bg-slate-50"} border text-[9px] shadow-none font-black px-2 py-0.5`}>
      {labels[status] || "WAIT"}
    </Badge>
  );
};

export default ImportHistory;
