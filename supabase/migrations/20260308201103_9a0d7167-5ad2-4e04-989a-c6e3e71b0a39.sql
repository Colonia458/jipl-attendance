
DROP TABLE IF EXISTS public.attendance;

CREATE TABLE public.attendance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can check in"
  ON public.attendance_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admin can view logs"
  ON public.attendance_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can delete logs"
  ON public.attendance_logs
  FOR DELETE
  TO authenticated
  USING (true);
