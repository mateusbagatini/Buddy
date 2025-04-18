"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function AuthCheck() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [logs, setLogs] = useState<string[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const supabase = createClientComponentClient()

  const addLog = (log: string) => {
    console.log(log)
    setLogs((prev) => [...prev, `[${new Date().toISOString()}] ${log}`])
  }

  const checkAuth = async () => {
    setStatus("loading")
    setMessage("Checking authentication...")
    setLogs([])
    setCurrentUser(null)

    try {
      // Check if we're authenticated
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        addLog(`Error getting user: ${userError.message}`)
        setStatus("error")
        setMessage(`Authentication error: ${userError.message}`)
        return
      }

      if (!user) {
        addLog("No authenticated user found")
        setStatus("error")
        setMessage("You are not logged in. Please sign in below.")
        return
      }

      addLog(`Authenticated as: ${user.email}`)
      setCurrentUser(user)

      // Check if the user has a profile in the users table
      const { data: profile, error: profileError } = await supabase.from("users").select("*").eq("id", user.id).single()

      if (profileError) {
        addLog(`Error getting user profile: ${profileError.message}`)
        setStatus("error")
        setMessage(`User profile error: ${profileError.message}`)
        return
      }

      addLog(`User profile found: ${profile.name} (${profile.role})`)
      setStatus("success")
      setMessage(`Successfully authenticated as ${user.email} with role: ${profile.role}`)
    } catch (error) {
      console.error("Error checking authentication:", error)
      addLog(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
      setStatus("error")
      setMessage(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const signIn = async () => {
    if (!email || !password) {
      setStatus("error")
      setMessage("Please enter both email and password")
      return
    }

    setStatus("loading")
    setMessage("Signing in...")
    setLogs([])
    setCurrentUser(null)

    try {
      addLog(`Attempting to sign in as: ${email}`)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        addLog(`Sign in error: ${error.message}`)
        setStatus("error")
        setMessage(`Sign in failed: ${error.message}`)
        return
      }

      if (!data.user) {
        addLog("Sign in returned no user")
        setStatus("error")
        setMessage("Sign in failed: No user returned")
        return
      }

      addLog(`Successfully signed in as: ${data.user.email}`)
      setCurrentUser(data.user)

      // Check if the user has a profile in the users table
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .single()

      if (profileError) {
        addLog(`Error getting user profile: ${profileError.message}`)
        setStatus("error")
        setMessage(`User profile error: ${profileError.message}`)
        return
      }

      addLog(`User profile found: ${profile.name} (${profile.role})`)
      setStatus("success")
      setMessage(`Successfully signed in as ${data.user.email} with role: ${profile.role}`)
    } catch (error) {
      console.error("Error signing in:", error)
      addLog(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
      setStatus("error")
      setMessage(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const signOut = async () => {
    setStatus("loading")
    setMessage("Signing out...")
    setLogs([])

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        addLog(`Sign out error: ${error.message}`)
        setStatus("error")
        setMessage(`Sign out failed: ${error.message}`)
        return
      }

      addLog("Successfully signed out")
      setCurrentUser(null)
      setStatus("success")
      setMessage("Successfully signed out")
    } catch (error) {
      console.error("Error signing out:", error)
      addLog(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
      setStatus("error")
      setMessage(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Check auth on page load
  useEffect(() => {
    checkAuth()
  }, [])

  return (
    <div className="container mx-auto py-10 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Check</CardTitle>
          <CardDescription>Check and fix authentication issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {status === "loading" && (
              <div className="flex items-center space-x-2 text-blue-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <p>{message}</p>
              </div>
            )}

            {status === "success" && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-700">{message}</AlertDescription>
              </Alert>
            )}

            {status === "error" && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {currentUser ? (
              <div className="p-4 border rounded-md">
                <p className="font-medium">Currently logged in as:</p>
                <p className="text-sm mt-1">Email: {currentUser.email}</p>
                <p className="text-sm">ID: {currentUser.id}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>
              </div>
            )}

            {logs.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Logs</h3>
                <div className="bg-gray-100 p-3 rounded-md max-h-60 overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index} className="text-xs font-mono mb-1">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button onClick={checkAuth} disabled={status === "loading"}>
            Check Auth
          </Button>
          {currentUser ? (
            <Button onClick={signOut} disabled={status === "loading"} variant="destructive">
              Sign Out
            </Button>
          ) : (
            <Button onClick={signIn} disabled={status === "loading"}>
              Sign In
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
