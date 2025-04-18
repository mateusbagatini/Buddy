"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function SetupAdmin() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [details, setDetails] = useState("")

  const setupAdmin = async () => {
    setStatus("loading")
    setMessage("Setting up admin user...")

    const supabase = createClientComponentClient()

    try {
      // Step 1: Create the user in auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: "bagatini.m@gmail.com",
        password: "628387",
        email_confirm: true,
      })

      if (authError) {
        // If the user already exists, try to continue anyway
        if (!authError.message.includes("already exists")) {
          throw authError
        }
        setDetails("User already exists in auth, attempting to set as admin...")

        // Get the user ID
        const { data: userData, error: userError } = await supabase.auth.admin.listUsers()
        if (userError) throw userError

        const user = userData.users.find((u) => u.email === "bagatini.m@gmail.com")
        if (!user) throw new Error("Could not find user in auth")

        // Step 2: Check if user exists in users table
        const { data: existingUser, error: existingUserError } = await supabase
          .from("users")
          .select("*")
          .eq("email", "bagatini.m@gmail.com")
          .single()

        if (existingUserError && !existingUserError.message.includes("No rows found")) {
          throw existingUserError
        }

        if (existingUser) {
          // Update user to admin if exists
          const { error: updateError } = await supabase
            .from("users")
            .update({ role: "admin", status: "active" })
            .eq("id", existingUser.id)

          if (updateError) throw updateError

          setStatus("success")
          setMessage("Admin user updated successfully!")
          setDetails(`User ID: ${existingUser.id}`)
          return
        }

        // Insert user if not exists
        const { data: insertData, error: insertError } = await supabase
          .from("users")
          .insert([
            {
              id: user.id,
              name: "Admin User",
              email: "bagatini.m@gmail.com",
              role: "admin",
              status: "active",
            },
          ])
          .select()

        if (insertError) throw insertError

        setStatus("success")
        setMessage("Admin user created successfully!")
        setDetails(`User ID: ${user.id}`)
        return
      }

      // If we get here, the user was created successfully
      const userId = authData.user.id

      // Step 2: Add user to users table with admin role
      const { error: insertError } = await supabase.from("users").insert([
        {
          id: userId,
          name: "Admin User",
          email: "bagatini.m@gmail.com",
          role: "admin",
          status: "active",
        },
      ])

      if (insertError) throw insertError

      setStatus("success")
      setMessage("Admin user created successfully!")
      setDetails(`User ID: ${userId}`)
    } catch (error) {
      console.error("Error setting up admin:", error)
      setStatus("error")
      setMessage("Failed to set up admin user")
      setDetails(error instanceof Error ? error.message : String(error))

      // Fallback method - direct SQL
      try {
        setDetails((prev) => prev + "\n\nAttempting fallback method...")

        // Try to create user with direct SQL
        const { error: sqlError } = await supabase.rpc("create_admin_user", {
          admin_email: "bagatini.m@gmail.com",
          admin_name: "Admin User",
        })

        if (sqlError) {
          setDetails((prev) => prev + "\n\nFallback method failed: " + sqlError.message)
        } else {
          setStatus("success")
          setMessage("Admin user created successfully using fallback method!")
        }
      } catch (fallbackError) {
        setDetails((prev) => prev + "\n\nFallback method error: " + String(fallbackError))
      }
    }
  }

  return (
    <div className="container mx-auto py-10 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Setup Admin User</CardTitle>
          <CardDescription>Create the initial admin user for your application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-md">
              <p className="font-medium">Admin Credentials</p>
              <p className="text-sm mt-1">Email: bagatini.m@gmail.com</p>
              <p className="text-sm">Password: 628387</p>
            </div>

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
        <CardFooter>
          <Button onClick={setupAdmin} disabled={status === "loading"} className="w-full">
            {status === "loading" ? "Setting up..." : "Create Admin User"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
