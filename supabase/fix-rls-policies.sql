-- First, let's create a helper function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Create a function to check if a user has access to an action flow
CREATE OR REPLACE FUNCTION public.can_access_action_flow(flow_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.action_flows
    WHERE id = flow_id AND (user_id = auth.uid() OR public.is_admin())
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Reset RLS policies for action_flows table
DROP POLICY IF EXISTS "Admins can do everything" ON public.action_flows;
DROP POLICY IF EXISTS "Users can view their assigned flows" ON public.action_flows;
DROP POLICY IF EXISTS "Users can update their assigned flows" ON public.action_flows;

-- Create new policies for action_flows table
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

-- Reset RLS policies for users table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can do everything with users" ON public.users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;

-- Create new policies for users table
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
