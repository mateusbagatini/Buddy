"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export default function CheckActionFlows() {
  const [results, setResults] = useState({
    tableExists: { status: "pending", message: "Checking if action_flows table exists..." },
    tableStructure: { status: "pending", message: "Checking table structure..." },
    permissions: { status: "pending", message: "Checking permissions..." },
    testInsert: { status: "pending", message: "Testing insert operation..." },
  })
  const [logs, setLogs] = useState<string[]>([])

  const supabase = createClientComponentClient()

  const addLog = (log: string) => {
    console.log(log)
    setLogs((prev) => [...prev, `[${new Date().toISOString()}] ${log}`])
  }

  const runDiagnostics = async () => {
    // Reset results
    setResults({
      tableExists: { status: "pending", message: "Checking if action_flows table exists..." },
      tableStructure: { status: "pending", message: "Checking table structure..." },
      permissions: { status: "pending", message: "Checking permissions..." },
      testInsert: { status: "pending", message: "Testing insert operation..." },
    })
    setLogs([])

    // Check if table exists
    try {
      addLog("Checking if action_flows table exists...")
      const { data: tableInfo, error: tableError } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "public")
        .eq("table_name", "action_flows")
        .single()

      if (tableError) {
        addLog(`Error checking table: ${tableError.message}`)
        setResults((prev) => ({
          ...prev,
          tableExists: { status: "error", message: `Error checking table: ${tableError.message}` },
        }))
      } else if (!tableInfo) {
        addLog("action_flows table does not exist")
        setResults((prev) => ({
          ...prev,
          tableExists: { status: "error", message: "action_flows table does not exist" },
        }))
      } else {
        addLog("action_flows table exists")
        setResults((prev) => ({
          ...prev,
          tableExists: { status: "success", message: "action_flows table exists" },
        }))

        // Check table structure
        try {
          addLog("Checking table structure...")
          const { data: columns, error: columnsError } = await supabase
            .from("information_schema.columns")
            .select("column_name, data_type")
            .eq("table_schema", "public")
            .eq("table_name", "action_flows")

          if (columnsError) {
            addLog(`Error checking columns: ${columnsError.message}`)
            setResults((prev) => ({
              ...prev,
              tableStructure: { status: "error", message: `Error checking columns: ${columnsError.message}` },
            }))
          } else {
            const requiredColumns = [
              { name: "id", type: "uuid" },
              { name: "title", type: "text" },
              { name: "sections", type: "jsonb" },
            ]

            const missingColumns = requiredColumns.filter((col) => !columns.some((c) => c.column_name === col.name))

            if (missingColumns.length > 0) {
              addLog(`Missing columns: ${missingColumns.map((c) => c.name).join(", ")}`)
              setResults((prev) => ({
                ...prev,
                tableStructure: {
                  status: "error",
                  message: `Missing columns: ${missingColumns.map((c) => c.name).join(", ")}`,
                },
              }))
            } else {
              addLog("Table structure looks good")
              setResults((prev) => ({
                ...prev,
                tableStructure: { status: "success", message: "Table structure looks good" },
              }))
            }
          }
        } catch (error) {
          addLog(`Error checking table structure: ${error.message}`)
          setResults((prev) => ({
            ...prev,
            tableStructure: { status: "error", message: `Error checking table structure: ${error.message}` },
          }))
        }

        // Check permissions
        try {
          addLog("Checking permissions...")
          const { data: policies, error: policiesError } = await supabase
            .from("pg_policies")
            .select("*")
            .eq("tablename", "action_flows")

          if (policiesError) {
            addLog(`Error checking policies: ${policiesError.message}`)
            setResults((prev) => ({
              ...prev,
              permissions: { status: "error", message: `Error checking policies: ${policiesError.message}` },
            }))
          } else if (!policies || policies.length === 0) {
            addLog("No RLS policies found for action_flows table")
            setResults((prev) => ({
              ...prev,
              permissions: { status: "warning", message: "No RLS policies found for action_flows table" },
            }))
          } else {
            addLog(`Found ${policies.length} policies for action_flows table`)
            setResults((prev) => ({
              ...prev,
              permissions: { status: "success", message: `Found ${policies.length} policies for action_flows table` },
            }))
          }
        } catch (error) {
          addLog(`Error checking permissions: ${error.message}`)
          setResults((prev) => ({
            ...prev,
            permissions: { status: "error", message: `Error checking permissions: ${error.message}` },
          }))
        }

        // Test insert operation
        try {
          addLog("Testing insert operation...")
          const testFlow = {
            title: "Test Action Flow",
            description: "This is a test action flow",
            status: "Draft",
            sections: [
              {
                id: "test-section",
                title: "Test Section",
                tasks: [
                  {
                    id: "test-task",
                    title: "Test Task",
                    description: "This is a test task",
                    completed: false,
                  },
                ],
              },
            ],
          }

          const { data: insertData, error: insertError } = await supabase.from("action_flows").insert(testFlow).select()

          if (insertError) {
            addLog(`Error inserting test flow: ${insertError.message}`)
            setResults((prev) => ({
              ...prev,
              testInsert: { status: "error", message: `Error inserting test flow: ${insertError.message}` },
            }))
          } else {
            addLog("Test insert successful")
            setResults((prev) => ({
              ...prev,
              testInsert: { status: "success", message: "Test insert successful" },
            }))

            // Clean up test data
            try {
              const { error: deleteError } = await supabase.from("action_flows").delete().eq("id", insertData[0].id)

              if (deleteError) {
                addLog(`Error cleaning up test data: ${deleteError.message}`)
              } else {
                addLog("Test data cleaned up")
              }
            } catch (error) {
              addLog(`Error cleaning up test data: ${error.message}`)
            }
          }
        } catch (error) {
          addLog(`Error testing insert: ${error.message}`)
          setResults((prev) => ({
            ...prev,
            testInsert: { status: "error", message: `Error testing insert: ${error.message}` },
          }))
        }
      }
    } catch (error) {
      addLog(`Error checking table: ${error.message}`)
      setResults((prev) => ({
        ...prev,
        tableExists: { status: "error", message: `Error checking table: ${error.message}` },
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
          <CardTitle>Action Flows Table Diagnostics</CardTitle>
          <CardDescription>Check your action_flows table configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Table Exists */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Table Exists</h3>
              <StatusIcon status={results.tableExists.status} />
            </div>
            <p className={`mt-2 ${results.tableExists.status === "error" ? "text-red-500" : ""}`}>
              {results.tableExists.message}
            </p>
          </div>

          {/* Table Structure */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Table Structure</h3>
              <StatusIcon status={results.tableStructure.status} />
            </div>
            <p className={`mt-2 ${results.tableStructure.status === "error" ? "text-red-500" : ""}`}>
              {results.tableStructure.message}
            </p>
          </div>

          {/* Permissions */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Permissions</h3>
              <StatusIcon status={results.permissions.status} />
            </div>
            <p className={`mt-2 ${results.permissions.status === "error" ? "text-red-500" : ""}`}>
              {results.permissions.message}
            </p>
          </div>

          {/* Test Insert */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Test Insert</h3>
              <StatusIcon status={results.testInsert.status} />
            </div>
            <p className={`mt-2 ${results.testInsert.status === "error" ? "text-red-500" : ""}`}>
              {results.testInsert.message}
            </p>
          </div>

          {/* Logs */}
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
        </CardContent>
        <CardFooter>
          <Button onClick={runDiagnostics}>Run Diagnostics Again</Button>
        </CardFooter>
      </Card>

      {/* SQL Setup Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>SQL Setup Instructions</CardTitle>
          <CardDescription>
            If you're having issues, run this SQL in your Supabase SQL Editor to set up your action_flows table
            correctly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
            {`-- Create action_flows table if it doesn't exist
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

-- Enable RLS on the table
ALTER TABLE action_flows ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their assigned action flows
CREATE POLICY IF NOT EXISTS "Users can view their assigned action flows" 
  ON action_flows FOR SELECT 
  USING (user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert action flows
CREATE POLICY IF NOT EXISTS "Admins can insert action flows" 
  ON action_flows FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update action flows
CREATE POLICY IF NOT EXISTS "Admins can update action flows" 
  ON action_flows FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can update their assigned action flows
CREATE POLICY IF NOT EXISTS "Users can update their assigned action flows" 
  ON action_flows FOR UPDATE 
  USING (user_id = auth.uid());

-- Admins can delete action flows
CREATE POLICY IF NOT EXISTS "Admins can delete action flows" 
  ON action_flows FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
