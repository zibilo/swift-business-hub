-- Fix the permissive INSERT policy on companies
-- Users should only create companies if they don't already belong to one
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;

CREATE POLICY "Authenticated users can create companies"
ON public.companies FOR INSERT
TO authenticated
WITH CHECK (
    NOT EXISTS (SELECT 1 FROM public.company_users WHERE user_id = auth.uid())
);