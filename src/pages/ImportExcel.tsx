import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { Loader2, AlertTriangle, CheckCircle, Upload, FileSpreadsheet, Download, RefreshCw, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FilePicker } from 'capacitor-file-picker';
import { BrandIcon } from '@/components/BrandIcons';
import { useNativePermissions } from '@/hooks/useNativePermissions';

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
  const { checkAndRequestStoragePermissions } = useNativePermissions();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [file, setFile] = useState<{ name: string, data: ArrayBuffer } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{
    rows: ParsedRow[];
    historyCheck: { valid: boolean; isUpdate: boolean; details?: string[] };
  } | null>(null);

  const VALID_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return { value: `${year}${month}`, label: `${month}/${year}` };
  });

  const handlePickFile = async () => {
    try {
      const isGranted = await checkAndRequestStoragePermissions();
      if (!isGranted) {
        toast({ title: "Permission refusée", description: "L'accès au stockage est nécessaire.", variant: "destructive" });
        return;
      }

      const result = await FilePicker.pickFiles({
        types: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'],
        multiple: false,
        readData: true
      });

      if (result.files && result.files.length > 0) {
        const pickedFile = result.files[0];
        if (pickedFile.data) {
          const binaryString = atob(pickedFile.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          setFile({ name: pickedFile.name, data: bytes.buffer });
          setValidationErrors([]);
          setIsSuccess(false);
          setPendingUpdate(null);
        }
      }
    } catch (error) {
      console.error('File picking error:', error);
      toast({ title: "Erreur", description: "Impossible de sélectionner le fichier.", variant: "destructive" });
    }
  };

  const validateStructure = (workbook: XLSX.WorkBook) => {
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];

    const required = ['PÉRIODE', 'MATRICULE', 'NOM', 'PRENOM', 'CODE CAISSE', 'CCO', 'MONTANT'];
    const missing = required.filter(h => !headers?.includes(h));

    if (missing.length > 0) {
      setValidationErrors([{
        type: 'structure',
        message: 'Colonnes manquantes',
        details: missing
      }]);
      return { valid: false };
    }

    const rows = XLSX.utils.sheet_to_json(worksheet) as any[];
    return { valid: true, rows };
  };

  const validateFormats = (rows: any[]) => {
    const errors: string[] = [];
    const parsedRows: ParsedRow[] = [];

    rows.forEach((row, index) => {
      const rowNum = index + 2;
      if (!/^\d{6}$/.test(String(row['PÉRIODE']))) errors.push(`Ligne ${rowNum}: PÉRIODE invalide (YYYYMM)`);
      if (!/^\d+$/.test(String(row['MATRICULE']))) errors.push(`Ligne ${rowNum}: MATRICULE invalide`);
      if (!row['NOM']) errors.push(`Ligne ${rowNum}: NOM manquant`);
      if (!row['PRENOM']) errors.push(`Ligne ${rowNum}: PRENOM manquant`);
      if (!/^\d+$/.test(String(row['CODE CAISSE']))) errors.push(`Ligne ${rowNum}: CODE CAISSE invalide`);
      if (!/^\d+$/.test(String(row['CCO']))) errors.push(`Ligne ${rowNum}: CCO invalide`);
      if (isNaN(Number(row['MONTANT']))) errors.push(`Ligne ${rowNum}: MONTANT invalide`);

      parsedRows.push({
        periode: parseInt(row['PÉRIODE']),
        matricule: String(row['MATRICULE']),
        nom: String(row['NOM']),
        prenom: String(row['PRENOM']),
        code_caisse: String(row['CODE CAISSE']),
        cco: String(row['CCO']),
        montant: Number(row['MONTANT']),
        row_number: rowNum
      });
    });

    if (errors.length > 0) {
      setValidationErrors([{
        type: 'format',
        message: 'Erreurs de format',
        details: errors.slice(0, 10)
      }]);
      return { valid: false };
    }

    return { valid: true, rows: parsedRows };
  };

  const checkInternalDuplicates = (rows: ParsedRow[]) => {
    const seen = new Set<string>();
    const duplicates: string[] = [];

    rows.forEach(row => {
      const key = `${row.periode}-${row.matricule}`;
      if (seen.has(key)) {
        duplicates.push(`Doublon détecté: Matricule ${row.matricule} pour la période ${row.periode}`);
      }
      seen.add(key);
    });

    if (duplicates.length > 0) {
      setValidationErrors([{
        type: 'duplicate_internal',
        message: 'Doublons dans le fichier',
        details: duplicates.slice(0, 5)
      }]);
      return false;
    }
    return true;
  };

  const checkHistoricalDuplicates = async (rows: ParsedRow[], period: number) => {
    // Note: We check file_import_rows for history because employee_references might be simplified
    const { data: existingData, error } = await supabase
      .from('file_import_rows')
      .select('matricule, nom_prenom, code_caisse, cco, montant')
      .eq('periode', period)
      .in('matricule', rows.map(r => r.matricule));

    if (error) throw error;

    if (existingData && existingData.length > 0) {
      const updates: string[] = [];
      rows.forEach(row => {
        const existing = existingData.find(e => e.matricule === row.matricule);
        if (existing) {
          const fullName = `${row.nom} ${row.prenom}`;
          if (existing.nom_prenom !== fullName ||
              existing.code_caisse !== row.code_caisse || existing.cco !== row.cco ||
              existing.montant !== row.montant) {
            updates.push(`Mise à jour pour ${fullName} (Matricule ${row.matricule})`);
          }
        }
      });

      if (updates.length > 0) {
        return {
          valid: true,
          isUpdate: true,
          details: [
            `📊 Statistiques de l'import :`,
            `✅ ${rows.length - updates.length} nouveaux enregistrements ou identiques`,
            `🔄 ${updates.length} mises à jour détectées`,
            ...updates.slice(0, 5)
          ]
        };
      }
    }

    return { valid: true, isUpdate: false };
  };

  const performImport = async (rows: ParsedRow[]) => {
    if (!file || !user || !companyUser) return;
    setIsUploading(true);

    try {
      const periodInt = parseInt(selectedPeriod);
      // 1. Upload to storage
      const storagePath = `${companyUser.company_id}/${selectedPeriod}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('company_imports')
        .upload(storagePath, file.data);

      if (uploadError) throw uploadError;

      // 2. Create import record
      const { data: importRecord, error: importError } = await supabase
        .from('file_imports')
        .insert({
          company_id: companyUser.company_id,
          uploaded_by: user.id,
          filename: file.name,
          storage_path: storagePath,
          period: periodInt,
          selected_period: periodInt,
          row_count: rows.length,
          status: 'completed'
        })
        .select()
        .single();

      if (importError) throw importError;

      // 3. Insert rows
      const importRows = rows.map(r => ({
        file_import_id: importRecord.id,
        periode: r.periode,
        matricule: r.matricule,
        nom_prenom: `${r.nom} ${r.prenom}`,
        code_caisse: r.code_caisse,
        cco: r.cco,
        montant: r.montant,
        row_number: r.row_number
      }));

      const { error: rowsError } = await supabase
        .from('file_import_rows')
        .insert(importRows);

      if (rowsError) throw rowsError;

      // 4. Update/Insert in references (upsert)
      const references = rows.map(r => ({
        company_id: companyUser.company_id,
        matricule: r.matricule,
        nom_prenom: `${r.nom} ${r.prenom}`,
        code_caisse: r.code_caisse,
        cco: r.cco,
        first_seen_file_id: importRecord.id
      }));

      // In real scenario, we might want to be careful with upsert on employee_references
      // but for this task, we follow the "No deletion" principle.
      const { error: refError } = await supabase
        .from('employee_references')
        .upsert(references, { onConflict: 'company_id,matricule' });

      if (refError) throw refError;

      setIsSuccess(true);
      setFile(null);
      setPendingUpdate(null);
      setValidationErrors([]);
      toast({ title: "Import réussi", description: `${rows.length} lignes importées.` });

    } catch (error: any) {
      toast({ title: "Erreur d'import", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedPeriod || !companyUser) return;
    setIsUploading(true);
    setValidationErrors([]);

    try {
      const workbook = XLSX.read(file.data, { type: 'array' });

      const struct = validateStructure(workbook);
      if (!struct.valid || !struct.rows) return;

      const formats = validateFormats(struct.rows);
      if (!formats.valid || !formats.rows) return;

      if (!checkInternalDuplicates(formats.rows)) return;

      const periodInt = parseInt(selectedPeriod);
      const rowsWithPeriod = formats.rows.filter(r => r.periode === periodInt);

      if (rowsWithPeriod.length === 0) {
        setValidationErrors([{
          type: 'period',
          message: 'Aucune donnée pour la période sélectionnée',
          details: [`Le fichier contient des données pour d'autres périodes.`]
        }]);
        return;
      }

      const historyCheck = await checkHistoricalDuplicates(rowsWithPeriod, periodInt);

      if (historyCheck.isUpdate) {
        setPendingUpdate({ rows: rowsWithPeriod, historyCheck });
        setValidationErrors([{
          type: 'update_detected',
          message: 'Données existantes détectées',
          details: historyCheck.details
        }]);
      } else {
        await performImport(rowsWithPeriod);
      }

    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#004080]">Import Excel</h1>
          <p className="text-muted-foreground text-sm">Téléversez vos fichiers de données de paie</p>
        </div>
        <BrandIcon name="import" size={32} color="#004080" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-t-4 border-t-[#004080]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Nouveau fichier
            </CardTitle>
            <CardDescription>Sélectionnez la période et le fichier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Période de reporting</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une période" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              className="border-2 border-dashed rounded-xl p-8 text-center bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
              onClick={handlePickFile}
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-slate-400" />
              {file ? (
                <div className="text-primary font-bold">{file.name}</div>
              ) : (
                <div className="text-sm text-slate-500">
                  Appuyez pour sélectionner un fichier Excel ou CSV
                </div>
              )}
            </div>

            <Button
              className="w-full bg-[#004080] hover:bg-[#003060]"
              onClick={handleUpload}
              disabled={!file || !selectedPeriod || isUploading || !!pendingUpdate}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              {isUploading ? "Traitement..." : "Lancer l'importation"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {validationErrors.length > 0 && (
            <Alert variant={validationErrors[0].type === 'update_detected' ? 'default' : 'destructive'} className={validationErrors[0].type === 'update_detected' ? 'border-[#004080] bg-blue-50' : ''}>
              {validationErrors[0].type === 'update_detected' ? <Info className="h-4 w-4 text-[#004080]" /> : <AlertTriangle className="h-4 w-4" />}
              <AlertTitle>{validationErrors[0].type === 'update_detected' ? 'Mise à jour détectée' : 'Erreur de validation'}</AlertTitle>
              <AlertDescription>
                <p className="font-medium mt-1">{validationErrors[0].message}</p>
                {validationErrors[0].details && (
                  <ul className="text-xs mt-2 space-y-1 list-disc pl-4">
                    {validationErrors[0].details.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                )}
                {validationErrors[0].type === 'update_detected' && (
                  <Button
                    className="mt-4 w-full bg-[#004080]"
                    onClick={() => performImport(pendingUpdate!.rows)}
                  >
                    Confirmer et importer
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {isSuccess && (
            <Alert className="bg-emerald-50 border-emerald-200">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <AlertTitle className="text-emerald-800">Import réussi</AlertTitle>
              <AlertDescription className="text-emerald-700">Vos données ont été enregistrées avec succès.</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                Spécifications Techniques
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <p>• <strong>PÉRIODE :</strong> YYYYMM (ex: 202501)</p>
              <p>• <strong>MATRICULE :</strong> Identifiant unique salarié</p>
              <p>• <strong>FORMATS :</strong> XLSX, XLS, CSV acceptés.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ImportExcel;
