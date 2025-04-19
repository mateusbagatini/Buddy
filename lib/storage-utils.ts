import { supabase } from "@/lib/supabase-utils"

/**
 * Ensures that a storage bucket exists in Supabase
 * @param bucketName The name of the bucket to ensure exists
 * @returns A boolean indicating if the bucket exists or was created successfully
 */
export async function ensureBucketExists(bucketName: string): Promise<boolean> {
  try {
    // First check if the bucket already exists
    const { data: buckets, error: getBucketError } = await supabase.storage.listBuckets()

    if (getBucketError) {
      console.error("Error checking buckets:", getBucketError)
      return false
    }

    // If bucket already exists, return true
    if (buckets.some((bucket) => bucket.name === bucketName)) {
      console.log(`Bucket ${bucketName} already exists`)
      return true
    }

    // Create the bucket if it doesn't exist
    const { error: createBucketError } = await supabase.storage.createBucket(bucketName, {
      public: true, // Make files publicly accessible
      fileSizeLimit: 10485760, // 10MB limit
    })

    if (createBucketError) {
      console.error(`Error creating bucket ${bucketName}:`, createBucketError)
      return false
    }

    console.log(`Successfully created bucket ${bucketName}`)
    return true
  } catch (error) {
    console.error("Unexpected error ensuring bucket exists:", error)
    return false
  }
}

/**
 * Uploads a file to Supabase storage, ensuring the bucket exists first
 * @param bucketName The name of the bucket to upload to
 * @param filePath The path where the file should be stored
 * @param file The file to upload
 * @returns The public URL of the uploaded file, or null if upload failed
 */
export async function uploadFile(bucketName: string, filePath: string, file: File): Promise<string | null> {
  try {
    // Ensure the bucket exists before uploading
    const bucketExists = await ensureBucketExists(bucketName)

    if (!bucketExists) {
      throw new Error(`Bucket ${bucketName} does not exist and could not be created`)
    }

    // Simplify the file path to avoid RLS issues
    // Instead of a complex path with user IDs, just use a simple path with a timestamp
    const timestamp = new Date().getTime()
    const simplePath = `uploads/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`

    // Upload the file
    const { error: uploadError } = await supabase.storage.from(bucketName).upload(simplePath, file, {
      cacheControl: "3600",
      upsert: true,
    })

    if (uploadError) {
      throw new Error(`Upload error: ${uploadError.message}`)
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(simplePath)

    return publicUrl
  } catch (error) {
    console.error("Error uploading file:", error)
    throw error
  }
}
