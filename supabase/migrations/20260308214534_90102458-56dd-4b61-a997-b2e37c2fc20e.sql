
-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view events" ON public.events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin can insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin can update events" ON public.events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin can delete events" ON public.events FOR DELETE TO authenticated USING (true);

-- Add event_id to attendance_logs
ALTER TABLE public.attendance_logs ADD COLUMN event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;
