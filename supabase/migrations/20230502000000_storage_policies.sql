-- Create a function to set up storage policies for a bucket
CREATE OR REPLACE FUNCTION create_storage_policy(bucket_name TEXT)
RETURNS VOID AS $$
BEGIN
    -- Allow authenticated users to upload files
    EXECUTE format('
        CREATE POLICY "Allow authenticated users to upload files" 
        ON storage.objects 
        FOR INSERT 
        TO authenticated 
        USING (bucket_id = %L AND auth.uid() = (storage.foldername(name))[1]::uuid);
    ', bucket_name);

    -- Allow users to update their own files
    EXECUTE format('
        CREATE POLICY "Allow users to update their own files" 
        ON storage.objects 
        FOR UPDATE 
        TO authenticated 
        USING (bucket_id = %L AND auth.uid() = (storage.foldername(name))[1]::uuid);
    ', bucket_name);

    -- Allow users to delete their own files
    EXECUTE format('
        CREATE POLICY "Allow users to delete their own files" 
        ON storage.objects 
        FOR DELETE 
        TO authenticated 
        USING (bucket_id = %L AND auth.uid() = (storage.foldername(name))[1]::uuid);
    ', bucket_name);

    -- Allow public access to read files
    EXECUTE format('
        CREATE POLICY "Allow public access to read files" 
        ON storage.objects 
        FOR SELECT 
        TO public 
        USING (bucket_id = %L);
    ', bucket_name);
END;
$$ LANGUAGE plpgsql;
