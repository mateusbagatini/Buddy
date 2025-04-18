-- Create a function to set up storage policies
CREATE OR REPLACE FUNCTION setup_storage_policies(sql_query TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    -- If a custom SQL query is provided, execute it
    IF sql_query IS NOT NULL THEN
        EXECUTE sql_query;
        RETURN;
    END IF;

    -- Default implementation
    -- Drop existing policies for the task-files bucket
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND (policyname LIKE '%task-files%' OR policyname LIKE '%Allow users to%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_name);
    END LOOP;

    -- Create new policies
    
    -- 1. Allow users to upload files (INSERT)
    EXECUTE $policy$
    CREATE POLICY "Allow users to upload files to task-files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'task-files'
    );
    $policy$;
    
    -- 2. Allow users to update their own files (UPDATE)
    EXECUTE $policy$
    CREATE POLICY "Allow users to update files in task-files"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'task-files'
    );
    $policy$;
    
    -- 3. Allow users to delete their own files (DELETE)
    EXECUTE $policy$
    CREATE POLICY "Allow users to delete files in task-files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'task-files'
    );
    $policy$;
    
    -- 4. Allow public access to read files (SELECT)
    EXECUTE $policy$
    CREATE POLICY "Allow public access to read files in task-files"
    ON storage.objects
    FOR SELECT
    TO public
    USING (
        bucket_id = 'task-files'
    );
    $policy$;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION setup_storage_policies TO authenticated;
