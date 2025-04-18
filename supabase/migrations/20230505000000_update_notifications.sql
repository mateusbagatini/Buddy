-- Add a type field to the notifications table to distinguish between message and assignment notifications
ALTER TABLE IF EXISTS notifications 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'message';

-- Create an index on the type field for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Update existing notifications to have the correct type
UPDATE notifications
SET type = 'message'
WHERE type IS NULL;
