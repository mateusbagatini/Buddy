"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export default function SupabaseDiagnostics() {
  const [results, setResults] = useState<{
    envVars: { status: "pending" | "success" | "error"; message: string }
    connection: { status: "pending" | "success" | "error"; message: string }
    tables: { status: "pending" | "success" | "error"; message: string; details?: any }
    rls: { status: "pending" | "success" | "error"; message: string }
  }>({
    envVars: { status: "pending", message: "Checking environment variables..." },
    connection: { status: "pending", message: "Testing connection..." },
    tables: { status: "pending", message: "Checking database tables..." },
    rls: { status: "pending", message: "Checking RLS policies..." },
  })

  const runDiagnostics = async () => {
    const supabase = createClientComponentClient()

    // Reset results
    setResults({
      envVars: { status: "pending", message: "Checking environment variables..." },
      connection: { status: "pending", message: "Testing connection..." },
      tables: { status: "pending", message: "Checking database tables..." },
      rls: { status: "pending", message: "Checking RLS policies..." },
    })

    // Check environment variables
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!url || !key) {
        setResults((prev) => ({
          ...prev,
          envVars: {
            status: "error",
            message: `Missing environment variables: ${!url ? "NEXT_PUBLIC_SUPABASE_URL" : ""} ${!key ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : ""}`,
          },
        }))
      } else {
        setResults((prev) => ({
          ...prev,
          envVars: { status: "success", message: "Environment variables are set correctly" },
        }))
      }
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        envVars: {
          status: "error",
          message: `Error checking environment variables: ${error instanceof Error ? error.message : String(error)}`,
        },
      }))
    }

    // Test connection
    try {
      const { data, error } = await supabase.from("users").select("count()", { count: "exact", head: true })

      if (error) {
        throw error
      }

      setResults((prev) => ({
        ...prev,
        connection: { status: "success", message: "Successfully connected to Supabase" },
      }))
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        connection: {
          status: "error",
          message: `Connection error: ${error instanceof Error ? error.message : String(error)}`,
        },
      }))
      // If connection fails, we can't check tables or RLS
      setResults((prev) => ({
        ...prev,
        tables: { status: "error", message: "Skipped due to connection error" },
        rls: { status: "error", message: "Skipped due to connection error" },
      }))
      return
    }

    // Check tables
    try {
      // Get list of tables
      const { data: tableList, error: tableListError } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "public")

      if (tableListError) {
        throw tableListError
      }

      // Check for required tables
      const requiredTables = ["users", "action_flows"]
      const foundTables = tableList?.map((t) => t.table_name) || []
      const missingTables = requiredTables.filter((t) => !foundTables.includes(t))

      if (missingTables.length > 0) {
        setResults((prev) => ({
          ...prev,
          tables: {
            status: "error",
            message: `Missing required tables: ${missingTables.join(", ")}`,
            details: { foundTables, requiredTables },
          },
        }))
      } else {
        setResults((prev) => ({
          ...prev,
          tables: {
            status: "success",
            message: "All required tables exist",
            details: { foundTables, requiredTables },
          },
        }))
      }
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        tables: {
          status: "error",
          message: `Error checking tables: ${error instanceof Error ? error.message : String(error)}`,
        },
      }))
    }

    // Check RLS policies
    try {
      // This is a simplified check - in a real app, you'd want to check specific policies
      const { data: rlsData, error: rlsError } = await supabase
        .from("pg_catalog.pg_tables")
        .select("tablename, rowsecurity")
        .eq("schemaname", "public")

      if (rlsError) {
        throw rlsError
      }

      const tablesWithoutRLS =
        rlsData
          ?.filter((t) => ["users", "action_flows"].includes(t.tablename) && !t.rowsecurity)
          .map((t) => t.tablename) || []

      if (tablesWithoutRLS.length > 0) {
        setResults((prev) => ({
          ...prev,
          rls: { status: "warning", message: `RLS not enabled on tables: ${tablesWithoutRLS.join(", ")}` },
        }))
      } else {
        setResults((prev) => ({
          ...prev,
          rls: { status: "success", message: "RLS is properly configured" },
        }))
      }
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        rls: {
          status: "error",
          message: `Error checking RLS: ${error instanceof Error ? error.message : String(error)}`,
        },
      }))
    }
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  const StatusIcon = ({ status }: { status: "pending" | "success" | "error" | "warning" }) => {
    if (status === "success") return <CheckCircle className="h-5 w-5 text-green-500" />
    if (status === "error") return <XCircle className="h-5 w-5 text-red-500" />
    if (status === "warning") return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    return <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
  }

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Supabase Database Diagnostics</CardTitle>
          <CardDescription>Check your Supabase configuration and database setup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Environment Variables */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Environment Variables</h3>
              <StatusIcon status={results.envVars.status} />
            </div>
            <p className={`mt-2 ${results.envVars.status === "error" ? "text-red-500" : ""}`}>
              {results.envVars.message}
            </p>
          </div>

          {/* Connection */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Supabase Connection</h3>
              <StatusIcon status={results.connection.status} />
            </div>
            <p className={`mt-2 ${results.connection.status === "error" ? "text-red-500" : ""}`}>
              {results.connection.message}
            </p>
          </div>

          {/* Tables */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Database Tables</h3>
              <StatusIcon status={results.tables.status} />
            </div>
            <p className={`mt-2 ${results.tables.status === "error" ? "text-red-500" : ""}`}>
              {results.tables.message}
            </p>
            {results.tables.details && (
              <div className="mt-2 text-sm">
                <p>Found tables: {results.tables.details.foundTables.join(", ") || "None"}</p>
                <p>Required tables: {results.tables.details.requiredTables.join(", ")}</p>
              </div>
            )}
          </div>

          {/* RLS Policies */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Row Level Security</h3>
              <StatusIcon status={results.rls.status} />
            </div>
            <p className={`mt-2 ${results.rls.status === "error" ? "text-red-500" : ""}`}>{results.rls.message}</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={runDiagnostics}>Run Diagnostics Again</Button>
        </CardFooter>
      </Card>

      {/* SQL Setup Instructions */}
      {(results.tables.status === "error" || results.rls.status === "error" || results.rls.status === "warning") && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Database Setup Instructions</CardTitle>
            <CardDescription>
              Run the following SQL in your Supabase SQL Editor to set up your database correctly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {`-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create action_flows table with JSONB for sections
CREATE TABLE IF NOT EXISTS action_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  deadline DATE,
  status TEXT NOT NULL CHECK (status IN ('Draft', 'In Progress', 'Completed')),
  user_id UUID REFERENCES users(id),
  sections JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_flows ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" 
  ON users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" 
  ON users FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert users" 
  ON users FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update users" 
  ON users FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete users" 
  ON users FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Action flows policies
CREATE POLICY "Users can view their assigned action flows" 
  ON action_flows FOR SELECT 
  USING (user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert action flows" 
  ON action_flows FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update action flows" 
  ON action_flows FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update their assigned action flows" 
  ON action_flows FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Admins can delete action flows" 
  ON action_flows FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );`}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
