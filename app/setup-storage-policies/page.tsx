"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export default function SetupStoragePoliciesPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const supabase = createClientComponentClient()

  const setupPolicies = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      // First, check if the bucket exists
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

      if (bucketsError) {
        throw new Error(`Error listing buckets: ${bucketsError.message}`)
      }

      const bucketExists = buckets.some((bucket) => bucket.name === "task-files")

      if (!bucketExists) {
        // Create the bucket if it doesn't exist
        const { error: createError } = await supabase.storage.createBucket("task-files", {
          public: true,
        })

        if (createError) {
          throw new Error(`Error creating bucket: ${createError.message}`)
        }
      }

      // Execute SQL to set up policies
      // Note: This requires the service role key (admin access)
      const { error: policyError } = await supabase.rpc("setup_storage_policies")

      if (policyError) {
        throw new Error(`Error setting up policies: ${policyError.message}`)
      }

      setResult({
        success: true,
        message: "Storage policies have been successfully set up!",
      })
    } catch (error) {
      console.error("Error setting up storage policies:", error)
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-2xl py-12">
      <Card>
        <CardHeader>
          <CardTitle>Setup Storage Policies</CardTitle>
          <CardDescription>
            Configure Row Level Security (RLS) policies for the task-files storage bucket
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            This will set up the necessary policies to allow file uploads and downloads for your application. The
            policies will be configured to allow authenticated users to upload files and anyone to view them.
          </p>

          {result && (
            <Alert className={result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={setupPolicies} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Setting up policies..." : "Setup Storage Policies"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
