-- =============================================================================
-- Migration 3: Row-Level Security policies
-- =============================================================================

-- Enable RLS on every public table
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fellows           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_analyses  ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper functions: role checks via JWT claims (set by custom_access_token_hook)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'supervisor'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_supervisor_of_fellow(fellow_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.fellows f
    WHERE f.id = fellow_uuid
      AND f.supervisor_id = auth.uid()
  );
$$;

-- =============================================================================
-- PROFILES
-- =============================================================================
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Supervisors can view profiles of other supervisors"
  ON public.profiles FOR SELECT
  USING (
    public.is_supervisor()
    AND id IN (
      SELECT id FROM public.supervisors
    )
  );

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- =============================================================================
-- USER_ROLES
-- =============================================================================
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.is_admin());

-- =============================================================================
-- SUPERVISORS
-- =============================================================================
CREATE POLICY "Supervisors can view all other supervisors"
  -- Useful for re-assigning sessions to other supervisors
  ON public.supervisors FOR SELECT
  USING (public.is_supervisor());

CREATE POLICY "Admins can manage all supervisors"
  ON public.supervisors FOR ALL
  USING (public.is_admin());

-- =============================================================================
-- GROUPS
-- =============================================================================
CREATE POLICY "Supervisors can view all groups"
  -- If sessions can be re-assigned, then this follows, regardless of whether groups
  -- are associated to supervisors or not
  ON public.groups FOR SELECT
  USING (public.is_supervisor());

CREATE POLICY "Admins can manage all groups"
  ON public.groups FOR ALL
  USING (public.is_admin());

-- =============================================================================
-- FELLOWS
-- =============================================================================
CREATE POLICY "Supervisors can view assigned fellows or fellows with re-assigned tasks"
  ON public.fellows FOR SELECT
  USING (
    public.is_supervisor()
    AND (
      supervisor_id = auth.uid()
      OR id IN (
        SELECT s.fellow_id FROM public.sessions s
        WHERE s.reviewer_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage all fellows"
  ON public.fellows FOR ALL
  USING (public.is_admin());

-- =============================================================================
-- SESSIONS
-- =============================================================================
CREATE POLICY "Supervisors can view their fellows' sessions or assigned sessions"
  ON public.sessions FOR SELECT
  USING (
    public.is_supervisor()
    AND (
      public.is_supervisor_of_fellow(fellow_id)
      OR reviewer_id = auth.uid()
    )
  );

CREATE POLICY "Supervisors can only create sessions for their own fellows"
  ON public.sessions FOR INSERT
  WITH CHECK (
    public.is_supervisor()
    AND public.is_supervisor_of_fellow(fellow_id)
  );

CREATE POLICY "Supervisors can update sessions they can view"
  ON public.sessions FOR UPDATE
  USING (
    public.is_supervisor()
    AND (
      public.is_supervisor_of_fellow(fellow_id)
      OR reviewer_id = auth.uid()
    )
  );

CREATE POLICY "Supervisors can delete sessions for their own fellows"
  ON public.sessions FOR DELETE
  USING (
    public.is_supervisor()
    AND public.is_supervisor_of_fellow(fellow_id)
  );

CREATE POLICY "Admins can manage all sessions"
  ON public.sessions FOR ALL
  USING (public.is_admin());

-- =============================================================================
-- SESSION_ANALYSES
-- =============================================================================
CREATE POLICY "Session viewers can manage analyses"
  ON public.session_analyses FOR ALL
  USING (
    session_id IN (
      SELECT id FROM public.sessions
    )
  );

CREATE POLICY "Admins can manage all analyses"
  ON public.session_analyses FOR ALL
  USING (public.is_admin());
