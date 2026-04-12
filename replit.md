# WebCon App - Replit Workspace

## Overview

AI-powered learning platform (WebCon) migrated from Vercel to Replit. pnpm workspace monorepo using TypeScript.

## Architecture

- **Frontend/Main App**: Next.js 15 (`artifacts/webcon-app`) — serves React SPA + API routes
- **Express API**: Express 5 (`artifacts/api-server`) — standalone API server (mirrors Next.js API routes)
- **Database lib**: `lib/db` — Drizzle ORM with libsql/Turso (local SQLite file by default)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: Next.js 15 + React 19 + Tailwind CSS v4
- **API framework**: Express 5 (api-server) + Next.js API routes (webcon-app)
- **Database**: libsql/Turso (SQLite, local file at `local.db`) + Drizzle ORM
- **Auth**: Custom session-based auth (email + password) with email verification via nodemailer
- **AI**: Anthropic Claude via Replit AI Integrations
- **Payments**: Paystack (requires `PAYSTACK_SECRET_KEY` secret)
- **Validation**: Zod, drizzle-zod

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes to local SQLite
- `pnpm --filter @workspace/webcon-app run dev` — run Next.js app locally

## Replit Compatibility Fixes Applied

1. **Dependencies installed**: ran `pnpm install` after migration.
2. **API server — libsql native binary**: Added `@libsql/linux-x64-gnu` as an optional direct dep of `api-server` so the built bundle can resolve the native SQLite driver at runtime. Also externalized `@libsql/*` and `libsql` in `build.mjs`.
3. **Next.js — libsql webpack bundling**: `lib/db` exports raw TypeScript which Next.js transpiles via webpack. The libsql package uses dynamic `require()` for platform native binaries which confuses webpack. Fixed in `next.config.ts` by externalizing all platform-specific `@libsql/linux-*` binaries in the server webpack config.
4. **Next.js SPA wrapper**: The React Router app is mounted only after the client is ready, avoiding server-side `document` access during Next.js rendering.
5. **Theme provider SSR safety**: Guarded browser-only `localStorage` and `window.matchMedia` reads so server rendering does not crash.
6. **Replit run scripts**: Next.js dev/start scripts bind to `0.0.0.0` and use `$PORT` with a 5000 fallback for Replit preview compatibility.

## Environment Variables

### Already configured (in .replit userenv):
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase publishable key
- `SUPABASE_URL` — Server-side Supabase URL
- `NEXT_PUBLIC_SITE_URL` — App domain
- `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_DATABASE` — PostgreSQL connection info

### Optional (for Turso cloud DB):
- `TURSO_DATABASE_URL` — Turso DB URL (falls back to local `file:/home/runner/workspace/local.db`)
- `TURSO_AUTH_TOKEN` — Turso auth token (not needed for local file DB)

### Automatically configured via Replit AI Integrations:
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — Replit AI integrations key
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` — Replit AI integrations endpoint

### Needs to be added as a secret:
- `PAYSTACK_SECRET_KEY` — For credit purchase/payment features
- `GMAIL_USER` — Gmail address for sending verification emails
- `GMAIL_APP_PASSWORD` — Gmail app password for nodemailer

## Workflows

- `artifacts/webcon-app: web` — Main Next.js app artifact (port via $PORT env var, externally port 80)
- `artifacts/api-server: API Server` — Express API server (port via $PORT env var, externally port 8080)

## GitHub Export Notes

- GitHub pushes use the `GITHUB_TOKEN` secret when the GitHub account integration is not authorized.
- The `webcon-prototype` repository should receive clean source snapshots that exclude generated/cache directories such as `.next`, `node_modules`, `.cache`, and `.local`.
