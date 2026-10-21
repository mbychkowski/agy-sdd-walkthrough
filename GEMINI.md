# OrderPulse — Agent Constitution

## Overview
OrderPulse is a 3-tier retail order fulfillment and inventory triage application.

## Directory Map
- `client/` — React 18 + Vite + Tailwind CSS + TypeScript frontend (Port `5173`, proxies `/api` to `3001`)
  - `client/src/App.tsx` — Dashboard header and KPI summary cards
  - `client/src/components/OrderTable.tsx` — Fulfillment order table and status controls
- `server/` — Express + TypeScript + `better-sqlite3` backend (Port `3001`)
  - `server/src/index.ts` — Express server entry point
  - `server/src/db.ts` — SQLite schema initialization & retail seed data (`server/data/orders.sqlite` or `:memory:` in test)
  - `server/src/routes/orders.ts` — REST API endpoints (`/api/orders`)
  - `server/tests/orders.test.ts` — Vitest + Supertest integration test suite
- `.agents/` — Agent skills (`.agents/skills/`) and verification hooks (`.agents/hooks/verify.sh`)

## Core Commands
- **Install:** `npm install`
- **Dev Server:** `npm run dev`
- **Verify All (Tests + Build):** `npm test`

## Engineering Guardrails
1. Always run `npm test` after modifying backend routes or frontend components.
2. Never modify SQLite schemas without updating seed/migration logic in `server/src/db.ts`.
3. Use parameterized queries in `better-sqlite3` (`db.prepare(...)`). Never interpolate raw SQL strings.
4. Keep UI components in `client/src/components/` strictly typed with TypeScript interfaces.
