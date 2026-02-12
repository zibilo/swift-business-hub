import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Plugins Capacitor (à installer: @capacitor/filesystem @capacitor/share)
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const ImportHistory = () => {
  const { companyUser } = useAuth();
  const navigate = useNavigate();
  const [searchDate, setSearchDate] = useState('');

  const { data: imports, isLoading } = useQuery({
    queryKey: ['file-imports', companyUser?.company_id, searchDate],
    queryFn: async () => {
      if (!companyUser?.company_id) return [];
      let query = supabase
        .from('file_imports')
        .select(`*`)
        .eq('company_id', companyUser.company_id)
        .order('created_at', { ascending: false });

      if (searchDate) {
        query = query.gte('created_at', `${searchDate}T00:00:00`).lte('created_at', `${searchDate}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!companyUser?.company_id,
  });

  // Fonction d'exportation vers les documents Android
  const handleExport = async (imp) => {
    try {
      const fileName = `Export_${imp.filename}_${Date.now()}.csv`;
      const content = `Date;Fichier;Periode;Volume;Statut\n${imp.created_at};${imp.filename};${imp.period};${imp.row_count};${imp.status}`;

      // 1. Écriture du fichier dans le dossier Documents du téléphone
      const result = await Filesystem.writeFile({
        path: fileName,
        data: content,
        directory: Directory.Documents,
        encoding: 'utf8'
      });

      // 2. Optionnel : Ouvrir le menu de partage natif Android
      await Share.share({
        title: 'Exporter le flux de salaire',
        url: result.uri,
        dialogTitle: 'Enregistrer ou envoyer le document',
      });
      
      alert("Fichier enregistré dans vos documents");
    } catch (e) {
      console.error('Erreur export Capacitor', e);
    }
  };

  return (
    <div className="h-screen w-full bg-[#F8FAFC] flex flex-col overflow-hidden">
      
      {/* HEADER MOBILE NATIVE STYLE */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-slate-100 flex items-center gap-4 shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 active:bg-slate-100 rounded-full transition-colors">
          <ChevronLeft className="h-6 w-6 text-slate-900" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 flex-1">Archives Flux</h1>
        <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
      </div>

      {/* BARRE DE RECHERCHE PAR DATE */}
      <div className="p-4 bg-white border-b border-slate-100 shrink-0">
        <div className="relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <CalendarIcon className="h-4 w-4 text-blue-500" />
          </div>
          <input
            type="date"
            className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
          />
          {searchDate && (
            <button 
              onClick={() => setSearchDate('')}
              className="absolute inset-y-0 right-3 text-[10px] font-bold text-slate-400 underline uppercase"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* LISTE DES DOCUMENTS (SCROLLABLE) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 w-full bg-slate-200 animate-pulse rounded-2xl" />)}
          </div>
        ) : imports?.length === 0 ? (
          <div className="text-center py-20">
            <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-sm">Aucun flux trouvé pour cette date.</p>
          </div>
        ) : (
          <AnimatePresence>
            {imports?.map((imp) => (
              <motion.div
                key={imp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="border-none shadow-sm bg-white p-4 rounded-[24px] active:scale-[0.98] transition-transform">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-3">
                      <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm truncate max-w-[150px]">
                          {imp.filename}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {format(new Date(imp.created_at), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <Badge className={imp.status === 'validated' ? 'bg-emerald-50 text-emerald-600 border-none' : 'bg-orange-50 text-orange-600 border-none'}>
                      {imp.status === 'validated' ? 'Validé' : imp.status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <div className="flex gap-4">
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Volume</p>
                        <p className="text-xs font-bold text-slate-700">{imp.row_count} lignes</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Période</p>
                        <p className="text-xs font-bold text-slate-700">{imp.period}</p>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => handleExport(imp)}
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 px-4 gap-2 shadow-md shadow-blue-200"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="text-xs">Export</span>
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* FOOTER FIXE SÉCURITÉ */}
      <div className="bg-white/80 backdrop-blur-md p-4 text-center border-t border-slate-100 shrink-0">
        <p className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-2">
          <Filter className="h-3 w-3" />
          Filtrez par date pour affiner vos recherches
        </p>
      </div>
    </div>
  );
};

export default ImportHistory;
