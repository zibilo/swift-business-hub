import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { BrandIcon } from '@/components/BrandIcons';
import { Loader2 } from 'lucide-react'; // Keep Loader2 for spinner

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
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{
    rows: ParsedRow[];
    historyCheck: { valid: boolean; isUpdate: boolean };
  } | null>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const VALID_EXTENSIONS = ['.xlsx', '.xls', '.xlsm', '.xlsb', '.csv', '.ods'];

  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return { value: `${year}${month}`, label: `${month}/${year}` };
  });

  const validateStructure = (worksheet: XLSX.WorkSheet) => {
    const expectedColumns = ['PÉRIODE', 'MATRICULE', 'NOM', 'PRENOM', 'CODE CAISSE', 'CCO', 'MONTANT'];
    const data = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });
    if (data.length < 2) {
      setValidationErrors([{ type: 'structure', message: 'Le fichier est vide' }]);
      return { valid: false };
    }
    const headers = (data[0] as unknown[]).map(h => String(h ?? '').toUpperCase().trim());
    const missing = expectedColumns.filter(col => !headers.includes(col));
    if (missing.length > 0) {
      setValidationErrors([{ type: 'structure', message: 'Colonnes manquantes', details: missing }]);
      return { valid: false };
    }
    return { valid: true, headers };
  };

  const validateFieldFormats = (data: unknown[][], headers: string[]) => {
    const pIdx = headers.indexOf('PÉRIODE');
    const mIdx = headers.indexOf('MATRICULE');
    const nIdx = headers.indexOf('NOM');
    const prIdx = headers.indexOf('PRENOM');
    const ccIdx = headers.indexOf('CODE CAISSE');
    const ccoIdx = headers.indexOf('CCO');
    const monIdx = headers.indexOf('MONTANT');

    const rows: ParsedRow[] = [];
    const errors: string[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i] as unknown[];
      if (!row || row.length === 0 || row.every(c => !c)) continue;

      const p = String(row[pIdx] ?? '').trim();
      const m = String(row[mIdx] ?? '').trim();
      const n = String(row[nIdx] ?? '').trim();
      const pr = String(row[prIdx] ?? '').trim();
      const cc = String(row[ccIdx] ?? '').trim();
      const cco = String(row[ccoIdx] ?? '').trim();
      const mon = Number(row[monIdx] ?? 0);

      if (!/^\d{6}$/.test(p)) errors.push(`Ligne ${i+1}: PÉRIODE invalide`);
      if (!/^\d{7}$/.test(m)) errors.push(`Ligne ${i+1}: MATRICULE invalide`);
      if (!n || !pr) errors.push(`Ligne ${i+1}: NOM/PRENOM manquant`);

      rows.push({
        periode: parseInt(p), matricule: m, nom: n.toUpperCase(), prenom: pr.toUpperCase(),
        code_caisse: cc, cco: cco, montant: mon, row_number: i + 1
      });
    }

    if (errors.length > 0) {
      setValidationErrors([{ type: 'format', message: 'Erreurs de format', details: errors.slice(0, 5) }]);
      return { valid: false };
    }
    return { valid: true, rows };
  };

  const checkHistoricalDuplicates = async (rows: ParsedRow[], period: number) => {
    if (!companyUser?.company_id) return { valid: false, isUpdate: false };
    const { data: lastImport } = await supabase.from('file_imports')
      .select('id, filename').eq('company_id', companyUser.company_id).eq('period', period)
      .in('status', ['pending', 'validated']).order('created_at', { ascending: false }).limit(1).single();

    if (!lastImport) return { valid: true, isUpdate: false };
    return { valid: true, isUpdate: true };
  };

  const performImport = async (rows: ParsedRow[]) => {
    if (!file || !companyUser || !user) return;
    setIsUploading(true);
    try {
      const path = `${companyUser.company_id}/${Date.now()}_${file.name}`;
      await supabase.storage.from('excel-imports').upload(path, file);

      const { data: imp } = await supabase.from('file_imports').insert({
        company_id: companyUser.company_id, filename: file.name, storage_path: path,
        period: parseInt(selectedPeriod), selected_period: parseInt(selectedPeriod),
        status: 'validated', uploaded_by: user.id, row_count: rows.length
      }).select().single();

      await supabase.from('file_import_rows').insert(rows.map(r => ({
        file_import_id: imp.id, periode: r.periode, matricule: r.matricule,
        nom_prenom: `${r.nom} ${r.prenom}`, code_caisse: r.code_caisse,
        cco: r.cco, montant: r.montant, row_number: r.row_number
      })));

      setIsSuccess(true);
      setFile(null);
      setPendingUpdate(null);
      toast({ title: '✅ Import réussi', description: `${rows.length} lignes traitées.` });
    } catch (e) {
      toast({ title: 'Erreur', description: 'Échec de l\'import', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = useCallback(async () => {
    if (!file || !selectedPeriod) return;
    setIsUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });

      const struct = validateStructure(ws);
      if (!struct.valid || !struct.headers) return;

      const formats = validateFieldFormats(data, struct.headers);
      if (!formats.valid || !formats.rows) return;

      const history = await checkHistoricalDuplicates(formats.rows, parseInt(selectedPeriod));
      if (history.isUpdate) {
        setPendingUpdate({ rows: formats.rows, historyCheck: history });
        setValidationErrors([{ type: 'update_detected', message: 'Mise à jour détectée' }]);
      } else {
        await performImport(formats.rows);
      }
    } finally {
      setIsUploading(false);
    }
  }, [file, selectedPeriod, companyUser, user]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#004080]">Import Excel</h1>
          <p className="text-muted-foreground text-sm">Gestion des flux de données</p>
        </div>
        <BrandIcon name="import" size={32} color="#004080" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-t-4 border-t-[#004080]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BrandIcon name="import" className="h-5 w-5" />
              Nouveau fichier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger><SelectValue placeholder="Choisir une période" /></SelectTrigger>
              <SelectContent>
                {periodOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="border-2 border-dashed rounded-xl p-8 text-center bg-slate-50 cursor-pointer" onClick={() => document.getElementById('file-upload')?.click()}>
              <input type="file" id="file-upload" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <BrandIcon name="import" className="h-12 w-12 mx-auto mb-3 text-slate-400" />
              <p className="text-sm text-slate-500">{file ? file.name : 'Sélectionnez un fichier'}</p>
            </div>

            <Button className="w-full bg-[#004080]" onClick={handleUpload} disabled={!file || !selectedPeriod || isUploading}>
              {isUploading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <BrandIcon name="import" className="mr-2 h-4 w-4" />}
              {isUploading ? "Traitement..." : "Importer"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {validationErrors.length > 0 && (
            <Alert variant={validationErrors[0].type === 'update_detected' ? 'default' : 'destructive'} className="bg-blue-50">
              <BrandIcon name="info" className="h-4 w-4" />
              <AlertTitle>{validationErrors[0].message}</AlertTitle>
              {validationErrors[0].type === 'update_detected' && (
                <Button className="mt-4 w-full bg-[#004080]" onClick={() => performImport(pendingUpdate!.rows)}>Confirmer</Button>
              )}
            </Alert>
          )}
          {isSuccess && (
            <Alert className="bg-emerald-50 border-emerald-200">
              <BrandIcon name="success" className="h-4 w-4 text-emerald-600" />
              <AlertTitle>Import réussi</AlertTitle>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportExcel;
