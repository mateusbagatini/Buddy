-- Add display_location column to library_items table
ALTER TABLE library_items
ADD COLUMN display_location TEXT CHECK (display_location IN ('library', 'resource', 'both')) DEFAULT 'library';

-- Update existing items to set display_location to 'library'
UPDATE library_items
SET display_location = 'library';
