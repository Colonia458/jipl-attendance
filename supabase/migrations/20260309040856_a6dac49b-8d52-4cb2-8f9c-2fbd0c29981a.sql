-- Add venue and time fields to events table
ALTER TABLE public.events
ADD COLUMN venue text,
ADD COLUMN start_time time,
ADD COLUMN end_time time;