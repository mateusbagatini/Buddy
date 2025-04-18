import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type User = {
  id: string
  name: string
  email: string
  role: "admin" | "user"
  status: "active" | "inactive"
  avatar_url?: string
  created_at?: string
}

export type ActionFlow = {
  id: string
  title: string
  description?: string
  deadline?: string
  status: "Draft" | "In Progress" | "Completed"
  user_id?: string | null
  sections: any[] // Using any[] as the type is complex and defined elsewhere
  created_at?: string
}

async function signIn(email: string, password: string) {
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

export { signIn }
