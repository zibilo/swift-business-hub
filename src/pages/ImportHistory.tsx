import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, FileSpreadsheet, Eye, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const ImportHistory = () => {
  const { companyUser } = useAuth();

  const { data: imports, isLoading } = useQuery({
    queryKey: ['file-imports', companyUser?.company_id],
    queryFn: async () => {
      if (!companyUser?.company_id) return [];
      
      const { data, error } = await supabase
        .from('file_imports')
        .select(`
          *,
          uploaded_by_profile:profiles!file_imports_uploaded_by_fkey(full_name)
        `)
        .eq('company_id', companyUser.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!companyUser?.company_id,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"><CheckCircle className="h-3 w-3 mr-1" />Terminé</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"><Loader2 className="h-3 w-3 mr-1 animate-spin" />En cours</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Erreur</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
    }
  };

  const formatPeriod = (period: number) => {
    const str = period.toString();
    const year = str.substring(0, 4);
    const month = str.substring(4, 6);
    return `${month}/${year}`;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Historique des imports</h1>
        <p className="text-muted-foreground">
          Consultez tous vos fichiers importés
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Fichiers importés
          </CardTitle>
          <CardDescription>
            Liste de tous les fichiers Excel traités
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : imports && imports.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fichier</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Lignes</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imports.map((imp) => (
                    <TableRow key={imp.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[200px]">{imp.filename}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatPeriod(imp.period)}</TableCell>
                      <TableCell>{imp.row_count || '-'}</TableCell>
                      <TableCell>{getStatusBadge(imp.status)}</TableCell>
                      <TableCell>
                        {format(new Date(imp.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <ImportDetailsDialog importId={imp.id} filename={imp.filename} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucun fichier importé</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function ImportDetailsDialog({ importId, filename }: { importId: string; filename: string }) {
  const { data: rows, isLoading } = useQuery({
    queryKey: ['import-rows', importId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('file_import_rows')
        .select('*')
        .eq('file_import_id', importId)
        .order('row_number', { ascending: true })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: false, // Only fetch when dialog opens
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Détails de l'import</DialogTitle>
          <DialogDescription>{filename}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : rows && rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Matricule</TableHead>
                  <TableHead>Nom/Prénom</TableHead>
                  <TableHead>Code Caisse</TableHead>
                  <TableHead>CCO</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.row_number}</TableCell>
                    <TableCell>{row.periode}</TableCell>
                    <TableCell>{row.matricule}</TableCell>
                    <TableCell>{row.nom_prenom}</TableCell>
                    <TableCell>{row.code_caisse}</TableCell>
                    <TableCell>{row.cco}</TableCell>
                    <TableCell className="text-right font-medium">
                      {row.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">Aucune donnée disponible</p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default ImportHistory;
