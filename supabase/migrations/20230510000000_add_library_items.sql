-- Create the library_items table
CREATE TABLE IF NOT EXISTS public.library_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;

-- Policy for admins (full access)
CREATE POLICY "Admins can do anything with library items" 
ON public.library_items 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
);

-- Policy for users (read-only access)
CREATE POLICY "Users can view library items" 
ON public.library_items 
FOR SELECT 
TO authenticated 
USING (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_library_items_created_at ON public.library_items (created_at);
