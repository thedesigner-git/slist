# Phase 1 Research: Foundation & Auth

**Phase:** 1 — Foundation & Auth
**Date:** 2026-03-20

---

## Key Findings

### 1. Monorepo Setup (npm workspaces, no Turborepo)

Minimal monorepo with npm workspaces — no Turborepo overhead for a small team.

```
new-investment-project/
  apps/
    web/           ← Next.js 14 (own package.json, "name": "@investiq/web")
    mobile/        ← Expo (own package.json, "name": "@investiq/mobile")
    backend/       ← FastAPI (no package.json — Python only)
  packages/
    types/         ← Shared TS types (own package.json, "name": "@investiq/types")
  package.json     ← root workspaces config
  pnpm-workspace.yaml OR package.json workspaces field
```

Root `package.json`:
```json
{
  "private": true,
  "workspaces": ["apps/web", "apps/mobile", "packages/*"],
  "scripts": {
    "dev:web": "npm -w @investiq/web run dev",
    "dev:backend": "docker-compose up backend",
    "lint": "npm -w @investiq/web run lint",
    "typecheck": "npm -w @investiq/web run typecheck && npm -w @investiq/types run typecheck"
  }
}
```

**Expo / Metro gotcha:** Metro bundler doesn't follow symlinks from npm workspaces by default. Must add `watchFolders` in `metro.config.js`:
```js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '../../packages')];
module.exports = config;
```

**Python backend:** Lives in `apps/backend/` but is NOT a JS workspace. Managed independently with `pip` and `pyproject.toml` (or `requirements.txt`). Docker Compose handles its runtime.

---

### 2. Supabase Local Dev (Supabase CLI)

`supabase start` spins up a full local Supabase stack via Docker under the hood. It manages its own containers — **do not include Supabase services in your own docker-compose.yml** (conflict risk).

Workflow:
```bash
supabase init           # creates supabase/ dir at repo root
supabase start          # starts local stack (first run pulls images ~1-2min)
supabase stop           # stops local stack
supabase db reset       # re-run all migrations
```

Output of `supabase start`:
```
API URL:      http://localhost:54321
GraphQL URL:  http://localhost:54321/graphql/v1
DB URL:       postgresql://postgres:postgres@localhost:54322/postgres
Studio URL:   http://localhost:54323
Anon key:     eyJ...
Service role: eyJ...
JWT Secret:   super-secret-jwt-token-with-at-least-32-characters-long
```

**Env vars** to wire into Next.js and FastAPI:
```env
# .env.local (Next.js)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>

# apps/backend/.env (FastAPI)
SUPABASE_URL=http://localhost:54321
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
```

**Docker Compose** only manages FastAPI (not Supabase):
```yaml
services:
  backend:
    build: ./apps/backend
    ports:
      - "8000:8000"
    env_file: ./apps/backend/.env
    volumes:
      - ./apps/backend:/app
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    network_mode: host   # lets FastAPI reach localhost:54321 (Supabase)
```

**Startup script** (`dev.sh` or Makefile):
```bash
supabase start && docker-compose up backend
# Next.js: npm -w @investiq/web run dev (separate terminal)
```

---

### 3. @supabase/ssr with Next.js 14 App Router

Install: `@supabase/ssr @supabase/supabase-js`

Three utility files needed:

**`apps/web/lib/supabase/server.ts`** (Server Components + Route Handlers):
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {} // Server Component — middleware handles refresh
        },
      },
    }
  )
}
```

**`apps/web/lib/supabase/client.ts`** (Client Components):
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**`apps/web/middleware.ts`** (route protection):
```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !request.nextUrl.pathname.startsWith('/login') &&
      !request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

**Auth callback route** (`apps/web/app/auth/callback/route.ts`):
```ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(`${origin}/dashboard`)
}
```

---

### 4. Google OAuth with Supabase

**Local dev setup (Supabase config.toml):**
```toml
# supabase/config.toml
[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_CLIENT_SECRET)"
```

**Google Cloud Console setup (human step):**
1. Create OAuth 2.0 credentials in Google Cloud Console
2. Authorized redirect URIs:
   - Local: `http://localhost:54321/auth/v1/callback`
   - Production: `https://<project-ref>.supabase.co/auth/v1/callback`

**Login page trigger:**
```ts
const supabase = createClient() // browser client
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  },
})
```

**Gotcha:** In local dev, the redirect goes through `localhost:54321` (Supabase local auth), not directly to the app. This is correct — Supabase handles the OAuth exchange.

---

### 5. FastAPI + Supabase JWT Verification

Install: `PyJWT>=2.0`, `python-jose[cryptography]` (or just `PyJWT` — simpler)

**`apps/backend/auth.py`:**
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os

security = HTTPBearer()
JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"]

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},  # Supabase uses 'authenticated' aud
        )
        return payload  # contains sub (user id), email, role, etc.
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

Usage:
```python
@app.get("/api/me")
def me(user=Depends(get_current_user)):
    return {"user_id": user["sub"], "email": user.get("email")}
```

**No RBAC:** Every authenticated user is equal. No role checks beyond verifying JWT is valid.

---

### 6. GitHub Actions CI

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  web:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test -- --run

  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r requirements-dev.txt
      - run: ruff check .
      - run: pytest
```

---

## Recommended Approaches

### Monorepo
**Recommendation:** npm workspaces, no Turborepo.
**Why:** Three apps, small team, no need for build caching infrastructure.
**Gotcha:** Add `metro.config.js` watchFolders for Expo before mobile phase.

### Local Dev Startup
**Recommendation:** `supabase start` first, then `docker-compose up backend`, then `npm run dev:web`.
**Why:** Supabase CLI manages its own Docker network; FastAPI uses `network_mode: host` to reach it.
**Gotcha:** `supabase start` is slow on first run. Document this in README.

### Auth
**Recommendation:** `@supabase/ssr` with httpOnly cookies + middleware.ts.
**Why:** Official Next.js App Router pattern. Secure, SSR-compatible, handles refresh automatically.
**Gotcha:** Must return `supabaseResponse` from middleware (not a fresh `NextResponse`) to preserve cookie updates.

### User Profile
**Recommendation:** Use Supabase's built-in `auth.users` table — no custom users table needed for v1.
**Why:** Supabase Auth already stores id, email, name (from Google). Notes table can FK to `auth.users.id`.
**Gotcha:** `auth.users` is not directly queryable from client — use `supabase.auth.getUser()` instead.

### FastAPI JWT
**Recommendation:** `PyJWT` with HS256, skip audience verification.
**Why:** Supabase local dev uses a static JWT secret. PyJWT is simpler than python-jose for this use case.
**Gotcha:** Set `options={"verify_aud": False}` — Supabase sets aud to "authenticated" which PyJWT rejects by default.
