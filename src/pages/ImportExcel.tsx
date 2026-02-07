import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileSpreadsheet, Upload, AlertTriangle, CheckCircle, Download, Loader2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ValidationError {
  type: 'structure' | 'format' | 'duplicate_internal' | 'duplicate_file' | 'period' | 'update_detected';
  message: string;
  details?: string[];
}

interface ParsedRow {
  periode: number;
  matricule: string;
  nom: string;
  prenom: string;
  code: string;
  caisse: string;
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
  const [updateDetected, setUpdateDetected] = useState(false);

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

  // ÉTAPE 1 : Vérifier la structure du fichier
  const validateStructure = (worksheet: XLSX.WorkSheet): { valid: boolean; headers?: string[] } => {
    const expectedColumns = ['PÉRIODE', 'MATRICULE', 'NOM', 'PRENOM', 'CODE', 'CAISSE', 'CCO', 'MONTANT'];
    const data = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });
    
    if (data.length < 2) {
      setValidationErrors([{
        type: 'structure',
        message: 'Le fichier est vide ou ne contient pas de données',
      }]);
      return { valid: false };
    }

    const headerRow = data[0] as unknown[];
    const headers = headerRow.map(h => String(h ?? '').toUpperCase().trim());
    
    // Vérifier que toutes les colonnes attendues sont présentes
    const missingColumns = expectedColumns.filter(col => !headers.includes(col));

    if (missingColumns.length > 0) {
      setValidationErrors([{
        type: 'structure',
        message: 'Structure du fichier incorrecte',
        details: [`Colonnes manquantes : ${missingColumns.join(', ')}`],
      }]);
      return { valid: false };
    }

    // Vérifier qu'il n'y a pas de colonnes supplémentaires inattendues
    const extraColumns = headers.filter(h => h && !expectedColumns.includes(h));
    if (extraColumns.length > 0) {
      setValidationErrors([{
        type: 'structure',
        message: 'Structure du fichier incorrecte',
        details: [`Colonnes non attendues : ${extraColumns.join(', ')}`],
      }]);
      return { valid: false };
    }

    return { valid: true, headers };
  };

  // ÉTAPE 2 : Valider chaque champ
  const validateFieldFormats = (data: unknown[][], headers: string[]): { valid: boolean; rows?: ParsedRow[]; errors?: string[] } => {
    const rows: ParsedRow[] = [];
    const formatErrors: string[] = [];

    const periodeIndex = headers.indexOf('PÉRIODE');
    const matriculeIndex = headers.indexOf('MATRICULE');
    const nomIndex = headers.indexOf('NOM');
    const prenomIndex = headers.indexOf('PRENOM');
    const codeIndex = headers.indexOf('CODE');
    const caisseIndex = headers.indexOf('CAISSE');
    const ccoIndex = headers.indexOf('CCO');
    const montantIndex = headers.indexOf('MONTANT');

    for (let i = 1; i < data.length; i++) {
      const row = data[i] as unknown[];
      if (!row || row.length === 0) continue;

      const rowNum = i + 1;
      let hasError = false;

      // Extraire les valeurs
      const periode = String(row[periodeIndex] ?? '').trim();
      const matricule = String(row[matriculeIndex] ?? '').trim();
      const nom = String(row[nomIndex] ?? '').trim();
      const prenom = String(row[prenomIndex] ?? '').trim();
      const code = String(row[codeIndex] ?? '').trim();
      const caisse = String(row[caisseIndex] ?? '').trim();
      const cco = String(row[ccoIndex] ?? '').trim();
      const montant = row[montantIndex];

      // Valider PÉRIODE (format YYYYMM)
      if (!/^\d{6}$/.test(periode)) {
        formatErrors.push(`Ligne ${rowNum} : PÉRIODE invalide (format attendu : YYYYMM, ex: 202501)`);
        hasError = true;
      }

      // Valider MATRICULE (exactement 7 chiffres)
      if (!/^\d{7}$/.test(matricule)) {
        formatErrors.push(`Ligne ${rowNum} : MATRICULE invalide (7 chiffres requis)`);
        hasError = true;
      }

      // Valider CODE (exactement 3 chiffres)
      if (!/^\d{3}$/.test(code)) {
        formatErrors.push(`Ligne ${rowNum} : CODE invalide (3 chiffres requis)`);
        hasError = true;
      }

      // Valider CAISSE (exactement 3 chiffres)
      if (!/^\d{3}$/.test(caisse)) {
        formatErrors.push(`Ligne ${rowNum} : CAISSE invalide (3 chiffres requis)`);
        hasError = true;
      }

      // Valider CCO (exactement 6 chiffres)
      if (!/^\d{6}$/.test(cco)) {
        formatErrors.push(`Ligne ${rowNum} : CCO invalide (6 chiffres requis)`);
        hasError = true;
      }

      // Valider MONTANT (numérique uniquement)
      const montantNum = Number(montant);
      if (isNaN(montantNum)) {
        formatErrors.push(`Ligne ${rowNum} : MONTANT invalide (numérique requis)`);
        hasError = true;
      }

      // Valider NOM et PRENOM (non vides)
      if (!nom) {
        formatErrors.push(`Ligne ${rowNum} : NOM requis`);
        hasError = true;
      }
      if (!prenom) {
        formatErrors.push(`Ligne ${rowNum} : PRENOM requis`);
        hasError = true;
      }

      if (!hasError) {
        rows.push({
          periode: parseInt(periode),
          matricule,
          nom,
          prenom,
          code,
          caisse,
          cco,
          montant: montantNum,
          row_number: rowNum,
        });
      }
    }

    if (formatErrors.length > 0) {
      setValidationErrors([{
        type: 'format',
        message: 'Erreurs de format détectées',
        details: formatErrors.slice(0, 10),
      }]);
      return { valid: false, errors: formatErrors };
    }

    return { valid: true, rows };
  };

  // Vérifier que la période correspond
  const validatePeriod = (rows: ParsedRow[], selectedPeriod: number): boolean => {
    const invalidRows = rows.filter(r => r.periode !== selectedPeriod);
    if (invalidRows.length > 0) {
      setValidationErrors([{
        type: 'period',
        message: 'La période du fichier ne correspond pas à la période sélectionnée',
        details: [`${invalidRows.length} ligne(s) avec une période différente`],
      }]);
      return false;
    }
    return true;
  };

  // ÉTAPE 3 : Détection des doublons internes
  const checkInternalDuplicates = (rows: ParsedRow[]): boolean => {
    const matriculeSet = new Set<string>();
    const ccoSet = new Set<string>();
    const duplicates: string[] = [];

    for (const row of rows) {
      if (matriculeSet.has(row.matricule)) {
        duplicates.push(`MATRICULE ${row.matricule} apparaît plusieurs fois (ligne ${row.row_number})`);
      }
      if (ccoSet.has(row.cco)) {
        duplicates.push(`CCO ${row.cco} apparaît plusieurs fois (ligne ${row.row_number})`);
      }
      
      matriculeSet.add(row.matricule);
      ccoSet.add(row.cco);
    }

    if (duplicates.length > 0) {
      setValidationErrors([{
        type: 'duplicate_internal',
        message: 'Doublon détecté dans le fichier — risque de double paiement',
        details: duplicates.slice(0, 10),
      }]);
      return false;
    }

    return true;
  };

  // ÉTAPE 4 : Vérification avec les anciens fichiers
  const checkHistoricalDuplicates = async (rows: ParsedRow[], selectedPeriod: number): Promise<{ valid: boolean; isUpdate: boolean }> => {
    if (!companyUser?.company_id) return { valid: false, isUpdate: false };

    // Récupérer les fichiers précédents pour cette période
    const { data: previousImports } = await supabase
      .from('file_imports')
      .select('id, row_count')
      .eq('company_id', companyUser.company_id)
      .eq('period', selectedPeriod)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (!previousImports || previousImports.length === 0) {
      // Nouveau fichier - pas d'historique
      return { valid: true, isUpdate: false };
    }

    // Récupérer les lignes du dernier fichier importé
    const lastImportId = previousImports[0].id;
    const { data: previousRows } = await supabase
      .from('file_import_rows')
      .select('matricule, cco, code_caisse, montant, nom_prenom')
      .eq('file_import_id', lastImportId);

    if (!previousRows || previousRows.length === 0) {
      return { valid: true, isUpdate: false };
    }

    // Comparer les données
    // Créer une signature pour chaque ligne
    const createSignature = (r: any) => {
      return `${r.matricule}|${r.cco}|${r.code_caisse}|${r.montant}`;
    };

    const previousSignatures = new Set(
      previousRows.map(r => createSignature({
        matricule: r.matricule,
        cco: r.cco,
        code_caisse: r.code_caisse,
        montant: r.montant,
      }))
    );

    const currentSignatures = new Set(
      rows.map(r => createSignature({
        matricule: r.matricule,
        cco: r.cco,
        code_caisse: r.code,

        
        montant: r.montant,
      }))
    );

    // Vérifier si c'est exactement le même fichier
    const allMatch = rows.length === previousRows.length &&
      rows.every(r => previousSignatures.has(createSignature({
        matricule: r.matricule,
        cco: r.cco,
        code_caisse: r.code,
        montant: r.montant,
      })));

    if (allMatch) {
      setValidationErrors([{
        type: 'duplicate_file',
        message: 'Ce fichier a déjà été transmis. Aucune mise à jour détectée.',
      }]);
      return { valid: false, isUpdate: false };
    }

    // Déterminer s'il y a des changements
    const hasChanges = !allMatch;

    if (hasChanges) {
      setUpdateDetected(true);
      return { valid: true, isUpdate: true };
    }

    return { valid: true, isUpdate: false };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
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
      setUpdateDetected(false);
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
    setUpdateDetected(false);

    try {
      // Lire et parser le fichier Excel
      const arrayBuffer = await file.arrayBuffer();
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      let workbook: XLSX.WorkBook;
      
      if (fileExtension === '.csv') {
        const text = new TextDecoder().decode(arrayBuffer);
        workbook = XLSX.read(text, { type: 'string' });
      } else {
        workbook = XLSX.read(arrayBuffer, { 
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false
        });
      }
      
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });

      // ÉTAPE 1 : Vérifier la structure
      const structureValidation = validateStructure(worksheet);
      if (!structureValidation.valid || !structureValidation.headers) {
        setIsUploading(false);
        return;
      }

      // ÉTAPE 2 : Valider les formats de champs
      const formatValidation = validateFieldFormats(data, structureValidation.headers);
      if (!formatValidation.valid || !formatValidation.rows) {
        setIsUploading(false);
        return;
      }

      const rows = formatValidation.rows;

      // Vérifier que la période correspond
      const periodValid = validatePeriod(rows, parseInt(selectedPeriod));
      if (!periodValid) {
        setIsUploading(false);
        return;
      }

      // ÉTAPE 3 : Vérifier les doublons internes
      const noDuplicatesInternal = checkInternalDuplicates(rows);
      if (!noDuplicatesInternal) {
        setIsUploading(false);
        return;
      }

      // ÉTAPE 4 : Vérifier avec l'historique
      const historyCheck = await checkHistoricalDuplicates(rows, parseInt(selectedPeriod));
      if (!historyCheck.valid) {
        setIsUploading(false);
        return;
      }

      // Téléverser le fichier
      const storagePath = `${companyUser.company_id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('excel-imports')
        .upload(storagePath, file);

      if (uploadError) {
        throw new Error('Erreur lors du téléversement du fichier');
      }

      // Créer l'enregistrement d'import
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

      // Insérer les lignes
      const rowsToInsert = rows.map(row => ({
        file_import_id: importData.id,
        periode: row.periode,
        matricule: row.matricule,
        nom_prenom: `${row.nom} ${row.prenom}`,
        code_caisse: row.code,
        cco: row.cco,
        montant: row.montant,
        row_number: row.row_number,
      }));

      const { error: rowsError } = await supabase
        .from('file_import_rows')
        .insert(rowsToInsert);

      if (rowsError) throw rowsError;

      // Mettre à jour les références employés
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
            nom_prenom: `${e.nom} ${e.prenom}`,
            code_caisse: e.code,
            cco: e.cco,
            first_seen_file_id: importData.id,
          }))
        );
      }

      // Marquer comme complété
      await supabase
        .from('file_imports')
        .update({ status: 'completed' })
        .eq('id', importData.id);

      setIsSuccess(true);
      setFile(null);
      setSelectedPeriod('');
      
      toast({
        title: historyCheck.isUpdate ? 'Mise à jour détectée — fichier transmis' : 'Succès',
        description: `${rows.length} ligne(s) importée(s) avec succès`,
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
      ['PÉRIODE', 'MATRICULE', 'NOM', 'PRENOM', 'CODE', 'CAISSE', 'CCO', 'MONTANT'],
      [202501, '5119788', 'DUPONT', 'Jean', '333', '249', '023467', 1500.50],
      [202501, '4523891', 'MARTIN', 'Marie', '333', '249', '045678', 2300.75],
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
                    {err.details && err.details.length > 0 && (
                      <ul className="text-sm mt-1 list-disc list-inside max-h-40 overflow-y-auto">
                        {err.details.map((d, j) => (
                          <li key={j}>{d}</li>
                        ))}
                        {err.details.length > 10 && (
                          <li className="text-muted-foreground">... et {err.details.length - 10} autre(s) erreur(s)</li>
                        )}
                      </ul>
                    )}
                  </div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {updateDetected && !isSuccess && (
            <Alert className="border-blue-500/50 bg-blue-500/5">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertTitle className="text-blue-500">Mise à jour détectée</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                Des modifications ont été détectées par rapport au dernier fichier. Le fichier sera accepté.
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
              <div className="text-sm space-y-1.5">
                <p><strong>PÉRIODE</strong> - Format YYYYMM (ex: 202501)</p>
                <p><strong>MATRICULE</strong> - 7 chiffres (ex: 5119788)</p>
                <p><strong>NOM</strong> - Nom du salarié</p>
                <p><strong>PRENOM</strong> - Prénom du salarié</p>
                <p><strong>CODE</strong> - 3 chiffres (ex: 333)</p>
                <p><strong>CAISSE</strong> - 3 chiffres (ex: 249)</p>
                <p><strong>CCO</strong> - 6 chiffres (ex: 023467)</p>
                <p><strong>MONTANT</strong> - Montant net à verser</p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">
                  ✅ Validation en 4 étapes : Structure → Formats → Doublons internes → Historique
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
        
