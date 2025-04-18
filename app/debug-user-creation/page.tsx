"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { createUserAction } from "@/app/actions"

export default function DebugUserCreation() {
  const [userData, setUserData] = useState({
    name: "Test User",
    email: `test-${Date.now()}@example.com`,
    password: "password123",
    role: "user",
    status: "active",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const supabase = createClientComponentClient()

  const addLog = (message: string) => {
    console.log(message)
    setLogs((prev) => [...prev, `[${new Date().toISOString()}] ${message}`])
  }

  const testDirectCreation = async () => {
    setIsLoading(true)
    setResult(null)
    setError(null)
    setLogs([])

    try {
      addLog(`Testing direct user creation for: ${userData.email}`)

      // Generate a unique email to avoid conflicts
      const testEmail = `test-${Date.now()}@example.com`
      setUserData((prev) => ({ ...prev, email: testEmail }))

      // Try to create user with server action
      addLog("Calling createUserAction server action...")
      const actionResult = await createUserAction(
        {
          name: userData.name,
          email: testEmail,
          role: userData.role,
          status: userData.status,
        },
        userData.password,
      )

      addLog(`Server action result: ${JSON.stringify(actionResult)}`)

      if (!actionResult.success) {
        throw new Error(actionResult.error || "Unknown error in server action")
      }

      setResult(actionResult)
      addLog("User created successfully!")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      addLog(`Error: ${errorMessage}`)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const testAPICreation = async () => {
    setIsLoading(true)
    setResult(null)
    setError(null)
    setLogs([])

    try {
      // Generate a unique email to avoid conflicts
      const testEmail = `test-${Date.now()}@example.com`
      setUserData((prev) => ({ ...prev, email: testEmail }))

      addLog(`Testing API route user creation for: ${testEmail}`)

      // Try to create user with API route
      addLog("Calling /api/users endpoint...")
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: userData.name,
          email: testEmail,
          password: userData.password,
          role: userData.role,
          status: userData.status,
        }),
      })

      const data = await response.json()
      addLog(`API response: ${JSON.stringify(data)}`)

      if (!response.ok) {
        throw new Error(data.error || `API error: ${response.status}`)
      }

      setResult(data)
      addLog("User created successfully via API!")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      addLog(`Error: ${errorMessage}`)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const checkServiceRoleKey = async () => {
    setIsLoading(true)
    setResult(null)
    setError(null)
    setLogs([])

    try {
      addLog("Checking if service role key is available...")

      // We can't directly check the environment variable on the client
      // So we'll make a simple request to check if we have admin privileges
      const response = await fetch("/api/check-admin", {
        method: "GET",
      })

      const data = await response.json()
      addLog(`API response: ${JSON.stringify(data)}`)

      if (!response.ok) {
        throw new Error(data.error || `API error: ${response.status}`)
      }

      setResult(data)
      addLog(data.hasServiceRoleKey ? "Service role key is available!" : "Service role key is NOT available!")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      addLog(`Error: ${errorMessage}`)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Debug User Creation</CardTitle>
          <CardDescription>Test different methods of user creation to diagnose issues</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Test Email</Label>
            <Input
              id="email"
              value={userData.email}
              onChange={(e) => setUserData((prev) => ({ ...prev, email: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              This will be auto-generated for each test to avoid conflicts
            </p>
          </div>

          {result && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700">User created successfully!</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {logs.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Logs:</h3>
              <div className="bg-gray-100 p-3 rounded-md max-h-60 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="text-xs font-mono mb-1">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="flex gap-2 w-full">
            <Button onClick={testDirectCreation} disabled={isLoading} className="flex-1">
              Test Server Action
            </Button>
            <Button onClick={testAPICreation} disabled={isLoading} className="flex-1">
              Test API Route
            </Button>
          </div>
          <Button onClick={checkServiceRoleKey} disabled={isLoading} variant="outline" className="w-full">
            Check Service Role Key
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
