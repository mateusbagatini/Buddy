import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    const { name, email, password, role, status } = await request.json()

    // Validate required fields
    if (!name || !email || !password || !role || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("API route: Creating user:", email)

    // Create a Supabase client with admin privileges
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ADMIN_KEY || "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )

    // Create the user in auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
      },
    })

    if (authError) {
      console.error("API route: Error creating auth user:", authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }

    console.log("API route: Auth user created successfully:", authData.user.id)

    // Create the user profile
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("users")
      .insert([
        {
          id: authData.user.id,
          name,
          email,
          role,
          status,
          created_at: new Date().toISOString(),
        },
      ])
      .select()

    if (profileError) {
      console.error("API route: Error creating user profile:", profileError)

      // Try to clean up the auth user
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      } catch (deleteError) {
        console.error("API route: Error cleaning up auth user:", deleteError)
      }

      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    console.log("API route: User profile created successfully")

    return NextResponse.json({
      success: true,
      user: profileData[0],
      message: "User created successfully",
    })
  } catch (error) {
    console.error("Error in user creation API:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
