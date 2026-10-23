# FulfillmentHub — Repository Constitution

## Architecture & Stack
- **Backend (`server/`):** Node.js + TypeScript + Express (port 3001) + SQLite (`server/src/db.ts`).
- **Frontend (`client/`):** React 18 + Vite (port 5173) + Tailwind CSS.
- **Specs (`spec/`):** Durable feature specifications and evaluation rubrics.

## Mandatory Verification Commands
- Fast backend unit tests: `npm run test:fast`
- Full build & test check: `npm test`
