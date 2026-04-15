# WebCon App - Replit Workspace

## Overview

AI-powered learning platform (WebCon) migrated from Vercel/Turso to run in Replit development while targeting Vercel production deployment with Supabase Postgres.

## Architecture

- **Frontend/Main App**: Next.js 15 (`artifacts/webcon-app`) — serves React SPA + API routes
- **Express API**: Express 5 (`artifacts/api-server`) — standalone API server (mirrors/supports API routes)
- **Database lib**: `lib/db` — Drizzle ORM with PostgreSQL via `pg` Pool

## Stack

- **Monorepo tool**: pnpm workspaces
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: Next.js 15 + React 19 + Tailwind CSS v4
- **API framework**: Express 5 (api-server) + Next.js API routes (webcon-app)
- **Database**: Supabase Postgres / PostgreSQL + Drizzle ORM
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
- `pnpm --filter @workspace/db run push` — push DB schema changes to PostgreSQL

## Replit Compatibility Fixes Applied

1. **Dependencies installed**: ran `pnpm install` after migration.
2. **Replit run scripts**: Next.js dev/start scripts bind to `0.0.0.0` and use `$PORT` with a 5000 fallback for preview compatibility.
3. **Artifact services configured**: web service runs Next.js on its assigned Replit port; API service runs Express on port 8080 with `PORT` provided in service env.
4. **Production Next.js config**: web artifact production config builds with `next build` and runs with `next start`.
5. **Postgres DB runtime**: `lib/db` uses `pg.Pool` and Drizzle's node-postgres adapter.
6. **Vercel deployment config**: root `vercel.json` builds `@workspace/webcon-app` and outputs `artifacts/webcon-app/.next`.
7. **Missing AI key resilience**: Groq clients are initialized inside request handlers only after `GROQ_API_KEY` is present, preventing missing secrets from crashing app startup.
8. **Next.js SPA wrapper**: React Router app is mounted through the catch-all Next.js page.
9. **Theme provider SSR safety**: browser-only theme access is guarded to avoid server rendering crashes.
10. **Hidden admin deployment page**: `/admin/deployment` is not linked in normal navigation and is protected by HTTP Basic auth. Defaults are `admin` / `liquid4*`, override with `ADMIN_USERNAME` and `ADMIN_PASSWORD` in production.

## Environment Variables

### Currently configured

- `NEXT_PUBLIC_SITE_URL` — current Replit development URL
- `DATABASE_URL` — runtime-managed by Replit or provided Postgres URL

### Database connection priority

- `SUPABASE_DATABASE_URL` — preferred Vercel production Supabase Postgres connection string
- `DATABASE_URL` — fallback Postgres connection string
- `POSTGRES_URL` — fallback Postgres connection string
- `POSTGRES_PRISMA_URL` — fallback Postgres connection string

### Needed for full feature support

- `GROQ_API_KEY` — enables AI chat responses
- `PAYSTACK_SECRET_KEY` — enables credit purchase/payment features
- `GMAIL_USER` — Gmail address for sending verification emails
- `GMAIL_APP_PASSWORD` — Gmail app password for nodemailer
- `NEXT_PUBLIC_SITE_URL` — production app URL for callbacks and links
- `ADMIN_USERNAME` — optional admin page username override
- `ADMIN_PASSWORD` — optional admin page password override

If these secrets are missing, the app still launches; the related feature returns a clear configuration error when used.

## Supabase Setup

- Run `lib/db/supabase-schema.sql` in the Supabase SQL editor before first production use, or run `pnpm --filter @workspace/db run push` with a Postgres connection string configured.
- Vercel should use `SUPABASE_DATABASE_URL` for the production database connection.

## Workflows

- `artifacts/webcon-app: web` — Main Next.js app, currently runs on assigned Replit preview port
- `artifacts/api-server: API Server` — Express API server, runs on port 8080

## Current Runtime Status

- Main web workflow starts successfully and serves `/` with HTTP 200.
- API server workflow starts successfully and listens on port 8080.
- Browser preview renders the WebCon landing page without runtime errors.

## Visual Design Direction

- The app uses a warm monochrome style inspired by polished AI workspaces: soft off-white backgrounds, black/white contrast, greyscale surfaces, and layered elevation.
- Dashboard and chat screens use stronger card shadows, glassy elevated panels, ambient background gradients, and black/white orb accents to avoid flat planes.

## GitHub Export Notes

- GitHub remote `origin` points to `https://github.com/Volttaik/Webcon-prototype`.
- GitHub pushes should use the connected GitHub authorization flow or a secure token supplied as an environment secret, not a token committed into files.
- The `webcon-prototype` repository should receive clean source snapshots that exclude generated/cache directories such as `.next`, `node_modules`, `.cache`, and `.local`.
