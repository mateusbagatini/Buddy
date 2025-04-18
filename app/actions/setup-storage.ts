"use server"

import { createClient } from "@supabase/supabase-js"

export async function setupStorageBucket() {
  try {
    // Create a Supabase client with service role key for admin privileges
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ADMIN_KEY || "",
    )

    if (!supabase) {
      return { success: false, message: "Failed to initialize Supabase client" }
    }

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      return {
        success: false,
        message: `Error listing buckets: ${listError.message}`,
      }
    }

    const bucketName = "task-files"
    const bucketExists = buckets.some((bucket) => bucket.name === bucketName)

    if (bucketExists) {
      // Update bucket to ensure it's public
      const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      })

      if (updateError) {
        return {
          success: false,
          message: `Error updating bucket: ${updateError.message}`,
        }
      }

      return {
        success: true,
        message: `Bucket ${bucketName} already exists and was updated`,
      }
    }

    // Create the bucket
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
    })

    if (createError) {
      return {
        success: false,
        message: `Error creating bucket: ${createError.message}`,
      }
    }

    // Set up RLS policies for the bucket
    const { error: policyError } = await supabase.rpc("create_storage_policy", {
      bucket_name: bucketName,
    })

    if (policyError) {
      console.warn(`Warning: Could not set up RLS policies: ${policyError.message}`)
    }

    return {
      success: true,
      message: `Successfully created bucket ${bucketName}`,
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Unexpected error: ${error.message || "Unknown error"}`,
    }
  }
}
