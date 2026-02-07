import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileSpreadsheet, Upload, AlertTriangle, CheckCircle, Download, Loader2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

// --- Interfaces ---
interface ValidationError {
  type: 'period' | 'structure' | 'discrepancy' | 'data_type';
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
  row_number: number; // Numéro de ligne dans le fichier Excel (pour les messages d'erreur)
}

// --- Composant ImportExcel ---
const ImportExcel = () => {
  const { companyUser, user } = useAuth();
  const { toast } = useToast();

  // --- States ---
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  // --- Mappage des colonnes (pour flexibilité) ---
  const columnMapping = {
    periode: ['PERIODE', 'PERIOD', 'MOIS', 'ANNEE_MOIS'],
    matricule: ['MATRICULE', 'MAT', 'ID_SALARIE', 'EMPLOYEE_ID'],
    nom_prenom: ['NOM / PRENOM', 'NOM PRENOM', 'NOM_PRENOM', 'NAME', 'EMPLOYEE_NAME'],
    code_caisse: ['CODE CAISSE', 'CAISSE', 'AGENCE', 'CODE_AGENCE', 'BRANCH_CODE'],
    cco: ['CCO', 'NUMERO_CCO', 'ACCOUNT_NUMBER'],
    montant: ['MONTANT', 'NET_A_PAYER', 'AMOUNT', 'VALUE']
  };

  // --- Génération des options de période (mémoïsé) ---
  const periodOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return {
        value: `${year}${month}`,
        label: `${month}/${year}`,
      };
    });
  }, []);

  // --- Fonctions de validation ---

  // Valide la structure du fichier et mappe les colonnes
  const validateStructure = (worksheet: XLSX.WorkSheet): { valid: boolean; rows: ParsedRow[] } => {
    const data = XLSX.utils.sheet_to_json<any>(worksheet, { defval: null });
    
    if (data.length === 0) {
      setValidationErrors([{ type: 'structure', message: 'Le fichier Excel est vide.' }]);
      return { valid: false, rows: [] };
    }

    const firstRowKeys = Object.keys(data[0] || {}); // Clés de la première ligne
    
    const findMappedKey = (aliases: string[]) => 
      firstRowKeys.find(key => aliases.includes(String(key).toUpperCase().trim()));

    const currentMappedKeys = {
      periode: findMappedKey(columnMapping.periode),
      matricule: findMappedKey(columnMapping.matricule),
      nom_prenom: findMappedKey(columnMapping.nom_prenom),
      code_caisse: findMappedKey(columnMapping.code_caisse),
      cco: findMappedKey(columnMapping.cco),
      montant: findMappedKey(columnMapping.montant),
    };

    const missingColumns = Object.values(currentMappedKeys).filter(key => !key);

    if (missingColumns.length > 0) {
      const missingNames = Object.entries(currentMappedKeys)
        .filter(([, value]) => !value)
        .map(([key]) => key.toUpperCase());

      setValidationErrors([{
        type: 'structure',
        message: 'Structure du fichier incorrecte',
        details: [`Certaines colonnes obligatoires n'ont pas été trouvées ou identifiées. Attendu: ${missingNames.join(', ')}`],
      }]);
      return { valid: false, rows: [] };
    }

    const parsedRows: ParsedRow[] = [];
    const dataConversionErrors: string[] = [];

    data.forEach((row, index) => {
      const rowNumber = index + 2; // +1 for 0-index, +1 for header row
      try {
        const periodeValue = row[currentMappedKeys.periode!];
        const montantValue = row[currentMappedKeys.montant!];

        // Basic data type validation and cleaning
        const periode = parseInt(String(periodeValue));
        if (isNaN(periode) || String(periode).length !== 6) {
          dataConversionErrors.push(`Ligne ${rowNumber}: La période "${periodeValue}" n'est pas un format valide (ex: 202401).`);
          return;
        }

        const montant = parseFloat(String(montantValue).replace(',', '.'));
        if (isNaN(montant)) {
          dataConversionErrors.push(`Ligne ${rowNumber}: Le montant "${montantValue}" n'est pas un nombre valide.`);
          return;
        }

        parsedRows.push({
          periode: periode,
          matricule: String(row[currentMappedKeys.matricule!] ?? '').trim(),
          nom_prenom: String(row[currentMappedKeys.nom_prenom!] ?? '').trim(),
          code_caisse: String(row[currentMappedKeys.code_caisse!] ?? '').trim(),
          cco: String(row[currentMappedKeys.cco!] ?? '').trim(),
          montant: montant,
          row_number: rowNumber,
        });
      } catch (error) {
        dataConversionErrors.push(`Ligne ${rowNumber}: Erreur lors du traitement des données - ${(error as Error).message}`);
      }
    });

    if (dataConversionErrors.length > 0) {
      setValidationErrors([{
        type: 'data_type',
        message: 'Erreurs de format de données détectées',
        details: dataConversionErrors.slice(0, 10), // Limit error messages for brevity
      }]);
      return { valid: false, rows: [] };
    }

    return { valid: true, rows: parsedRows };
  };

  // Valide que la période dans le fichier correspond à celle sélectionnée
  const validatePeriod = (rows: ParsedRow[], selectedPeriodNum: number): boolean => {
    const invalidRows = rows.filter(r => r.periode !== selectedPeriodNum);
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

  // Vérifie les incohérences avec les données existantes des employés
  const checkDiscrepancies = async (rows: ParsedRow[]): Promise<boolean> => {
    if (!companyUser?.company_id) return false;

    // Récupérer les références existantes des employés pour l'entreprise
    const { data: existingRefs, error: fetchError } = await supabase
      .from('employee_references')
      .select('matricule, nom_prenom, code_caisse, cco')
      .eq('company_id', companyUser.company_id);

    if (fetchError) {
      console.error('Error fetching existing employee references:', fetchError);
      setValidationErrors([{
        type: 'discrepancy',
        message: 'Erreur lors de la vérification des références existantes.',
        details: [fetchError.message],
      }]);
      return false;
    }

    if (!existingRefs || existingRefs.length === 0) {
      // C'est potentiellement le premier import, pas de références à vérifier
      return true;
    }

    const refMap = new Map(existingRefs.map(r => [r.matricule, r]));
    const discrepancies: string[] = [];

    for (const row of rows) {
      const existingRef = refMap.get(row.matricule);
      if (existingRef) {
        const diffs: string[] = [];
        // Comparaison des champs, ignorons la casse pour les chaînes
        if (existingRef.nom_prenom?.toLowerCase() !== row.nom_prenom.toLowerCase()) {
          diffs.push(`Nom: "${existingRef.nom_prenom}" → "${row.nom_prenom}"`);
        }
        if (existingRef.code_caisse?.toLowerCase() !== row.code_caisse.toLowerCase()) {
          diffs.push(`Code caisse: "${existingRef.code_caisse}" → "${row.code_caisse}"`);
        }
        if (existingRef.cco?.toLowerCase() !== row.cco.toLowerCase()) {
          diffs.push(`CCO: "${existingRef.cco}" → "${row.cco}"`);
        }
        if (diffs.length > 0) {
          discrepancies.push(`Matricule ${row.matricule} (Ligne ${row.row_number}): ${diffs.join(', ')}`);
        }
      }
    }

    if (discrepancies.length > 0) {
      setValidationErrors([{
        type: 'discrepancy',
        message: 'Des incohérences ont été détectées avec les données des fichiers précédents',
        details: [`Voici un aperçu des 10 premières incohérences :`, ...discrepancies.slice(0, 10)],
      }]);
      return false;
    }

    return true;
  };

  // --- Gestionnaires d'événements ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setValidationErrors([]);
      setIsSuccess(false);
    }
  };

  const handleUpload = useCallback(async () => {
    if (!file || !selectedPeriod || !companyUser?.company_id || !user) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une période et un fichier pour commencer.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setValidationErrors([]);
    setIsSuccess(false);

    try {
      // 1. Lecture et parsing du fichier Excel
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      // Assumer le premier onglet pour l'instant
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      // 2. Validation de la structure et des types de données
      const { valid, rows } = validateStructure(worksheet);
      if (!valid) {
        setIsUploading(false);
        return;
      }

      // 3. Validation de la période
      const periodValid = validatePeriod(rows, parseInt(selectedPeriod));
      if (!periodValid) {
        setIsUploading(false);
        return;
      }

      // 4. Vérification des incohérences avec les données existantes
      const noDiscrepancies = await checkDiscrepancies(rows);
      if (!noDiscrepancies) {
        setIsUploading(false);
        return;
      }
      
      // Si toutes les validations passent, on procède à l'importation réelle

      // 5. Téléversement du fichier sur Supabase Storage
      const storagePath = `excel-imports/${companyUser.company_id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('imports') // Assurez-vous que votre bucket s'appelle 'imports'
        .upload(storagePath, file);

      if (uploadError) {
        throw new Error(`Erreur lors du téléversement du fichier : ${uploadError.message}`);
      }

      // 6. Création d'un enregistrement `file_import`
      const { data: importData, error: importError } = await supabase
        .from('file_imports')
        .insert({
          company_id: companyUser.company_id,
          filename: file.name,
          storage_path: storagePath,
          period: parseInt(selectedPeriod),
          selected_period: parseInt(selectedPeriod), // Double-check if `selected_period` is redundant
          status: 'processing', // Initial status
          uploaded_by: user.id,
          row_count: rows.length,
        })
        .select()
        .single();

      if (importError) throw new Error(`Erreur lors de la création de l'enregistrement d'import : ${importError.message}`);

      // 7. Insertion des lignes de données dans `file_import_rows`
      const rowsToInsert = rows.map(row => ({
        file_import_id: importData.id,
        ...row,
      }));

      // Utilisation de `insert` en mode `batch` pour de meilleures performances
      const { error: rowsError } = await supabase
        .from('file_import_rows')
        .insert(rowsToInsert);

      if (rowsError) throw new Error(`Erreur lors de l'insertion des lignes de données : ${rowsError.message}`);

      // 8. Mise à jour des références d'employés (si de nouveaux employés sont détectés)
      const { data: existingRefs } = await supabase
        .from('employee_references')
        .select('matricule')
        .eq('company_id', companyUser.company_id);

      const existingMatricules = new Set(existingRefs?.map(r => r.matricule) || []);
      const newEmployees = rows.filter(r => !existingMatricules.has(r.matricule));

      if (newEmployees.length > 0) {
        // Insertion en mode `ignoreDuplicates` ou `upsert` si votre table le permet
        await supabase.from('employee_references').insert(
          newEmployees.map(e => ({
            company_id: companyUser.company_id,
            matricule: e.matricule,
            nom_prenom: e.nom_prenom,
            code_caisse: e.code_caisse,
            cco: e.cco,
            first_seen_file_id: importData.id, // Garder une trace du premier fichier où l'employé est apparu
          }))
        );
      }

      // 9. Mise à jour du statut d'importation à 'completed'
      await supabase
        .from('file_imports')
        .update({ status: 'completed' })
        .eq('id', importData.id);

      // --- Succès ---
      setIsSuccess(true);
      setFile(null); // Réinitialiser le fichier sélectionné
      // setSelectedPeriod(''); // Laisser la période sélectionnée ou la réinitialiser si souhaité
      toast({
        title: 'Importation réussie 🎉',
        description: `${rows.length} lignes importées pour la période ${selectedPeriod}.`,
      });

    } catch (error) {
      console.error('Erreur d\'importation:', error);
      // Mettre à jour le statut en 'failed' en cas d'erreur
      if (typeof error === 'object' && error !== null && 'id' in (error as any)) {
         await supabase.from('file_imports').update({ status: 'failed' }).eq('id', (error as any).id);
      }
      toast({
        title: 'Erreur d\'importation',
        description: error instanceof Error ? error.message : 'Une erreur inattendue est survenue lors du traitement du fichier.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [file, selectedPeriod, companyUser, user, toast, columnMapping]); // Ajout de columnMapping aux dépendances

  const downloadTemplate = () => {
    const template = [
      ['PERIODE', 'MATRICULE', 'NOM / PRENOM', 'CODE CAISSE', 'CCO', 'MONTANT'],
      [202412, 'EMP001', 'DUBOIS Marc', '001', '12345678', 2150.75],
      [202412, 'EMP002', 'MARTIN Sophie', '002', '87654321', 1800.00],
    ];
    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modele_Import');
    XLSX.writeFile(wb, 'modele_import_paie.xlsx');
  };

  // --- Rendu du composant ---
  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* En-tête de la page */}
        <div>
          <h1 className="text-3xl font-extrabold text-blue-900 mb-1">Importation Excel</h1>
          <p className="text-gray-600">
            Téléchargez et validez vos fichiers de données de paie.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Section Téléchargement */}
          <Card className="shadow-lg border-blue-100">
            <CardHeader className="bg-blue-50/50 p-6 rounded-t-lg border-b border-blue-100">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold text-blue-800">
                <Upload className="h-6 w-6 text-blue-600" />
                Importer un nouveau fichier
              </CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                Sélectionnez la période concernée et votre fichier Excel pour l'importation.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <label htmlFor="select-period" className="text-sm font-medium text-gray-800">
                  Période du fichier <span className="text-red-500">*</span>
                </label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger id="select-period" className="w-full border-blue-200 focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue placeholder="Sélectionnez une période (YYYYMM)" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {periodOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="file-upload" className="text-sm font-medium text-gray-800">
                  Fichier Excel <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50 hover:border-blue-500 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="block w-full h-full cursor-pointer">
                    <FileSpreadsheet className="h-12 w-12 mx-auto text-blue-500 mb-3" />
                    {file ? (
                      <p className="text-base font-semibold text-blue-800">{file.name}</p>
                    ) : (
                      <p className="text-sm text-gray-600">
                        Cliquez ici pour sélectionner un fichier <span className="font-semibold">.xlsx</span> ou <span className="font-semibold">.xls</span>
                      </p>
                    )}
                    {file && <p className="text-xs text-gray-500 mt-1">Fichier sélectionné : {file.name}</p>}
                  </label>
                </div>
              </div>

              <Button 
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
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
                    Importer le fichier
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Section Informations et Erreurs */}
          <div className="space-y-6">
            {validationErrors.length > 0 && (
              <Alert variant="destructive" className="border-red-400 bg-red-50 text-red-800 shadow-md">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <AlertTitle className="text-red-800 font-semibold">Erreur(s) de validation détectée(s) !</AlertTitle>
                <AlertDescription className="text-red-700 mt-2">
                  {validationErrors.map((err, i) => (
                    <div key={i} className="mt-2 p-2 border-l-2 border-red-500 pl-3">
                      <p className="font-medium">{err.message}</p>
                      {err.details && (
                        <ul className="text-sm mt-1 list-disc list-inside space-y-1">
                   
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
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
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
              Sélectionnez la période et téléversez votre fichier Excel
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
              <label className="text-sm font-medium">Fichier Excel</label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  {file ? (
                    <p className="text-sm font-medium">{file.name}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Cliquez pour sélectionner un fichier .xlsx
                    </p>
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
