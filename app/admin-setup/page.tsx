"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function AdminSetup() {
  const [status, setStatus] = useState<"checking" | "fixing" | "success" | "error">("checking")
  const [message, setMessage] = useState("Checking admin user status...")
  const [details, setDetails] = useState("")
  const [userId, setUserId] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  // Check admin status on load
  useEffect(() => {
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    setStatus("checking")
    setMessage("Checking admin user status...")

    try {
      // Step 1: Check if user exists in auth
      const { data: authUsers, error: authError } = await supabase
        .from("auth.users")
        .select("id, email")
        .eq("email", "bagatini.m@gmail.com")
        .maybeSingle()

      if (authError && !authError.message.includes("does not exist")) {
        throw new Error(`Auth check error: ${authError.message}`)
      }

      // If we can't query auth.users directly, try a different approach
      let authUserId = authUsers?.id

      if (!authUserId) {
        // Try to sign in to get the user ID
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: "bagatini.m@gmail.com",
          password: "628387",
        })

        if (signInError) {
          setDetails(`User doesn't exist in auth or password is incorrect: ${signInError.message}`)
        } else if (signInData?.user) {
          authUserId = signInData.user.id
          setDetails(`Found user in auth with ID: ${authUserId}`)
        }
      } else {
        setDetails(`Found user in auth with ID: ${authUserId}`)
      }

      setUserId(authUserId || null)

      // Step 2: Check if user exists in users table with admin role
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", "bagatini.m@gmail.com")
        .maybeSingle()

      if (userError && !userError.message.includes("No rows found")) {
        throw new Error(`User check error: ${userError.message}`)
      }

      if (!userData) {
        setMessage("Admin user not found in users table")
        return
      }

      if (userData.role !== "admin") {
        setMessage("User exists but doesn't have admin role")
        return
      }

      // All good!
      setStatus("success")
      setMessage("Admin user exists with correct privileges")
      setDetails(`User ID: ${userData.id}, Role: ${userData.role}, Status: ${userData.status}`)
    } catch (error) {
      console.error("Error checking admin status:", error)
      setStatus("error")
      setMessage("Error checking admin status")
      setDetails(error instanceof Error ? error.message : String(error))
    }
  }

  const fixAdminUser = async () => {
    setStatus("fixing")
    setMessage("Fixing admin user...")

    try {
      // If we don't have a user ID, we need to create the user in auth
      if (!userId) {
        // Try to create user in auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: "bagatini.m@gmail.com",
          password: "628387",
          email_confirm: true,
        })

        if (authError) {
          // If this fails, we need a different approach
          setDetails(`Failed to create auth user: ${authError.message}`)

          // Try direct SQL approach
          const { data: sqlData, error: sqlError } = await supabase.rpc("create_admin_user_manual", {
            admin_email: "bagatini.m@gmail.com",
            admin_password: "628387",
          })

          if (sqlError) {
            throw new Error(`Failed to create user via SQL: ${sqlError.message}`)
          }

          setStatus("success")
          setMessage("Admin user created via SQL function")
          setDetails("Please try logging in now")
          return
        }

        setUserId(authData.user.id)
        setDetails(`Created auth user with ID: ${authData.user.id}`)
      }

      // Now ensure the user exists in the users table with admin role
      const { data: upsertData, error: upsertError } = await supabase
        .from("users")
        .upsert(
          {
            id: userId,
            name: "Admin User",
            email: "bagatini.m@gmail.com",
            role: "admin",
            status: "active",
            created_at: new Date().toISOString(),
          },
          { onConflict: "email" },
        )
        .select()

      if (upsertError) {
        throw new Error(`Failed to update user record: ${upsertError.message}`)
      }

      setStatus("success")
      setMessage("Admin user fixed successfully!")
      setDetails("You should now be able to log in with admin privileges")
    } catch (error) {
      console.error("Error fixing admin user:", error)
      setStatus("error")
      setMessage("Failed to fix admin user")
      setDetails(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <div className="container mx-auto py-10 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Admin User Setup</CardTitle>
          <CardDescription>Check and fix admin privileges for bagatini.m@gmail.com</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-md">
              <p className="font-medium">Admin Credentials</p>
              <p className="text-sm mt-1">Email: bagatini.m@gmail.com</p>
              <p className="text-sm">Password: 628387</p>
            </div>

            {status === "checking" && (
              <div className="flex items-center space-x-2 text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p>{message}</p>
              </div>
            )}

            {status === "fixing" && (
              <div className="flex items-center space-x-2 text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p>{message}</p>
              </div>
            )}

            {status === "success" && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-700">{message}</AlertDescription>
                {details && <p className="text-xs mt-2 text-green-600">{details}</p>}
              </Alert>
            )}

            {status === "error" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
                {details && <p className="text-xs mt-2 whitespace-pre-wrap">{details}</p>}
              </Alert>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={checkAdminStatus} disabled={status === "checking" || status === "fixing"}>
            Check Status
          </Button>
          <Button
            onClick={fixAdminUser}
            disabled={status === "checking" || status === "fixing" || status === "success"}
          >
            Fix Admin User
          </Button>
        </CardFooter>
      </Card>

      {/* SQL Function Creation */}
      {status === "error" && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>SQL Function Setup</CardTitle>
            <CardDescription>Run this SQL in your Supabase SQL Editor to create a helper function</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {`-- Create a function to set up the admin user
CREATE OR REPLACE FUNCTION create_admin_user_manual(admin_email TEXT, admin_password TEXT)
RETURNS TEXT AS $$
DECLARE
  user_id UUID;
BEGIN
  -- First try to find if the user already exists in auth.users
  SELECT id INTO user_id FROM auth.users WHERE email = admin_email;
  
  -- If user doesn't exist in auth, create them
  IF user_id IS NULL THEN
    -- This requires admin privileges, which you have in the SQL editor
    INSERT INTO auth.users (
      email,
      encrypted_password,
      email_confirmed_at,
      role
    ) VALUES (
      admin_email,
      crypt(admin_password, gen_salt('bf')),
      now(),
      'authenticated'
    )
    RETURNING id INTO user_id;
  END IF;
  
  -- Now check if user exists in the users table
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = user_id) THEN
    -- Insert into users table with admin role
    INSERT INTO users (
      id,
      name,
      email,
      role,
      status,
      created_at
    ) VALUES (
      user_id,
      'Admin User',
      admin_email,
      'admin',
      'active',
      now()
    );
  ELSE
    -- Update existing user to be admin
    UPDATE users
    SET role = 'admin', status = 'active'
    WHERE id = user_id;
  END IF;
  
  RETURN 'Admin user created successfully with ID: ' || user_id;
END;
$$ LANGUAGE plpgsql;`}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
