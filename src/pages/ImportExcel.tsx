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
  const [updateDetected, setUpdateDetected] = useState(false);

  // Constantes de validation
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const VALID_EXTENSIONS = ['.xlsx', '.xls', '.xlsm', '.xlsb', '.csv', '.ods'];

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
    const expectedColumns = ['PÉRIODE', 'MATRICULE', 'NOM', 'PRENOM', 'CODE CAISSE', 'CCO', 'MONTANT'];
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

    return { valid: true, headers };
  };

  // ÉTAPE 2 : Valider les formats des champs
  const validateFieldFormats = (data: unknown[][], headers: string[]): { valid: boolean; rows?: ParsedRow[] } => {
    const periodeIndex = headers.findIndex(h => h === 'PÉRIODE');
    const matriculeIndex = headers.findIndex(h => h === 'MATRICULE');
    const nomIndex = headers.findIndex(h => h === 'NOM');
    const prenomIndex = headers.findIndex(h => h === 'PRENOM');
    const codeCaisseIndex = headers.findIndex(h => h === 'CODE CAISSE');
    const ccoIndex = headers.findIndex(h => h === 'CCO');
    const montantIndex = headers.findIndex(h => h === 'MONTANT');

    const rows: ParsedRow[] = [];
    const formatErrors: string[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i] as unknown[];
      
      if (!row[periodeIndex] || !row[matriculeIndex] || !row[nomIndex] || !row[prenomIndex] || 
          !row[codeCaisseIndex] || !row[ccoIndex] || !row[montantIndex]) {
        formatErrors.push(`Ligne ${i + 1}: Champs manquants`);
        continue;
      }

      const periode = parseInt(String(row[periodeIndex]));
      const montant = parseInt(String(row[montantIndex]));

      if (isNaN(periode) || String(periode).length !== 6) {
        formatErrors.push(`Ligne ${i + 1}: Format de période invalide (YYYYMM attendu)`);
        continue;
      }

      if (isNaN(montant)) {
        formatErrors.push(`Ligne ${i + 1}: Montant invalide`);
        continue;
      }

      rows.push({
        periode,
        matricule: String(row[matriculeIndex]).trim(),
        nom: String(row[nomIndex]).trim().toUpperCase(),
        prenom: String(row[prenomIndex]).trim().toUpperCase(),
        code_caisse: String(row[codeCaisseIndex]).trim(),
        cco: String(row[ccoIndex]).trim(),
        montant,
        row_number: i + 1,
      });
    }

    if (formatErrors.length > 0) {
      setValidationErrors([{
        type: 'format',
        message: 'Erreurs de format détectées',
        details: formatErrors.slice(0, 20),
      }]);
      return { valid: false };
    }

    if (rows.length === 0) {
      setValidationErrors([{
        type: 'format',
        message: 'Aucune donnée valide trouvée',
      }]);
      return { valid: false };
    }

    return { valid: true, rows };
  };

  // ÉTAPE 3 : Vérifier les doublons internes
  const checkInternalDuplicates = (rows: ParsedRow[]): boolean => {
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const row of rows) {
      const key = `${row.periode}-${row.matricule}`;
      if (seen.has(key)) {
        duplicates.push(`Ligne ${row.row_number}: Doublon détecté (${row.matricule})`);
      }
      seen.add(key);
    }

    if (duplicates.length > 0) {
      setValidationErrors([{
        type: 'duplicate_internal',
        message: 'Doublons détectés dans le fichier',
        details: duplicates.slice(0, 20),
      }]);
      return false;
    }

    return true;
  };

  // ÉTAPE 4 : Vérifier avec l'historique
  const checkHistoricalDuplicates = async (rows: ParsedRow[], period: number): Promise<{ valid: boolean; isUpdate: boolean }> => {
    if (!companyUser?.company_id) {
      setValidationErrors([{
        type: 'update_detected',
        message: 'Erreur: Informations entreprise manquantes',
      }]);
      return { valid: false, isUpdate: false };
    }

    try {
      const { data: existingRows, error } = await supabase
        .from('file_import_rows')
        .select('periode, matricule')
        .eq('periode', period);

      if (error) {
        console.error('Erreur lors de la vérification des doublons:', error);
        setValidationErrors([{
          type: 'duplicate_file',
          message: 'Erreur lors de la vérification de l\'historique',
          details: [error.message],
        }]);
        return { valid: false, isUpdate: false };
      }

      const existingSet = new Set(existingRows?.map(r => `${r.periode}-${r.matricule}`) || []);
      const duplicates = rows.filter(r => existingSet.has(`${r.periode}-${r.matricule}`));

      if (duplicates.length > 0) {
        setUpdateDetected(true);
        return { valid: true, isUpdate: true };
      }

      return { valid: true, isUpdate: false };
    } catch (error) {
      console.error('Erreur non attendue lors de la vérification:', error);
      setValidationErrors([{
        type: 'duplicate_file',
        message: 'Erreur lors de la vérification de l\'historique',
        details: [error instanceof Error ? error.message : 'Erreur inconnue'],
      }]);
      return { valid: false, isUpdate: false };
    }
  };
  

  const validatePeriod = (rows: ParsedRow[], selectedPeriod: number): boolean => {
    const invalidPeriods = rows.filter(r => r.periode !== selectedPeriod);

    if (invalidPeriods.length > 0) {
      setValidationErrors([{
        type: 'period',
        message: 'Période incohérente détectée',
        details: [
          `La période sélectionnée est ${String(selectedPeriod).slice(0, 4)}-${String(selectedPeriod).slice(4)}`,
          `Mais le fichier contient des données de période différente`,
        ],
      }]);
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validation de l'extension
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
      if (!VALID_EXTENSIONS.includes(fileExtension)) {
        toast({
          title: 'Format non supporté',
          description: `Formats acceptés: ${VALID_EXTENSIONS.join(', ')}`,
          variant: 'destructive',
        });
        return;
      }

      // Validation de la taille
      if (selectedFile.size > MAX_FILE_SIZE) {
        toast({
          title: 'Fichier trop volumineux',
          description: `La taille maximale est 10MB. Votre fichier fait ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`,
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

      // Téléverser le fichier avec meilleure gestion d'erreurs
      const storagePath = `${companyUser.company_id}/${Date.now()}_${file.name}`;
      
      try {
        const { error: uploadError } = await supabase.storage
          .from('excel-imports')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Erreur détaillée du téléversement:', uploadError);
          
          // Messages d'erreur personnalisés selon le type d'erreur
          let errorMessage = 'Erreur lors du téléversement du fichier';
          
          if (uploadError.message?.includes('Bucket not found')) {
            errorMessage = 'Le bucket de stockage n\'existe pas. Contactez l\'administrateur.';
          } else if (uploadError.message?.includes('Permission denied')) {
            errorMessage = 'Permissions insuffisantes pour téléverser. Contactez l\'administrateur.';
          } else if (uploadError.message?.includes('Payload too large')) {
            errorMessage = 'Le fichier est trop volumineux.';
          } else {
            errorMessage = `${errorMessage}: ${uploadError.message || 'Erreur inconnue'}`;
          }
          
          throw new Error(errorMessage);
        }
      } catch (uploadError) {
        console.error('Erreur réseau ou serveur lors du téléversement:', uploadError);
        throw new Error(
          uploadError instanceof Error 
            ? uploadError.message 
            : 'Erreur lors du téléversement du fichier'
        );
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
          status: 'pending',
          uploaded_by: user.id,
          row_count: rows.length,
        })
        .select()
        .single();

      if (importError) {
        console.error('Erreur lors de la création de l\'enregistrement:', importError);
        throw new Error(`Erreur lors de la création du dossier d'import: ${importError.message}`);
      }

      // Insérer les lignes - SANS company_id
      const rowsToInsert = rows.map(row => ({
        file_import_id: importData.id,
        periode: row.periode,
        matricule: row.matricule,
        nom_prenom: `${row.nom} ${row.prenom}`,
        code_caisse: row.code_caisse,
        cco: row.cco,
        montant: row.montant,
        row_number: row.row_number,
      }));

      const { error: rowsError } = await supabase
        .from('file_import_rows')
        .insert(rowsToInsert);

      if (rowsError) {
        console.error('Erreur lors de l\'insertion des lignes:', rowsError);
        throw new Error(`Erreur lors de l'importation des lignes: ${rowsError.message}`);
      }

      // Mettre à jour les références employés
      const { data: existingRefs, error: refError } = await supabase
        .from('employee_references')
        .select('matricule')
        .eq('company_id', companyUser.company_id);

      if (refError) {
        console.error('Erreur lors de la vérification des références:', refError);
      }

      const existingMatricules = new Set(existingRefs?.map(r => r.matricule) || []);
      const newEmployees = rows.filter(r => !existingMatricules.has(r.matricule));

      if (newEmployees.length > 0) {
        const { error: empError } = await supabase.from('employee_references').insert(
          newEmployees.map(e => ({
            company_id: companyUser.company_id,
            matricule: e.matricule,
            nom_prenom: `${e.nom} ${e.prenom}`,
            code_caisse: e.code_caisse,
            cco: e.cco,
            first_seen_file_id: importData.id,
          }))
        );
        
        if (empError) {
          console.error('Erreur lors de la création des références employés:', empError);
        }
      }

      // Marquer comme validé
      const { error: updateError } = await supabase
        .from('file_imports')
        .update({ status: 'validated' })
        .eq('id', importData.id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour du statut:', updateError);
      }

      setIsSuccess(true);
      setFile(null);
      setSelectedPeriod('');
      
      toast({
        title: historyCheck.isUpdate ? 'Mise à jour détectée — fichier transmis' : 'Succès',
        description: `${rows.length} ligne(s) importée(s) avec succès`,
      });

    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      setValidationErrors([{
        type: 'upload',
        message: error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'import',
      }]);
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
      ['PÉRIODE', 'MATRICULE', 'NOM', 'PRENOM', 'CODE CAISSE', 'CCO', 'MONTANT'],
      [202501, '5119788', 'DUPONT', 'Jean', '249', '023467', 10987777],
      [202501, '4523891', 'MARTIN', 'Marie', '249', '045678', 8500000],
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
                  accept={VALID_EXTENSIONS.join(',')}
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
                        Formats acceptés: {VALID_EXTENSIONS.join(', ')} (Max 10MB)
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
                        {err.details.length > 20 && (
                          <li className="text-muted-foreground">... et {err.details.length - 20} autre(s) erreur(s)</li>
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
                <p><strong>CODE CAISSE</strong> - 3 chiffres (ex: 249)</p>
                <p><strong>CCO</strong> - 6 chiffres (ex: 023467)</p>
                <p><strong>MONTANT</strong> - Nombre entier (ex: 10987777)</p>
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
