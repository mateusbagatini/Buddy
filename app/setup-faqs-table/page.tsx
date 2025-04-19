"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function SetupFaqsTablePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClientComponentClient()

  const setupFaqsTable = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // SQL to create the FAQs table
      const sql = `
        -- Create the FAQs table
        CREATE TABLE IF NOT EXISTS public.faqs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            category TEXT,
            is_published BOOLEAN DEFAULT true,
            priority INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );

        -- Add RLS policies
        ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

        -- Policy for admins (full access)
        CREATE POLICY "Admins can do anything with FAQs" 
        ON public.faqs 
        FOR ALL 
        TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.users
                WHERE users.id = auth.uid() AND users.role = 'admin'
            )
        );

        -- Policy for users (read-only access to published FAQs)
        CREATE POLICY "Users can view published FAQs" 
        ON public.faqs 
        FOR SELECT 
        TO authenticated 
        USING (is_published = true);

        -- Add indexes
        CREATE INDEX IF NOT EXISTS idx_faqs_category ON public.faqs (category);
        CREATE INDEX IF NOT EXISTS idx_faqs_priority ON public.faqs (priority);
      `

      // Execute the SQL
      const { error: sqlError } = await supabase.rpc("execute_sql", { sql_query: sql })

      if (sqlError) {
        throw new Error(`Failed to create FAQs table: ${sqlError.message}`)
      }

      // Add some sample FAQs
      const sampleFaqs = [
        {
          question: "How do I create a new task?",
          answer:
            "To create a new task, navigate to your action flow and click the 'Add Task' button in the relevant section. Fill in the task details and click 'Save'.",
          category: "Tasks",
          priority: 10,
        },
        {
          question: "How do I mark a task as complete?",
          answer:
            "To mark a task as complete, click the checkbox next to the task name. The task will be marked as complete and will be reflected in your progress.",
          category: "Tasks",
          priority: 9,
        },
        {
          question: "What is an action flow?",
          answer:
            "An action flow is a collection of related tasks organized into sections. It helps you manage complex workflows by breaking them down into manageable steps.",
          category: "General",
          priority: 10,
        },
        {
          question: "How do I upload files to a task?",
          answer:
            "To upload files to a task, open the task details and click on the 'Upload' button. Select the file from your device and it will be attached to the task.",
          category: "Files",
          priority: 8,
        },
        {
          question: "Can I communicate with others about a task?",
          answer:
            "Yes, each task has a messaging feature. Open the task and use the message section at the bottom to communicate with others involved in the task.",
          category: "Communication",
          priority: 7,
        },
      ]

      // Insert sample FAQs
      const { error: insertError } = await supabase.from("faqs").insert(sampleFaqs)

      if (insertError) {
        throw new Error(`Failed to insert sample FAQs: ${insertError.message}`)
      }

      setSuccess(true)
    } catch (err) {
      console.error("Error setting up FAQs table:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Setup FAQs Table</CardTitle>
          <CardDescription>
            This will create the FAQs table in your Supabase database and add some sample FAQs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                FAQs table created successfully! You can now manage FAQs in the admin dashboard.
              </AlertDescription>
            </Alert>
          )}
          <p className="text-sm text-gray-500 mb-4">
            This setup will create a new table in your database to store frequently asked questions and answers. These
            FAQs will be used by the AI chatbot to provide helpful responses to users.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={setupFaqsTable} disabled={isLoading || success} className="w-full">
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⟳</span> Setting up...
              </>
            ) : success ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" /> Setup Complete
              </>
            ) : (
              "Setup FAQs Table"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
