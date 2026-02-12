import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BrandIcon } from '@/components/BrandIcons';

const ImportHistory = () => {
  const { companyUser } = useAuth();

  const { data: imports, isLoading } = useQuery({
    queryKey: ['file-imports', companyUser?.company_id],
    queryFn: async () => {
      if (!companyUser?.company_id) return [];
      const { data, error } = await supabase
        .from('file_imports')
        .select(`*`)
        .eq('company_id', companyUser.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!companyUser?.company_id,
  });

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historique des Flux</h1>
          <p className="text-sm text-slate-500">Journal des transmissions</p>
        </div>
        <BrandIcon name="history" size={32} color="#004080" />
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <BrandIcon name="history" className="h-4 w-4" />
            JOURNAL
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fichier</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Chargement...</TableCell></TableRow>
              ) : imports?.map((imp) => (
                <TableRow key={imp.id}>
                  <TableCell className="font-medium">{imp.filename}</TableCell>
                  <TableCell>{imp.period}</TableCell>
                  <TableCell>{imp.row_count} lignes</TableCell>
                  <TableCell>{format(new Date(imp.created_at), 'dd/MM/yy HH:mm', { locale: fr })}</TableCell>
                  <TableCell>
                    <Badge variant={imp.status === 'validated' ? 'default' : 'secondary'}>
                      {imp.status === 'validated' ? 'OK' : imp.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportHistory;
