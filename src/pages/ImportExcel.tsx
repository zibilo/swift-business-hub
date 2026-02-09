import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { FileSpreadsheet, Upload, AlertTriangle, CheckCircle, Download, Loader2, Info, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { BrandIcon } from '@/components/BrandIcons';

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{
    rows: ParsedRow[];
    historyCheck: { valid: boolean; isUpdate: boolean };
  } | null>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const VALID_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
  const BATCH_SIZE = 1000;

  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return {
      value: `${year}${month}`,
      label: `${month}/${year}`,
    };
  });

  const validateStructure = (worksheet: XLSX.WorkSheet): { valid: boolean; headers?: string[] } => {
    const expectedColumns = ['PÉRIODE', 'MATRICULE', 'NOM', 'PRENOM', 'CODE CAISSE', 'CCO', 'MONTANT'];
    const data = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });
    
    if (data.length < 2) {
      setValidationErrors([{ type: 'structure', message: 'Le fichier est vide ou ne contient pas de données' }]);
      return { valid: false };
    }

    const headerRow = data[0] as unknown[];
    const headers = headerRow.map(h => String(h ?? '').toUpperCase().trim());
    const missingColumns = expectedColumns.filter(col => !headers.includes(col));

    if (missingColumns.length > 0) {
      setValidationErrors([{
        type: 'structure',
        message: 'Structure du fichier incorrecte',
        details: [`Colonnes manquantes : ${missingColumns.join(', ')}`],
      }]);
      return { valid: false };
    }

    return { valid: true, headers };
  };

  const validateFieldFormats = (data: unknown[][], headers: string[]): { valid: boolean; rows?: ParsedRow[] } => {
    const rows: ParsedRow[] = [];
    const idx = {
        p: headers.indexOf('PÉRIODE'),
        m: headers.indexOf('MATRICULE'),
        n: headers.indexOf('NOM'),
        pr: headers.indexOf('PRENOM'),
        cc: headers.indexOf('CODE CAISSE'),
        cco: headers.indexOf('CCO'),
        mt: headers.indexOf('MONTANT')
    };

    const errors: string[] = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row || row.length === 0) continue;
        
        try {
            rows.push({
                periode: parseInt(String(row[idx.p]).trim()),
                matricule: String(row[idx.m]).trim(),
                nom: String(row[idx.n]).trim().toUpperCase(),
                prenom: String(row[idx.pr]).trim().toUpperCase(),
                code_caisse: String(row[idx.cc]).trim(),
                cco: String(row[idx.cco]).trim(),
                montant: Number(String(row[idx.mt]).trim()),
                row_number: i + 1
            });
        } catch (e) {
            errors.push(`Erreur ligne ${i + 1}`);
        }
    }

    if (errors.length > 0) {
        setValidationErrors([{ type: 'format', message: 'Erreurs de format', details: errors.slice(0, 5) }]);
        return { valid: false };
    }

    return { valid: true, rows };
  };

  const validatePeriod = (rows: ParsedRow[], selectedPeriod: number): boolean => {
     return rows.every(r => r.periode === selectedPeriod);
  };

  const checkHistoricalDuplicates = async (rows: ParsedRow[], period: number): Promise<{ valid: boolean; isUpdate: boolean }> => {
    if (!companyUser?.company_id) return { valid: false, isUpdate: false };

    const { data: previousImports } = await supabase
      .from('file_imports')
      .select('id, row_count, filename, created_at')
      .eq('company_id', companyUser.company_id)
      .eq('period', period)
      .in('status', ['pending', 'validated'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (!previousImports || previousImports.length === 0) {
      return { valid: true, isUpdate: false };
    }

    const lastImport = previousImports[0];
    
    setValidationErrors([{
      type: 'update_detected',
      message: '🔄 Mise à jour détectée',
      details: [
        `Un fichier existe déjà pour cette période (${lastImport.filename}).`,
        `Ceci sera considéré comme une mise à jour.`,
      ],
    }]);

    return { valid: true, isUpdate: true };
  };

  const performImport = async (rows: ParsedRow[], historyCheck: { valid: boolean; isUpdate: boolean }) => {
    if (!file || !companyUser?.company_id || !user || !selectedPeriod) return;

    try {
      setIsUploading(true);
      setUploadProgress(5);

      // 1. Upload Storage
      const storagePath = `${companyUser.company_id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('excel-imports')
        .upload(storagePath, file);

      if (uploadError) throw new Error(`Upload échoué: ${uploadError.message}`);
      setUploadProgress(15);

      // 2. Création de l'enregistrement parent
      const { data: importData, error: importError } = await supabase
        .from('file_imports')
        .insert({
          company_id: companyUser.company_id,
          filename: file.name,
          storage_path: storagePath,
          period: parseInt(selectedPeriod),
          selected_period: parseInt(selectedPeriod),
          status: 'pending', // 'pending' pour commencer
          uploaded_by: user.id,
          row_count: rows.length,
        })
        .select()
        .single();

      if (importError) throw importError;
      setUploadProgress(20);

      // 3. INSERTION PAR LOTS (BATCHING)
      const totalRows = rows.length;
      
      for (let i = 0; i < totalRows; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE).map(row => ({
          file_import_id: importData.id,
          periode: row.periode,
          matricule: row.matricule,
          nom_prenom: `${row.nom} ${row.prenom}`,
          code_caisse: row.code_caisse,
          cco: row.cco,
          montant: row.montant,
          row_number: row.row_number,
        }));

        const { error: batchError } = await supabase
          .from('file_import_rows')
          .insert(batch);

        if (batchError) throw new Error(`Erreur insertion lot ${i}: ${batchError.message}`);

        const progress = 20 + Math.round(((i + BATCH_SIZE) / totalRows) * 60);
        setUploadProgress(Math.min(progress, 80));
      }

      setUploadProgress(85);
      const uniqueEmployees = Array.from(new Map(rows.map(item => [item.matricule, item])).values());
      
      for (let i = 0; i < uniqueEmployees.length; i += BATCH_SIZE) {
        const empBatch = uniqueEmployees.slice(i, i + BATCH_SIZE).map(e => ({
            company_id: companyUser.company_id,
            matricule: e.matricule,
            nom_prenom: `${e.nom} ${e.prenom}`,
            code_caisse: e.code_caisse,
            cco: e.cco,
            first_seen_file_id: importData.id,
            updated_at: new Date().toISOString()
        }));

        const { error: empError } = await supabase
            .from('employee_references')
            .upsert(empBatch, { 
                onConflict: 'company_id,matricule',
                ignoreDuplicates: true
            });
            
        if (empError) console.warn("Erreur ref employés (non bloquant):", empError);
      }

      const { error: updateError } = await supabase
        .from('file_imports')
        .update({ status: 'validated' }) // Changement ici vers 'validated' si terminé
        .eq('id', importData.id);

      if (updateError) throw updateError;

      setUploadProgress(100);
      setIsSuccess(true);
      setFile(null);
      setSelectedPeriod('');
      setPendingUpdate(null);
      setValidationErrors([]); // Clear errors explicitly
      
      toast({
        title: '✅ Import réussi',
        description: `${rows.length} ligne(s) traitée(s) avec succès`,
      });

    } catch (error: any) {
      console.error('Erreur Import:', error);
      setValidationErrors([{ type: 'upload', message: error.message || "Erreur inconnue" }]);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > MAX_FILE_SIZE) {
        toast({ title: 'Fichier trop lourd', description: 'Max 10MB', variant: 'destructive' });
        return;
      }
      setFile(selectedFile);
      setValidationErrors([]);
      setIsSuccess(false);
      setPendingUpdate(null);
    }
  };

  const handleUpload = useCallback(async () => {
    if (!file || !selectedPeriod || !companyUser?.company_id) {
        toast({ title: "Informations manquantes", variant: "destructive" });
        return;
    }

    // Reset states before starting
    setIsUploading(true);
    setUploadProgress(1);
    setValidationErrors([]); 
    setIsSuccess(false);
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });

        const structure = validateStructure(worksheet);
        if (!structure.valid) throw new Error(structure.headers ? "Erreur format" : "Erreur structure");

        const parsed = validateFieldFormats(data, structure.headers!);
        if (!parsed.valid || !parsed.rows) throw new Error("Erreur parsing");

        if (!validatePeriod(parsed.rows, parseInt(selectedPeriod))) {
             setValidationErrors([{ type: 'period', message: "Période invalide dans le fichier" }]);
             setIsUploading(false);
             return;
        }

        const history = await checkHistoricalDuplicates(parsed.rows, parseInt(selectedPeriod));
        
        if (history.isUpdate) {
            setPendingUpdate({ rows: parsed.rows, historyCheck: history });
            setIsUploading(false);
            return;
        }

        await performImport(parsed.rows, history);

    } catch (e: any) {
        setIsUploading(false);
        if (validationErrors.length === 0) {
             setValidationErrors([{ type: 'structure', message: e.message || "Erreur de traitement" }]);
        }
    }
  }, [file, selectedPeriod, companyUser]);

  const handleConfirmUpdate = async () => {
    if (!pendingUpdate) return;
    await performImport(pendingUpdate.rows, pendingUpdate.historyCheck);
  };

  const downloadTemplate = () => {
    const template = [
      ['PÉRIODE', 'MATRICULE', 'NOM', 'PRENOM', 'CODE CAISSE', 'CCO', 'MONTANT'],
      [202501, '5119788', 'DUPONT', 'Jean', '249', '023467', 10987777],
    ];
    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modèle');
    XLSX.writeFile(wb, 'modele_import.xlsx');
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import Excel</h1>
        <p className="text-muted-foreground">Importez vos fichiers de données de paie (Haute Volumétrie)</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" /> 
                Nouveau fichier
            </CardTitle>
            <CardDescription>Format .xlsx ou .csv (Max 10MB)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Période</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                <SelectContent>
                  {periodOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fichier</label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input type="file" accept={VALID_EXTENSIONS.join(',')} onChange={handleFileChange} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="cursor-pointer block">
                  <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">{file ? file.name : "Cliquez pour sélectionner"}</p>
                </label>
              </div>
            </div>

            {/* Stable container for progress */}
            <div className="h-6">
                {isUploading && (
                    <div className="space-y-1">
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-xs text-center text-muted-foreground">{uploadProgress}%</p>
                    </div>
                )}
            </div>

            <Button className="w-full bg-[#004080]" onClick={handleUpload} disabled={!file || !selectedPeriod || isUploading || !!pendingUpdate}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BrandIcon name="import" className="h-4 w-4 mr-2" />}
              {isUploading ? "Traitement..." : "Importer"}
            </Button>
          </CardContent>
        </Card>

        {/* Stable container for alerts to prevent layout shifts/crashes */}
        <div className="space-y-4">
          <div className="min-h-[50px]">
            {validationErrors.length > 0 && (
                <Alert variant={validationErrors[0].type === 'update_detected' ? 'default' : 'destructive'} 
                    className={validationErrors[0].type === 'update_detected' ? 'border-blue-500/50 bg-blue-500/5' : ''}>
                <AlertTitle className="flex items-center gap-2">
                    {validationErrors[0].type === 'update_detected' ? <Info className="h-4 w-4 text-blue-500"/> : <AlertTriangle className="h-4 w-4"/>}
                    {validationErrors[0].type === 'update_detected' ? 'Validation Requise' : 'Erreur'}
                </AlertTitle>
                <AlertDescription className="mt-2">
                    <div className="flex flex-col gap-2">
                        <span className="font-bold">{validationErrors[0].message}</span>
                        {validationErrors[0].details && (
                            <ul className="list-disc pl-4 text-sm">
                                {validationErrors[0].details.map((d, j) => <li key={j}>{d}</li>)}
                            </ul>
                        )}
                    </div>
                    {pendingUpdate && (
                        <Button className="mt-4 w-full bg-blue-600 hover:bg-blue-700" onClick={handleConfirmUpdate} disabled={isUploading}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Confirmer la mise à jour
                        </Button>
                    )}
                </AlertDescription>
                </Alert>
            )}

            {isSuccess && (
                <Alert className="border-green-500/50 bg-green-500/10 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Succès</AlertTitle>
                <AlertDescription>Le fichier a été intégré à la base de données.</AlertDescription>
                </Alert>
            )}
          </div>

          <Button variant="outline" className="w-full" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" /> Modèle d'import
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImportExcel;
