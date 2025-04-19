"use server"

import { revalidatePath } from "next/cache"
import { createUserWithAPI } from "@/lib/user-utils"
import { createClient } from "@supabase/supabase-js"
import { sendEmailNotification, createUserNotification } from "@/lib/email"
import type { User, ActionFlow } from "@/lib/supabase"

// User actions
export async function createUserAction(userData: Omit<User, "id" | "created_at">, password: string) {
  try {
    // Create a Supabase admin client with service role key
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

    // First try the direct admin API approach
    try {
      console.log("Creating user with admin API:", userData.email)

      // Create the user in auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: userData.name,
          role: userData.role,
        },
      })

      if (authError) {
        console.error("Error creating auth user with admin API:", authError)
        throw authError
      }

      if (!authData.user) {
        throw new Error("Failed to create user with admin API")
      }

      console.log("Auth user created successfully:", authData.user.id)

      // Create the user profile
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from("users")
        .insert([
          {
            id: authData.user.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            status: userData.status,
            created_at: new Date().toISOString(),
          },
        ])
        .select()

      if (profileError) {
        console.error("Error creating user profile:", profileError)

        // Try to clean up the auth user if profile creation fails
        try {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        } catch (deleteError) {
          console.error("Error cleaning up auth user after profile creation failure:", deleteError)
        }

        throw profileError
      }

      console.log("User profile created successfully:", profileData[0])

      // Send welcome email
      try {
        await sendEmailNotification(createUserNotification(userData))
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError)
        // Continue even if email fails
      }

      revalidatePath("/admin/users")
      return { success: true, data: profileData[0] }
    } catch (adminApiError) {
      console.error("Admin API approach failed, trying API route fallback:", adminApiError)

      // If admin API fails, try the API route fallback
      const apiResult = await createUserWithAPI({
        name: userData.name,
        email: userData.email,
        password,
        role: userData.role,
        status: userData.status,
      })

      // Send welcome email
      try {
        await sendEmailNotification(createUserNotification(userData))
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError)
        // Continue even if email fails
      }

      revalidatePath("/admin/users")
      return { success: true, data: apiResult.user }
    }
  } catch (error: any) {
    console.error("Error creating user:", error)
    let errorMessage = "Failed to create user. Please try again."

    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === "string") {
      errorMessage = error
    }

    if (errorMessage.includes("already registered") || errorMessage.includes("already exists")) {
      errorMessage = "This email is already registered. Please use a different email address."
    }

    return { success: false, error: errorMessage }
  }
}

// Other actions remain unchanged...
export async function updateUserAction(id: string, updates: Partial<User>) {
  try {
    // Existing code...
  } catch (error: any) {
    console.error("Error updating user:", error)
    return { success: false, error: error.message || "Failed to update user. Please try again." }
  }
}

export async function deleteUserAction(id: string) {
  try {
    // Existing code...
  } catch (error: any) {
    console.error("Error deleting user:", error)
    return { success: false, error: error.message || "Failed to delete user. Please try again." }
  }
}

export async function createActionFlowAction(flowData: Omit<ActionFlow, "id" | "created_at">) {
  try {
    // Existing code...
  } catch (error: any) {
    console.error("Error creating action flow:", error)
    return { success: false, error: error.message || "Failed to create action flow. Please try again." }
  }
}

export async function updateActionFlowAction(id: string, updates: Partial<ActionFlow>) {
  try {
    // Existing code...
  } catch (error: any) {
    console.error("Error updating action flow:", error)
    return { success: false, error: error.message || "Failed to update action flow. Please try again." }
  }
}

export async function updateTaskCompletionAction(
  flowId: string,
  sectionId: string,
  taskId: string,
  completed: boolean,
) {
  try {
    // Existing code...
  } catch (error: any) {
    console.error("Error updating task completion:", error)
    return { success: false, error: error.message || "Failed to update task completion. Please try again." }
  }
}

export async function deleteActionFlowAction(id: string) {
  try {
    // Existing code...
  } catch (error: any) {
    console.error("Error deleting action flow:", error)
    return { success: false, error: error.message || "Failed to delete action flow. Please try again." }
  }
}
