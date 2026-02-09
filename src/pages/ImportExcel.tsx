import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileSpreadsheet, Upload, AlertTriangle, CheckCircle, Download, Loader2, Info, RefreshCw } from 'lucide-react';
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
  const [pendingUpdate, setPendingUpdate] = useState<{
    rows: ParsedRow[];
    historyCheck: { valid: boolean; isUpdate: boolean };
  } | null>(null);

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
    const expectedColumns = ['PERIODE', 'MATRICULE', 'NOM', 'PRENOM', 'CODE CAISSE', 'CCO', 'MONTANT'];
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

  // ÉTAPE 2 : Valider les formats des champs (STRICTEMENT)
  const validateFieldFormats = (data: unknown[][], headers: string[]): { valid: boolean; rows?: ParsedRow[] } => {
    const periodeIndex = headers.findIndex(h => h === 'PERIODE');
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
      const rowNum = i + 1;
      
      // Vérifier que la ligne n'est pas vide
      if (!row || row.length === 0 || row.every(cell => !cell)) {
        continue; // Ignorer les lignes vides
      }

      let hasError = false;

      // Extraire et nettoyer les valeurs
      const periode = String(row[periodeIndex] ?? '').trim();
      const matricule = String(row[matriculeIndex] ?? '').trim();
      const nom = String(row[nomIndex] ?? '').trim();
      const prenom = String(row[prenomIndex] ?? '').trim();
      const codeCaisse = String(row[codeCaisseIndex] ?? '').trim();
      const cco = String(row[ccoIndex] ?? '').trim();
      const montantRaw = String(row[montantIndex] ?? '').trim();

      // VALIDATION STRICTE : PÉRIODE (exactement 6 chiffres, format YYYYMM)
      if (!/^\d{6}$/.test(periode)) {
        formatErrors.push(`Ligne ${rowNum} : PERIODE invalide "${periode}" (format requis : YYYYMM, exactement 6 chiffres)`);
        hasError = true;
      }

      // VALIDATION STRICTE : MATRICULE (exactement 7 chiffres)
      if (!/^\d{7}$/.test(matricule)) {
        formatErrors.push(`Ligne ${rowNum} : MATRICULE invalide "${matricule}" (requis : exactement 7 chiffres)`);
        hasError = true;
      }

      // VALIDATION STRICTE : CODE CAISSE (exactement 3 chiffres)
      if (!/^\d{3}$/.test(codeCaisse)) {
        formatErrors.push(`Ligne ${rowNum} : CODE CAISSE invalide "${codeCaisse}" (requis : exactement 3 chiffres)`);
        hasError = true;
      }

      // VALIDATION STRICTE : CCO (exactement 6 chiffres)
      if (!/^\d{6}$/.test(cco)) {
        formatErrors.push(`Ligne ${rowNum} : CCO invalide "${cco}" (requis : exactement 6 chiffres)`);
        hasError = true;
      }

      // VALIDATION STRICTE : MONTANT (nombre uniquement, entier ou décimal)
      const montantNum = Number(montantRaw);
      if (montantRaw === '' || isNaN(montantNum)) {
        formatErrors.push(`Ligne ${rowNum} : MONTANT invalide "${montantRaw}" (requis : nombre uniquement)`);
        hasError = true;
      }

      // VALIDATION : NOM et PRENOM (non vides)
      if (!nom || nom.length === 0) {
        formatErrors.push(`Ligne ${rowNum} : NOM requis (champ vide)`);
        hasError = true;
      }
      if (!prenom || prenom.length === 0) {
        formatErrors.push(`Ligne ${rowNum} : PRENOM requis (champ vide)`);
        hasError = true;
      }

      // Si pas d'erreur, ajouter la ligne
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

  // ÉTAPE 3 : Vérifier les doublons internes (MATRICULE et CCO)
  const checkInternalDuplicates = (rows: ParsedRow[]): boolean => {
    const matriculeMap = new Map<string, number[]>();
    const ccoMap = new Map<string, number[]>();
    const duplicates: string[] = [];

    // Parcourir toutes les lignes pour détecter les doublons
    for (const row of rows) {
      // Vérifier les doublons de MATRICULE
      if (!matriculeMap.has(row.matricule)) {
        matriculeMap.set(row.matricule, [row.row_number]);
      } else {
        matriculeMap.get(row.matricule)!.push(row.row_number);
      }

      // Vérifier les doublons de CCO
      if (!ccoMap.has(row.cco)) {
        ccoMap.set(row.cco, [row.row_number]);
      } else {
        ccoMap.get(row.cco)!.push(row.row_number);
      }
    }

    // Collecter les doublons de MATRICULE
    for (const [matricule, lineNumbers] of matriculeMap.entries()) {
      if (lineNumbers.length > 1) {
        duplicates.push(
          `⚠️ MATRICULE ${matricule} apparaît ${lineNumbers.length} fois (lignes ${lineNumbers.join(', ')})`
        );
      }
    }

    // Collecter les doublons de CCO
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
    if (!companyUser?.company_id) {
      setValidationErrors([{
        type: 'update_detected',
        message: 'Erreur: Informations entreprise manquantes',
      }]);
      return { valid: false, isUpdate: false };
    }

    try {
      // Récupérer tous les imports pour cette période et cette entreprise
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

      // Si aucun import précédent, c'est un nouveau fichier
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

      // Récupérer toutes les lignes du dernier import
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

      // Créer une signature complète pour chaque ligne (tous les champs)
      const createSignature = (r: any) => {
        return `${r.periode}|${r.matricule}|${r.nom_prenom}|${r.code_caisse}|${r.cco}|${r.montant}`;
      };

      // Trier les lignes actuelles par matricule pour une comparaison cohérente
      const sortedCurrentRows = [...rows].sort((a, b) => a.matricule.localeCompare(b.matricule));

      // Créer les sets de signatures
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

      // Vérifier si les fichiers sont identiques
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
        // CAS 1: Fichier identique → REJET
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

      // CAS 2: Fichier modifié → ALERTE puis ACCEPTATION après confirmation
      console.log('🔄 Modifications détectées dans le fichier');

      // Détecter les différences
      const differences: string[] = [];

      // Vérifier les nouvelles lignes
      const existingMatricules = new Set(existingRows.map(r => r.matricule));
      const newRows = sortedCurrentRows.filter(r => !existingMatricules.has(r.matricule));

      // Vérifier les lignes supprimées
      const currentMatricules = new Set(sortedCurrentRows.map(r => r.matricule));
      const deletedRows = existingRows.filter(r => !currentMatricules.has(r.matricule));

      // Vérifier les lignes modifiées
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

      // Afficher l'alerte de mise à jour
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
      setPendingUpdate(null);
    }
  };

  // Fonction pour effectuer l'import
  const performImport = async (rows: ParsedRow[], historyCheck: { valid: boolean; isUpdate: boolean }) => {
    if (!file || !companyUser?.company_id || !user || !selectedPeriod) return;

    try {
      setIsUploading(true);

      // Téléverser le fichier avec gestion d'erreurs détaillée
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
        
        // Messages d'erreur personnalisés
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
        return;
      }

      console.log('✅ Téléversement réussi:', uploadData);

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

      // Insérer les lignes
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
      setPendingUpdate(null);
      setUpdateDetected(false);
      
      toast({
        title: historyCheck.isUpdate ? '✅ Mise à jour transmise avec succès' : '✅ Import réussi',
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

      // Si c'est une mise à jour, stocker les données et attendre confirmation
      if (historyCheck.isUpdate) {
        setPendingUpdate({ rows, historyCheck });
        setIsUploading(false);
        return; // Arrêter ici et attendre la confirmation de l'utilisateur
      }

      // Continuer avec l'import (nouveau fichier)
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
    }
  }, [file, selectedPeriod, companyUser, user, toast]);

  // Fonction pour confirmer et envoyer la mise à jour
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
              disabled={!file || !selectedPeriod || isUploading || !!pendingUpdate}
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
            <Alert variant={validationErrors[0].type === 'update_detected' ? 'default' : 'destructive'} className={validationErrors[0].type === 'update_detected' ? 'border-blue-500/50 bg-blue-500/5' : ''}>
              {validationErrors[0].type === 'update_detected' ? (
                <Info className="h-4 w-4 text-blue-500" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertTitle className={validationErrors[0].type === 'update_detected' ? 'text-blue-500' : ''}>
                {validationErrors[0].type === 'update_detected' ? '🔄 Mise à jour détectée' : 'Erreur de validation'}
              </AlertTitle>
              <AlertDescription>
                {validationErrors.map((err, i) => (
                  <div key={i} className="mt-2">
                    <p className="font-medium">{err.message}</p>
                    {err.details && err.details.length > 0 && (
                      <ul className="text-sm mt-2 space-y-0.5">
                        {err.details.map((d, j) => (
                          <li key={j} className={d.startsWith('📊') || d.startsWith('✅') ? 'font-semibold mt-2' : ''}>
                            {d}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
                {validationErrors[0].type === 'update_detected' && pendingUpdate && (
                  <Button 
                    className="mt-4 w-full bg-blue-500 hover:bg-blue-600"
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
