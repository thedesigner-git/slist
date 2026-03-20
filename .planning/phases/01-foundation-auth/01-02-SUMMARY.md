# Plan 01-02 Summary: Google OAuth + Auth Flow

**Completed:** 2026-03-20
**Status:** ✓ Done (pending visual checkpoint — requires Google OAuth credentials)

## What Was Built

- `apps/web/components/auth/SignInButton.tsx` — Google OAuth trigger with Google logo
- `apps/web/app/login/page.tsx` — minimal dark auth gate, checks session and redirects if already logged in
- `apps/web/app/auth/callback/route.ts` — exchanges OAuth code for Supabase session, redirects to /dashboard
- `apps/web/app/dashboard/page.tsx` — placeholder showing user email (replaced in Phase 4)
- `supabase/migrations/20260320000001_profiles.sql` — profiles table, auto-create trigger on signup, RLS policies
- `apps/backend/routers/users.py` — GET /api/users/me returning user id + email from JWT
- `apps/backend/main.py` updated to include users router

## User Setup Required

Before testing OAuth locally:
1. Install Supabase CLI: `npm install -g supabase` or `brew install supabase/tap/supabase`
2. Run `supabase start` in repo root — copy anon key and JWT secret to `.env.local`
3. Create Google OAuth credentials in Google Cloud Console
4. Add redirect URI: `http://localhost:54321/auth/v1/callback`
5. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `supabase/.env`
6. Run `supabase db reset` to apply profiles migration
