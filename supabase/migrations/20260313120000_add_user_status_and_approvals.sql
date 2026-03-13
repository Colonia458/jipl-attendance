
-- Add status column to user_roles
ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
CHECK (status IN ('pending', 'active', 'rejected'));

-- Drop and recreate list_admins to include status
DROP FUNCTION IF EXISTS public.list_admins();
CREATE OR REPLACE FUNCTION public.list_admins()
RETURNS TABLE(user_id uuid, email text, role public.app_role, created_at timestamptz, status text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.user_id, u.email::text, ur.role, ur.created_at, COALESCE(ur.status, 'active')::text
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id;
$$;

-- Helper RPC so AdminLogin can check own status without RLS issues
CREATE OR REPLACE FUNCTION public.get_my_status()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(status, 'active') FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;
