-- Add requires_approval field to the tasks
ALTER TABLE action_flows
ALTER COLUMN sections TYPE jsonb;

ALTER TABLE action_flows
ADD COLUMN requires_approval BOOLEAN NOT NULL DEFAULT FALSE;

-- Create a function to help migrate existing data
CREATE OR REPLACE FUNCTION add_requires_approval_to_tasks()
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
   
   -- Update each section's tasks to include requires_approval field
   updated_sections := flow_record.sections;
   
   FOR i IN 0..jsonb_array_length(flow_record.sections) - 1
   LOOP
     -- Check if the section has tasks
     IF jsonb_typeof(flow_record.sections->i->'tasks') = 'array' THEN
       -- Loop through each task in the section
       FOR j IN 0..jsonb_array_length(flow_record.sections->i->'tasks') - 1
       LOOP
         -- Add requires_approval field if it doesn't exist
         IF NOT (flow_record.sections->i->'tasks'->j ? 'requires_approval') THEN
           updated_sections := jsonb_set(
             updated_sections,
             ARRAY[i::text, 'tasks', j::text, 'requires_approval'],
             'false'::jsonb
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
SELECT add_requires_approval_to_tasks();

-- Drop the function after use
DROP FUNCTION add_requires_approval_to_tasks();
