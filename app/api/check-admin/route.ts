import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    // Check if we have the service role key
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ADMIN_KEY || ""
    const hasServiceRoleKey = !!serviceRoleKey && serviceRoleKey.length > 0

    // If we have the key, try to use it to verify admin access
    let hasAdminAccess = false

    if (hasServiceRoleKey) {
      try {
        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })

        // Try to list users - this requires admin privileges
        const { data, error } = await supabaseAdmin.auth.admin.listUsers()

        if (!error && data) {
          hasAdminAccess = true
        }
      } catch (error) {
        console.error("Error testing admin access:", error)
      }
    }

    return NextResponse.json({
      hasServiceRoleKey,
      hasAdminAccess,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    })
  } catch (error) {
    console.error("Error in check-admin API:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
