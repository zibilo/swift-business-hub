import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  FileSpreadsheet, Upload, AlertTriangle, CheckCircle, 
  Download, Loader2, Info, Calendar as CalendarIcon,
  ShieldCheck, FileCheck, ShieldX, ListChecks, ChevronLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface ValidationError {
  type: 'structure' | 'format' | 'compliance' | 'duplicate' | 'upload';
  message: string;
  details?: string[];
}

interface ParsedRow {
  periode: number;
  matricule: string;
  nom: string;
  prenom: string;
  code_caisse: string;
  cco: string;
  montant: number;
  row_number: number;
}

const ImportExcel = () => {
  const { companyUser, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  const getPeriodFromDate = (date: Date | undefined) => {
    if (!date) return '';
    return format(date, 'yyyyMM');
  };

  const checkCoreBankingCompliance = async (rows: ParsedRow[]): Promise<boolean> => {
    if (!companyUser?.company_id) return false;
    const { data: references, error } = await supabase
      .from('employee_references')
      .select('matricule, nom_prenom, code_caisse, cco')
      .eq('company_id', companyUser.company_id);

    if (error) {
      setValidationErrors([{ type: 'upload', message: 'Erreur Référentiel' }]);
      return false;
    }

    const refMap = new Map(references?.map(r => [r.matricule, r]));
    const errors: string[] = [];

    rows.forEach(row => {
      const ref = refMap.get(row.matricule);
      const fullName = `${row.nom} ${row.prenom}`.trim().toUpperCase();
      if (!ref) {
        errors.push(`Ligne ${row.row_number}: Matricule inconnu`);
      } else {
        if (fullName !== ref.nom_prenom.toUpperCase()) errors.push(`Ligne ${row.row_number}: Nom non conforme`);
        if (row.code_caisse !== ref.code_caisse) errors.push(`Ligne ${row.row_number}: Code Caisse erroné`);
        if (row.cco !== ref.cco) errors.push(`Ligne ${row.row_number}: RIB/CCO erroné`);
      }
    });

    if (errors.length > 0) {
      setValidationErrors([{
        type: 'compliance',
        message: 'NON-CONFORMITÉ CORE BANKING',
        details: errors.slice(0, 5).concat(errors.length > 5 ? [`(+${errors.length - 5} autres)`] : [])
      }]);
      return false;
    }
    return true;
  };

  const performImport = async (rows: ParsedRow[]) => {
    if (!file || !companyUser?.company_id || !user || !selectedDate) return;
    const period = parseInt(getPeriodFromDate(selectedDate));
    try {
      const storagePath = `${companyUser.company_id}/${Date.now()}_${file.name}`;
      await supabase.storage.from('excel-imports').upload(storagePath, file);
      const { data: imp } = await supabase.from('file_imports').insert({
        company_id: companyUser.company_id, filename: file.name, storage_path: storagePath,
        period: period, selected_period: period, status: 'validated', uploaded_by: user.id, row_count: rows.length
      }).select().single();
      await supabase.from('file_import_rows').insert(rows.map(r => ({
        file_import_id: imp.id, periode: r.periode, matricule: r.matricule, 
        nom_prenom: `${r.nom} ${r.prenom}`, code_caisse: r.code_caisse, cco: r.cco, montant: r.montant, row_number: r.row_number
      })));
      setIsSuccess(true);
      setFile(null);
      toast({ title: 'Succès', description: 'Flux transmis' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedDate || !companyUser?.company_id) return;
    setIsUploading(true);
    setValidationErrors([]);
    setIsSuccess(false);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });
      const headers = (data[0] as unknown[]).map(h => String(h ?? '').toUpperCase().trim());
      
      const rows: ParsedRow[] = [];
      const mIdx = headers.findIndex(h => h === 'MATRICULE');
      const nIdx = headers.findIndex(h => h === 'NOM');
      const prIdx = headers.findIndex(h => h === 'PRENOM');
      const cIdx = headers.findIndex(h => h === 'CODE CAISSE');
      const ccoIdx = headers.findIndex(h => h === 'CCO');
      const mtIdx = headers.findIndex(h => h === 'MONTANT');
      const pIdx = headers.findIndex(h => h.includes('PERIODE') || h.includes('PÉRIODE'));

      for (let i = 1; i < data.length; i++) {
        const r = data[i] as any[];
        if (!r || !r[mIdx]) continue;
        rows.push({
          periode: parseInt(String(r[pIdx] || '0')),
          matricule: String(r[mIdx]).trim(), nom: String(r[nIdx] || '').trim(),
          prenom: String(r[prIdx] || '').trim(), code_caisse: String(r[cIdx] || '').trim(),
          cco: String(r[ccoIdx] || '').trim(), montant: Number(r[mtIdx] || 0), row_number: i + 1
        });
      }

      const isCompliant = await checkCoreBankingCompliance(rows);
      if (!isCompliant) { setIsUploading(false); return; }
      await performImport(rows);
    } catch (e: any) {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col font-sans">
      
      {/* HEADER MOBILE NATIVE */}
      <div className="bg-white px-4 pt-10 pb-6 border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-xl font-black text-[#00204E]">Nouveau Flux</h1>
            <p className="text-[10px] uppercase font-bold text-blue-600 tracking-widest">Audit de paie</p>
          </div>
        </div>
        <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
        </div>
      </div>

      <main className="p-4 space-y-6 pb-32">
        
        {/* ALERTES D'ERREUR EN PRIORITÉ SUR MOBILE */}
        <AnimatePresence>
          {validationErrors.length > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
              <Alert className="border-none shadow-lg bg-red-600 text-white rounded-3xl p-5">
                <ShieldX className="h-6 w-6 mb-2" />
                <AlertTitle className="text-sm font-black uppercase tracking-tight">Audit Rejeté</AlertTitle>
                <AlertDescription className="text-xs space-y-2 opacity-90">
                  <p>{validationErrors[0].message}</p>
                  <div className="bg-black/10 rounded-xl p-3">
                    {validationErrors[0].details?.map((d, i) => <p key={i}>• {d}</p>)}
                  </div>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {isSuccess && (
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
              <Alert className="border-none shadow-lg bg-emerald-500 text-white rounded-3xl p-5">
                <CheckCircle className="h-6 w-6 mb-2" />
                <AlertTitle className="text-sm font-black uppercase">Fichier Validé</AlertTitle>
                <AlertDescription className="text-xs font-bold">Transmission 100% conforme effectuée.</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FORMULAIRE PRINCIPAL */}
        <div className="space-y-4">
          
          {/* PÉRIODE */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Période fiscale</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full h-14 justify-start rounded-2xl border-2 bg-white font-bold text-slate-700">
                  <CalendarIcon className="mr-3 h-5 w-5 text-blue-600" />
                  {selectedDate ? format(selectedDate, "MMMM yyyy", { locale: fr }) : "Saisir le mois"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-screen max-w-[350px] p-0 rounded-3xl border-none shadow-2xl" align="center">
                <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={fr} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {/* UPLOAD ZONE */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Fichier Excel (.xlsx)</label>
            <div className={cn(
              "relative border-2 border-dashed rounded-[32px] p-10 text-center transition-all bg-white",
              file ? "border-emerald-400 bg-emerald-50/20" : "border-slate-200"
            )}>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 z-10" />
              <div className="flex flex-col items-center gap-3">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center",
                  file ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-300"
                )}>
                  {file ? <FileCheck size={28} /> : <Upload size={28} />}
                </div>
                <p className="text-xs font-bold text-slate-600 truncate max-w-full px-4">
                  {file ? file.name : "Appuyez pour choisir"}
                </p>
              </div>
            </div>
          </div>

          {/* BOUTON D'ACTION FIXE EN BAS OU DANS LE FLUX */}
          <div className="pt-4">
            <Button 
              onClick={handleUpload}
              disabled={!file || !selectedDate || isUploading}
              className="w-full h-16 bg-[#00204E] hover:bg-blue-900 rounded-[24px] text-base font-black shadow-xl shadow-blue-900/20 active:scale-95 transition-transform"
            >
              {isUploading ? (
                <><Loader2 className="animate-spin mr-2 h-5 w-5" /> Audit en cours...</>
              ) : (
                <><ListChecks className="mr-2 h-5 w-5" /> Vérifier et Envoyer</>
              )}
            </Button>
          </div>
        </div>

        {/* MODÈLE ET NORMES (ACCORDION STYLE OU SIMPLE) */}
        <Card className="border-none bg-slate-900 text-white rounded-[32px] p-6 shadow-xl">
           <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-4">Aide au formatage</h3>
           <div className="space-y-3 opacity-80 text-[10px] leading-relaxed">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span>Matricule</span>
                <span className="font-bold">7 chiffres</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span>Code Caisse</span>
                <span className="font-bold">3 chiffres (249)</span>
              </div>
              <p className="italic text-slate-400 pt-1">
                Le système bloque l'envoi si une information ne correspond pas à votre base bancaire.
              </p>
           </div>
           <Button 
            variant="ghost" 
            onClick={() => {/* Logique template */}}
            className="w-full mt-4 text-white text-[10px] font-bold uppercase tracking-tighter"
           >
             <Download className="h-3 w-3 mr-2" /> Télécharger le modèle
           </Button>
        </Card>

      </main>

      {/* FOOTER DISCRET */}
      <footer className="mt-auto py-6 text-center opacity-30">
        <p className="text-[8px] font-black uppercase tracking-[0.4em]">MUCODEC Security Systems</p>
      </footer>
    </div>
  );
};

export default ImportExcel;
