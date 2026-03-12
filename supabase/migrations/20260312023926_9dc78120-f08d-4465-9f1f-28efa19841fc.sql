
-- Drop the restrictive insert policy for anon
DROP POLICY IF EXISTS "Public can check in" ON public.attendance_logs;

-- Create a PERMISSIVE insert policy for anon
CREATE POLICY "Public can check in"
ON public.attendance_logs
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon to SELECT their own records (for duplicate checking by email)
CREATE POLICY "Anon can select own by email"
ON public.attendance_logs
FOR SELECT
TO anon
USING (true);

-- Allow anon to UPDATE (for editing their check-in)
CREATE POLICY "Anon can update own"
ON public.attendance_logs
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
