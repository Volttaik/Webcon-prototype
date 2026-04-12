# WebCon App - Replit Workspace

## Overview

AI-powered learning platform (WebCon) migrated from Vercel to Replit. pnpm workspace monorepo using TypeScript.

## Architecture

- **Frontend/Main App**: Next.js 15 (`artifacts/webcon-app`) — serves React SPA + API routes
- **Express API**: Express 5 (`artifacts/api-server`) — standalone API server (mirrors/supports API routes)
- **Database lib**: `lib/db` — Drizzle ORM with libsql/Turso (local SQLite file by default)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: Next.js 15 + React 19 + Tailwind CSS v4
- **API framework**: Express 5 (api-server) + Next.js API routes (webcon-app)
- **Database**: libsql/Turso (SQLite, local file at `local.db`) + Drizzle ORM
- **Auth**: Custom session-based auth (email + password) with email verification via nodemailer
- **AI**: Groq chat integration via `GROQ_API_KEY`
- **Payments**: Paystack (requires `PAYSTACK_SECRET_KEY` secret)
- **Validation**: Zod, drizzle-zod

## Key Commands

- `pnpm install` — install workspace dependencies from the lockfile
- `pnpm --filter @workspace/webcon-app run dev` — run the main Next.js app locally
- `pnpm --filter @workspace/webcon-app run build` — build the Next.js app
- `pnpm --filter @workspace/webcon-app run start` — start the built Next.js app
- `pnpm --filter @workspace/api-server run dev` — build and run the Express API server
- `pnpm --filter @workspace/db run push` — push DB schema changes to local SQLite/Turso

## Replit Compatibility Fixes Applied

1. **Dependencies installed**: ran `pnpm install` after migration.
2. **Replit run scripts**: Next.js dev/start scripts bind to `0.0.0.0` and use `$PORT` with a 5000 fallback for preview compatibility.
3. **Artifact services configured**: web service runs Next.js on its assigned Replit port; API service runs Express on port 8080 with `PORT` provided in service env.
4. **Production Next.js config**: web artifact production config now builds with `next build` and runs with `next start` instead of treating the app as a static Vite export.
5. **API server — libsql native binary**: `@libsql/linux-x64-gnu` is available as an optional direct dependency for the API server bundle.
6. **Next.js — libsql webpack bundling**: `next.config.ts` transpiles `@workspace/db` and externalizes libsql native/platform packages for server builds.
7. **Missing AI key resilience**: Groq clients are initialized inside request handlers only after `GROQ_API_KEY` is present, preventing missing secrets from crashing app startup.
8. **Next.js SPA wrapper**: React Router app is mounted through the catch-all Next.js page.
9. **Theme provider SSR safety**: browser-only theme access is guarded to avoid server rendering crashes.

## Environment Variables

### Currently configured

- `NEXT_PUBLIC_SITE_URL` — current Replit development URL
- `DATABASE_URL` — runtime-managed by Replit

### Optional database override

- `TURSO_DATABASE_URL` — Turso DB URL (falls back to local file DB if unset)
- `TURSO_AUTH_TOKEN` — Turso auth token (not needed for local file DB)

### Needed for full feature support

- `GROQ_API_KEY` — enables AI chat responses
- `PAYSTACK_SECRET_KEY` — enables credit purchase/payment features
- `GMAIL_USER` — Gmail address for sending verification emails
- `GMAIL_APP_PASSWORD` — Gmail app password for nodemailer

If these secrets are missing, the app still launches; the related feature returns a clear configuration error when used.

## Workflows

- `artifacts/webcon-app: web` — Main Next.js app, currently runs on assigned Replit preview port 22817
- `artifacts/api-server: API Server` — Express API server, runs on port 8080

## Current Runtime Status

- Main web workflow starts successfully and serves `/` with HTTP 200.
- API server workflow starts successfully and listens on port 8080.
- Browser preview renders the WebCon landing page without runtime errors.

## GitHub Export Notes

- GitHub pushes use the `GITHUB_TOKEN` secret when the GitHub account integration is not authorized.
- The `webcon-prototype` repository should receive clean source snapshots that exclude generated/cache directories such as `.next`, `node_modules`, `.cache`, and `.local`.
