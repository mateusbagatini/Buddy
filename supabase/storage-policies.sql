-- Drop existing policies if they exist
BEGIN;

-- Get the list of policies for the task-files bucket
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    END LOOP;
END $$;

-- Create new policies

-- 1. Allow users to upload files (INSERT)
CREATE POLICY "Allow users to upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'task-files' 
    -- No path restrictions, allow uploads to any path
);

-- 2. Allow users to update their own files (UPDATE)
CREATE POLICY "Allow users to update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'task-files'
    -- No path restrictions, allow updates to any file
);

-- 3. Allow users to delete their own files (DELETE)
CREATE POLICY "Allow users to delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'task-files'
    -- No path restrictions, allow deletion of any file
);

-- 4. Allow public access to read files (SELECT)
CREATE POLICY "Allow public access to read files"
ON storage.objects
FOR SELECT
TO public
USING (
    bucket_id = 'task-files'
);

COMMIT;
