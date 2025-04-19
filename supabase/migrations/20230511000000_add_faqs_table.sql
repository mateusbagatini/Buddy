-- Create the FAQs table
CREATE TABLE IF NOT EXISTS public.faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT,
    is_published BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Policy for admins (full access)
CREATE POLICY "Admins can do anything with FAQs" 
ON public.faqs 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
);

-- Policy for users (read-only access to published FAQs)
CREATE POLICY "Users can view published FAQs" 
ON public.faqs 
FOR SELECT 
TO authenticated 
USING (is_published = true);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_faqs_category ON public.faqs (category);
CREATE INDEX IF NOT EXISTS idx_faqs_priority ON public.faqs (priority);
