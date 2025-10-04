-- Update handle_new_user to include requires_onboarding
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
BEGIN
  -- Extract company name and domain
  v_company_name := COALESCE(NEW.raw_user_meta_data->>'company', split_part(NEW.email, '@', 2));
  v_domain := split_part(NEW.email, '@', 2);
  v_requires_onboarding := COALESCE((NEW.raw_user_meta_data->>'requires_onboarding')::boolean, true);
  
  RAISE LOG 'Creating user: %, company: %, domain: %, requires_onboarding: %', NEW.email, v_company_name, v_domain, v_requires_onboarding;
  
  -- Create organization for the user
  INSERT INTO public.organizations (
    name,
    domain,
    plan,
    status
  ) VALUES (
    v_company_name,
    v_domain,
    'starter',
    'active'
  )
  RETURNING id INTO v_org_id;
  
  RAISE LOG 'Created organization with id: %', v_org_id;

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