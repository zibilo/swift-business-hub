import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileSpreadsheet, Upload, AlertTriangle, CheckCircle, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ValidationError {
  type: 'period' | 'structure' | 'discrepancy';
  message: string;
  details?: string[];
}

interface ParsedRow {
  periode: number;
  matricule: string;
  nom_prenom: string;
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

  // Generate period options (current month + 11 previous months)
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

  const validateStructure = (worksheet: XLSX.WorkSheet): { valid: boolean; rows: ParsedRow[] } => {
    const expectedColumns = ['PERIODE', 'MATRICULE', 'NOM / PRENOM', 'CODE CAISSE', 'CCO', 'MONTANT'];
    const data = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });
    
    if (data.length < 2) {
      return { valid: false, rows: [] };
    }

    const headerRow = data[0] as unknown[];
    const headers = headerRow.map(h => String(h ?? '').toUpperCase().trim());
    const missingColumns = expectedColumns.filter(col => !headers.includes(col));

    if (missingColumns.length > 0) {
      setValidationErrors([{
        type: 'structure',
        message: 'Structure du fichier incorrecte',
        details: [`Colonnes manquantes: ${missingColumns.join(', ')}`],
      }]);
      return { valid: false, rows: [] };
    }

    // Parse rows
    const rows: ParsedRow[] = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i] as unknown[];
      if (!row || row.length === 0) continue;

      const periodeIndex = headers.indexOf('PERIODE');
      const matriculeIndex = headers.indexOf('MATRICULE');
      const nomIndex = headers.indexOf('NOM / PRENOM');
      const caisseIndex = headers.indexOf('CODE CAISSE');
      const ccoIndex = headers.indexOf('CCO');
      const montantIndex = headers.indexOf('MONTANT');

      rows.push({
        periode: Number(row[periodeIndex]),
        matricule: String(row[matriculeIndex] ?? '').trim(),
        nom_prenom: String(row[nomIndex] ?? '').trim(),
        code_caisse: String(row[caisseIndex] ?? '').trim(),
        cco: String(row[ccoIndex] ?? '').trim(),
        montant: Number(row[montantIndex]) || 0,
        row_number: i + 1,
      });
    }

    return { valid: true, rows };
  };

  const validatePeriod = (rows: ParsedRow[], selectedPeriod: number): boolean => {
    const invalidRows = rows.filter(r => r.periode !== selectedPeriod);
    if (invalidRows.length > 0) {
      setValidationErrors([{
        type: 'period',
        message: 'La période du fichier ne correspond pas à la période sélectionnée',
        details: [`Lignes concernées: ${invalidRows.map(r => r.row_number).slice(0, 5).join(', ')}${invalidRows.length > 5 ? '...' : ''}`],
      }]);
      return false;
    }
    return true;
  };

  const checkDiscrepancies = async (rows: ParsedRow[]): Promise<boolean> => {
    if (!companyUser?.company_id) return false;

    // Get existing employee references
    const { data: existingRefs } = await supabase
      .from('employee_references')
      .select('matricule, nom_prenom, code_caisse, cco')
      .eq('company_id', companyUser.company_id);

    if (!existingRefs || existingRefs.length === 0) {
      // First import - no references to check against
      return true;
    }

    const refMap = new Map(existingRefs.map(r => [r.matricule, r]));
    const discrepancies: string[] = [];

    for (const row of rows) {
      const existingRef = refMap.get(row.matricule);
      if (existingRef) {
        const diffs: string[] = [];
        if (existingRef.nom_prenom !== row.nom_prenom) {
          diffs.push(`Nom: "${existingRef.nom_prenom}" → "${row.nom_prenom}"`);
        }
        if (existingRef.code_caisse !== row.code_caisse) {
          diffs.push(`Code caisse: "${existingRef.code_caisse}" → "${row.code_caisse}"`);
        }
        if (existingRef.cco !== row.cco) {
          diffs.push(`CCO: "${existingRef.cco}" → "${row.cco}"`);
        }
        if (diffs.length > 0) {
          discrepancies.push(`Matricule ${row.matricule}: ${diffs.join(', ')}`);
        }
      }
    }

    if (discrepancies.length > 0) {
      setValidationErrors([{
        type: 'discrepancy',
        message: 'Données incohérentes avec les fichiers précédents',
        details: discrepancies.slice(0, 10),
      }]);
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Vérifier l'extension du fichier
      const validExtensions = ['.xlsx', '.xls', '.xlsm', '.xlsb', '.csv', '.ods'];
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        toast({
          title: 'Format non supporté',
          description: 'Veuillez sélectionner un fichier Excel (.xlsx, .xls, .xlsm, .xlsb) ou CSV',
          variant: 'destructive',
        });
        return;
      }

      setFile(selectedFile);
      setValidationErrors([]);
      setIsSuccess(false);
    }
  };

  const handleUpload = useCallback(async () => {
    if (!file || !selectedPeriod || !companyUser?.company_id || !user) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une période et un fichier',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setValidationErrors([]);
    setIsSuccess(false);

    try {
      // Read and parse Excel file
      const arrayBuffer = await file.arrayBuffer();
      
      // Déterminer les options de lecture selon le type de fichier
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      let workbook: XLSX.WorkBook;
      
      if (fileExtension === '.csv') {
        // Pour les fichiers CSV, on les traite comme du texte
        const text = new TextDecoder().decode(arrayBuffer);
        workbook = XLSX.read(text, { type: 'string' });
      } else {
        // Pour tous les formats Excel
        workbook = XLSX.read(arrayBuffer, { 
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false
        });
      }
      
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      // Step 1: Validate structure
      const { valid, rows } = validateStructure(worksheet);
      if (!valid) {
        setIsUploading(false);
        return;
      }

      // Step 2: Validate period
      const periodValid = validatePeriod(rows, parseInt(selectedPeriod));
      if (!periodValid) {
        setIsUploading(false);
        return;
      }

      // Step 3: Check discrepancies with existing data
      const noDiscrepancies = await checkDiscrepancies(rows);
      if (!noDiscrepancies) {
        setIsUploading(false);
        return;
      }

      // Step 4: Upload file to storage
      const storagePath = `${companyUser.company_id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('excel-imports')
        .upload(storagePath, file);

      if (uploadError) {
        throw new Error('Erreur lors du téléversement du fichier');
      }

      // Step 5: Create file_import record
      const { data: importData, error: importError } = await supabase
        .from('file_imports')
        .insert({
          company_id: companyUser.company_id,
          filename: file.name,
          storage_path: storagePath,
          period: parseInt(selectedPeriod),
          selected_period: parseInt(selectedPeriod),
          status: 'processing',
          uploaded_by: user.id,
          row_count: rows.length,
        })
        .select()
        .single();

      if (importError) throw importError;

      // Step 6: Insert rows
      const rowsToInsert = rows.map(row => ({
        file_import_id: importData.id,
        ...row,
      }));

      const { error: rowsError } = await supabase
        .from('file_import_rows')
        .insert(rowsToInsert);

      if (rowsError) throw rowsError;

      // Step 7: Update employee references (for new employees only)
      const { data: existingRefs } = await supabase
        .from('employee_references')
        .select('matricule')
        .eq('company_id', companyUser.company_id);

      const existingMatricules = new Set(existingRefs?.map(r => r.matricule) || []);
      const newEmployees = rows.filter(r => !existingMatricules.has(r.matricule));

      if (newEmployees.length > 0) {
        await supabase.from('employee_references').insert(
          newEmployees.map(e => ({
            company_id: companyUser.company_id,
            matricule: e.matricule,
            nom_prenom: e.nom_prenom,
            code_caisse: e.code_caisse,
            cco: e.cco,
            first_seen_file_id: importData.id,
          }))
        );
      }

      // Step 8: Update status to completed
      await supabase
        .from('file_imports')
        .update({ status: 'completed' })
        .eq('id', importData.id);

      setIsSuccess(true);
      setFile(null);
      setSelectedPeriod('');
      toast({
        title: 'Succès',
        description: `${rows.length} lignes importées avec succès`,
      });

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [file, selectedPeriod, companyUser, user, toast]);

  const downloadTemplate = () => {
    const template = [
      ['PERIODE', 'MATRICULE', 'NOM / PRENOM', 'CODE CAISSE', 'CCO', 'MONTANT'],
      [202501, 'MAT001', 'DUPONT Jean', '249', '12345678', 1500.50],
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
        <p className="text-muted-foreground">
          Importez vos fichiers de données de paie
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Nouveau fichier
            </CardTitle>
            <CardDescription>
              Sélectionnez la période et téléversez votre fichier Excel ou CSV
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Période</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une période" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fichier Excel ou CSV</label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls,.xlsm,.xlsb,.csv,.ods"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  {file ? (
                    <p className="text-sm font-medium">{file.name}</p>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Cliquez pour sélectionner un fichier
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Formats acceptés: .xlsx, .xls, .xlsm, .xlsb, .csv, .ods
                      </p>
                    </>
                  )}
                </label>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleUpload} 
              disabled={!file || !selectedPeriod || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importer
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Info and errors */}
        <div className="space-y-4">
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erreur de validation</AlertTitle>
              <AlertDescription>
                {validationErrors.map((err, i) => (
                  <div key={i} className="mt-2">
                    <p className="font-medium">{err.message}</p>
                    {err.details && (
                      <ul className="text-sm mt-1 list-disc list-inside">
                        {err.details.map((d, j) => (
                          <li key={j}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {isSuccess && (
            <Alert className="border-primary/50 bg-primary/5">
              <CheckCircle className="h-4 w-4 text-primary" />
              <AlertTitle className="text-primary">Import réussi</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                Votre fichier a été traité avec succès.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Format attendu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-1">
                <p><strong>PERIODE</strong> - Numérique (6 chiffres, ex: 202512)</p>
                <p><strong>MATRICULE</strong> - Identifiant unique du salarié</p>
                <p><strong>NOM / PRENOM</strong> - Identité complète</p>
                <p><strong>CODE CAISSE</strong> - Code agence (3 caractères)</p>
                <p><strong>CCO</strong> - Numéro de compte court</p>
                <p><strong>MONTANT</strong> - Montant net à verser</p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">
                  Formats supportés: Excel (.xlsx, .xls, .xlsm, .xlsb), CSV, OpenDocument (.ods)
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger le modèle
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ImportExcel;
