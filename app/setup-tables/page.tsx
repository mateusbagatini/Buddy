"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { setupTablesAction } from "@/app/actions/setup-tables"

export default function SetupTables() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const setupTables = async () => {
    setStatus("loading")
    setMessage("Setting up database tables...")

    try {
      const result = await setupTablesAction()

      if (result.success) {
        setStatus("success")
        setMessage(result.message || "Database tables set up successfully")
      } else {
        setStatus("error")
        setMessage(result.error || "Failed to set up database tables")
      }
    } catch (error) {
      console.error("Error setting up tables:", error)
      setStatus("error")
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <div className="container mx-auto py-10 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Setup Database Tables</CardTitle>
          <CardDescription>Create and configure the necessary database tables</CardDescription>
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

            <div className="p-4 border rounded-md">
              <p className="font-medium">This will:</p>
              <ul className="list-disc ml-5 mt-2 text-sm space-y-1">
                <li>Create the action_flows table if it doesn't exist</li>
                <li>Set up the necessary Row Level Security (RLS) policies</li>
                <li>Create helper functions for database operations</li>
              </ul>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={setupTables} disabled={status === "loading"} className="w-full">
            {status === "loading" ? "Setting up..." : "Setup Database Tables"}
          </Button>
        </CardFooter>
      </Card>

      {status === "error" && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Manual SQL Setup</CardTitle>
            <CardDescription>Run this SQL in your Supabase SQL Editor</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-xs">
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
      )}
    </div>
  )
}
