DROP POLICY IF EXISTS "allow_all_select_anon_auth" ON public.attendance_logs;
DROP POLICY IF EXISTS "allow_all_insert_anon_auth" ON public.attendance_logs;

CREATE POLICY "allow_all_select_anon_auth"
ON public.attendance_logs
FOR SELECT
TO anon, authenticated
USING (auth.role() = 'anon' OR auth.role() = 'authenticated');

CREATE POLICY "allow_all_insert_anon_auth"
ON public.attendance_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');