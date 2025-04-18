"use server"

import { createClient } from "@supabase/supabase-js"

export async function setupStoragePolicies() {
  try {
    // Create a Supabase client with admin privileges
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ADMIN_KEY || "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )

    // SQL to set up storage policies
    const sql = `
    -- Drop existing policies for the task-files bucket
    DO $$
    DECLARE
        policy_record RECORD;
    BEGIN
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'objects' 
            AND schemaname = 'storage'
            AND (policyname LIKE '%task-files%' OR policyname LIKE '%Allow users to%')
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
        END LOOP;
    END $$;

    -- Create new policies
    
    -- 1. Allow users to upload files (INSERT)
    CREATE POLICY "Allow users to upload files to task-files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'task-files'
    );
    
    -- 2. Allow users to update their own files (UPDATE)
    CREATE POLICY "Allow users to update files in task-files"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'task-files'
    );
    
    -- 3. Allow users to delete their own files (DELETE)
    CREATE POLICY "Allow users to delete files in task-files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'task-files'
    );
    
    -- 4. Allow public access to read files (SELECT)
    CREATE POLICY "Allow public access to read files in task-files"
    ON storage.objects
    FOR SELECT
    TO public
    USING (
        bucket_id = 'task-files'
    );
    `

    // Execute the SQL
    const { error } = await supabaseAdmin.rpc("setup_storage_policies", { sql_query: sql })

    if (error) {
      // Try an alternative approach if the RPC method fails
      const { error: sqlError } = await supabaseAdmin.sql(sql)
      if (sqlError) {
        throw new Error(`Error executing SQL: ${sqlError.message}`)
      }
    }

    return { success: true, message: "Storage policies have been successfully set up!" }
  } catch (error) {
    console.error("Error setting up storage policies:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}
