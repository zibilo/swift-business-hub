import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileSpreadsheet, Upload, AlertTriangle, CheckCircle, Download, Loader2, Info, RefreshCw, X, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

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

interface UploadProgress {
  stage: 'parsing' | 'validating' | 'uploading' | 'saving' | 'complete';
  progress: number;
  message: string;
  totalRows?: number;
  processedRows?: number;
}

interface OngoingImport {
  id: string;
  filename: string;
  period: number;
  progress: number;
  stage: string;
  created_at: string;
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
  const [pendingUpdate, setPendingUpdate] = useState<{
    rows: ParsedRow[];
    historyCheck: { valid: boolean; isUpdate: boolean };
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    stage: 'parsing',
    progress: 0,
    message: 'En attente...',
  });
  const [ongoingImports, setOngoingImports] = useState<OngoingImport[]>([]);
  const [showOngoingImports, setShowOngoingImports] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Constantes de validation
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const VALID_EXTENSIONS = ['.xlsx', '.xls', '.xlsm', '.xlsb', '.csv', '.ods'];

  // Vérifier les importations en cours au chargement
  useEffect(() => {
    checkOngoingImports();
    
    // Vérifier périodiquement les importations en cours
    const interval = setInterval(checkOngoingImports, 5000);
    return () => clearInterval(interval);
  }, [companyUser]);

  const checkOngoingImports = async () => {
    if (!companyUser?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('file_imports')
        .select('id, filename, period, upload_progress, upload_stage, created_at')
        .eq('company_id', companyUser.company_id)
        .eq('status', 'uploading')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const ongoing = data.map(item => ({
          id: item.id,
          filename: item.filename,
          period: item.period,
          progress: item.upload_progress || 0,
          stage: item.upload_stage || 'uploading',
          created_at: item.created_at,
        }));
        setOngoingImports(ongoing);
        setShowOngoingImports(true);
      } else {
        setOngoingImports([]);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des imports en cours:', error);
    }
  };

  // Nettoyer les états après un succès
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        setIsSuccess(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

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

  const updateProgress = (stage: UploadProgress['stage'], progress: number, message: string, totalRows?: number, processedRows?: number) => {
    setUploadProgress({ stage, progress, message, totalRows, processedRows });
  };

  // ÉTAPE 1 : Vérifier la structure du fichier
  const validateStructure = (worksheet: XLSX.WorkSheet): { valid: boolean; headers?: string[] } => {
    updateProgress('validating', 10, 'Vérification de la structure...');
    
    const expectedColumns = ['MATRICULE', 'NOM', 'PRENOM', 'CODE CAISSE', 'CCO', 'MONTANT'];
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
    
    const hasPeriode = headers.includes('PERIODE') || headers.includes('PÉRIODE');
    if (!hasPeriode) {
      setValidationErrors([{
        type: 'structure',
        message: 'Structure du fichier incorrecte',
        details: ['Colonne manquante : PERIODE (ou PÉRIODE)'],
      }]);
      return { valid: false };
    }

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
    updateProgress('validating', 25, 'Validation des formats...');
    
    const periodeIndex = headers.findIndex(h => h === 'PERIODE' || h === 'PÉRIODE');
    const matriculeIndex = headers.findIndex(h => h === 'MATRICULE');
    const nomIndex = headers.findIndex(h => h === 'NOM');
    const prenomIndex = headers.findIndex(h => h === 'PRENOM');
    const codeCaisseIndex = headers.findIndex(h => h === 'CODE CAISSE');
    const ccoIndex = headers.findIndex(h => h === 'CCO');
    const montantIndex = headers.findIndex(h => h === 'MONTANT');

    const rows: ParsedRow[] = [];
    const formatErrors: string[] = [];
    const totalRows = data.length - 1;

    for (let i = 1; i < data.length; i++) {
      const row = data[i] as unknown[];
      const rowNum = i + 1;
      
      // Mise à jour progressive de la progression
      if (i % 100 === 0) {
        const progress = 25 + Math.floor((i / totalRows) * 15);
        updateProgress('validating', progress, `Validation des lignes... (${i}/${totalRows})`, totalRows, i);
      }
      
      if (!row || row.length === 0 || row.every(cell => !cell)) {
        continue;
      }

      let hasError = false;

      const periode = String(row[periodeIndex] ?? '').trim();
      const matricule = String(row[matriculeIndex] ?? '').trim();
      const nom = String(row[nomIndex] ?? '').trim();
      const prenom = String(row[prenomIndex] ?? '').trim();
      const codeCaisse = String(row[codeCaisseIndex] ?? '').trim();
      const cco = String(row[ccoIndex] ?? '').trim();
      const montantRaw = String(row[montantIndex] ?? '').trim();

      if (!/^\d{6}$/.test(periode)) {
        formatErrors.push(`Ligne ${rowNum} : PERIODE invalide "${periode}" (format requis : YYYYMM, exactement 6 chiffres)`);
        hasError = true;
      }

      if (!/^\d{7}$/.test(matricule)) {
        formatErrors.push(`Ligne ${rowNum} : MATRICULE invalide "${matricule}" (requis : exactement 7 chiffres)`);
        hasError = true;
      }

      if (!/^\d{3}$/.test(codeCaisse)) {
        formatErrors.push(`Ligne ${rowNum} : CODE CAISSE invalide "${codeCaisse}" (requis : exactement 3 chiffres)`);
        hasError = true;
      }

      if (!/^\d{1,7}$/.test(cco)) {
        formatErrors.push(`Ligne ${rowNum} : CCO invalide "${cco}" (requis : 1 à 7 chiffres)`);
        hasError = true;
      }

      const montantNum = Number(montantRaw);
      if (montantRaw === '' || isNaN(montantNum)) {
        formatErrors.push(`Ligne ${rowNum} : MONTANT invalide "${montantRaw}" (requis : nombre uniquement)`);
        hasError = true;
      }

      if (!nom || nom.length === 0) {
        formatErrors.push(`Ligne ${rowNum} : NOM requis (champ vide)`);
        hasError = true;
      }
      if (!prenom || prenom.length === 0) {
        formatErrors.push(`Ligne ${rowNum} : PRENOM requis (champ vide)`);
        hasError = true;
      }

      if (!hasError) {
        rows.push({
          periode: parseInt(periode),
          matricule,
          nom: nom.toUpperCase(),
          prenom: prenom.toUpperCase(),
          code_caisse: codeCaisse,
          cco,
          montant: montantNum,
          row_number: rowNum,
        });
      }
    }

    if (formatErrors.length > 0) {
      setValidationErrors([{
        type: 'format',
        message: `❌ Erreurs de format détectées (${formatErrors.length} erreur${formatErrors.length > 1 ? 's' : ''})`,
        details: [
          ...formatErrors.slice(0, 10),
          ...(formatErrors.length > 10 ? [`... et ${formatErrors.length - 10} autre(s) erreur(s)`] : []),
        ],
      }]);
      return { valid: false };
    }

    if (rows.length === 0) {
      setValidationErrors([{
        type: 'format',
        message: '❌ Aucune donnée valide trouvée dans le fichier',
        details: ['Le fichier ne contient aucune ligne de données valide.'],
      }]);
      return { valid: false };
    }

    return { valid: true, rows };
  };

  // ÉTAPE 3 : Vérifier les doublons internes
  const checkInternalDuplicates = (rows: ParsedRow[]): boolean => {
    updateProgress('validating', 45, 'Vérification des doublons...');
    
    const matriculeMap = new Map<string, number[]>();
    const ccoMap = new Map<string, number[]>();
    const duplicates: string[] = [];

    for (const row of rows) {
      if (!matriculeMap.has(row.matricule)) {
        matriculeMap.set(row.matricule, [row.row_number]);
      } else {
        matriculeMap.get(row.matricule)!.push(row.row_number);
      }

      if (!ccoMap.has(row.cco)) {
        ccoMap.set(row.cco, [row.row_number]);
      } else {
        ccoMap.get(row.cco)!.push(row.row_number);
      }
    }

    for (const [matricule, lineNumbers] of matriculeMap.entries()) {
      if (lineNumbers.length > 1) {
        duplicates.push(
          `⚠️ MATRICULE ${matricule} apparaît ${lineNumbers.length} fois (lignes ${lineNumbers.join(', ')})`
        );
      }
    }

    for (const [cco, lineNumbers] of ccoMap.entries()) {
      if (lineNumbers.length > 1) {
        duplicates.push(
          `⚠️ CCO ${cco} apparaît ${lineNumbers.length} fois (lignes ${lineNumbers.join(', ')})`
        );
      }
    }

    if (duplicates.length > 0) {
      setValidationErrors([{
        type: 'duplicate_internal',
        message: '❌ Doublon détecté dans le fichier — risque de double paiement',
        details: [
          'Les doublons suivants ont été détectés :',
          '',
          ...duplicates.slice(0, 10),
          ...(duplicates.length > 10 ? [`... et ${duplicates.length - 10} autre(s) doublon(s)`] : []),
          '',
          '💡 Vérifiez et corrigez le fichier avant de réimporter.',
        ],
      }]);
      return false;
    }

    return true;
  };

  const validatePeriod = (rows: ParsedRow[], selectedPeriod: number): boolean => {
    updateProgress('validating', 50, 'Vérification de la période...');
    
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

  // ÉTAPE 4 : Vérifier avec l'historique
  const checkHistoricalDuplicates = async (rows: ParsedRow[], period: number): Promise<{ valid: boolean; isUpdate: boolean }> => {
    updateProgress('validating', 60, 'Vérification de l\'historique...');
    
    if (!companyUser?.company_id) {
      setValidationErrors([{
        type: 'update_detected',
        message: 'Erreur: Informations entreprise manquantes',
      }]);
      return { valid: false, isUpdate: false };
    }

    try {
      const { data: previousImports, error: importsError } = await supabase
        .from('file_imports')
        .select('id, row_count, filename, created_at')
        .eq('company_id', companyUser.company_id)
        .eq('period', period)
        .in('status', ['pending', 'validated'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (importsError) {
        console.error('Erreur lors de la récupération des imports:', importsError);
        setValidationErrors([{
          type: 'duplicate_file',
          message: 'Erreur lors de la vérification de l\'historique',
          details: [importsError.message],
        }]);
        return { valid: false, isUpdate: false };
      }

      if (!previousImports || previousImports.length === 0) {
        console.log('✅ Nouveau fichier - aucun historique trouvé pour cette période');
        return { valid: true, isUpdate: false };
      }

      const lastImport = previousImports[0];
      console.log('📄 Fichier précédent trouvé:', {
        id: lastImport.id,
        filename: lastImport.filename,
        rows: lastImport.row_count,
        date: lastImport.created_at,
      });

      const { data: existingRows, error: rowsError } = await supabase
        .from('file_import_rows')
        .select('periode, matricule, nom_prenom, code_caisse, cco, montant')
        .eq('file_import_id', lastImport.id)
        .order('matricule', { ascending: true });

      if (rowsError) {
        console.error('Erreur lors de la récupération des lignes:', rowsError);
        setValidationErrors([{
          type: 'duplicate_file',
          message: 'Erreur lors de la vérification de l\'historique',
          details: [rowsError.message],
        }]);
        return { valid: false, isUpdate: false };
      }

      if (!existingRows || existingRows.length === 0) {
        console.log('✅ Nouveau fichier - aucune ligne trouvée dans l\'historique');
        return { valid: true, isUpdate: false };
      }

      const createSignature = (r: any) => {
        return `${r.periode}|${r.matricule}|${r.nom_prenom}|${r.code_caisse}|${r.cco}|${r.montant}`;
      };

      const sortedCurrentRows = [...rows].sort((a, b) => a.matricule.localeCompare(b.matricule));

      const previousSignatures = new Set(
        existingRows.map(r => createSignature({
          periode: r.periode,
          matricule: r.matricule,
          nom_prenom: r.nom_prenom,
          code_caisse: r.code_caisse,
          cco: r.cco,
          montant: r.montant,
        }))
      );

      const isIdentical = 
        rows.length === existingRows.length &&
        sortedCurrentRows.every(r => previousSignatures.has(createSignature({
          periode: r.periode,
          matricule: r.matricule,
          nom_prenom: `${r.nom} ${r.prenom}`,
          code_caisse: r.code_caisse,
          cco: r.cco,
          montant: r.montant,
        })));

      if (isIdentical) {
        console.log('❌ Fichier identique détecté - Import rejeté');
        setValidationErrors([{
          type: 'duplicate_file',
          message: '❌ Ce fichier a déjà été transmis. Aucune mise à jour détectée.',
          details: [
            `Fichier précédent: ${lastImport.filename}`,
            `Date de transmission: ${new Date(lastImport.created_at).toLocaleString('fr-FR')}`,
            `Nombre de lignes: ${existingRows.length}`,
            '⚠️ Le fichier est strictement identique au précédent.',
            '💡 Si vous souhaitez corriger des données, modifiez le fichier puis réimportez-le.',
          ],
        }]);
        return { valid: false, isUpdate: false };
      }

      console.log('🔄 Modifications détectées dans le fichier');

      const differences: string[] = [];
      const existingMatricules = new Set(existingRows.map(r => r.matricule));
      const newRows = sortedCurrentRows.filter(r => !existingMatricules.has(r.matricule));
      const currentMatricules = new Set(sortedCurrentRows.map(r => r.matricule));
      const deletedRows = existingRows.filter(r => !currentMatricules.has(r.matricule));
      const modifiedRows = sortedCurrentRows.filter(currentRow => {
        const currentSig = createSignature({
          periode: currentRow.periode,
          matricule: currentRow.matricule,
          nom_prenom: `${currentRow.nom} ${currentRow.prenom}`,
          code_caisse: currentRow.code_caisse,
          cco: currentRow.cco,
          montant: currentRow.montant,
        });
        return existingMatricules.has(currentRow.matricule) && !previousSignatures.has(currentSig);
      });

      if (newRows.length > 0) {
        differences.push(`➕ ${newRows.length} nouvelle(s) ligne(s) ajoutée(s)`);
      }
      if (deletedRows.length > 0) {
        differences.push(`➖ ${deletedRows.length} ligne(s) supprimée(s)`);
      }
      if (modifiedRows.length > 0) {
        differences.push(`✏️ ${modifiedRows.length} ligne(s) modifiée(s)`);
      }

      setUpdateDetected(true);
      setValidationErrors([{
        type: 'update_detected',
        message: '🔄 Mise à jour détectée',
        details: [
          `Fichier précédent: ${lastImport.filename}`,
          `Date: ${new Date(lastImport.created_at).toLocaleString('fr-FR')}`,
          `Anciennes lignes: ${existingRows.length}`,
          `Nouvelles lignes: ${rows.length}`,
          '',
          '📊 Modifications détectées:',
          ...differences,
          '',
          '✅ Cliquez sur "Confirmer et envoyer la mise à jour" pour continuer.',
        ],
      }]);

      return { valid: true, isUpdate: true };

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
      if (!VALID_EXTENSIONS.includes(fileExtension)) {
        toast({
          title: 'Format non supporté',
          description: `Formats acceptés: ${VALID_EXTENSIONS.join(', ')}`,
          variant: 'destructive',
        });
        return;
      }

      if (selectedFile.size > MAX_FILE_SIZE) {
        toast({
          title: 'Fichier trop volumineux',
          description: `La taille maximale est 10MB. Votre fichier fait ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`,
          variant: 'destructive',
        });
        return;
      }

      setValidationErrors([]);
      setIsSuccess(false);
      setUpdateDetected(false);
      setPendingUpdate(null);
      setUploadProgress({ stage: 'parsing', progress: 0, message: 'Fichier sélectionné' });
      
      setTimeout(() => {
        setFile(selectedFile);
      }, 0);
    }
  };

  // Fonction pour effectuer l'import avec suivi de progression
  const performImport = async (rows: ParsedRow[], historyCheck: { valid: boolean; isUpdate: boolean }) => {
    if (!file || !companyUser?.company_id || !user || !selectedPeriod) return;

    try {
      setIsUploading(true);
      updateProgress('uploading', 70, 'Téléversement du fichier...');

      const storagePath = `${companyUser.company_id}/${Date.now()}_${file.name}`;
      
      console.log('🔄 Tentative de téléversement vers Supabase Storage:', {
        bucket: 'excel-imports',
        path: storagePath,
        fileSize: `${(file.size / 1024).toFixed(2)} KB`,
        fileType: file.type,
        companyId: companyUser.company_id,
      });

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('excel-imports')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('❌ Erreur de téléversement:', uploadError);
        
        let errorMessage = '';
        let errorDetails: string[] = [];
        
        if (uploadError.message?.toLowerCase().includes('bucket')) {
          errorMessage = '❌ Le bucket "excel-imports" n\'existe pas dans Supabase Storage';
          errorDetails = [
            '📝 Action requise dans Supabase Dashboard:',
            '1. Allez dans Storage',
            '2. Cliquez sur "New bucket"',
            '3. Nom: excel-imports',
            '4. Public: Non (privé)',
            '5. Créez le bucket',
            '6. Configurez les politiques RLS (Row Level Security)',
          ];
        } else if (uploadError.message?.toLowerCase().includes('permission') || uploadError.message?.toLowerCase().includes('policy')) {
          errorMessage = '❌ Permissions insuffisantes - Politiques RLS manquantes';
          errorDetails = [
            '📝 Action requise dans Supabase Dashboard:',
            '1. Allez dans Storage > excel-imports',
            '2. Cliquez sur "Policies"',
            '3. Ajoutez une politique pour INSERT',
            '4. Exemple: authenticated users can upload',
            `5. Vérifiez que l'utilisateur ${user.id} a les droits`,
          ];
        } else if (uploadError.message?.toLowerCase().includes('size') || uploadError.message?.toLowerCase().includes('large')) {
          errorMessage = '❌ Fichier trop volumineux';
          errorDetails = [
            `Taille actuelle: ${(file.size / 1024 / 1024).toFixed(2)} MB`,
            'Limite: 10 MB',
            'Réduisez la taille du fichier ou contactez l\'administrateur',
          ];
        } else if (uploadError.message?.toLowerCase().includes('auth')) {
          errorMessage = '❌ Session expirée ou non authentifié';
          errorDetails = [
            'Déconnectez-vous et reconnectez-vous',
            'Puis réessayez l\'import',
          ];
        } else {
          errorMessage = `❌ Erreur de téléversement: ${uploadError.message}`;
          errorDetails = [
            'Code d\'erreur: ' + (uploadError.statusCode || 'N/A'),
            'Message: ' + uploadError.message,
            'Contactez le support technique',
          ];
        }
        
        setValidationErrors([{
          type: 'upload',
          message: errorMessage,
          details: errorDetails,
        }]);
        
        setIsUploading(false);
        updateProgress('parsing', 0, 'Erreur lors du téléversement');
        return;
      }

      console.log('✅ Téléversement réussi:', uploadData);
      updateProgress('saving', 80, 'Enregistrement des données...');

      // Créer l'enregistrement d'import avec progression
      const { data: importData, error: importError } = await supabase
        .from('file_imports')
        .insert({
          company_id: companyUser.company_id,
          filename: file.name,
          storage_path: storagePath,
          period: parseInt(selectedPeriod),
          selected_period: parseInt(selectedPeriod),
          status: 'uploading',
          uploaded_by: user.id,
          row_count: rows.length,
          upload_progress: 80,
          upload_stage: 'saving',
        })
        .select()
        .single();

      if (importError) {
        console.error('Erreur lors de la création de l\'enregistrement:', importError);
        throw new Error(`Erreur lors de la création du dossier d'import: ${importError.message}`);
      }

      updateProgress('saving', 85, 'Importation des lignes...');

      // Insérer les lignes par batch pour performance
      const batchSize = 500;
      const totalBatches = Math.ceil(rows.length / batchSize);
      
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const currentBatch = Math.floor(i / batchSize) + 1;
        
        updateProgress('saving', 85 + Math.floor((currentBatch / totalBatches) * 10), 
          `Importation des lignes... (${i + batch.length}/${rows.length})`,
          rows.length,
          i + batch.length
        );

        const rowsToInsert = batch.map(row => ({
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
      }

      updateProgress('saving', 95, 'Finalisation...');

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

      // Marquer comme validé avec progression à 100%
      const { error: updateError } = await supabase
        .from('file_imports')
        .update({ 
          status: 'validated',
          upload_progress: 100,
          upload_stage: 'complete',
        })
        .eq('id', importData.id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour du statut:', updateError);
      }

      updateProgress('complete', 100, 'Importation terminée avec succès!', rows.length, rows.length);

      setTimeout(() => {
        setIsUploading(false);
        setIsSuccess(true);
        setFile(null);
        setSelectedPeriod('');
        setPendingUpdate(null);
        setUpdateDetected(false);
        setUploadProgress({ stage: 'parsing', progress: 0, message: 'En attente...' });
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        toast({
          title: historyCheck.isUpdate ? '✅ Mise à jour transmise avec succès' : '✅ Import réussi',
          description: `${rows.length} ligne(s) importée(s) avec succès`,
        });
      }, 500);

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
      setIsUploading(false);
      updateProgress('parsing', 0, 'Erreur lors de l\'importation');
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
    setPendingUpdate(null);
    updateProgress('parsing', 5, 'Lecture du fichier...');

    try {
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

      const structureValidation = validateStructure(worksheet);
      if (!structureValidation.valid || !structureValidation.headers) {
        setIsUploading(false);
        updateProgress('parsing', 0, 'Erreur de validation');
        return;
      }

      const formatValidation = validateFieldFormats(data, structureValidation.headers);
      if (!formatValidation.valid || !formatValidation.rows) {
        setIsUploading(false);
        updateProgress('parsing', 0, 'Erreur de validation');
        return;
      }

      const rows = formatValidation.rows;

      const periodValid = validatePeriod(rows, parseInt(selectedPeriod));
      if (!periodValid) {
        setIsUploading(false);
        updateProgress('parsing', 0, 'Erreur de validation');
        return;
      }

      const noDuplicatesInternal = checkInternalDuplicates(rows);
      if (!noDuplicatesInternal) {
        setIsUploading(false);
        updateProgress('parsing', 0, 'Erreur de validation');
        return;
      }

      const historyCheck = await checkHistoricalDuplicates(rows, parseInt(selectedPeriod));
      if (!historyCheck.valid) {
        setIsUploading(false);
        updateProgress('parsing', 0, 'Erreur de validation');
        return;
      }

      if (historyCheck.isUpdate) {
        setPendingUpdate({ rows, historyCheck });
        setIsUploading(false);
        updateProgress('parsing', 0, 'En attente de confirmation');
        return;
      }

      await performImport(rows, historyCheck);

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
      setIsUploading(false);
      updateProgress('parsing', 0, 'Erreur');
    }
  }, [file, selectedPeriod, companyUser, user, toast]);

  const handleConfirmUpdate = useCallback(async () => {
    if (!pendingUpdate) return;
    await performImport(pendingUpdate.rows, pendingUpdate.historyCheck);
  }, [pendingUpdate]);

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
    
    toast({
      title: '✅ Modèle téléchargé',
      description: 'Le fichier modele_import.xlsx a été téléchargé',
    });
  };

  const getProgressColor = () => {
    if (uploadProgress.stage === 'complete') return 'bg-green-500';
    if (uploadProgress.stage === 'uploading' || uploadProgress.stage === 'saving') return 'bg-blue-500';
    return 'bg-primary';
  };

  const getStageIcon = (stage: UploadProgress['stage']) => {
    switch (stage) {
      case 'parsing': return <FileSpreadsheet className="h-4 w-4" />;
      case 'validating': return <AlertTriangle className="h-4 w-4" />;
      case 'uploading': return <Upload className="h-4 w-4" />;
      case 'saving': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'complete': return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Import Excel
              </h1>
              <p className="text-slate-600 mt-1">
                Importez vos fichiers de données de paie en toute sécurité
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Badge variant="outline" className="gap-2">
                <TrendingUp className="h-3 w-3" />
                Validation en 4 étapes
              </Badge>
            </div>
          </div>
        </div>

        {/* Ongoing Imports Alert */}
        {showOngoingImports && ongoingImports.length > 0 && (
          <Alert className="bg-blue-50 border-blue-200">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900">Importations en cours</AlertTitle>
            <AlertDescription>
              <div className="space-y-2 mt-2">
                {ongoingImports.map(imp => (
                  <div key={imp.id} className="bg-white rounded-lg p-3 border border-blue-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm text-slate-900">{imp.filename}</p>
                        <p className="text-xs text-slate-500">
                          Période: {String(imp.period).slice(4)}/{String(imp.period).slice(0, 4)}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {imp.progress}%
                      </Badge>
                    </div>
                    <Progress value={imp.progress} className="h-2" />
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => setShowOngoingImports(false)}
              >
                Masquer
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upload Form Card */}
          <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-white/20 hover:shadow-xl transition-all duration-300">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                  <Upload className="h-5 w-5 text-white" />
                </div>
                Nouveau fichier
              </CardTitle>
              <CardDescription>
                Sélectionnez la période et téléversez votre fichier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Period Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  📅 Période de paie
                </label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod} disabled={isUploading}>
                  <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
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

              {/* File Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  📄 Fichier Excel ou CSV
                </label>
                <div className="relative group">
                  <div className={`
                    border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
                    ${file 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50'
                    }
                    ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={VALID_EXTENSIONS.join(',')}
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      disabled={isUploading}
                    />
                    <label 
                      htmlFor="file-upload" 
                      className={isUploading ? 'cursor-not-allowed' : 'cursor-pointer'}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className={`
                          p-4 rounded-full transition-all duration-300
                          ${file 
                            ? 'bg-blue-500 group-hover:bg-blue-600' 
                            : 'bg-slate-200 group-hover:bg-blue-500'
                          }
                        `}>
                          <FileSpreadsheet className={`
                            h-8 w-8 transition-colors
                            ${file ? 'text-white' : 'text-slate-600 group-hover:text-white'}
                          `} />
                        </div>
                        {file ? (
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-blue-900">{file.name}</p>
                            <p className="text-xs text-blue-600">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-700">
                              Cliquez pour sélectionner un fichier
                            </p>
                            <p className="text-xs text-slate-500">
                              {VALID_EXTENSIONS.join(', ')} • Max 10MB
                            </p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {isUploading && (
                <div className="space-y-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
                      {getStageIcon(uploadProgress.stage)}
                      <span>{uploadProgress.message}</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600">
                      {uploadProgress.progress}%
                    </span>
                  </div>
                  <Progress 
                    value={uploadProgress.progress} 
                    className="h-2.5"
                  />
                  {uploadProgress.totalRows && (
                    <p className="text-xs text-slate-600 text-center">
                      {uploadProgress.processedRows || 0} / {uploadProgress.totalRows} lignes traitées
                    </p>
                  )}
                </div>
              )}

              {/* Upload Button */}
              <Button 
                className={`
                  w-full h-12 text-base font-semibold
                  bg-gradient-to-r from-blue-600 to-indigo-600 
                  hover:from-blue-700 hover:to-indigo-700
                  shadow-lg hover:shadow-xl
                  transition-all duration-300
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                onClick={handleUpload} 
                disabled={!file || !selectedPeriod || isUploading || !!pendingUpdate}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Traitement en cours...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-2" />
                    Lancer l'importation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Info and Errors Column */}
          <div className="space-y-4">
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <Alert 
                variant={validationErrors[0].type === 'update_detected' ? 'default' : 'destructive'} 
                className={`
                  ${validationErrors[0].type === 'update_detected' 
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50' 
                    : 'bg-red-50 border-red-200'
                  }
                  shadow-lg
                `}
              >
                {validationErrors[0].type === 'update_detected' ? (
                  <Info className="h-4 w-4 text-blue-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <AlertTitle className={`font-bold ${
                  validationErrors[0].type === 'update_detected' 
                    ? 'text-blue-900' 
                    : 'text-red-900'
                }`}>
                  {validationErrors[0].type === 'update_detected' 
                    ? '🔄 Mise à jour détectée' 
                    : '⚠️ Erreur de validation'
                  }
                </AlertTitle>
                <AlertDescription>
                  {validationErrors.map((err, i) => (
                    <div key={`error-${err.type}-${i}`} className="mt-2">
                      <p className="font-medium">{err.message}</p>
                      {err.details && err.details.length > 0 && (
                        <ul className="text-sm mt-3 space-y-1 pl-4">
                          {err.details.map((d, j) => (
                            <li 
                              key={`detail-${i}-${j}`}
                              className={`
                                ${d.startsWith('📊') || d.startsWith('✅') ? 'font-semibold mt-2' : ''}
                                ${d === '' ? 'h-2' : ''}
                              `}
                            >
                              {d}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                  {validationErrors[0].type === 'update_detected' && pendingUpdate && (
                    <Button 
                      className="mt-4 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                      onClick={handleConfirmUpdate}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Confirmer et envoyer la mise à jour
                        </>
                      )}
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Success Message */}
            {isSuccess && (
              <Alert className="border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-900 font-bold">✅ Import réussi</AlertTitle>
                <AlertDescription className="text-green-700">
                  Votre fichier a été traité avec succès. Les données sont maintenant disponibles.
                </AlertDescription>
              </Alert>
            )}

            {/* Format Info Card */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
                    <Info className="h-4 w-4 text-white" />
                  </div>
                  Format attendu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 text-sm">
                  {[
                    { label: 'PÉRIODE', desc: 'Format YYYYMM (ex: 202501)', icon: '📅' },
                    { label: 'MATRICULE', desc: '7 chiffres (ex: 5119788)', icon: '🔢' },
                    { label: 'NOM', desc: 'Nom du salarié', icon: '👤' },
                    { label: 'PRENOM', desc: 'Prénom du salarié', icon: '👤' },
                    { label: 'CODE CAISSE', desc: '3 chiffres (ex: 249)', icon: '🏦' },
                    { label: 'CCO', desc: '1 à 7 chiffres (ex: 023467)', icon: '🔑' },
                    { label: 'MONTANT', desc: 'Nombre entier (ex: 10987777)', icon: '💰' },
                  ].map((field, idx) => (
                    <div 
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 hover:from-blue-50 hover:to-indigo-50 transition-all duration-200"
                    >
                      <span className="text-lg">{field.icon}</span>
                      <div>
                        <p className="font-semibold text-slate-900">{field.label}</p>
                        <p className="text-xs text-slate-600">{field.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-900">
                      <strong>Validation en 4 étapes:</strong> Structure → Formats → Doublons internes → Historique
                    </p>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
                  onClick={downloadTemplate}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger le modèle
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportExcel;
