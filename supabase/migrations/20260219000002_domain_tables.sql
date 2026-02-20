-- =============================================================================
-- Migration 2: Domain tables — supervisors, groups, fellows, sessions, analyses
-- =============================================================================

-- ---------------------------------------------------------------------------
-- supervisors: extends profiles for users with the supervisor role
-- Uses the same PK as profiles (1:1 relationship)
-- ---------------------------------------------------------------------------
CREATE TABLE public.supervisors (
  id         uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- groups: therapy groups
-- ---------------------------------------------------------------------------
CREATE TABLE public.groups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- fellows: lay providers who deliver sessions, assigned to a supervisor
-- ---------------------------------------------------------------------------
CREATE TABLE public.fellows (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     text NOT NULL,
  email         text,
  supervisor_id uuid NOT NULL REFERENCES public.supervisors(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- sessions: completed therapy sessions with transcript and review state
-- ---------------------------------------------------------------------------
CREATE TABLE public.sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fellow_id    uuid        NOT NULL REFERENCES public.fellows(id)      ON DELETE CASCADE,
  group_id     uuid        NOT NULL REFERENCES public.groups(id)       ON DELETE CASCADE,
  session_date timestamptz NOT NULL,
  transcript   text        NOT NULL,
  status       text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processed', 'flagged_for_review', 'safe')),
  reviewer_id  uuid        REFERENCES public.supervisors(id),
  review_note  text,
  reviewed_at  timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- session_analyses: one-to-one structured AI output per session
-- ---------------------------------------------------------------------------
CREATE TABLE public.session_analyses (
  id                                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                        uuid NOT NULL UNIQUE REFERENCES public.sessions(id) ON DELETE CASCADE,
  summary                           text NOT NULL,
  content_coverage_score            int  NOT NULL CHECK (content_coverage_score    BETWEEN 1 AND 3),
  content_coverage_justification    text NOT NULL,
  facilitation_quality_score        int  NOT NULL CHECK (facilitation_quality_score BETWEEN 1 AND 3),
  facilitation_quality_justification text NOT NULL,
  protocol_safety_score             int  NOT NULL CHECK (protocol_safety_score     BETWEEN 1 AND 3),
  protocol_safety_justification     text NOT NULL,
  risk_flag                         text NOT NULL CHECK (risk_flag IN ('SAFE', 'RISK')),
  risk_quotes                       text[] DEFAULT '{}',
  last_ran_at                       timestamptz,
  last_ran_by                       uuid REFERENCES public.supervisors(id),
  created_at                        timestamptz DEFAULT now()
);
