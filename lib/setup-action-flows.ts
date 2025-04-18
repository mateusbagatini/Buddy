import { createClient } from "@supabase/supabase-js"

// This function ensures the action_flows table exists and has the correct structure
export async function setupActionFlowsTable() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  try {
    // Check if the table exists
    const { data: tableExists, error: tableError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .eq("table_name", "action_flows")
      .single()

    // If there's an error or the table doesn't exist, create it
    if (tableError || !tableExists) {
      // Create the action_flows table
      const { error: createError } = await supabase.rpc("execute_sql", {
        sql_string: `
          -- Create action_flows table if it doesn't exist
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
            );
        `,
      })

      if (createError) {
        console.error("Error creating action_flows table:", createError)
        return { success: false, error: createError.message }
      }

      return { success: true, message: "Action flows table created successfully" }
    }

    return { success: true, message: "Action flows table already exists" }
  } catch (error) {
    console.error("Error setting up action_flows table:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// This function creates a helper function in the database to execute SQL
export async function createExecuteSqlFunction() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  try {
    const { error } = await supabase.rpc("execute_sql", {
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
      // If the function doesn't exist, this will fail
      // Let's create it directly
      const { error: directError } = await supabase.from("_temp_execute_sql").select().limit(1)

      if (directError) {
        console.error("Error creating execute_sql function:", directError)
        return { success: false, error: directError.message }
      }
    }

    return { success: true, message: "execute_sql function created or already exists" }
  } catch (error) {
    console.error("Error creating execute_sql function:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
