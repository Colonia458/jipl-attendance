
-- Create attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendee_name TEXT NOT NULL,
  email TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  device_info TEXT
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public check-in)
CREATE POLICY "Anyone can check in" ON public.attendance
FOR INSERT WITH CHECK (true);

-- Only authenticated users (admin) can view
CREATE POLICY "Authenticated users can view attendance" ON public.attendance
FOR SELECT TO authenticated USING (true);

-- Only authenticated users (admin) can delete
CREATE POLICY "Authenticated users can delete attendance" ON public.attendance
FOR DELETE TO authenticated USING (true);
