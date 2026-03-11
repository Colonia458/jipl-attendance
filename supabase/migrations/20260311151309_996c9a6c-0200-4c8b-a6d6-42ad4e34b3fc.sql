
DROP VIEW IF EXISTS public.attendance_logs_public;

CREATE VIEW public.attendance_logs_public AS
SELECT id, event_id, full_name, company, designation_department, created_at
FROM public.attendance_logs;

INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload signatures" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'signatures');
CREATE POLICY "Anyone can read signatures" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'signatures');
