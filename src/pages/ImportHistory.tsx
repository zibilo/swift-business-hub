import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  FileText, 
  Download, 
  Search, 
  Calendar as CalendarIcon, 
  ChevronLeft,
  Filter,
  History,
  ArrowRightLeft,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Plugins Capacitor
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const ImportHistory = () => {
  const { companyUser } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Conversion de la date pour la requête Supabase
  const searchDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

  const { data: imports, isLoading } = useQuery({
    queryKey: ['file-imports', companyUser?.company_id, searchDateStr],
    queryFn: async () => {
      if (!companyUser?.company_id) return [];
      let query = supabase
        .from('file_imports')
        .select(`*`)
        .eq('company_id', companyUser.company_id)
        .order('created_at', { ascending: false });

      if (searchDateStr) {
        query = query.gte('created_at', `${searchDateStr}T00:00:00`).lte('created_at', `${searchDateStr}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!companyUser?.company_id,
  });

  const handleExport = async (imp: any) => {
    try {
      const fileName = `Export_${imp.filename}_${Date.now()}.csv`;
      const content = `Date;Fichier;Periode;Volume;Statut\n${imp.created_at};${imp.filename};${imp.period};${imp.row_count};${imp.status}`;

      const result = await Filesystem.writeFile({
        path: fileName,
        data: content,
        directory: Directory.Documents,
        encoding: 'utf8'
      });

      await Share.share({
        title: 'Exporter le flux de salaire',
        url: result.uri,
        dialogTitle: 'Enregistrer ou envoyer le document',
      });
    } catch (e) {
      console.error('Erreur export Capacitor', e);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col">
      
      {/* HEADER INSTITUTIONNEL */}
      <div className="bg-white px-6 pt-12 pb-6 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)} 
            className="rounded-full bg-slate-50 hover:bg-slate-100 h-10 w-10"
          >
            <ChevronLeft className="h-6 w-6 text-slate-900" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-[#00204E] tracking-tight">Archives Flux</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-blue-600">Journal des transmissions</p>
          </div>
        </div>
        <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center shadow-inner">
          <History className="h-6 w-6 text-blue-600" />
        </div>
      </div>

      {/* BARRE DE RECHERCHE CALENDRIER MODERNE */}
      <div className="p-4 bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-xl mx-auto flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "flex-1 h-12 justify-start text-left font-semibold rounded-xl border-slate-200 transition-all",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-3 h-4 w-4 text-blue-600" />
                {selectedDate ? format(selectedDate, "PPP", { locale: fr }) : "Filtrer par date..."}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-none" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
                locale={fr}
              />
            </PopoverContent>
          </Popover>

          {selectedDate && (
            <Button 
              variant="ghost" 
              onClick={() => setSelectedDate(undefined)}
              className="h-12 w-12 rounded-xl bg-red-50 text-red-600 hover:bg-red-100"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* LISTE DES DOCUMENTS */}
      <div className="flex-1 p-4 space-y-4 pb-24 max-w-xl mx-auto w-full">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 w-full bg-slate-200/50 animate-pulse rounded-[32px]" />
            ))}
          </div>
        ) : imports?.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center py-20"
          >
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-slate-900 font-bold">Aucune archive</p>
            <p className="text-slate-400 text-sm mt-1">Aucun flux trouvé pour cette sélection.</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {imports?.map((imp) => (
              <motion.div
                key={imp.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                layout
              >
                <Card className="border-none shadow-[0_4px_20px_rgba(0,0,0,0.03)] bg-white rounded-[32px] overflow-hidden active:scale-[0.98] transition-all">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                          <FileText className="h-6 w-6 text-slate-600" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-bold text-slate-900 text-sm leading-tight truncate max-w-[140px]">
                            {imp.filename}
                          </h3>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <ArrowRightLeft className="h-3 w-3" />
                            {format(new Date(imp.created_at), 'dd MMM yyyy', { locale: fr })}
                          </div>
                        </div>
                      </div>
                      <Badge className={cn(
                        "text-[10px] font-black uppercase px-3 py-1 rounded-full border-none",
                        imp.status === 'validated' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      )}>
                        {imp.status === 'validated' ? 'Traité' : imp.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Volume de paie</p>
                        <p className="text-sm font-bold text-slate-800">{imp.row_count} salariés</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Période fiscale</p>
                        <p className="text-sm font-bold text-slate-800">{imp.period}</p>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => handleExport(imp)}
                      className="w-full mt-4 bg-slate-900 hover:bg-black text-white rounded-2xl h-12 gap-2 shadow-lg shadow-slate-200"
                    >
                      <Download className="h-4 w-4" />
                      <span className="text-sm font-bold">Exporter l'accusé</span>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* FOOTER STATUT */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl p-4 text-center border-t border-slate-100 z-20 md:hidden">
        <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Base de données synchronisée
        </div>
      </div>
    </div>
  );
};

export default ImportHistory;
