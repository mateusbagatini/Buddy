import { createClient } from "@supabase/supabase-js"

export async function fixUserIntegration() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  try {
    // 1. Create the is_admin function if it doesn't exist
    await supabase.rpc(
      "create_is_admin_function",
      {},
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    // 2. Fix RLS policies for users table
    await supabase.rpc(
      "fix_users_rls_policies",
      {},
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    // 3. Fix RLS policies for action_flows table
    await supabase.rpc(
      "fix_action_flows_rls_policies",
      {},
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    return { success: true, message: "User integration fixed successfully" }
  } catch (error) {
    console.error("Error fixing user integration:", error)
    return { success: false, error: error.message }
  }
}

// SQL to run in Supabase SQL Editor to create the necessary functions:
/*
-- Create the is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Create a function to fix users RLS policies
CREATE OR REPLACE FUNCTION public.fix_users_rls_policies()
RETURNS VOID AS $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
  DROP POLICY IF EXISTS "Admins can do everything with users" ON public.users;
  
  -- Create new policies
  CREATE POLICY "Users can view their own profile" 
  ON public.users
  FOR SELECT
  USING (id = auth.uid() OR public.is_admin());
  
  CREATE POLICY "Users can update their own profile" 
  ON public.users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
  
  CREATE POLICY "Admins can do everything with users" 
  ON public.users
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to fix action_flows RLS policies
CREATE OR REPLACE FUNCTION public.fix_action_flows_rls_policies()
RETURNS VOID AS $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Admins can do everything" ON public.action_flows;
  DROP POLICY IF EXISTS "Users can view their assigned flows" ON public.action_flows;
  DROP POLICY IF EXISTS "Users can update their assigned flows" ON public.action_flows;
  
  -- Create new policies
  CREATE POLICY "Admins can do everything" 
  ON public.action_flows
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
  
  CREATE POLICY "Users can view their assigned flows" 
  ON public.action_flows
  FOR SELECT
  USING (user_id = auth.uid());
  
  CREATE POLICY "Users can update their assigned flows" 
  ON public.action_flows
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to create the is_admin function
CREATE OR REPLACE FUNCTION public.create_is_admin_function()
RETURNS VOID AS $$
BEGIN
  -- Create the is_admin function
  CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS BOOLEAN AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    );
  $$ LANGUAGE sql SECURITY DEFINER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/
