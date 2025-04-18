-- Check if action_flows table exists and create it if it doesn't
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
