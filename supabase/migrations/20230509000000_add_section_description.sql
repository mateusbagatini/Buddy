-- Add section description field to the sections in action_flows

-- Create a function to add description field to all sections
CREATE OR REPLACE FUNCTION add_description_to_sections()
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
    
    -- Update each section to include description field
    updated_sections := flow_record.sections;
    
    FOR i IN 0..jsonb_array_length(flow_record.sections) - 1
    LOOP
      -- Add description field if it doesn't exist
      IF NOT (flow_record.sections->i ? 'description') THEN
        updated_sections := jsonb_set(
          updated_sections,
          ARRAY[i::text, 'description'],
          '""'::jsonb
        );
      END IF;
    END LOOP;
    
    -- Update the action flow with the new structure
    UPDATE action_flows SET sections = updated_sections WHERE id = flow_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to update existing data
SELECT add_description_to_sections();

-- Drop the function after use
DROP FUNCTION add_description_to_sections();
