-- Table pour stocker les métadonnées des fichiers importés
CREATE TABLE public.file_imports (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES public.profiles(id),
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    period INTEGER NOT NULL, -- Format YYYYMM (ex: 202512)
    selected_period INTEGER NOT NULL, -- Période sélectionnée par l'utilisateur
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'error', 'rejected')),
    error_message TEXT,
    row_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour stocker les lignes de chaque fichier importé
CREATE TABLE public.file_import_rows (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    file_import_id UUID NOT NULL REFERENCES public.file_imports(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    periode INTEGER NOT NULL, -- YYYYMM
    matricule TEXT NOT NULL,
    nom_prenom TEXT NOT NULL,
    code_caisse TEXT NOT NULL, -- 3 caractères
    cco TEXT NOT NULL,
    montant DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table de référence des employés (première occurrence = référence)
CREATE TABLE public.employee_references (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    matricule TEXT NOT NULL,
    nom_prenom TEXT NOT NULL,
    code_caisse TEXT NOT NULL,
    cco TEXT NOT NULL,
    first_seen_file_id UUID REFERENCES public.file_imports(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, matricule)
);

-- Table pour logger les divergences détectées
CREATE TABLE public.import_discrepancies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    file_import_id UUID NOT NULL REFERENCES public.file_imports(id) ON DELETE CASCADE,
    matricule TEXT NOT NULL,
    field_name TEXT NOT NULL, -- 'cco', 'nom_prenom', 'code_caisse'
    expected_value TEXT NOT NULL,
    actual_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les performances
CREATE INDEX idx_file_imports_company ON public.file_imports(company_id);
CREATE INDEX idx_file_imports_period ON public.file_imports(period);
CREATE INDEX idx_file_import_rows_file ON public.file_import_rows(file_import_id);
CREATE INDEX idx_file_import_rows_matricule ON public.file_import_rows(matricule);
CREATE INDEX idx_employee_references_company ON public.employee_references(company_id);
CREATE INDEX idx_employee_references_matricule ON public.employee_references(company_id, matricule);
CREATE INDEX idx_import_discrepancies_file ON public.import_discrepancies(file_import_id);

-- Enable RLS
ALTER TABLE public.file_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_discrepancies ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour file_imports
CREATE POLICY "Users can view their company imports"
ON public.file_imports FOR SELECT
USING (is_company_member(company_id));

CREATE POLICY "Users can insert imports for their company"
ON public.file_imports FOR INSERT
WITH CHECK (is_company_member(company_id) AND uploaded_by = auth.uid());

CREATE POLICY "Users can update their company imports"
ON public.file_imports FOR UPDATE
USING (is_company_member(company_id));

-- RLS Policies pour file_import_rows
CREATE POLICY "Users can view rows of their company imports"
ON public.file_import_rows FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.file_imports fi
    WHERE fi.id = file_import_id AND is_company_member(fi.company_id)
));

CREATE POLICY "Users can insert rows for their company imports"
ON public.file_import_rows FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.file_imports fi
    WHERE fi.id = file_import_id AND is_company_member(fi.company_id)
));

-- RLS Policies pour employee_references
CREATE POLICY "Users can view their company employee references"
ON public.employee_references FOR SELECT
USING (is_company_member(company_id));

CREATE POLICY "Users can insert employee references for their company"
ON public.employee_references FOR INSERT
WITH CHECK (is_company_member(company_id));

CREATE POLICY "Users can update their company employee references"
ON public.employee_references FOR UPDATE
USING (is_company_member(company_id));

-- RLS Policies pour import_discrepancies
CREATE POLICY "Users can view discrepancies of their imports"
ON public.import_discrepancies FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.file_imports fi
    WHERE fi.id = file_import_id AND is_company_member(fi.company_id)
));

CREATE POLICY "Users can insert discrepancies for their imports"
ON public.import_discrepancies FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.file_imports fi
    WHERE fi.id = file_import_id AND is_company_member(fi.company_id)
));

-- Trigger pour updated_at sur employee_references
CREATE TRIGGER update_employee_references_updated_at
BEFORE UPDATE ON public.employee_references
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();