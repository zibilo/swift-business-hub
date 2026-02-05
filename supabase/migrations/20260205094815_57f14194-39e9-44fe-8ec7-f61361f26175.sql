-- 1. Create enum for company roles
CREATE TYPE public.company_role AS ENUM ('admin', 'user');

-- 2. Create companies table
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    siret TEXT UNIQUE,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'France',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create company_users membership table
CREATE TABLE public.company_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role company_role NOT NULL DEFAULT 'user',
    invited_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, user_id)
);

-- 5. Create support_messages table
CREATE TABLE public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_from_support BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Create company_files table
CREATE TABLE public.company_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    storage_path TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    status TEXT DEFAULT 'pending',
    scan_result TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_files ENABLE ROW LEVEL SECURITY;

-- 8. Create helper function: get user's company
CREATE OR REPLACE FUNCTION public.get_user_company_id(user_uuid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT company_id FROM public.company_users WHERE user_id = user_uuid LIMIT 1;
$$;

-- 9. Create helper function: check if user is company admin
CREATE OR REPLACE FUNCTION public.is_company_admin(company_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.company_users
        WHERE company_id = company_uuid
          AND user_id = auth.uid()
          AND role = 'admin'
    );
$$;

-- 10. Create helper function: check if user is company member
CREATE OR REPLACE FUNCTION public.is_company_member(company_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.company_users
        WHERE company_id = company_uuid
          AND user_id = auth.uid()
    );
$$;

-- 11. RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- 12. RLS Policies for companies
CREATE POLICY "Company members can view their company"
ON public.companies FOR SELECT
TO authenticated
USING (public.is_company_member(id));

CREATE POLICY "Authenticated users can create companies"
ON public.companies FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Company admins can update their company"
ON public.companies FOR UPDATE
TO authenticated
USING (public.is_company_admin(id));

CREATE POLICY "Company admins can delete their company"
ON public.companies FOR DELETE
TO authenticated
USING (public.is_company_admin(id));

-- 13. RLS Policies for company_users
CREATE POLICY "Members can view company users"
ON public.company_users FOR SELECT
TO authenticated
USING (public.is_company_member(company_id));

CREATE POLICY "Admins can add company users"
ON public.company_users FOR INSERT
TO authenticated
WITH CHECK (
    public.is_company_admin(company_id) 
    OR (user_id = auth.uid() AND NOT EXISTS (SELECT 1 FROM public.company_users WHERE user_id = auth.uid()))
);

CREATE POLICY "Admins can update company users"
ON public.company_users FOR UPDATE
TO authenticated
USING (public.is_company_admin(company_id));

CREATE POLICY "Admins can delete company users or users can leave"
ON public.company_users FOR DELETE
TO authenticated
USING (public.is_company_admin(company_id) OR (user_id = auth.uid() AND role != 'admin'));

-- 14. RLS Policies for support_messages
CREATE POLICY "Members can view company messages"
ON public.support_messages FOR SELECT
TO authenticated
USING (public.is_company_member(company_id));

CREATE POLICY "Members can send messages"
ON public.support_messages FOR INSERT
TO authenticated
WITH CHECK (public.is_company_member(company_id) AND user_id = auth.uid());

CREATE POLICY "Admins can delete messages"
ON public.support_messages FOR DELETE
TO authenticated
USING (public.is_company_admin(company_id));

-- 15. RLS Policies for company_files
CREATE POLICY "Members can view company files"
ON public.company_files FOR SELECT
TO authenticated
USING (public.is_company_member(company_id));

CREATE POLICY "Members can upload files"
ON public.company_files FOR INSERT
TO authenticated
WITH CHECK (public.is_company_member(company_id) AND uploaded_by = auth.uid());

CREATE POLICY "Admins can delete files"
ON public.company_files FOR DELETE
TO authenticated
USING (public.is_company_admin(company_id));

-- 16. Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 17. Create triggers for automatic timestamp updates
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 18. Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 19. Create indexes for performance
CREATE INDEX idx_company_users_company_id ON public.company_users(company_id);
CREATE INDEX idx_company_users_user_id ON public.company_users(user_id);
CREATE INDEX idx_support_messages_company_id ON public.support_messages(company_id);
CREATE INDEX idx_company_files_company_id ON public.company_files(company_id);