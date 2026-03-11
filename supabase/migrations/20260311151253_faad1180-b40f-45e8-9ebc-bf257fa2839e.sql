
ALTER TABLE public.attendance_logs 
ADD COLUMN IF NOT EXISTS designation_department text,
ADD COLUMN IF NOT EXISTS signature_url text;
