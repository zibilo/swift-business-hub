// src/pages/admin/AdminReferences.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Upload, Database, Loader2 } from 'lucide-react';

export default function AdminReferences() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const { data: companies } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name');
      return data;
    }
  });

  const handleImportReference = async () => {
    if (!file || !selectedCompany) return;
    setIsUploading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as any[];

      // Préparation des données pour insertion
      const references = data.map(row => ({
        company_id: selectedCompany,
        matricule: String(row.MATRICULE),
        nom_prenom: `${row.NOM} ${row.PRENOM}`,
        code_caisse: String(row.CODE_CAISSE),
        cco: String(row.CCO)
      }));

      // Upsert : si le matricule existe déjà pour cette entreprise, on met à jour
      const { error } = await supabase
        .from('employee_references')
        .upsert(references, { onConflict: 'company_id, matricule' });

      if (error) throw error;
      toast.success(`${references.length} salariés enregistrés dans le référentiel.`);
      setFile(null);
    } catch (e: any) {
      toast.error("Erreur d'import : " + e.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-black text-[#00204E]">Référentiel Salariés</h1>
      
      <Card className="border-none shadow-xl rounded-3xl">
        <CardHeader><CardTitle className="text-sm uppercase tracking-widest text-slate-400">Importer une base de référence</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Select onValueChange={setSelectedCompany}>
            <SelectTrigger className="rounded-xl h-12">
              <SelectValue placeholder="Choisir l'entreprise" />
            </SelectTrigger>
            <SelectContent>
              {companies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="border-2 border-dashed rounded-2xl p-8 text-center bg-slate-50">
            <input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" id="ref-file" />
            <label htmlFor="ref-file" className="cursor-pointer flex flex-col items-center gap-2">
              <Database className="text-slate-300 h-10 w-10" />
              <span className="text-sm font-bold text-slate-600">{file ? file.name : "Sélectionner le fichier Master (.xlsx)"}</span>
            </label>
          </div>

          <Button 
            onClick={handleImportReference} 
            disabled={!file || !selectedCompany || isUploading}
            className="w-full h-14 bg-[#00204E] rounded-xl font-bold"
          >
            {isUploading ? <Loader2 className="animate-spin" /> : "Mettre à jour le référentiel"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
