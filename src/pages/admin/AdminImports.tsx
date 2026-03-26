import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { format, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Download, Loader2, Search, Mail, 
  RefreshCw, FileDown, Send, Settings2, Trash2, X, AlertTriangle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { saveAs } from 'file-saver';
import { cn } from '@/lib/utils';

export default function AdminImports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // --- CONFIGURATION MAILS ---
  const [senderEmail, setSenderEmail] = useState(localStorage.getItem('mail_from') || '');
  const [receiverEmail, setReceiverEmail] = useState(localStorage.getItem('mail_to') || '');
  
  // ÉTATS UI
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  
  const [selectedImport, setSelectedImport] = useState<any>(null);
  const [reconciliationData, setReconciliationData] = useState<any[]>([]);

  // 1. CHARGEMENT DES FLUX
  const { data: imports, isLoading } = useQuery({
    queryKey: ['admin-imports-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('file_imports')
        .select(`*, companies ( name )`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // 2. MUTATION SUPPRESSION
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Suppression des lignes d'abord (contrainte clé étrangère)
      await supabase.from('file_import_rows').delete().eq('file_import_id', id);
      // Suppression de l'import
      const { error } = await supabase.from('file_imports').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-imports-full'] });
      toast({ title: "Flux supprimé", description: "Le dossier a été retiré définitivement." });
      setIsDeleteAlertOpen(false);
    },
    onError: () => toast({ title: "Erreur", description: "Impossible de supprimer le flux", variant: "destructive" })
  });

  // 3. LOGIQUE MAILS
  const generateMailContent = (file: any) => {
    const subject = `TRANSFERT FLUX DE PAIE - ${file?.companies?.name}`;
    const body = `Bonjour,%0D%0A%0D%0AVeuillez trouver ci-joint le fichier de paie.%0D%0A%0D%0A- Entreprise : ${file?.companies?.name}%0D%0A- Période : ${file?.period}%0D%0A- Salariés : ${file?.row_count}%0D%0A%0D%0ACordialement.`;
    return { subject, body };
  };

  const openApp = (app: 'outlook' | 'gmail', file: any) => {
    const { subject, body } = generateMailContent(file);
    if (app === 'outlook') {
      window.location.href = `mailto:${receiverEmail}?subject=${subject}&body=${body}`;
    } else {
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${receiverEmail}&su=${subject}&body=${body}`, '_blank');
    }
  };

  // 4. LOGIQUE RÉCONCILIATION
  const handleStartReconciliation = async (imp: any) => {
    setSelectedImport(imp);
    const { data: rows } = await supabase.from('file_import_rows').select('*').eq('file_import_id', imp.id);
    const { data: refs } = await supabase.from('employee_references').select('*').eq('company_id', imp.company_id);
    const refMap = new Map(refs?.map(r => [r.matricule, r]));

    const results = rows?.map(row => {
      const ref = refMap.get(row.matricule);
      return { ...row, status: !ref ? 'missing' : (row.cco !== ref.cco ? 'mismatch' : 'ok'), expectedCco: ref?.cco };
    });
    setReconciliationData(results || []);
    setIsReconcileOpen(true);
  };

  const filteredImports = imports?.filter(imp => 
    (imp.filename?.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (imp.companies?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-blue-600" /></div>;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in">
      <div>
        <h1 className="text-3xl font-black text-[#00204E] tracking-tight">Supervision des Flux</h1>
        <p className="text-slate-500 font-medium">Réception, réconciliation et transfert sécurisé</p>
      </div>

      {/* CONFIGURATION MAILS */}
      <Card className="border-none shadow-lg bg-slate-900 text-white rounded-3xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings2 className="text-blue-400 h-5 w-5" />
            <h2 className="text-xs font-black uppercase tracking-widest text-blue-100">Configuration des transferts</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
              value={senderEmail}
              onChange={(e) => { setSenderEmail(e.target.value); localStorage.setItem('mail_from', e.target.value); }}
              className="bg-white/5 border-white/10 text-white rounded-xl"
              placeholder="Votre email (Expéditeur)"
            />
            <Input 
              value={receiverEmail}
              onChange={(e) => { setReceiverEmail(e.target.value); localStorage.setItem('mail_to', e.target.value); }}
              className="bg-white/5 border-white/10 text-white rounded-xl"
              placeholder="Email destinataire"
            />
          </div>
        </CardContent>
      </Card>

      {/* LISTE DES FLUX */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-4 border-b flex gap-3">
          <Input 
            placeholder="Rechercher..." 
            className="rounded-xl border-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="font-bold">Date Réception</TableHead>
              <TableHead className="font-bold">Entreprise</TableHead>
              <TableHead className="font-bold">Lignes</TableHead>
              <TableHead className="font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredImports?.map((imp) => (
              <TableRow key={imp.id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell className="text-xs font-bold text-blue-600">
                  {isValid(new Date(imp.created_at)) ? format(new Date(imp.created_at), 'dd MMM yyyy HH:mm', { locale: fr }) : 'Date invalide'}
                </TableCell>
                <TableCell className="font-black text-slate-900">{imp.companies?.name}</TableCell>
                <TableCell className="text-sm font-medium">{imp.row_count} sal.</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button onClick={() => handleStartReconciliation(imp)} variant="outline" size="sm" className="h-9 border-blue-200 text-blue-700 bg-blue-50 rounded-lg"><RefreshCw size={14} /></Button>
                    <Button onClick={() => { setSelectedImport(imp); setIsTransferOpen(true); }} className="bg-[#00204E] rounded-lg h-9"><Send size={14} /></Button>
                    <Button onClick={() => { setSelectedImport(imp); setIsDeleteAlertOpen(true); }} variant="ghost" className="h-9 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg"><Trash2 size={14} /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* MODALE TRANSFERT (OUTLOOK / GMAIL) */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="font-black text-[#00204E]">Préparer l'envoi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <Button onClick={() => openApp('outlook', selectedImport)} className="w-full bg-[#0078d4] h-14 rounded-2xl font-bold">OUVRIR OUTLOOK WINDOWS</Button>
             <Button onClick={() => openApp('gmail', selectedImport)} className="w-full bg-white border-2 border-slate-100 text-slate-900 h-14 rounded-2xl font-bold">OUVRIR GMAIL BROWSER</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODALE RÉCONCILIATION */}
      <Dialog open={isReconcileOpen} onOpenChange={setIsReconcileOpen}>
        <DialogContent className="max-w-4xl rounded-[2rem]">
          <DialogHeader><DialogTitle className="font-black">Audit de Réconciliation</DialogTitle></DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto border rounded-xl">
             <Table>
                <TableHeader><TableRow><TableHead>Salarié</TableHead><TableHead>CCO Flux</TableHead><TableHead>CCO Master</TableHead><TableHead>État</TableHead></TableRow></TableHeader>
                <TableBody>
                   {reconciliationData.map((r, i) => (
                     <TableRow key={i} className={cn(r.status !== 'ok' && "bg-red-50")}>
                        <TableCell className="text-xs font-bold">{r.nom_prenom}</TableCell>
                        <TableCell className="text-xs font-mono">{r.cco}</TableCell>
                        <TableCell className="text-xs font-mono text-blue-600">{r.expectedCco || '???'}</TableCell>
                        <TableCell>{r.status === 'ok' ? <Badge className="bg-emerald-500 text-white text-[8px]">OK</Badge> : <Badge className="bg-red-500 text-white text-[8px]">ERREUR</Badge>}</TableCell>
                     </TableRow>
                   ))}
                </TableBody>
             </Table>
          </div>
          <DialogFooter><Button onClick={() => setIsReconcileOpen(false)} className="bg-[#00204E] rounded-xl">Fermer l'audit</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERTE SUPPRESSION */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle /> Supprimer ce flux ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action effacera le fichier et toutes les lignes de salaires associées. Cette opération est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(selectedImport.id)} className="bg-red-600 rounded-xl">Supprimer définitivement</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
