"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function SetupMasterAdmin() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [details, setDetails] = useState("")
  const [logs, setLogs] = useState<string[]>([])
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const addLog = (log: string) => {
    console.log(log) // Also log to console for debugging
    setLogs((prev) => [...prev, `[${new Date().toISOString()}] ${log}`])
  }

  const setupMasterAdmin = async () => {
    setStatus("loading")
    setMessage("Setting up master admin user...")
    setLogs([])
    setDebugInfo(null)

    const supabase = createClientComponentClient()

    try {
      // Step 1: Check if the users table exists
      addLog("Checking if users table exists...")

      const { data: tableInfo, error: tableError } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "public")
        .eq("table_name", "users")
        .single()

      if (tableError) {
        addLog(`Error checking users table: ${tableError.message}`)
        // Continue anyway, as this might be a permissions issue
      } else {
        if (!tableInfo) {
          addLog("Users table not found! Creating users table...")

          // Try to create the users table
          const { error: createTableError } = await supabase.rpc("create_users_table")

          if (createTableError) {
            addLog(`Failed to create users table: ${createTableError.message}`)
            // Continue anyway, we'll try to insert and see what happens
          } else {
            addLog("Users table created successfully")
          }
        } else {
          addLog("Users table exists")
        }
      }

      // Step 2: Try to sign up the user
      addLog("Attempting to sign up master admin user...")

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: "bagatini.m@gmail.com",
        password: "628387",
      })

      let userId: string | undefined

      if (signUpError) {
        addLog(`Sign up error: ${signUpError.message}`)

        // If user already exists, try to sign in
        if (signUpError.message.includes("already registered") || signUpError.message.includes("already exists")) {
          addLog("User already exists, attempting to sign in...")

          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: "bagatini.m@gmail.com",
            password: "628387",
          })

          if (signInError) {
            throw new Error(`Sign in failed: ${signInError.message}`)
          }

          userId = signInData.user.id
          addLog(`Signed in successfully, user ID: ${userId}`)
        } else {
          // If it's not a "user exists" error, throw it
          throw signUpError
        }
      } else {
        // If sign up was successful
        userId = signUpData.user?.id
        addLog(`User signed up successfully, ID: ${userId}`)
      }

      if (!userId) {
        throw new Error("Failed to get user ID")
      }

      // Step 3: Get current user to verify
      const {
        data: { user },
        error: getUserError,
      } = await supabase.auth.getUser()

      if (getUserError) {
        addLog(`Error getting current user: ${getUserError.message}`)
      } else {
        addLog(`Current user: ${user?.id}`)
      }

      // Step 4: Check if user exists in users table
      addLog("Checking if user exists in users table...")

      const { data: existingUser, error: existingUserError } = await supabase
        .from("users")
        .select("*")
        .eq("email", "bagatini.m@gmail.com")

      setDebugInfo({ existingUserQuery: existingUserError || existingUser })

      if (existingUserError) {
        addLog(`Error checking existing user: ${existingUserError.message}`)

        // This might be because the table doesn't exist or has a different structure
        addLog("Attempting direct insert with minimal fields...")

        // Try a simplified insert
        const { data: simpleInsert, error: simpleInsertError } = await supabase
          .from("users")
          .insert({
            id: userId,
            email: "bagatini.m@gmail.com",
            role: "admin",
          })
          .select()

        if (simpleInsertError) {
          addLog(`Simple insert failed: ${simpleInsertError.message}`)
          throw new Error(`Failed to create user record: ${simpleInsertError.message}`)
        }

        addLog("Simple insert successful!")
        setStatus("success")
        setMessage("Master admin user set up successfully!")
        setDetails(`You can now log in with email: bagatini.m@gmail.com and password: 628387`)
        return
      }

      if (existingUser && existingUser.length > 0) {
        addLog(`User exists in users table, ID: ${existingUser[0].id}, role: ${existingUser[0].role}`)

        // Update user to admin if not already
        if (existingUser[0].role !== "admin") {
          addLog("Updating user to admin role...")

          const { error: updateError } = await supabase
            .from("users")
            .update({ role: "admin", status: "active" })
            .eq("id", existingUser[0].id)

          if (updateError) {
            throw new Error(`Failed to update user role: ${updateError.message}`)
          }

          addLog("User role updated to admin successfully")
        }

        setStatus("success")
        setMessage("Master admin user set up successfully!")
        setDetails(`You can now log in with email: bagatini.m@gmail.com and password: 628387`)
        return
      }

      // Step 5: Create user record in users table
      addLog("Creating user record in users table...")

      // Log the data we're trying to insert for debugging
      const userData = {
        id: userId,
        name: "Admin User",
        email: "bagatini.m@gmail.com",
        role: "admin",
        status: "active",
      }
      addLog(`Inserting user data: ${JSON.stringify(userData)}`)

      const { data: insertData, error: insertError } = await supabase.from("users").insert([userData]).select()

      if (insertError) {
        // Log the full error for debugging
        console.error("Insert error:", insertError)
        addLog(`Insert error code: ${insertError.code}`)
        addLog(`Insert error details: ${JSON.stringify(insertError.details)}`)

        // Try alternative approach with upsert
        addLog("Trying upsert instead of insert...")

        const { data: upsertData, error: upsertError } = await supabase.from("users").upsert([userData]).select()

        if (upsertError) {
          throw new Error(`Failed to create user record: ${upsertError.message}`)
        }

        addLog("User record created successfully via upsert")
      } else {
        addLog("User record created successfully")
      }

      setStatus("success")
      setMessage("Master admin user set up successfully!")
      setDetails(`You can now log in with email: bagatini.m@gmail.com and password: 628387`)
    } catch (error) {
      console.error("Error setting up master admin:", error)
      setStatus("error")
      setMessage("Failed to set up master admin user")
      setDetails(error instanceof Error ? error.message : String(error))
    }
  }

  // Function to create users table via SQL
  const createUsersTable = async () => {
    setStatus("loading")
    setMessage("Creating users table...")
    setLogs([])

    const supabase = createClientComponentClient()

    try {
      addLog("Attempting to create users table via SQL...")

      // Execute SQL to create the users table
      const { error } = await supabase.rpc("execute_sql", {
        sql_string: `
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            name TEXT,
            email TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL,
            status TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `,
      })

      if (error) {
        throw new Error(`Failed to create users table: ${error.message}`)
      }

      addLog("Users table created successfully")
      setStatus("success")
      setMessage("Users table created successfully")
      setDetails("Now try setting up the master admin user again")
    } catch (error) {
      console.error("Error creating users table:", error)
      setStatus("error")
      setMessage("Failed to create users table")
      setDetails(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <div className="container mx-auto py-10 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Setup Master Admin User</CardTitle>
          <CardDescription>Create your master admin account without using Supabase directly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-md">
              <p className="font-medium">Master Admin Credentials</p>
              <p className="text-sm mt-1">Email: bagatini.m@gmail.com</p>
              <p className="text-sm">Password: 628387</p>
            </div>

            {status === "loading" && (
              <div className="flex items-center space-x-2 text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p>{message}</p>
              </div>
            )}

            {status === "success" && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-700">{message}</AlertDescription>
                {details && <p className="text-sm mt-2 text-green-600">{details}</p>}
              </Alert>
            )}

            {status === "error" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
                {details && <p className="text-sm mt-2">{details}</p>}
              </Alert>
            )}

            {logs.length > 0 && (
              <div className="mt-4">
                <p className="font-medium mb-2">Process Log:</p>
                <div className="bg-gray-100 p-3 rounded-md max-h-60 overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index} className="text-xs font-mono mb-1">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {debugInfo && (
              <div className="mt-4">
                <p className="font-medium mb-2">Debug Info:</p>
                <pre className="bg-gray-100 p-3 rounded-md max-h-60 overflow-y-auto text-xs">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Button onClick={setupMasterAdmin} disabled={status === "loading"} className="w-full">
            {status === "loading" ? "Setting up..." : "Create Master Admin User"}
          </Button>

          <Button onClick={createUsersTable} variant="outline" disabled={status === "loading"} className="w-full">
            Create Users Table (If Missing)
          </Button>
        </CardFooter>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>SQL Setup Instructions</CardTitle>
          <CardDescription>If the automatic setup fails, you can run this SQL in Supabase</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-3 rounded-md overflow-auto text-xs">
            {`-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  status TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Get the user ID from auth.users
DO $$
DECLARE
  user_id UUID;
BEGIN
  -- Check if user exists in auth.users
  SELECT id INTO user_id FROM auth.users WHERE email = 'bagatini.m@gmail.com';
  
  -- If user doesn't exist, we need to create them
  IF user_id IS NULL THEN
    -- Create user in auth.users (requires admin privileges)
    INSERT INTO auth.users (
      email,
      encrypted_password,
      email_confirmed_at,
      role
    ) VALUES (
      'bagatini.m@gmail.com',
      crypt('628387', gen_salt('bf')),
      now(),
      'authenticated'
    )
    RETURNING id INTO user_id;
  END IF;
  
  -- Insert or update user in users table
  INSERT INTO users (id, name, email, role, status)
  VALUES (
    user_id,
    'Admin User',
    'bagatini.m@gmail.com',
    'admin',
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET role = 'admin', status = 'active';
  
  -- Also handle case where email might exist with different ID
  DELETE FROM users 
  WHERE email = 'bagatini.m@gmail.com' AND id != user_id;
END $$;`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
