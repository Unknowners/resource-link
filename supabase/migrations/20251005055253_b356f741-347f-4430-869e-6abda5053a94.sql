-- Add slug column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS slug text;

-- Create unique constraint on slug within organization
CREATE UNIQUE INDEX IF NOT EXISTS projects_organization_slug_idx 
ON public.projects(organization_id, slug);

-- Create user_projects junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.user_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, project_id, organization_id)
);

-- Enable RLS on user_projects
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_projects
CREATE POLICY "Members can view user projects"
ON public.user_projects
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org owners can manage user projects"
ON public.user_projects
FOR ALL
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.organization_members 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

CREATE POLICY "Super admins can manage user projects"
ON public.user_projects
FOR ALL
USING (is_any_super_admin(auth.uid()));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS user_projects_user_id_idx ON public.user_projects(user_id);
CREATE INDEX IF NOT EXISTS user_projects_project_id_idx ON public.user_projects(project_id);
CREATE INDEX IF NOT EXISTS user_projects_org_id_idx ON public.user_projects(organization_id);