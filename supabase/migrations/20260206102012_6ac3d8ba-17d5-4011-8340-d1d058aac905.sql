-- Function to create a company and assign the creator as admin atomically
CREATE OR REPLACE FUNCTION public.create_company_with_admin(
    company_name text,
    company_siret text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_company_id uuid;
BEGIN
    -- Check if user already belongs to a company
    IF EXISTS (SELECT 1 FROM public.company_users WHERE user_id = auth.uid()) THEN
        RAISE EXCEPTION 'User already belongs to a company';
    END IF;
    
    -- Create the company
    INSERT INTO public.companies (name, siret)
    VALUES (company_name, company_siret)
    RETURNING id INTO new_company_id;
    
    -- Add the creator as admin
    INSERT INTO public.company_users (company_id, user_id, role)
    VALUES (new_company_id, auth.uid(), 'admin');
    
    RETURN new_company_id;
END;
$$;