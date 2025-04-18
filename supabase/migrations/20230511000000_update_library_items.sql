-- Add type and file_path columns to library_items table
ALTER TABLE public.library_items
ADD COLUMN type TEXT NOT NULL DEFAULT 'link',
ADD COLUMN file_path TEXT;

-- Update existing rows to set the type to 'link'
UPDATE public.library_items
SET type = 'link'
WHERE url IS NOT NULL;

-- Add a check constraint to ensure type is either 'link' or 'file'
ALTER TABLE public.library_items
ADD CONSTRAINT type_check CHECK (type IN ('link', 'file'));
