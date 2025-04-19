"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function FixUserIntegration() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [logs, setLogs] = useState<string[]>([])
  const [results, setResults] = useState({
    orphanedProfiles: 0,
    missingProfiles: 0,
    fixedProfiles: 0,
  })

  const supabase = createClientComponentClient()

  const addLog = (log: string) => {
    console.log(log)
    setLogs((prev) => [...prev, `[${new Date().toISOString()}] ${log}`])
  }

  const fixUserIntegration = async () => {
    setStatus("loading")
    setMessage("Fixing user integration issues...")
    setLogs([])
    setResults({
      orphanedProfiles: 0,
      missingProfiles: 0,
      fixedProfiles: 0,
    })

    try {
      // Step 1: Find auth users without profiles
      addLog("Finding auth users without profiles...")
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

      if (authError) {
        addLog(`Error listing auth users: ${authError.message}`)
        // Try a different approach if admin API is not available
        addLog("Trying alternative approach...")
        await fixWithoutAdminAccess()
        return
      }

      // Get all user profiles
      const { data: profiles, error: profilesError } = await supabase.from("users").select("id,email")

      if (profilesError) {
        throw new Error(`Error fetching user profiles: ${profilesError.message}`)
      }

      const profileIds = profiles.map((p) => p.id)
      const profileEmails = profiles.map((p) => p.email.toLowerCase())

      // Find auth users without profiles
      let missingProfiles = 0
      for (const user of authUsers.users) {
        if (!profileIds.includes(user.id)) {
          addLog(`Auth user ${user.email} (${user.id}) has no profile. Creating one...`)
          missingProfiles++

          // Create profile for this user
          const { error: insertError } = await supabase.from("users").insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email.split("@")[0],
            role: "user",
            status: "active",
          })

          if (insertError) {
            addLog(`Error creating profile: ${insertError.message}`)
          } else {
            addLog(`Created profile for ${user.email}`)
            setResults((prev) => ({ ...prev, fixedProfiles: prev.fixedProfiles + 1 }))
          }
        }
      }

      setResults((prev) => ({ ...prev, missingProfiles }))

      // Step 2: Find orphaned profiles (profiles without auth users)
      addLog("Finding orphaned profiles...")
      let orphanedProfiles = 0

      for (const profile of profiles) {
        const authUser = authUsers.users.find((u) => u.id === profile.id)
        if (!authUser) {
          addLog(`Profile ${profile.email} (${profile.id}) has no auth user. Marking for deletion...`)
          orphanedProfiles++

          // In a real app, you might want to delete these or mark them somehow
          // For safety, we'll just log them here
        }
      }

      setResults((prev) => ({ ...prev, orphanedProfiles }))

      // Success
      setStatus("success")
      setMessage(
        `Fixed ${results.fixedProfiles} user integration issues. Found ${missingProfiles} missing profiles and ${orphanedProfiles} orphaned profiles.`,
      )
    } catch (error) {
      console.error("Error fixing user integration:", error)
      setStatus("error")
      setMessage(`Error fixing user integration: ${error.message}`)
    }
  }

  // Alternative approach when admin access is not available
  const fixWithoutAdminAccess = async () => {
    try {
      addLog("Using SQL function to fix user integration...")

      // Execute SQL function to fix user integration
      const { data, error } = await supabase.rpc("fix_user_integration")

      if (error) {
        throw new Error(`Error executing fix_user_integration: ${error.message}`)
      }

      addLog(`SQL function executed successfully: ${JSON.stringify(data)}`)
      setStatus("success")
      setMessage("User integration fixed using SQL function.")
    } catch (error) {
      console.error("Error with alternative fix:", error)
      setStatus("error")
      setMessage(`Error with alternative fix: ${error.message}`)
    }
  }

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Fix User Integration</CardTitle>
          <CardDescription>Repair the connection between Supabase Auth and user profiles</CardDescription>
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

            {status === "success" && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="border rounded-md p-4">
                  <div className="text-sm font-medium">Missing Profiles</div>
                  <div className="text-2xl font-bold">{results.missingProfiles}</div>
                  <div className="text-xs text-muted-foreground">Auth users without profiles</div>
                </div>
                <div className="border rounded-md p-4">
                  <div className="text-sm font-medium">Orphaned Profiles</div>
                  <div className="text-2xl font-bold">{results.orphanedProfiles}</div>
                  <div className="text-xs text-muted-foreground">Profiles without auth users</div>
                </div>
                <div className="border rounded-md p-4">
                  <div className="text-sm font-medium">Fixed Profiles</div>
                  <div className="text-2xl font-bold">{results.fixedProfiles}</div>
                  <div className="text-xs text-muted-foreground">Profiles created or fixed</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={fixUserIntegration} disabled={status === "loading"}>
            {status === "loading" ? "Fixing..." : "Fix User Integration"}
          </Button>
        </CardFooter>
      </Card>

      {/* SQL Setup Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>SQL Function Setup</CardTitle>
          <CardDescription>
            Run this SQL in your Supabase SQL Editor to create a function that can fix user integration issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
            {`-- Create a function to fix user integration issues
CREATE OR REPLACE FUNCTION fix_user_integration()
RETURNS JSONB AS $$
DECLARE
  missing_profiles INT := 0;
  orphaned_profiles INT := 0;
  fixed_profiles INT := 0;
  auth_user RECORD;
  profile RECORD;
BEGIN
  -- Find auth users without profiles and create profiles for them
  FOR auth_user IN 
    SELECT au.id, au.email, au.raw_user_meta_data->>'name' as name
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    missing_profiles := missing_profiles + 1;
    
    -- Create a profile for this auth user
    INSERT INTO public.users (id, name, email, role, status, created_at)
    VALUES (
      auth_user.id,
      COALESCE(auth_user.name, split_part(auth_user.email, '@', 1)),
      auth_user.email,
      'user',
      'active',
      NOW()
    );
    
    fixed_profiles := fixed_profiles + 1;
  END LOOP;

  -- Find orphaned profiles (profiles without auth users)
  FOR profile IN 
    SELECT pu.id, pu.email
    FROM public.users pu
    LEFT JOIN auth.users au ON pu.id = au.id
    WHERE au.id IS NULL
  LOOP
    orphaned_profiles := orphaned_profiles + 1;
    
    -- For safety, we don't automatically delete orphaned profiles
    -- You can uncomment this if you want to delete them
    -- DELETE FROM public.users WHERE id = profile.id;
  END LOOP;

  -- Return results
  RETURN jsonb_build_object(
    'missing_profiles', missing_profiles,
    'orphaned_profiles', orphaned_profiles,
    'fixed_profiles', fixed_profiles
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
