-- Add messages to the action_flows table structure
-- Since action_flows uses JSONB for sections, we'll update the structure to include messages

-- Create a function to help migrate existing data
CREATE OR REPLACE FUNCTION add_messages_to_tasks()
RETURNS void AS $$
DECLARE
  flow_record RECORD;
  updated_sections JSONB;
BEGIN
  -- Loop through all action flows
  FOR flow_record IN SELECT id, sections FROM action_flows
  LOOP
    -- Skip if sections is null or not an array
    IF flow_record.sections IS NULL OR jsonb_typeof(flow_record.sections) != 'array' THEN
      CONTINUE;
    END IF;
    
    -- Update each section's tasks to include messages array
    updated_sections := flow_record.sections;
    
    FOR i IN 0..jsonb_array_length(flow_record.sections) - 1
    LOOP
      -- Check if the section has tasks
      IF jsonb_typeof(flow_record.sections->i->'tasks') = 'array' THEN
        -- Loop through each task in the section
        FOR j IN 0..jsonb_array_length(flow_record.sections->i->'tasks') - 1
        LOOP
          -- Add messages array if it doesn't exist
          IF NOT (flow_record.sections->i->'tasks'->j ? 'messages') THEN
            updated_sections := jsonb_set(
              updated_sections,
              ARRAY[i::text, 'tasks', j::text, 'messages'],
              '[]'::jsonb
            );
          END IF;
        END LOOP;
      END IF;
    END LOOP;
    
    -- Update the action flow with the new structure
    UPDATE action_flows SET sections = updated_sections WHERE id = flow_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to update existing data
SELECT add_messages_to_tasks();

-- Drop the function after use
DROP FUNCTION add_messages_to_tasks();

-- Create a notification table to store user notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flow_id UUID NOT NULL REFERENCES action_flows(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  message TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" 
ON notifications FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Admins can insert notifications" 
ON notifications FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can insert notifications to admins" 
ON notifications FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE id = user_id AND role = 'admin'
  )
);
