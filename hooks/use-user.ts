"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"

type User = {
  id: string
  email: string
  name?: string
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          const { data } = await supabase.from("users").select("id, email, name").eq("id", session.user.id).single()

          setUser(data)
        }
      } catch (error) {
        console.error("Error fetching user:", error)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [supabase])

  return { user, loading }
}
