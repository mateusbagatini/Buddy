"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export default function CheckUserIntegration() {
  const [results, setResults] = useState({
    authUser: { status: "pending", message: "Checking authenticated user..." },
    userProfile: { status: "pending", message: "Checking user profile..." },
    userIntegration: { status: "pending", message: "Checking user integration..." },
    testUser: { status: "pending", message: "Testing user creation..." },
  })
  const [logs, setLogs] = useState<string[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)

  const supabase = createClientComponentClient()

  const addLog = (log: string) => {
    console.log(log)
    setLogs((prev) => [...prev, `[${new Date().toISOString()}] ${log}`])
  }

  const runDiagnostics = async () => {
    // Reset results
    setResults({
      authUser: { status: "pending", message: "Checking authenticated user..." },
      userProfile: { status: "pending", message: "Checking user profile..." },
      userIntegration: { status: "pending", message: "Checking user integration..." },
      testUser: { status: "pending", message: "Testing user creation..." },
    })
    setLogs([])
    setCurrentUser(null)

    // Check authenticated user
    try {
      addLog("Checking authenticated user...")
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error) {
        addLog(`Error getting authenticated user: ${error.message}`)
        setResults((prev) => ({
          ...prev,
          authUser: { status: "error", message: `Error getting authenticated user: ${error.message}` },
        }))
      } else if (!user) {
        addLog("No authenticated user found")
        setResults((prev) => ({
          ...prev,
          authUser: { status: "warning", message: "No authenticated user found" },
        }))
      } else {
        addLog(`Authenticated user found: ${user.id} (${user.email})`)
        setCurrentUser(user)
        setResults((prev) => ({
          ...prev,
          authUser: { status: "success", message: `Authenticated user found: ${user.id} (${user.email})` },
        }))

        // Check user profile
        try {
          addLog("Checking user profile...")
          const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single()

          if (profileError) {
            addLog(`Error getting user profile: ${profileError.message}`)
            setResults((prev) => ({
              ...prev,
              userProfile: { status: "error", message: `Error getting user profile: ${profileError.message}` },
            }))
          } else if (!profile) {
            addLog("User profile not found")
            setResults((prev) => ({
              ...prev,
              userProfile: { status: "error", message: "User profile not found" },
            }))
          } else {
            addLog(`User profile found: ${profile.id} (${profile.name || profile.email})`)
            setResults((prev) => ({
              ...prev,
              userProfile: {
                status: "success",
                message: `User profile found: ${profile.id} (${profile.name || profile.email})`,
              },
            }))

            // Check user integration
            if (profile.id === user.id) {
              addLog("User integration is correct: Auth ID matches profile ID")
              setResults((prev) => ({
                ...prev,
                userIntegration: {
                  status: "success",
                  message: "User integration is correct: Auth ID matches profile ID",
                },
              }))
            } else {
              addLog("User integration issue: Auth ID does not match profile ID")
              setResults((prev) => ({
                ...prev,
                userIntegration: {
                  status: "error",
                  message: "User integration issue: Auth ID does not match profile ID",
                },
              }))
            }
          }
        } catch (error) {
          addLog(`Error checking user profile: ${error.message}`)
          setResults((prev) => ({
            ...prev,
            userProfile: { status: "error", message: `Error checking user profile: ${error.message}` },
          }))
        }
      }
    } catch (error) {
      addLog(`Error checking authenticated user: ${error.message}`)
      setResults((prev) => ({
        ...prev,
        authUser: { status: "error", message: `Error checking authenticated user: ${error.message}` },
      }))
    }

    // Test user creation
    try {
      addLog("Testing user creation...")

      // Generate a unique email
      const testEmail = `test-${Date.now()}@example.com`
      const testPassword = "password123"
      const testName = "Test User"

      addLog(`Creating test user: ${testEmail}`)

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            name: testName,
          },
        },
      })

      if (authError) {
        addLog(`Error creating auth user: ${authError.message}`)
        setResults((prev) => ({
          ...prev,
          testUser: { status: "error", message: `Error creating auth user: ${authError.message}` },
        }))
        return
      }

      if (!authData.user) {
        addLog("Auth user creation failed: No user returned")
        setResults((prev) => ({
          ...prev,
          testUser: { status: "error", message: "Auth user creation failed: No user returned" },
        }))
        return
      }

      addLog(`Auth user created: ${authData.user.id}`)

      // Create user profile
      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .insert([
          {
            id: authData.user.id,
            name: testName,
            email: testEmail,
            role: "user",
            status: "active",
          },
        ])
        .select()

      if (profileError) {
        addLog(`Error creating user profile: ${profileError.message}`)
        setResults((prev) => ({
          ...prev,
          testUser: { status: "error", message: `Error creating user profile: ${profileError.message}` },
        }))
        return
      }

      addLog("Test user created successfully")
      setResults((prev) => ({
        ...prev,
        testUser: { status: "success", message: "Test user created successfully" },
      }))

      // Clean up test user
      try {
        addLog("Cleaning up test user...")

        // Delete from users table
        const { error: deleteProfileError } = await supabase.from("users").delete().eq("id", authData.user.id)

        if (deleteProfileError) {
          addLog(`Error deleting user profile: ${deleteProfileError.message}`)
        }

        // Delete from auth
        try {
          const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(authData.user.id)

          if (deleteAuthError) {
            addLog(`Error deleting auth user: ${deleteAuthError.message}`)
          }
        } catch (error) {
          addLog(`Error deleting auth user (might be a permissions issue): ${error.message}`)
        }

        addLog("Test user cleaned up")
      } catch (error) {
        addLog(`Error cleaning up test user: ${error.message}`)
      }
    } catch (error) {
      addLog(`Error testing user creation: ${error.message}`)
      setResults((prev) => ({
        ...prev,
        testUser: { status: "error", message: `Error testing user creation: ${error.message}` },
      }))
    }
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  const StatusIcon = ({ status }: { status: "pending" | "success" | "error" | "warning" }) => {
    if (status === "success") return <CheckCircle className="h-5 w-5 text-green-500" />
    if (status === "error") return <XCircle className="h-5 w-5 text-red-500" />
    if (status === "warning") return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    return <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
  }

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>User Integration Diagnostics</CardTitle>
          <CardDescription>Check your user integration between Supabase Auth and users table</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auth User */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Authenticated User</h3>
              <StatusIcon status={results.authUser.status} />
            </div>
            <p className={`mt-2 ${results.authUser.status === "error" ? "text-red-500" : ""}`}>
              {results.authUser.message}
            </p>
          </div>

          {/* User Profile */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">User Profile</h3>
              <StatusIcon status={results.userProfile.status} />
            </div>
            <p className={`mt-2 ${results.userProfile.status === "error" ? "text-red-500" : ""}`}>
              {results.userProfile.message}
            </p>
          </div>

          {/* User Integration */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">User Integration</h3>
              <StatusIcon status={results.userIntegration.status} />
            </div>
            <p className={`mt-2 ${results.userIntegration.status === "error" ? "text-red-500" : ""}`}>
              {results.userIntegration.message}
            </p>
          </div>

          {/* Test User */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Test User Creation</h3>
              <StatusIcon status={results.testUser.status} />
            </div>
            <p className={`mt-2 ${results.testUser.status === "error" ? "text-red-500" : ""}`}>
              {results.testUser.message}
            </p>
          </div>

          {/* Logs */}
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

          {/* Current User */}
          {currentUser && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Current User</h3>
              <pre className="bg-gray-100 p-3 rounded-md max-h-60 overflow-y-auto text-xs">
                {JSON.stringify(currentUser, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={runDiagnostics}>Run Diagnostics Again</Button>
        </CardFooter>
      </Card>

      {/* SQL Setup Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>SQL Setup Instructions</CardTitle>
          <CardDescription>
            If you're having issues, run this SQL in your Supabase SQL Editor to fix user integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
            {`-- Fix missing user profiles
DO $$
DECLARE
  auth_user RECORD;
BEGIN
  -- Loop through auth.users that don't have a profile
  FOR auth_user IN 
    SELECT au.id, au.email, au.raw_user_meta_data->>'name' as name
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    -- Create a profile for each missing user
    INSERT INTO public.users (id, name, email, role, status, created_at)
    VALUES (
      auth_user.id,
      COALESCE(auth_user.name, 'User'),
      auth_user.email,
      'user',
      'active',
      NOW()
    );
    
    RAISE NOTICE 'Created profile for user: % (%)', auth_user.email, auth_user.id;
  END LOOP;
END $$;

-- Fix orphaned profiles (profiles without auth users)
DO $$
DECLARE
  orphan_profile RECORD;
BEGIN
  -- Find orphaned profiles
  FOR orphan_profile IN 
    SELECT pu.id, pu.email
    FROM public.users pu
    LEFT JOIN auth.users au ON pu.id = au.id
    WHERE au.id IS NULL
  LOOP
    -- Delete orphaned profiles
    DELETE FROM public.users WHERE id = orphan_profile.id;
    
    RAISE NOTICE 'Deleted orphaned profile: % (%)', orphan_profile.email, orphan_profile.id;
  END LOOP;
END $$;`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
