"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function TestConnection() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    async function testConnection() {
      const supabase = createClientComponentClient()
      try {
        // Simple query to test the connection
        const { data, error } = await supabase.from("users").select("count()", { count: "exact" })

        if (error) throw error

        setStatus("success")
        setMessage(`Connection successful! Found ${data[0].count} users.`)
      } catch (error: any) {
        console.error("Error:", error)
        setStatus("error")
        setMessage(error.message || "Unknown error")
      }
    }

    testConnection()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>

      {status === "loading" && <p>Testing connection...</p>}

      {status === "success" && (
        <div className="p-4 bg-green-100 text-green-800 rounded">
          <p className="font-bold">✅ Success!</p>
          <p>{message}</p>
        </div>
      )}

      {status === "error" && (
        <div className="p-4 bg-red-100 text-red-800 rounded">
          <p className="font-bold">❌ Connection Failed</p>
          <p>{message}</p>
          <div className="mt-4">
            <p className="font-semibold">Debug Information:</p>
            <p>NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Not set"}</p>
            <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Not set"}</p>
          </div>
        </div>
      )}
    </div>
  )
}
