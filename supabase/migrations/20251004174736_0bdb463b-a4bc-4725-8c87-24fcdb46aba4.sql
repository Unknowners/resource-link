-- Add slug column to organizations
ALTER TABLE public.organizations
ADD COLUMN slug TEXT;

-- Create unique index on slug
CREATE UNIQUE INDEX organizations_slug_unique ON public.organizations(slug);

-- Create transliteration function for Ukrainian/Russian to Latin
CREATE OR REPLACE FUNCTION public.transliterate_to_slug(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result TEXT;
BEGIN
  result := lower(input_text);
  
  -- Ukrainian/Russian to Latin transliteration
  result := translate(result,
    'абвгдеєжзиіїйклмнопрстуфхцчшщьюяыэёъ',
    'abvgdeezzyiiiyklmnoprstufhccssyuyaeyo'
  );
  
  -- Replace spaces and special chars with hyphens
  result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
  
  -- Remove leading/trailing hyphens
  result := trim(both '-' from result);
  
  RETURN result;
END;
$$;

-- Generate slugs for existing organizations
UPDATE public.organizations
SET slug = public.transliterate_to_slug(
  CASE 
    WHEN name IS NOT NULL AND name != '' THEN name
    ELSE domain
  END
) || '-' || substring(id::text, 1, 8)
WHERE slug IS NULL;

-- Make slug NOT NULL after populating
ALTER TABLE public.organizations
ALTER COLUMN slug SET NOT NULL;

-- Update handle_new_user to generate slug
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_org_id UUID;
  v_company_name TEXT;
  v_domain TEXT;
  v_requires_onboarding BOOLEAN;
  v_slug TEXT;
BEGIN
  -- Extract company name and domain
  v_company_name := COALESCE(NEW.raw_user_meta_data->>'company', split_part(NEW.email, '@', 2));
  v_domain := split_part(NEW.email, '@', 2);
  v_requires_onboarding := COALESCE((NEW.raw_user_meta_data->>'requires_onboarding')::boolean, true);
  
  -- Generate slug from company name
  v_slug := public.transliterate_to_slug(v_company_name);
  
  RAISE LOG 'Creating user: %, company: %, domain: %, slug: %, requires_onboarding: %', 
    NEW.email, v_company_name, v_domain, v_slug, v_requires_onboarding;
  
  -- Create organization for the user with slug
  INSERT INTO public.organizations (
    name,
    domain,
    slug,
    plan,
    status
  ) VALUES (
    v_company_name,
    v_domain,
    v_slug,
    'starter',
    'active'
  )
  RETURNING id INTO v_org_id;
  
  RAISE LOG 'Created organization with id: % and slug: %', v_org_id, v_slug;

  -- Insert profile with organization and requires_onboarding
  INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name, 
    email, 
    company,
    organization_id,
    requires_onboarding
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,
    NEW.raw_user_meta_data->>'company',
    v_org_id,
    v_requires_onboarding
  );
  
  RAISE LOG 'Created profile for user: %', NEW.id;
  
  -- Add user to organization as owner
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (v_org_id, NEW.id, 'owner');
  
  RAISE LOG 'Added user to organization as owner';
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RAISE LOG 'Assigned user role to user: %', NEW.id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
  RAISE;
END;
$function$;