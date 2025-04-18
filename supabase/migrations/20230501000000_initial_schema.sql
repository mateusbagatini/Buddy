-- Create users table
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

-- Create RLS policies
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
  );

-- Create initial admin user (you'll need to replace this with your own admin user)
INSERT INTO users (id, name, email, role, status)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'Admin User', 'admin@example.com', 'admin', 'active')
ON CONFLICT (id) DO NOTHING;
