import { supabase } from "@/lib/supabase-utils"

export async function refreshSession() {
  try {
    // Try to refresh the session
    const { data, error } = await supabase.auth.refreshSession()

    if (error) {
      console.error("Error refreshing session:", error)
      return { success: false, error: error.message }
    }

    if (!data.session) {
      return { success: false, error: "No session found" }
    }

    return { success: true, user: data.user }
  } catch (error) {
    console.error("Unexpected error refreshing session:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error("Error signing in:", error)
      return { success: false, error: error.message }
    }

    if (!data.user) {
      return { success: false, error: "No user returned" }
    }

    return { success: true, user: data.user, session: data.session }
  } catch (error) {
    console.error("Unexpected error signing in:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("Error signing out:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Unexpected error signing out:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.error("Error getting user:", error)
      return { success: false, error: error.message }
    }

    if (!data.user) {
      return { success: false, error: "No user found" }
    }

    return { success: true, user: data.user }
  } catch (error) {
    console.error("Unexpected error getting user:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
