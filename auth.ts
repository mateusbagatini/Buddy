import { supabase } from "@/lib/supabase"
import type { User } from "@/lib/supabase"

/**
 * Sign up a new user with email and password
 */
export async function signUp(email: string, password: string, userData: Omit<User, "id" | "created_at">) {
  try {
    // First create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: userData.name,
          role: userData.role,
        },
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
      },
    })

    if (authError) {
      console.error("Error signing up:", authError)
      throw authError
    }

    if (!authData.user) {
      throw new Error("Failed to create user")
    }

    // Then create the user profile
    const { data: profileData, error: profileError } = await supabase
      .from("users")
      .insert([
        {
          id: authData.user.id,
          email,
          ...userData,
          created_at: new Date().toISOString(),
        },
      ])
      .select()

    if (profileError) {
      console.error("Error creating user profile:", profileError)

      // Try to clean up the auth user if profile creation fails
      try {
        await supabase.auth.admin.deleteUser(authData.user.id)
      } catch (deleteError) {
        console.error("Error cleaning up auth user after profile creation failure:", deleteError)
      }

      throw profileError
    }

    return { auth: authData, profile: profileData[0] }
  } catch (error) {
    // Rethrow the error to be handled by the calling function
    throw error
  }
}
