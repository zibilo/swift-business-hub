-- Remove the insecure "Allow all" policy on company_files
DROP POLICY IF EXISTS "Allow all" ON public.company_files;