-- Remove custom_role_id from organization_members
ALTER TABLE public.organization_members DROP COLUMN IF EXISTS custom_role_id;

-- Drop organization_roles table and its audit trigger
DROP TRIGGER IF EXISTS audit_org_roles_changes ON public.organization_roles;
DROP TABLE IF EXISTS public.organization_roles CASCADE;

-- Drop the audit function for organization roles
DROP FUNCTION IF EXISTS public.audit_org_roles_changes() CASCADE;