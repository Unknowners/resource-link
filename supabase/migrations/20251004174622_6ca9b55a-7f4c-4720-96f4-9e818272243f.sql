-- Fix profiles without organization_id by syncing from organization_members
UPDATE public.profiles p
SET organization_id = om.organization_id
FROM public.organization_members om
WHERE p.id = om.user_id 
  AND p.organization_id IS NULL;

-- Fix profiles with mismatched organization_id
UPDATE public.profiles p
SET organization_id = om.organization_id
FROM public.organization_members om
WHERE p.id = om.user_id 
  AND p.organization_id IS NOT NULL
  AND p.organization_id != om.organization_id;