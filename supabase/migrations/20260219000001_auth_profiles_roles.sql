-- =============================================================================
-- Migration 1: Auth infrastructure — profiles, roles, triggers, custom JWT hook
-- =============================================================================

-- Role enum used across the app and in JWT claims
CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor');

-- ---------------------------------------------------------------------------
-- profiles: mirrors auth.users for app-level user data
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name  text,
  email      text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- user_roles: one role per user, referenced by the custom access token hook
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- ---------------------------------------------------------------------------
-- Trigger: auto-create a profile row when a new auth user signs up
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email
  );

  -- Let's store the role info for auth guards
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'supervisor');

  -- NOT comfortable with querying supervisors from the profile
  -- or user_roles tables, so I'll duplicate data
  -- We'll need to DELETE IF EXISTS every time user roles are changed &
  -- user is not a supervisor (user is ONLY admin)
  INSERT INTO public.supervisors (id) VALUES (NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Trigger: keep updated_at current (reused by other tables)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- Custom access token hook: injects user_role claim into every JWT
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims    jsonb;
  user_role public.app_role;
BEGIN
  claims := event -> 'claims';

  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = (event ->> 'user_id')::uuid;

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  ELSE
    -- Default to supervisor when no explicit role is assigned
    claims := jsonb_set(claims, '{user_role}', '"supervisor"');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- The auth service calls this function as supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- The hook reads user_roles to resolve the claim
GRANT SELECT ON TABLE public.user_roles TO supabase_auth_admin;
