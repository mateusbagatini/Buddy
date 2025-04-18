import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export async function checkUserAuth() {
  const supabase = createClientComponentClient()

  try {
    // Check if the user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      return {
        authenticated: false,
        error: `Authentication error: ${userError.message}`,
      }
    }

    if (!user) {
      return {
        authenticated: false,
        error: "No authenticated user found",
      }
    }

    // Check if the user has a profile in the users table
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, name, email, role")
      .eq("id", user.id)
      .single()

    if (profileError) {
      return {
        authenticated: true,
        user,
        error: `Profile error: ${profileError.message}`,
      }
    }

    return {
      authenticated: true,
      user,
      profile,
      isAdmin: profile.role === "admin",
    }
  } catch (error) {
    return {
      authenticated: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
