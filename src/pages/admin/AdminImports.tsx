import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { 
  Download, Loader2, FileDown, Search, 
  RefreshCw, Edit3, CheckCircle2, AlertCircle, FileX, Save, X 
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { saveAs } from 'file-saver';
import { cn } from '@/lib/utils';

export default function AdminImports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // ÉTATS DES FILTRES
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // ÉTATS DES MODALES
  const [selectedImport, setSelectedImport] = useState<any>(null);
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const [reconciliationData, setReconciliationData] = useState<any[]>([]);
  const [editingRows, setEditingRows] = useState<any[]>([]);

  // 1. CHARGEMENT DES FLUX
  const { data: imports, isLoading } = useQuery({
    queryKey: ['admin-imports-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('file_imports')
        .select(`*, companies ( id, name )`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // 2. ACTION : RÉCONCILIATION (Logique de comparaison)
  const handleStartReconciliation = async (imp: any) => {
    setSelectedImport(imp);
    try {
      const { data: rows } = await supabase.from('file_import_rows').select('*').eq('file_import_id', imp.id);
      const { data: refs } = await supabase.from('employee_references').select('*').eq('company_id', imp.company_id);

      const refMap = new Map(refs?.map(r => [r.matricule, r]));

      const results = rows?.map(row => {
        const ref = refMap.get(row.matricule);
        const isMatch = ref && row.cco === ref.cco && row.code_caisse === ref.code_caisse;
        return {
          ...row,
          status: !ref ? 'missing' : !isMatch ? 'mismatch' : 'ok',
          expectedCco: ref?.cco,
          expectedName: ref?.nom_prenom
        };
      });

      setReconciliationData(results || []);
      setIsReconcileOpen(true);
    } catch (e) {
      toast({ title: "Erreur", description: "Échec de l'analyse", variant: "destructive" });
    }
  };

  // 3. ACTION : MODIFIER (Chargement des lignes éditables)
  const handleOpenModifier = async (imp: any) => {
    setSelectedImport(imp);
    const { data } = await supabase.from('file_import_rows').select('*').eq('file_import_id', imp.id).order('row_number', { ascending: true });
    setEditingRows(data || []);
    setIsEditOpen(true);
  };

  // 4. ACTION : SAUVEGARDER CORRECTIONS
  const saveCorrections = async () => {
    try {
      for (const row of editingRows) {
        await supabase.from('file_import_rows').update({
          matricule: row.matricule,
          nom_prenom: row.nom_prenom,
          cco: row.cco,
          montant: row.montant
        }).eq('id', row.id);
      }
      toast({ title: "Modifications enregistrées", description: "Le flux a été mis à jour." });
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-imports-full'] });
    } catch (e) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  // 5. ACTION : TÉLÉCHARGER
  const handleDownload = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from('excel-imports').download(path);
    if (error) return toast({ title: "Fichier introuvable", variant: "destructive" });
    saveAs(data, name);
  };

  // FILTRAGE
  const filteredImports = imports?.filter(imp => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = imp.filename.toLowerCase().includes(searchLower) || imp.companies?.name.toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'all' || imp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'validated': return <Badge className="bg-blue-100 text-blue-700 border-none">Importé</Badge>;
      case 'reconciled': return <Badge className="bg-emerald-100 text-emerald-700 border-none">Réconcilié</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-700 border-none">Rejeté</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#00204E]">Historique des Flux</h1>
          <p className="text-slate-500 font-medium">Contrôle de conformité et gestion des corrections</p>
        </div>
        
        <div className="flex gap-3">
          <Input 
            placeholder="Rechercher..." 
            className="w-64 rounded-xl border-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select onValueChange={setStatusFilter} defaultValue="all">
            <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les flux</SelectItem>
              <SelectItem value="validated">Importé</SelectItem>
              <SelectItem value="reconciled">Réconcilié</SelectItem>
              <SelectItem value="rejected">Rejeté</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-bold">Fichier / Entreprise</TableHead>
              <TableHead className="font-bold">Période</TableHead>
              <TableHead className="font-bold">Lignes</TableHead>
              <TableHead className="font-bold">Statut</TableHead>
              <TableHead className="font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredImports?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-40 text-center text-slate-400 italic">Aucun flux trouvé</TableCell></TableRow>
            ) : filteredImports?.map((imp) => (
              <TableRow key={imp.id} className="hover:bg-slate-50/50">
                <TableCell>
                  <div className="font-bold">{imp.filename}</div>
                  <div className="text-xs text-blue-600">{imp.companies?.name}</div>
                </TableCell>
                <TableCell className="font-mono text-sm">{imp.period}</TableCell>
                <TableCell className="text-sm">{imp.row_count} sal.</TableCell>
                <TableCell>{getStatusBadge(imp.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button onClick={() => handleOpenModifier(imp)} variant="outline" size="sm" className="h-9 border-slate-200 text-slate-600 rounded-lg"><Edit3 size={14} className="mr-1" /> Modifier</Button>
                    <Button onClick={() => handleStartReconciliation(imp)} variant="outline" size="sm" className="h-9 border-blue-200 bg-blue-50 text-blue-700 rounded-lg"><RefreshCw size={14} className="mr-1" /> Réconciliation</Button>
                    <Button onClick={() => handleDownload(imp.storage_path, imp.filename)} variant="ghost" size="icon"><FileDown size={18} className="text-slate-400" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ----------------- MODALE RÉCONCILIATION ----------------- */}
      <Dialog open={isReconcileOpen} onOpenChange={setIsReconcileOpen}>
        <DialogContent className="max-w-5xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black"><RefreshCw className="text-blue-600" /> Audit de Réconciliation</DialogTitle>
            <DialogDescription>Comparaison automatique entre le flux reçu et le Master Salariés MUCODEC.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto border rounded-xl">
            <Table>
              <TableHeader className="sticky top-0 bg-white shadow-sm">
                <TableRow>
                  <TableHead>Salarié</TableHead>
                  <TableHead>CCO (Flux)</TableHead>
                  <TableHead>CCO (Master)</TableHead>
                  <TableHead>Diagnostic</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliationData.map((r, i) => (
                  <TableRow key={i} className={cn(r.status !== 'ok' && "bg-red-50")}>
                    <TableCell className="text-xs">
                       <div className="font-bold">{r.nom_prenom}</div>
                       <div className="text-[10px] text-slate-400">Mle: {r.matricule}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.cco}</TableCell>
                    <TableCell className="font-mono text-xs text-blue-600">{r.expectedCco || '???'}</TableCell>
                    <TableCell>
                      {r.status === 'ok' ? <Badge className="bg-emerald-500 text-white text-[9px]">Conforme</Badge> : 
                       r.status === 'missing' ? <Badge className="bg-orange-500 text-white text-[9px]">Inconnu Master</Badge> : 
                       <Badge className="bg-red-600 text-white text-[9px]">Erreur RIB/CCO</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsReconcileOpen(false)}>Annuler</Button>
            <Button 
              className="bg-[#00204E] rounded-xl"
              onClick={async () => {
                await supabase.from('file_imports').update({ status: 'reconciled' }).eq('id', selectedImport.id);
                setIsReconcileOpen(false);
                queryClient.invalidateQueries({ queryKey: ['admin-imports-full'] });
                toast({ title: "Flux réconcilié", description: "Prêt pour mise en paiement." });
              }}
            >Valider la réconciliation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------- MODALE MODIFIER (ÉDITION) ----------------- */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-5xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black"><Edit3 className="text-orange-600" /> Correction Manuelle</DialogTitle>
            <DialogDescription>Ajustez les données du flux avant validation finale.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto border rounded-xl">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Mle</TableHead>
                  <TableHead>Nom complet</TableHead>
                  <TableHead>CCO / RIB</TableHead>
                  <TableHead>Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editingRows.map((row, idx) => (
                  <TableRow key={row.id}>
                    <TableCell><input value={row.matricule} className="w-16 bg-transparent border-b border-slate-200 outline-none" onChange={(e) => {
                      const newRows = [...editingRows];
                      newRows[idx].matricule = e.target.value;
                      setEditingRows(newRows);
                    }} /></TableCell>
                    <TableCell><input value={row.nom_prenom} className="w-full bg-transparent border-b border-slate-200 outline-none" onChange={(e) => {
                      const newRows = [...editingRows];
                      newRows[idx].nom_prenom = e.target.value;
                      setEditingRows(newRows);
                    }} /></TableCell>
                    <TableCell><input value={row.cco} className="w-32 font-mono text-xs bg-transparent border-b border-slate-200 outline-none" onChange={(e) => {
                      const newRows = [...editingRows];
                      newRows[idx].cco = e.target.value;
                      setEditingRows(newRows);
                    }} /></TableCell>
                    <TableCell><input type="number" value={row.montant} className="w-24 bg-transparent border-b border-slate-200 outline-none" onChange={(e) => {
                      const newRows = [...editingRows];
                      newRows[idx].montant = Number(e.target.value);
                      setEditingRows(newRows);
                    }} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)}><X size={16} /> Annuler</Button>
            <Button className="bg-emerald-600 rounded-xl px-8" onClick={saveCorrections}><Save size={16} className="mr-2" /> Appliquer les corrections</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
