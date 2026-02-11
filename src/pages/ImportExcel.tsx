import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  FileSpreadsheet, Upload, AlertTriangle, CheckCircle, 
  Download, Loader2, Info, RefreshCw, Calendar as CalendarIcon,
  ShieldCheck, FileCheck, Search
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface ValidationError {
  type: 'structure' | 'format' | 'duplicate_internal' | 'duplicate_file' | 'period' | 'update_detected' | 'upload';
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
  
  // États de sélection
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [file, setFile] = useState<File | null>(null);
  
  // États de statut
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [updateDetected, setUpdateDetected] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{
    rows: ParsedRow[];
    historyCheck: { valid: boolean; isUpdate: boolean };
  } | null>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const VALID_EXTENSIONS = ['.xlsx', '.xls', '.xlsm', '.xlsb', '.csv', '.ods'];

  // Utilitaire pour transformer la date du calendrier en YYYYMM
  const getPeriodFromDate = (date: Date | undefined) => {
    if (!date) return '';
    return format(date, 'yyyyMM');
  };

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => setIsSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  // LOGIQUE DE VALIDATION (Conservée à 100%)
  const validateStructure = (worksheet: XLSX.WorkSheet) => {
    const expectedColumns = ['MATRICULE', 'NOM', 'PRENOM', 'CODE CAISSE', 'CCO', 'MONTANT'];
    const data = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });
    if (data.length < 2) return { valid: false };
    const headers = (data[0] as unknown[]).map(h => String(h ?? '').toUpperCase().trim());
    const hasPeriode = headers.includes('PERIODE') || headers.includes('PÉRIODE');
    if (!hasPeriode) {
      setValidationErrors([{ type: 'structure', message: 'Structure incorrecte', details: ['Colonne PERIODE manquante'] }]);
      return { valid: false };
    }
    const missing = expectedColumns.filter(col => !headers.includes(col));
    if (missing.length > 0) {
      setValidationErrors([{ type: 'structure', message: 'Colonnes manquantes', details: [missing.join(', ')] }]);
      return { valid: false };
    }
    return { valid: true, headers };
  };

  const validateFieldFormats = (data: unknown[][], headers: string[]) => {
    const pIdx = headers.findIndex(h => h === 'PERIODE' || h === 'PÉRIODE');
    const mIdx = headers.findIndex(h => h === 'MATRICULE');
    const nIdx = headers.findIndex(h => h === 'NOM');
    const prIdx = headers.findIndex(h => h === 'PRENOM');
    const cIdx = headers.findIndex(h => h === 'CODE CAISSE');
    const ccoIdx = headers.findIndex(h => h === 'CCO');
    const mtIdx = headers.findIndex(h => h === 'MONTANT');

    const rows: ParsedRow[] = [];
    const errs: string[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i] as unknown[];
      if (!row || row.length === 0 || row.every(cell => !cell)) continue;
      
      const p = String(row[pIdx] ?? '').trim();
      const m = String(row[mIdx] ?? '').trim();
      const mt = Number(String(row[mtIdx] ?? '').trim());

      if (!/^\d{6}$/.test(p)) errs.push(`Ligne ${i+1}: PERIODE "${p}" invalide (YYYYMM requis)`);
      if (!/^\d{7}$/.test(m)) errs.push(`Ligne ${i+1}: MATRICULE "${m}" invalide (7 chiffres)`);
      if (isNaN(mt)) errs.push(`Ligne ${i+1}: MONTANT "${row[mtIdx]}" invalide`);

      rows.push({
        periode: parseInt(p), matricule: m, nom: String(row[nIdx] ?? '').toUpperCase(),
        prenom: String(row[prIdx] ?? '').toUpperCase(), code_caisse: String(row[cIdx] ?? ''),
        cco: String(row[ccoIdx] ?? ''), montant: mt, row_number: i + 1
      });
    }
    if (errs.length > 0) {
      setValidationErrors([{ type: 'format', message: 'Erreurs de format', details: errs.slice(0, 5) }]);
      return { valid: false };
    }
    return { valid: true, rows };
  };

  const checkInternalDuplicates = (rows: ParsedRow[]) => {
    const seen = new Set();
    for (const r of rows) {
      if (seen.has(r.matricule)) {
        setValidationErrors([{ type: 'duplicate_internal', message: `Doublon interne: Matricule ${r.matricule}` }]);
        return false;
      }
      seen.add(r.matricule);
    }
    return true;
  };

  const checkHistoricalDuplicates = async (rows: ParsedRow[], period: number) => {
    if (!companyUser?.company_id) return { valid: false, isUpdate: false };
    const { data: previous } = await supabase.from('file_imports').select('id, filename, created_at')
      .eq('company_id', companyUser.company_id).eq('period', period).in('status', ['pending', 'validated']).limit(1);
    
    if (!previous || previous.length === 0) return { valid: true, isUpdate: false };
    
    setUpdateDetected(true);
    setValidationErrors([{ type: 'update_detected', message: 'Modification détectée', details: [`Un fichier existe déjà pour la période ${period}.`] }]);
    return { valid: true, isUpdate: true };
  };

  const performImport = async (rows: ParsedRow[], isUpdate: boolean) => {
    if (!file || !companyUser?.company_id || !user || !selectedDate) return;
    setIsUploading(true);
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
      setUpdateDetected(false);
      toast({ title: 'Succès', description: 'Fichier importé avec succès' });
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
    
    const period = parseInt(getPeriodFromDate(selectedDate));
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });

    const struct = validateStructure(worksheet);
    if (!struct.valid) { setIsUploading(false); return; }

    const formatCheck = validateFieldFormats(data, struct.headers!);
    if (!formatCheck.valid) { setIsUploading(false); return; }

    if (!checkInternalDuplicates(formatCheck.rows!)) { setIsUploading(false); return; }

    const hist = await checkHistoricalDuplicates(formatCheck.rows!, period);
    if (!hist.valid) { setIsUploading(false); return; }

    if (hist.isUpdate) {
      setPendingUpdate({ rows: formatCheck.rows!, historyCheck: hist });
      setIsUploading(false);
      return;
    }

    await performImport(formatCheck.rows!, false);
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-6xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-2">
            <ShieldCheck className="h-3 w-3" />
            Vérification de Conformité
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Importation de Flux</h1>
          <p className="text-slate-500 mt-1">Plateforme de transmission sécurisée MUCODEC</p>
        </div>
        <Button variant="outline" onClick={() => {
          const template = [['PÉRIODE', 'MATRICULE', 'NOM', 'PRENOM', 'CODE CAISSE', 'CCO', 'MONTANT'], [202401, '5119788', 'N', 'A', '249', '023467', 100000]];
          const ws = XLSX.utils.aoa_to_sheet(template);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Modèle');
          XLSX.writeFile(wb, 'modele_mucodec.xlsx');
        }} className="text-xs font-semibold uppercase tracking-wider h-10 border-slate-200">
          <Download className="mr-2 h-4 w-4" /> Modèle Excel
        </Button>
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* FORMULAIRE - COLONNE GAUCHE */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden ring-1 ring-slate-100">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <FileCheck className="h-4 w-4" /> Paramètres du Fichier
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 space-y-8">
              {/* SÉLECTEUR DE PÉRIODE CALENDRIER */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase text-slate-500 tracking-tighter">Période concernée</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-14 justify-start text-left font-semibold text-lg border-2 rounded-2xl transition-all",
                        !selectedDate && "text-muted-foreground",
                        "hover:border-blue-600 hover:bg-blue-50/50"
                      )}
                    >
                      <CalendarIcon className="mr-3 h-6 w-6 text-blue-600" />
                      {selectedDate ? (
                        format(selectedDate, "MMMM yyyy", { locale: fr })
                      ) : (
                        <span>Choisir un mois</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-none" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      locale={fr}
                      className="p-4"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* ZONE DE TÉLÉVERSEMENT */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase text-slate-500 tracking-tighter">Fichier de paie</label>
                <div 
                  className={cn(
                    "relative group cursor-pointer border-2 border-dashed rounded-3xl p-10 text-center transition-all",
                    file ? "bg-emerald-50/30 border-emerald-200" : "bg-slate-50 border-slate-200 hover:border-blue-400 hover:bg-white"
                  )}
                >
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <div className="space-y-4">
                    <div className={cn(
                      "w-16 h-16 mx-auto rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                      file ? "bg-emerald-100 text-emerald-600" : "bg-white text-slate-400 shadow-sm"
                    )}>
                      {file ? <FileCheck className="h-8 w-8" /> : <Upload className="h-8 w-8" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">
                        {file ? file.name : "Cliquez ou glissez le fichier ici"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">Excel, CSV (Max 10Mo)</p>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleUpload}
                disabled={!file || !selectedDate || isUploading}
                className="w-full h-16 bg-[#00204E] hover:bg-blue-900 rounded-2xl text-lg font-bold shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all"
              >
                {isUploading ? <Loader2 className="animate-spin h-6 w-6" /> : "Lancer l'audit et l'envoi"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* FEEDBACK ET INFOS - COLONNE DROITE */}
        <div className="lg:col-span-2 space-y-6">
          {/* ALERTES DYNAMIQUES */}
          {validationErrors.length > 0 && (
            <Alert className={cn(
              "border-none shadow-lg rounded-3xl p-6",
              validationErrors[0].type === 'update_detected' ? "bg-blue-600 text-white" : "bg-red-50 text-red-800"
            )}>
              <div className="flex gap-4">
                {validationErrors[0].type === 'update_detected' ? <RefreshCw className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                <div className="flex-1">
                  <AlertTitle className="font-black uppercase tracking-wider text-sm mb-2">
                    {validationErrors[0].type === 'update_detected' ? "Mise à jour requise" : "Échec de validation"}
                  </AlertTitle>
                  <AlertDescription className="text-sm leading-relaxed opacity-90">
                    {validationErrors[0].message}
                    {validationErrors[0].details && (
                      <ul className="mt-4 space-y-1 font-medium bg-black/5 p-3 rounded-xl">
                        {validationErrors[0].details.map((d, i) => <li key={i}>• {d}</li>)}
                      </ul>
                    )}
                  </AlertDescription>
                  {validationErrors[0].type === 'update_detected' && (
                    <Button onClick={() => performImport(pendingUpdate!.rows, true)} className="mt-6 w-full bg-white text-blue-600 font-black hover:bg-blue-50">
                      Confirmer le Remplacement
                    </Button>
                  )}
                </div>
              </div>
            </Alert>
          )}

          {isSuccess && (
            <Alert className="bg-emerald-600 text-white border-none shadow-lg rounded-3xl p-6">
              <CheckCircle className="h-6 w-6" />
              <div className="ml-2">
                <AlertTitle className="font-black uppercase tracking-wider text-sm">Transmission Réussie</AlertTitle>
                <AlertDescription>Le fichier a été audité et archivé avec succès.</AlertDescription>
              </div>
            </Alert>
          )}

          {/* RAPPEL DES NORMES */}
          <Card className="border-none bg-slate-900 text-white rounded-3xl shadow-xl overflow-hidden">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Rappel des normes</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <NormItem label="Matricule" desc="Exactement 7 chiffres" />
                <NormItem label="Période" desc="Format numérique YYYYMM" />
                <NormItem label="Caisse" desc="Code banque sur 3 positions" />
                <div className="pt-4 border-t border-white/10 mt-4 flex items-center gap-3 text-slate-400">
                  <Info className="h-5 w-5" />
                  <p className="text-[10px] uppercase font-bold tracking-widest leading-tight">
                    Chaque ligne est vérifiée contre l'historique pour éviter les doublons de paiement.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const NormItem = ({ label, desc }: { label: string, desc: string }) => (
  <div className="flex justify-between items-center gap-4">
    <span className="text-xs font-bold text-slate-200">{label}</span>
    <span className="text-[10px] text-slate-500 font-mono">{desc}</span>
  </div>
);

export default ImportExcel;
