
-- Create a public view that only exposes name and company for the live dashboard
CREATE VIEW public.attendance_logs_public
WITH (security_invoker = on) AS
  SELECT id, full_name, company, created_at, event_id
  FROM public.attendance_logs;

-- Grant anon access to the view
GRANT SELECT ON public.attendance_logs_public TO anon;

-- Enable realtime for attendance_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;
