-- Add approval status to the task structure in action_flows
-- Since tasks are stored in JSONB, we need to create a function to update them

-- Create a function to add approval_status field to all tasks
CREATE OR REPLACE FUNCTION add_approval_status_to_tasks()
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
    
    -- Update each section's tasks to include approval_status
    updated_sections := flow_record.sections;
    
    FOR i IN 0..jsonb_array_length(flow_record.sections) - 1
    LOOP
      -- Check if the section has tasks
      IF jsonb_typeof(flow_record.sections->i->'tasks') = 'array' THEN
        -- Loop through each task in the section
        FOR j IN 0..jsonb_array_length(flow_record.sections->i->'tasks') - 1
        LOOP
          -- Add approval_status if it doesn't exist
          IF NOT (flow_record.sections->i->'tasks'->j ? 'approval_status') THEN
            updated_sections := jsonb_set(
              updated_sections,
              ARRAY[i::text, 'tasks', j::text, 'approval_status'],
              '"pending"'::jsonb
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
SELECT add_approval_status_to_tasks();

-- Drop the function after use
DROP FUNCTION add_approval_status_to_tasks();

-- Add a new notification type for task refusals
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'message';
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Add comments to explain the notification types
COMMENT ON COLUMN notifications.type IS 'Type of notification: message, deadline, task_refused, etc.';
