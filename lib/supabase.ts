import { createClient } from "@supabase/supabase-js"

// Create a single supabase client for interacting with your database
export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Types for our database tables
export type User = {
  id: string
  name: string
  email: string
  role: "admin" | "user"
  status: "active" | "inactive"
  created_at?: string
  avatar_url?: string
}

export type ActionFlow = {
  id: string
  title: string
  description?: string
  deadline?: string
  status: "Draft" | "In Progress" | "Completed"
  created_at?: string
  user_id?: string | null // ID of the assigned user
  sections: Section[]
}

export type Section = {
  id: string
  title: string
  tasks: Task[]
}

export type Task = {
  id: string
  title: string
  description?: string
  completed: boolean
  inputs?: Input[]
}

export type Input = {
  id: string
  type: "text" | "file"
  label: string
  value?: string
}

// User functions
export async function getUsers() {
  const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching users:", error)
    throw error
  }

  return data as User[]
}

export async function getUserById(id: string) {
  const { data, error } = await supabase.from("users").select("*").eq("id", id).single()

  if (error) {
    console.error("Error fetching user:", error)
    throw error
  }

  return data as User
}

export async function createUser(user: Omit<User, "id" | "created_at">) {
  const { data, error } = await supabase
    .from("users")
    .insert([{ ...user, created_at: new Date().toISOString() }])
    .select()

  if (error) {
    console.error("Error creating user:", error)
    throw error
  }

  return data[0] as User
}

export async function updateUser(id: string, updates: Partial<User>) {
  const { data, error } = await supabase.from("users").update(updates).eq("id", id).select()

  if (error) {
    console.error("Error updating user:", error)
    throw error
  }

  return data[0] as User
}

export async function deleteUser(id: string) {
  // First, check if this user has any assigned action flows
  const { data: flows, error: flowsError } = await supabase.from("action_flows").select("id").eq("user_id", id)

  if (flowsError) {
    console.error("Error checking user's action flows:", flowsError)
    throw flowsError
  }

  // If user has assigned action flows, unassign them
  if (flows && flows.length > 0) {
    const { error: updateError } = await supabase.from("action_flows").update({ user_id: null }).eq("user_id", id)

    if (updateError) {
      console.error("Error unassigning action flows:", updateError)
      throw updateError
    }
  }

  // Delete the user from the users table
  const { error: deleteError } = await supabase.from("users").delete().eq("id", id)

  if (deleteError) {
    console.error("Error deleting user from users table:", deleteError)
    throw deleteError
  }

  // Delete the user from auth.users (requires admin privileges)
  try {
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(id)

    if (authDeleteError) {
      console.error("Error deleting user from auth:", authDeleteError)
      // We don't throw here because the user is already deleted from the users table
      // and this might be a permissions issue
    }
  } catch (error) {
    console.error("Error deleting user from auth (might be a permissions issue):", error)
    // We don't throw here because the user is already deleted from the users table
  }

  return true
}

// Action Flow functions
export async function getActionFlows() {
  const { data, error } = await supabase.from("action_flows").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching action flows:", error)
    throw error
  }

  return data.map((flow) => ({
    ...flow,
    sections: flow.sections || [],
  })) as ActionFlow[]
}

export async function getActionFlowById(id: string) {
  const { data, error } = await supabase.from("action_flows").select("*").eq("id", id).single()

  if (error) {
    console.error("Error fetching action flow:", error)
    throw error
  }

  return {
    ...data,
    sections: data.sections || [],
  } as ActionFlow
}

export async function getActionFlowsByUserId(userId: string) {
  const { data, error } = await supabase
    .from("action_flows")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching user action flows:", error)
    throw error
  }

  return data.map((flow) => ({
    ...flow,
    sections: flow.sections || [],
  })) as ActionFlow[]
}

export async function createActionFlow(flow: Omit<ActionFlow, "id" | "created_at">) {
  const { data, error } = await supabase
    .from("action_flows")
    .insert([{ ...flow, created_at: new Date().toISOString() }])
    .select()

  if (error) {
    console.error("Error creating action flow:", error)
    throw error
  }

  return data[0] as ActionFlow
}

export async function updateActionFlow(id: string, updates: Partial<ActionFlow>) {
  const { data, error } = await supabase.from("action_flows").update(updates).eq("id", id).select()

  if (error) {
    console.error("Error updating action flow:", error)
    throw error
  }

  return data[0] as ActionFlow
}

export async function updateTaskCompletion(flowId: string, sectionId: string, taskId: string, completed: boolean) {
  // First get the current flow
  const flow = await getActionFlowById(flowId)
  if (!flow) throw new Error("Action flow not found")

  // Update the task completion status
  const updatedSections = flow.sections.map((section) =>
    section.id === sectionId
      ? {
          ...section,
          tasks: section.tasks.map((task) => (task.id === taskId ? { ...task, completed } : task)),
        }
      : section,
  )

  // Update the flow with the new sections
  return updateActionFlow(flowId, { sections: updatedSections })
}

export async function deleteActionFlow(id: string) {
  const { error } = await supabase.from("action_flows").delete().eq("id", id)

  if (error) {
    console.error("Error deleting action flow:", error)
    throw error
  }

  return true
}

// Authentication functions
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error("Error signing in:", error)
    throw error
  }

  return data
}

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
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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

export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error("Error signing out:", error)
    throw error
  }

  return true
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    console.error("Error getting current user:", error)
    return null
  }

  if (!data.user) {
    return null
  }

  // Get the user profile
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", data.user.id)
    .single()

  if (profileError) {
    console.error("Error getting user profile:", profileError)
    return null
  }

  return profile as User
}
