"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase-utils"
import { CheckCircle, XCircle, RefreshCw, User } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function FixActionFlowsTable() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [logs, setLogs] = useState<string[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const addLog = (log: string) => {
    console.log(log)
    setLogs((prev) => [...prev, `[${new Date().toISOString()}] ${log}`])
  }

  const checkSupabaseConnection = async () => {
    setStatus("loading")
    setMessage("Checking Supabase connection...")
    setLogs([])
    setCurrentUser(null)
    setDebugInfo(null)

    try {
      // Step 1: Check if we can connect to Supabase
      addLog("Testing Supabase connection...")

      // Try to get the current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        addLog(`Error getting user: ${userError.message}`)
        setStatus("error")
        setMessage(`Supabase connection error: ${userError.message}`)
        return
      }

      if (!user) {
        addLog("No authenticated user found")
        setStatus("error")
        setMessage("No authenticated user found. Please log in first.")
        return
      }

      addLog(`Authenticated as: ${user.email}`)
      setCurrentUser(user)

      // Step 2: Check if the user has a profile in the users table
      const { data: profile, error: profileError } = await supabase.from("users").select("*").eq("id", user.id).single()

      if (profileError) {
        addLog(`Error getting user profile: ${profileError.message}`)
        setStatus("error")
        setMessage(`User profile error: ${profileError.message}`)
        return
      }

      addLog(`User profile found: ${profile.name} (${profile.role})`)
      setDebugInfo({ user, profile })

      // Step 3: Check if the action_flows table exists
      addLog("Checking if action_flows table exists...")

      // Try to query the action_flows table
      const { data: actionFlows, error: actionFlowsError } = await supabase
        .from("action_flows")
        .select("count")
        .limit(1)

      if (actionFlowsError) {
        addLog(`Error querying action_flows table: ${actionFlowsError.message}`)

        // If the table doesn't exist, create it
        if (actionFlowsError.message.includes("does not exist")) {
          addLog("The action_flows table doesn't exist. Attempting to create it...")
          await createActionFlowsTable()
        } else {
          setStatus("error")
          setMessage(`Error querying action_flows table: ${actionFlowsError.message}`)
        }
        return
      }

      addLog("The action_flows table exists!")
      setStatus("success")
      setMessage("Supabase connection successful and action_flows table exists.")
    } catch (error) {
      console.error("Error checking Supabase connection:", error)
      addLog(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
      setStatus("error")
      setMessage(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const createActionFlowsTable = async () => {
    try {
      addLog("Creating action_flows table...")

      // Execute SQL to create the table
      const { error } = await supabase.rpc("execute_sql", {
        sql_string: `
          -- Create action_flows table
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
          CREATE POLICY IF NOT EXISTS "Users can view their assigned action flows" 
            ON action_flows FOR SELECT 
            USING (user_id = auth.uid() OR 
              EXISTS (
                SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
              )
            );
          
          CREATE POLICY IF NOT EXISTS "Admins can insert action flows" 
            ON action_flows FOR INSERT 
            WITH CHECK (
              EXISTS (
                SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
              )
            );
          
          CREATE POLICY IF NOT EXISTS "Admins can update action flows" 
            ON action_flows FOR UPDATE 
            USING (
              EXISTS (
                SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
              )
            );
          
          CREATE POLICY IF NOT EXISTS "Users can update their assigned action flows" 
            ON action_flows FOR UPDATE 
            USING (user_id = auth.uid());
          
          CREATE POLICY IF NOT EXISTS "Admins can delete action flows" 
            ON action_flows FOR DELETE 
            USING (
              EXISTS (
                SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
              )
            );
        `,
      })

      if (error) {
        // If the RPC fails, it might be because the execute_sql function doesn't exist
        addLog(`Error creating table via RPC: ${error.message}`)

        // Try to create the execute_sql function
        await createExecuteSqlFunction()
        return
      }

      // Verify the table was created
      const { error: verifyError } = await supabase.from("action_flows").select("count").limit(1)

      if (verifyError) {
        addLog(`Error verifying table creation: ${verifyError.message}`)
        setStatus("error")
        setMessage(`Failed to create action_flows table: ${verifyError.message}`)
        return
      }

      addLog("action_flows table created successfully!")
      setStatus("success")
      setMessage("The action_flows table has been created successfully.")
    } catch (error) {
      console.error("Error creating action_flows table:", error)
      addLog(`Error creating table: ${error instanceof Error ? error.message : String(error)}`)
      setStatus("error")
      setMessage(`Error creating table: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const createExecuteSqlFunction = async () => {
    try {
      addLog("Creating execute_sql function...")

      // Try to create the function directly using SQL
      const { error } = await supabase.rpc("execute_sql_direct", {
        sql_string: `
          -- Create a helper function to execute SQL
          CREATE OR REPLACE FUNCTION execute_sql(sql_string TEXT)
          RETURNS VOID AS $
          BEGIN
            EXECUTE sql_string;
          END;
          $ LANGUAGE plpgsql SECURITY DEFINER;
        `,
      })

      if (error) {
        addLog(`Error creating execute_sql function: ${error.message}`)
        setStatus("error")
        setMessage("Failed to create execute_sql function. Please run the SQL manually.")
        return
      }

      addLog("execute_sql function created successfully!")

      // Now try to create the action_flows table again
      await createActionFlowsTable()
    } catch (error) {
      console.error("Error creating execute_sql function:", error)
      addLog(`Error creating function: ${error instanceof Error ? error.message : String(error)}`)
      setStatus("error")
      setMessage(`Error creating function: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const testInsert = async () => {
    try {
      addLog("Testing insert operation...")

      // Create a test action flow
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

      const { data, error } = await supabase.from("action_flows").insert(testFlow).select()

      if (error) {
        addLog(`Error inserting test flow: ${error.message}`)
        setStatus("error")
        setMessage(`Failed to insert test flow: ${error.message}`)
        return
      }

      addLog("Test insert successful!")
      setDebugInfo((prev) => ({ ...prev, testInsert: data }))

      // Clean up the test data
      if (data && data[0] && data[0].id) {
        await supabase.from("action_flows").delete().eq("id", data[0].id)

        addLog("Test data cleaned up")
      }

      setStatus("success")
      setMessage("The action_flows table is working correctly.")
    } catch (error) {
      console.error("Error testing insert:", error)
      addLog(`Error testing insert: ${error instanceof Error ? error.message : String(error)}`)
      setStatus("error")
      setMessage(`Error testing insert: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Fix Action Flows Table</CardTitle>
          <CardDescription>Check and fix issues with the action_flows table</CardDescription>
        </CardHeader>
        <CardContent>
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

            {currentUser && (
              <div className="p-4 border rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4" />
                  <p className="font-medium">Current User</p>
                </div>
                <p className="text-sm">Email: {currentUser.email}</p>
                <p className="text-sm">ID: {currentUser.id}</p>
              </div>
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

            {debugInfo && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Debug Information</h3>
                <pre className="bg-gray-100 p-3 rounded-md max-h-60 overflow-y-auto text-xs">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button onClick={checkSupabaseConnection} disabled={status === "loading"} className="w-full">
            {status === "loading" ? "Checking..." : "Check Supabase Connection"}
          </Button>
          <Button onClick={createActionFlowsTable} disabled={status === "loading"} className="w-full">
            Create Action Flows Table
          </Button>
          <Button onClick={testInsert} disabled={status === "loading"} className="w-full">
            Test Insert Operation
          </Button>
        </CardFooter>
      </Card>

      {/* SQL Setup Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>SQL Setup Instructions</CardTitle>
          <CardDescription>
            If automatic fixes fail, run this SQL in your Supabase SQL Editor to set up the action_flows table
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
            {`-- Create a helper function to execute SQL
CREATE OR REPLACE FUNCTION execute_sql(sql_string TEXT)
RETURNS VOID AS $
BEGIN
  EXECUTE sql_string;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create action_flows table
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
ALTER TABLE action_flows ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY IF NOT EXISTS "Users can view their assigned action flows" 
  ON action_flows FOR SELECT 
  USING (user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY IF NOT EXISTS "Admins can insert action flows" 
  ON action_flows FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY IF NOT EXISTS "Admins can update action flows" 
  ON action_flows FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY IF NOT EXISTS "Users can update their assigned action flows" 
  ON action_flows FOR UPDATE 
  USING (user_id = auth.uid());

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
