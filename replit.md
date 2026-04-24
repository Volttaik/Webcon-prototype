# EduBridge App - Replit Workspace

## Overview

EduBridge (formerly WebCon) — an AI-powered learning platform that pairs students with course-specific AI study agents. Migrated from Vercel/Turso to run in Replit development. Targets Vercel/Replit production deployment with Postgres.

## Brand

- **Name**: EduBridge — bridging students with personalized AI agents
- **Logo**: Custom bridge mark (`src/components/Logo.tsx`) — minimal stroke arch + deck + pillars, uses `currentColor`
- **Theme**: Dark by default, warm monochrome palette
- **Note**: The pnpm workspace package name is still `@workspace/webcon-app` for backwards compatibility with the workflow filter — the brand was rebranded at the UI/copy level.

## Architecture

- **Frontend/Main App**: Next.js 15 (`artifacts/webcon-app`) — serves React SPA + API routes
- **Express API**: Express 5 (`artifacts/api-server`) — standalone API server
- **Database lib**: `lib/db` — Drizzle ORM with PostgreSQL via `pg` Pool

## Stack

- **Monorepo**: pnpm workspaces · TypeScript 5.9
- **Frontend**: Next.js 15 + React 19 + Tailwind CSS v4 + Framer Motion
- **API**: Express 5 + Next.js API routes
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Custom session-based (email + password), email verification via nodemailer
- **AI**: Groq — `llama-3.3-70b-versatile` (text + tools), `meta-llama/llama-4-scout-17b-16e-instruct` (vision)
- **Payments**: Paystack
- **Validation**: Zod, drizzle-zod

## Key Commands

- `pnpm install`
- `pnpm --filter @workspace/webcon-app run dev` — main app on `$PORT` (5000 fallback)
- `pnpm --filter @workspace/webcon-app run build`
- `pnpm --filter @workspace/db run push` — push DB schema

## Workflows

- `Start application` — runs the main app (`pnpm --filter @workspace/webcon-app run dev`) on port 5000

## AI Capabilities (`/api/chat/conversations/[id]/messages`)

- **Vision**: when an `imageUrl` is attached, the route switches to the vision model and passes a multimodal content array (text + image_url). Vision calls skip tools.
- **Tools** (text path):
  - `web_search` — DuckDuckGo Instant Answer + Related Topics, returns up to ~5 results with sources
  - `schedule_session` — inserts a row into `scheduleSessionsTable` (the same table the Schedule UI reads from)
  - `create_document` — saves a workspace item (note/study guide/etc)
  - `create_project` — multi-task project + tasks
  - `plan_schedule` — saves a written study plan as a workspace doc
- **Memory**: long-term snippets per (agent, user), capped at 15 entries, deduped by snippet
- **System prompt**: injects today's date, agent personality/soul/system prompt, hub knowledge base, vision guidance, and tool guidelines

## Theme & Hydration

- `src/app/layout.tsx` includes a pre-hydration inline script that reads `localStorage['edubridge-theme']` (with `webcon-theme` legacy fallback) and applies the `dark` class to `<html>` before paint — eliminates white flash on load.
- `ThemeProvider` (`src/lib/theme.tsx`) writes to `edubridge-theme`; default theme is `dark`.

## Real Data Surfaces (no dummy/coming-soon)

- **Schedule** (`/schedule`) — TanStack Query against `/api/schedule` (GET/POST/PATCH/DELETE). Manual creation via dialog; agent-suggested sessions show in sidebar with attribution.
- **Settings → Credits** — Real Paystack flow (`/api/credits/buy`) for the `starter`, `standard`, `pro_pack`, and `mega` packages, plus a live transaction history list (`/api/credits/history`).
- **Billing** (`/billing`) — Already real-data, unchanged.

## Replit Compatibility Fixes

1. Workflow `Start application` runs the Next.js app on port 5000 bound to `0.0.0.0`.
2. `viewport.themeColor` moved from `metadata` to `viewport` export (Next 15 conformance).
3. Service worker cache renamed to `edubridge-v1` so the rebrand invalidates old caches.
4. Manifest rebranded to EduBridge.
5. Groq clients are constructed inside request handlers, only after `GROQ_API_KEY` is read — missing secrets do not crash startup.
6. Theme provider is browser-guarded for SSR safety.

## Environment Variables

### Currently configured

- `NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`

### Database connection priority

`SUPABASE_DATABASE_URL` → `DATABASE_URL` → `POSTGRES_URL` → `POSTGRES_PRISMA_URL`

### Needed for full feature support

- `GROQ_API_KEY` — AI chat (text + vision)
- `PAYSTACK_SECRET_KEY` — credit purchases
- `GMAIL_USER` + `GMAIL_APP_PASSWORD` — verification + hub emails
- `NEXT_PUBLIC_SITE_URL` — production callback URL
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — admin page basic auth (defaults `admin` / `liquid4*`)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` — Web Push notifications (auto-generated; persist in shared env)

If a secret is missing the app launches and the affected feature returns a clear configuration error when used.

## Visual Design

- Warm monochrome inspired by polished AI workspaces: soft contrast, layered elevation, subtle shadows.
- Dashboard and chat surfaces use elevated card shadows, glassy panels, and ambient gradients.
- New EduBridge brand mark — a stylized bridge — appears in the header, sidebar, landing page, footer, and chat empty state.

## Notifications & Web Push

- **In-app notification center**: bell icon in the top header (`src/components/NotificationBell.tsx`) reads from `notifications` table via `/api/notifications` (GET/PATCH/DELETE). Supports unread badge, mark-all-read, and click-through to `href`.
- **Web Push (PWA)**: service worker (`public/sw.js`) handles `push` and `notificationclick` events. Browsers subscribe via `enablePushNotifications()` in `src/lib/push-client.ts`, which calls `/api/push/subscribe` to persist a `push_subscriptions` row.
- **Server-side send**: `src/lib/push-server.ts` exposes `sendPushToUser(userId, payload)`, used by `/api/credits/verify` and `/api/plans/verify` to fire a phone-style notification on payment success. Stale subscriptions (404/410) are auto-pruned.
- **Schema migrations** for both tables live in `src/instrumentation.ts` and are applied at startup; each step runs in its own try/catch so dev environments without `users` don't block other migrations.

## Recent Changes (April 2026)

- Unified Paystack flow: every redirect lands on `/payment/callback` with branded success/cancel/error cards. `/api/credits/verify` and `/api/plans/verify` now coerce `meta.userId` to `Number()` to fix spurious "User mismatch" errors.
- Added in-app notifications + Web Push: bell in header, `notifications` + `push_subscriptions` tables, push fired on credits/plan purchase, service worker upgraded to handle push & click-through.
- Migrated Vercel/Turso → Replit (port 5000 workflow).
- Rebranded WebCon → EduBridge across UI, manifest, service worker, emails, WhatsApp copy, and admin auth realm.
- New `Logo` component (bridge arch + deck + pillars).
- Eliminated white flash via pre-hydration theme script.
- Replaced dummy Schedule data with real `/api/schedule`-backed CRUD; added "Add session" dialog and agent-suggestions sidebar.
- Replaced "Payment coming soon" toast in Settings with the real Paystack purchase flow plus a transaction history list.
- Improved AI agent: vision support (image attachments), `schedule_session` tool, expanded web search results, memory cap 5 → 15, stronger system prompt with date awareness and tool discipline.

## GitHub Export Notes

- GitHub remote `origin` points to `https://github.com/Volttaik/Webcon-prototype`.
- Use the connected GitHub authorization flow or a secret token (never commit tokens).
- Exclude `.next`, `node_modules`, `.cache`, `.local` from clean snapshots.
