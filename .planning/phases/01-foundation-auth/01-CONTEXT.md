# Phase 1 Context: Foundation & Auth

**Phase:** 1 — Foundation & Auth
**Created:** 2026-03-20
**Status:** Ready for planning

---

## Core User Constraint (CRITICAL — applies to all phases)

> "I do not want to collect any data from customers. I do not need anything from them. I want no restriction — they can use what I can use."

**What this means for implementation:**
- **No analytics** — no Mixpanel, Amplitude, Google Analytics, Plausible, or any behavior tracking
- **No user behavior logging** — no event logs, session recordings, funnel tracking
- **No feature tiers or access control** — every authenticated user has 100% identical access to all features and data
- **Auth = identity only** — Google login exists solely so notes can be saved per person; it is NOT a gate to features
- **No data sold or shared** — no third-party data pipelines beyond what's strictly needed to run the app
- **No consent banners, cookie notices, or privacy popups** — nothing to consent to because nothing is collected

This constraint is FIXED and must be respected in every phase.

---

## Decisions

### Repo Structure
**Decision:** Monorepo — single repository with three apps.

```
new-investment-project/
  apps/
    web/          ← Next.js 14 (App Router)
    mobile/       ← React Native / Expo
    backend/      ← Python FastAPI
  packages/
    types/        ← Shared TypeScript types
  .planning/
```

**Why:** Web and mobile share API types; a monorepo avoids duplication and keeps everything in one place for a small team. No Turborepo overhead for now — just a root `package.json` with workspaces.

---

### Login Page Experience
**Decision:** Minimal, clean auth gate. No marketing landing page.

- Single centered card: app name/logo + "Sign in with Google" button
- No signup form, no email/password, no other options
- After login: redirect directly to dashboard
- No onboarding flow, no profile setup, no welcome modal
- Dark or neutral color scheme (matches an investment/finance aesthetic)

**Why:** This is a small team internal tool. Nobody needs to be sold on it.

---

### Session Strategy
**Decision:** Supabase Auth with Next.js middleware using server-side cookies (`@supabase/ssr`).

- Use `@supabase/ssr` package (official Next.js App Router integration)
- Sessions stored in httpOnly cookies — secure, works with SSR and Server Components
- Middleware (`middleware.ts`) protects all routes except `/login`; unauthenticated users redirected to `/login`
- No JWT manipulation in client code — Supabase handles refresh automatically
- FastAPI reads the Supabase JWT from the `Authorization` header to identify the user on API calls

**Why:** httpOnly cookies are more secure than localStorage. `@supabase/ssr` is the officially supported pattern for Next.js App Router.

---

### Docker Compose Scope
**Decision:** Supabase local stack via `supabase` CLI + FastAPI in Docker. Next.js runs natively.

```yaml
# docker-compose.yml covers:
- Supabase local (postgres, auth, storage, studio) via supabase CLI
- FastAPI backend (Python container with hot reload)
# Not in Docker:
- Next.js web (runs via `npm run dev` natively — faster HMR)
- Expo mobile (runs via `npx expo start` natively)
```

Single startup: `supabase start && docker-compose up` → everything running.

**Why:** Supabase CLI provides a full local Supabase stack (including Studio UI) with one command. Keeping Next.js native avoids Docker networking complexity and gives faster hot reload.

---

### CI Skeleton
**Decision:** GitHub Actions with three jobs on PR and push to main.

1. `lint` — ESLint (web), Ruff (backend)
2. `typecheck` — `tsc --noEmit` (web/packages), Pyright or mypy (backend)
3. `test` — Vitest (web unit tests), pytest (backend unit tests)

No deployment in CI for now — manual deploy in Phase 7.

---

## What Downstream Agents Should Know

- **No analytics code anywhere** — if a library suggests adding tracking, skip it
- **No RBAC, no roles, no permissions checks** — every logged-in user is equal
- **Auth middleware pattern:** `middleware.ts` → Supabase session check → redirect if unauthenticated
- **FastAPI auth:** extract user from Supabase JWT in a `get_current_user` dependency, used on all protected endpoints
- **Monorepo structure is fixed** — all new apps/packages go under `apps/` or `packages/`
- **Supabase local for dev** — no hitting production Supabase during development

## Deferred Ideas

*(None from this phase discussion)*
