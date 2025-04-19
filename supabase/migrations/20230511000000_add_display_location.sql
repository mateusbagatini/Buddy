-- Add display_location column to library_items table
ALTER TABLE public.library_items 
ADD COLUMN IF NOT EXISTS display_location TEXT DEFAULT 'right' CHECK (display_location IN ('left', 'right'));

-- Update existing items to have 'right' as default
UPDATE public.library_items SET display_location = 'right' WHERE display_location IS NULL;
