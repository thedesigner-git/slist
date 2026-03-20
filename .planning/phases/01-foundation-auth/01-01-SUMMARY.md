# Plan 01-01 Summary: Monorepo Scaffold

**Completed:** 2026-03-20
**Status:** ✓ Done

## What Was Built

- Monorepo structure: `apps/web`, `apps/mobile`, `apps/backend`, `packages/types`
- Root `package.json` with npm workspaces
- `packages/types` — shared TypeScript types (User, Market, Strategy)
- `apps/web` — Next.js 14 App Router with Tailwind, `@supabase/ssr`, middleware route protection
- `apps/web/lib/supabase/server.ts` and `client.ts` — Supabase SSR utilities
- `apps/web/middleware.ts` — protects all routes, redirects unauthenticated to /login
- `apps/backend/main.py` — FastAPI with /health endpoint and CORS
- `apps/backend/auth.py` — `get_current_user` dependency using PyJWT + Supabase JWT secret
- `docker-compose.yml` — FastAPI container with `network_mode: host`
- `supabase/config.toml` — local Supabase config with Google OAuth enabled
- `.env.example`, `.gitignore`

## Key Decisions Made

- `network_mode: host` in Docker Compose so FastAPI reaches Supabase CLI at localhost:54321
- Supabase CLI manages its own Docker containers — not included in docker-compose.yml
- `verify_aud: False` in PyJWT decode (Supabase uses "authenticated" audience)

## Files Created

- package.json, .gitignore, .env.example
- packages/types/index.ts, package.json, tsconfig.json
- apps/web/package.json, next.config.ts, tsconfig.json, tailwind.config.ts, postcss.config.js
- apps/web/app/layout.tsx, app/page.tsx, app/globals.css
- apps/web/lib/supabase/server.ts, client.ts
- apps/web/middleware.ts
- apps/backend/main.py, auth.py, requirements.txt, requirements-dev.txt, pyproject.toml, Dockerfile, .env.example
- docker-compose.yml
- supabase/config.toml
