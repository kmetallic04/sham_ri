# Shamiri Supervisor Copilot

A Next.js app for supervisors to review therapy sessions delivered by fellows. Access to data is enforced in the database with **Row Level Security (RLS)**; the app uses a single server action to run the **AI session-analysis** tool.

---

## Row Level Security (RLS)

All access control is implemented in Postgres via RLS. Every request uses the authenticated user’s JWT (`auth.uid()`); policies decide which rows that user can read or change. The app does not implement its own permission checks—it relies on Supabase and RLS.

### Roles and helpers

- **Roles** are stored in `public.user_roles` (`admin`, `supervisor`). They are set in the JWT (e.g. via a custom access token hook).
- **Helper functions** (used in policies):
  - `public.is_admin()` — current user has role `admin`
  - `public.is_supervisor()` — current user has role `supervisor`
  - `public.is_supervisor_of_fellow(fellow_uuid)` — current user is that fellow’s `supervisor_id` in `public.fellows`

### Tables and policies (summary)

| Table | RLS | Who can do what |
|-------|-----|------------------|
| **profiles** | ✅ | Users: own profile. Supervisors: view other supervisors. Admins: view all. |
| **user_roles** | ✅ | Users: view own role. Admins: full access. |
| **supervisors** | ✅ | Supervisors: view all. Admins: full access. |
| **groups** | ✅ | Supervisors: view all. Admins: full access. |
| **fellows** | ✅ | Supervisors: view own fellows or fellows with sessions assigned to them (`reviewer_id`). Admins: full access. |
| **sessions** | ✅ | Supervisors: view/update sessions where they are the fellow’s supervisor or the session’s `reviewer_id`; insert/delete only for their own fellows. Admins: full access. |
| **session_analyses** | ✅ | Access only if the user can see the related session (via `session_id`). Admins: full access. |

Sessions are the main focus: supervisors see only their fellows’ sessions or sessions assigned to them for review; admins see and manage all sessions. All tables use explicit `FOR SELECT` / `FOR INSERT` / `FOR UPDATE` / `FOR DELETE` (or `FOR ALL` where intended) so behaviour is clear and consistent.

---

## AI tool: one server action

The only server-side entry point for the AI analysis feature is a **single server action** that runs the “analyze session” tool:

- **File:** `app/actions/analyze-session.ts`
- **Function:** `getOrCreateAnalysis(sessionId, force?)`

It:

1. Uses the Supabase **server client** (cookie-based session, so `auth.uid()` is set).
2. Loads the session (and related fellow/supervisor/group). If the user has no access, the `.from("sessions").select(...).single()` call returns no row—RLS blocks it—and the action throws.
3. If an analysis already exists and `force` is false, returns that analysis (no AI call).
4. Otherwise calls **Google Gemini** (e.g. `gemini-2.5-flash`) with the session transcript and a system prompt to produce structured JSON (summary, scores, risk flag, etc.).
5. Validates the response with `sessionAnalysisSchema` and inserts into `session_analyses`. RLS allows insert only if the user can see that session.

So: **authorization is enforced by RLS**; the server action only runs the AI and reads/writes through Supabase. There is no separate “check if user may analyze this session” logic in the app—if RLS allows the session read and the analysis insert, the action succeeds; otherwise Supabase returns an error.

The same file exposes `updateSessionStatus(sessionId, status)` for marking a session safe or flagged; again, updates are allowed only if RLS permits that row.

---

## Setup and run

1. **Supabase**  
   Create a project and run migrations under `supabase/migrations/` (schema + RLS).

2. **Environment**  
   Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or publishable key)
   - `GOOGLE_GENERATIVE_AI_API_KEY` (for the analyze-session action)

3. **Run**  
   `npm run dev` (or your package manager). Use the app as a supervisor or admin; RLS and the single server action above define what each role can see and do.
