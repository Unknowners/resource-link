-- Add requires_onboarding to profiles
ALTER TABLE public.profiles 
ADD COLUMN requires_onboarding BOOLEAN DEFAULT true;

-- Create organization_roles table for custom roles
CREATE TABLE public.organization_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Enable RLS on organization_roles
ALTER TABLE public.organization_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization_roles
CREATE POLICY "Members can view org roles"
ON public.organization_roles
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org owners can manage roles"
ON public.organization_roles
FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

CREATE POLICY "Super admins can manage all org roles"
ON public.organization_roles
FOR ALL
USING (is_any_super_admin(auth.uid()))
WITH CHECK (is_any_super_admin(auth.uid()));

-- Add custom_role_id to organization_members
ALTER TABLE public.organization_members
ADD COLUMN custom_role_id UUID REFERENCES public.organization_roles(id) ON DELETE SET NULL;

-- Create trigger for organization_roles updated_at
CREATE TRIGGER update_organization_roles_updated_at
BEFORE UPDATE ON public.organization_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trigger for organization_roles
CREATE OR REPLACE FUNCTION public.audit_org_roles_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  v_org_id := COALESCE(NEW.organization_id, OLD.organization_id);
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, organization_id, action, resource_type, resource_id, details)
    VALUES (
      auth.uid(),
      v_org_id,
      'create',
      'organization_role',
      NEW.id::text,
      jsonb_build_object('name', NEW.name, 'description', NEW.description, 'permissions', NEW.permissions)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, organization_id, action, resource_type, resource_id, details)
    VALUES (
      auth.uid(),
      v_org_id,
      'update',
      'organization_role',
      NEW.id::text,
      jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, organization_id, action, resource_type, resource_id, details)
    VALUES (
      auth.uid(),
      v_org_id,
      'delete',
      'organization_role',
      OLD.id::text,
      jsonb_build_object('name', OLD.name)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_organization_roles_changes
AFTER INSERT OR UPDATE OR DELETE ON public.organization_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_org_roles_changes();