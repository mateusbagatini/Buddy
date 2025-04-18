"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { setupStorageBucket } from "@/app/actions/setup-storage"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { ensureBucketExists } from "@/lib/storage-utils"
import { AlertCircle, CheckCircle } from "lucide-react"

export default function SetupStoragePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null)
  const [clientResult, setClientResult] = useState<{ success?: boolean; message?: string } | null>(null)

  const handleSetupStorage = async () => {
    setIsLoading(true)
    try {
      // Try server-side setup first
      const serverResult = await setupStorageBucket()
      setResult(serverResult)

      // If server-side setup fails, try client-side setup
      if (!serverResult.success) {
        try {
          const success = await ensureBucketExists("task-files")
          setClientResult({
            success,
            message: success
              ? "Successfully created bucket from client-side"
              : "Failed to create bucket from client-side",
          })
        } catch (error: any) {
          setClientResult({
            success: false,
            message: `Client-side error: ${error.message || "Unknown error"}`,
          })
        }
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: `Error: ${error.message || "Unknown error"}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const testBucketAccess = async () => {
    setIsLoading(true)
    try {
      const supabase = createClientComponentClient()

      // Test listing buckets
      const { data: buckets, error: listError } = await supabase.storage.listBuckets()

      if (listError) {
        setResult({
          success: false,
          message: `Error listing buckets: ${listError.message}`,
        })
        return
      }

      const bucketName = "task-files"
      const bucketExists = buckets.some((bucket) => bucket.name === bucketName)

      if (!bucketExists) {
        setResult({
          success: false,
          message: `Bucket ${bucketName} does not exist`,
        })
        return
      }

      // Test uploading a small test file
      const testFile = new Blob(["test"], { type: "text/plain" })
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload("test.txt", testFile, { upsert: true })

      if (uploadError) {
        setResult({
          success: false,
          message: `Error uploading test file: ${uploadError.message}`,
        })
        return
      }

      setResult({
        success: true,
        message: `Successfully tested bucket access. Bucket exists and file upload works.`,
      })
    } catch (error: any) {
      setResult({
        success: false,
        message: `Error testing bucket access: ${error.message || "Unknown error"}`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Setup Storage Bucket</CardTitle>
          <CardDescription>Create and configure the storage bucket for file uploads</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result && (
            <div className={`p-4 rounded-md ${result.success ? "bg-green-50" : "bg-red-50"}`}>
              <div className="flex items-start">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                )}
                <div>
                  <p className={result.success ? "text-green-700" : "text-red-700"}>
                    {result.success ? "Success" : "Error"}
                  </p>
                  <p className="text-sm">{result.message}</p>
                </div>
              </div>
            </div>
          )}

          {clientResult && !result?.success && (
            <div className={`p-4 rounded-md ${clientResult.success ? "bg-green-50" : "bg-red-50"}`}>
              <div className="flex items-start">
                {clientResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                )}
                <div>
                  <p className={clientResult.success ? "text-green-700" : "text-red-700"}>
                    Client-side {clientResult.success ? "Success" : "Error"}
                  </p>
                  <p className="text-sm">{clientResult.message}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button onClick={handleSetupStorage} disabled={isLoading}>
            {isLoading ? "Setting up..." : "Setup Storage Bucket"}
          </Button>
          <Button variant="outline" onClick={testBucketAccess} disabled={isLoading}>
            Test Bucket Access
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
