-- Add INSERT policy for excel-imports bucket (missing policy causing upload failures)
CREATE POLICY "Users can upload to their company folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'excel-imports' 
  AND auth.uid() IN (
    SELECT user_id FROM public.company_users 
    WHERE company_id = (storage.foldername(name))[1]::uuid
  )
);

-- Add UPDATE policy for completeness
CREATE POLICY "Users can update their company files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'excel-imports' 
  AND auth.uid() IN (
    SELECT user_id FROM public.company_users 
    WHERE company_id = (storage.foldername(name))[1]::uuid
  )
);