"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export default function TestConnection() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function testConnection() {
      try {
        // Simple query to test the connection
        const { data, error } = await supabase.from("users").select("count()", { count: "exact" })

        if (error) {
          throw error
        }

        setStatus("success")
      } catch (error) {
        console.error("Error connecting to Supabase:", error)
        setStatus("error")
        setErrorMessage(error instanceof Error ? error.message : String(error))
      }
    }

    testConnection()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>

      {status === "loading" && <div className="text-blue-500">Testing connection to Supabase...</div>}

      {status === "success" && (
        <div className="text-green-500 font-semibold">✅ Successfully connected to Supabase!</div>
      )}

      {status === "error" && (
        <div className="text-red-500">
          <p className="font-semibold">❌ Failed to connect to Supabase</p>
          <p className="mt-2">{errorMessage}</p>
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <p className="font-medium">Troubleshooting tips:</p>
            <ul className="list-disc ml-5 mt-2">
              <li>Check that your environment variables are correctly set</li>
              <li>Verify that your Supabase project is active</li>
              <li>Ensure the 'users' table exists in your database</li>
              <li>Check that your IP is not blocked by Supabase</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
