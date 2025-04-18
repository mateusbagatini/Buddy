"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function SetupLibraryTable() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [logs, setLogs] = useState<string[]>([])

  const supabase = createClientComponentClient()

  const addLog = (log: string) => {
    console.log(log)
    setLogs((prev) => [...prev, `[${new Date().toISOString()}] ${log}`])
  }

  const setupLibraryTable = async () => {
    setStatus("loading")
    setMessage("Setting up library_items table...")
    setLogs([])

    try {
      addLog("Creating library_items table...")

      // Execute SQL to create the table
      const { error } = await supabase.rpc("execute_sql", {
        sql_string: `
          -- Create the library_items table
          CREATE TABLE IF NOT EXISTS public.library_items (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title TEXT NOT NULL,
            description TEXT,
            url TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          );
          
          -- Add RLS policies
          ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;
          
          -- Policy for admins (full access)
          CREATE POLICY "Admins can do anything with library items" 
          ON public.library_items 
          FOR ALL 
          TO authenticated 
          USING (
            EXISTS (
              SELECT 1 FROM public.users
              WHERE users.id = auth.uid() AND users.role = 'admin'
            )
          );
          
          -- Policy for users (read-only access)
          CREATE POLICY "Users can view library items" 
          ON public.library_items 
          FOR SELECT 
          TO authenticated 
          USING (true);
          
          -- Add indexes
          CREATE INDEX IF NOT EXISTS idx_library_items_created_at ON public.library_items (created_at);
        `,
      })

      if (error) {
        // If the RPC fails, it might be because the execute_sql function doesn't exist
        addLog(`Error creating table via RPC: ${error.message}`)

        // Try direct SQL execution if available
        try {
          addLog("Attempting direct SQL execution...")
          const { error: directError } = await supabase.sql(`
            -- Create the library_items table
            CREATE TABLE IF NOT EXISTS public.library_items (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              title TEXT NOT NULL,
              description TEXT,
              url TEXT NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
            
            -- Add RLS policies
            ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;
            
            -- Policy for admins (full access)
            CREATE POLICY "Admins can do anything with library items" 
            ON public.library_items 
            FOR ALL 
            TO authenticated 
            USING (
              EXISTS (
                SELECT 1 FROM public.users
                WHERE users.id = auth.uid() AND users.role = 'admin'
              )
            );
            
            -- Policy for users (read-only access)
            CREATE POLICY "Users can view library items" 
            ON public.library_items 
            FOR SELECT 
            TO authenticated 
            USING (true);
            
            -- Add indexes
            CREATE INDEX IF NOT EXISTS idx_library_items_created_at ON public.library_items (created_at);
          `)

          if (directError) {
            throw new Error(`Direct SQL execution failed: ${directError.message}`)
          } else {
            addLog("Direct SQL execution successful!")
          }
        } catch (directError) {
          addLog(`Direct SQL execution failed: ${directError.message}`)
          throw new Error(`Failed to create library_items table: ${error.message}`)
        }
      }

      // Verify the table was created
      const { data, error: verifyError } = await supabase
        .from("library_items")
        .select("count(*)", { count: "exact", head: true })

      if (verifyError) {
        if (verifyError.message.includes("does not exist")) {
          throw new Error(
            "Failed to create library_items table. Please run the SQL manually in the Supabase SQL editor.",
          )
        }
        throw new Error(`Error verifying table creation: ${verifyError.message}`)
      }

      addLog("library_items table created successfully!")
      setStatus("success")
      setMessage("The library_items table has been created successfully.")
    } catch (error) {
      console.error("Error creating library_items table:", error)
      addLog(`Error creating table: ${error instanceof Error ? error.message : String(error)}`)
      setStatus("error")
      setMessage(`Error creating table: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Setup Library Items Table</CardTitle>
          <CardDescription>Create the library_items table in your Supabase database</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {status === "loading" && (
              <div className="flex items-center space-x-2 text-blue-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <p>{message}</p>
              </div>
            )}

            {status === "success" && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-700">{message}</AlertDescription>
              </Alert>
            )}

            {status === "error" && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {logs.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Logs</h3>
                <div className="bg-gray-100 p-3 rounded-md max-h-60 overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index} className="text-xs font-mono mb-1">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={setupLibraryTable} disabled={status === "loading"}>
            {status === "loading" ? "Setting up..." : "Setup Library Table"}
          </Button>
        </CardFooter>
      </Card>

      {/* SQL Setup Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Manual SQL Setup</CardTitle>
          <CardDescription>If the automatic setup fails, run this SQL in your Supabase SQL Editor</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
            {`-- Create the library_items table
CREATE TABLE IF NOT EXISTS public.library_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;

-- Policy for admins (full access)
CREATE POLICY "Admins can do anything with library items" 
ON public.library_items 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Policy for users (read-only access)
CREATE POLICY "Users can view library items" 
ON public.library_items 
FOR SELECT 
TO authenticated 
USING (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_library_items_created_at ON public.library_items (created_at);`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
