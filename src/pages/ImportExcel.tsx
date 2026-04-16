import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Upload, CheckCircle, 
  Loader2, Calendar as CalendarIcon,
  ShieldCheck, FileCheck, ChevronLeft, Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const ImportExcel = () => {
  const { companyUser, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const getPeriodFromDate = (date: Date | undefined) => {
    if (!date) return '';
    return format(date, 'yyyyMM');
  };

  const handleUpload = async () => {
    if (!file || !selectedDate || !companyUser?.company_id || !user) {
      toast({ title: "Champs manquants", description: "Sélectionnez une période et un fichier.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setIsSuccess(false);

    try {
      // 1. Lecture rapide pour compter les lignes du fichier
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      const rowCount = jsonData.length;

      // 2. Préparation de l'envoi vers le stockage (Storage)
      const period = parseInt(getPeriodFromDate(selectedDate));
      const storagePath = `${companyUser.company_id}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('excel-imports')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // 3. Enregistrement dans la base de données (Historique)
      const { error: dbError } = await supabase.from('file_imports').insert({
        company_id: companyUser.company_id,
        filename: file.name,
        storage_path: storagePath,
        period: period,
        selected_period: period,
        status: 'validated',
        uploaded_by: user.id,
        row_count: rowCount
      });

      if (dbError) throw dbError;

      // 4. Finalisation
      setIsSuccess(true);
      setFile(null);
      toast({ 
        title: 'Fichier envoyé !', 
        description: `Le flux pour ${format(selectedDate, "MMMM yyyy", { locale: fr })} a été transmis.` 
      });
      
      // Optionnel : redirection vers l'historique après 2 secondes
      setTimeout(() => navigate('/history'), 2000);

    } catch (e: any) {
      console.error(e);
      toast({ 
        title: 'Erreur lors de l\'envoi', 
        description: "Une erreur technique est survenue. Vérifiez votre connexion.", 
        variant: 'destructive' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col font-sans">
      
      {/* HEADER */}
      <div className="bg-white px-4 pt-10 pb-6 border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-xl font-black text-[#00204E]">Transmission de Flux</h1>
            <p className="text-[10px] uppercase font-bold text-blue-600 tracking-widest">Envoi sécurisé MUCODEC</p>
          </div>
        </div>
        <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
        </div>
      </div>

      <main className="p-4 space-y-6 pb-32 max-w-lg mx-auto w-full">
        
        <AnimatePresence>
          {isSuccess && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <Alert className="border-none shadow-lg bg-emerald-500 text-white rounded-3xl p-5">
                <CheckCircle className="h-6 w-6 mb-2" />
                <AlertTitle className="text-sm font-black uppercase">Succès</AlertTitle>
                <AlertDescription className="text-xs font-bold">Votre fichier a été transmis à la banque avec succès.</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {/* SÉLECTION DU MOIS / ANNÉE */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Période concernée</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full h-14 justify-start rounded-2xl border-2 bg-white font-bold text-slate-700">
                  <CalendarIcon className="mr-3 h-5 w-5 text-blue-600" />
                  {selectedDate ? format(selectedDate, "MMMM yyyy", { locale: fr }) : "Choisir le mois"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-screen max-w-[350px] p-0 rounded-3xl border-none shadow-2xl" align="center">
                <Calendar 
                  mode="single" 
                  selected={selectedDate} 
                  onSelect={setSelectedDate} 
                  locale={fr} 
                  initialFocus 
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* SÉLECTION DU FICHIER */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Fichier de paie (Excel ou CSV)</label>
            <div className={cn(
              "relative border-2 border-dashed rounded-[32px] p-10 text-center transition-all bg-white",
              file ? "border-blue-400 bg-blue-50/20" : "border-slate-200"
            )}>
              <input 
                type="file" 
                accept=".xlsx,.xls,.csv" 
                onChange={(e) => setFile(e.target.files?.[0] || null)} 
                className="absolute inset-0 opacity-0 z-10 cursor-pointer" 
              />
              <div className="flex flex-col items-center gap-3">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center",
                  file ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-300"
                )}>
                  {file ? <FileCheck size={28} /> : <Upload size={28} />}
                </div>
                <p className="text-xs font-bold text-slate-600 truncate max-w-full px-4">
                  {file ? file.name : "Appuyez pour choisir le fichier"}
                </p>
              </div>
            </div>
          </div>

          {/* BOUTON D'ENVOI */}
          <div className="pt-4">
            <Button 
              onClick={handleUpload}
              disabled={!file || !selectedDate || isUploading}
              className="w-full h-16 bg-[#00204E] hover:bg-blue-900 rounded-[24px] text-base font-black shadow-xl"
            >
              {isUploading ? (
                <><Loader2 className="animate-spin mr-2 h-5 w-5" /> Envoi en cours...</>
              ) : (
                <><Send className="mr-2 h-5 w-5" /> Envoyer à la banque</>
              )}
            </Button>
          </div>
        </div>

        {/* INFO SÉCURITÉ */}
        <Card className="border-none bg-slate-900 text-white rounded-[32px] p-6 shadow-xl">
           <div className="flex items-center gap-3 mb-4">
             <ShieldCheck className="h-5 w-5 text-blue-400" />
             <h3 className="text-xs font-black uppercase tracking-widest text-blue-400">Sécurité de transmission</h3>
           </div>
           <p className="text-[10px] leading-relaxed opacity-70">
             Le fichier est crypté dès son envoi. Une fois reçu, nos services procèderont au traitement automatique des virements vers les comptes de vos salariés.
           </p>
        </Card>
      </main>

      <footer className="mt-auto py-6 text-center opacity-30">
        <p className="text-[8px] font-black uppercase tracking-[0.4em]">MUCODEC DIGITAL BANKING SYSTEMS</p>
      </footer>
    </div>
  );
};

export default ImportExcel;
