-- Ensure attendance_logs exists with requested core columns
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  designation text,
  phone text,
  email text,
  signature text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure requested columns exist on existing table
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS designation text;
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS signature text;

-- Backfill requested columns from existing schema where possible
UPDATE public.attendance_logs
SET
  name = COALESCE(name, full_name),
  designation = COALESCE(designation, designation_department, job_title, company),
  phone = COALESCE(phone, phone_number),
  signature = COALESCE(signature, signature_url)
WHERE
  name IS NULL
  OR designation IS NULL
  OR phone IS NULL
  OR signature IS NULL;

-- Reset all RLS policies for attendance_logs
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'attendance_logs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendance_logs', pol.policyname);
  END LOOP;
END $$;

-- Keep RLS enabled and create explicit allow-all policies for anon + authenticated on SELECT and INSERT
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_select_anon_auth"
ON public.attendance_logs
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "allow_all_insert_anon_auth"
ON public.attendance_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Grant requested privileges
GRANT ALL PRIVILEGES ON TABLE public.attendance_logs TO anon;
GRANT ALL PRIVILEGES ON TABLE public.attendance_logs TO authenticated;