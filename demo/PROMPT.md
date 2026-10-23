# One-Shot Bootstrap Prompt — `day2-start` (Bare Harness Baseline)

If you are unable to clone or pull the `day2-start` branch of the **FulfillmentHub** repository, copy and paste the prompt below into Antigravity in an empty directory (or an existing workspace) to generate the exact `day2-start` baseline state in a single shot.

---

## Copy-Paste One-Shot Prompt (`day2-start`)

````text
Build the complete "day2-start" (Bare Harness Baseline) state of the FulfillmentHub retail order and inventory triage portal in this workspace.

Execute all steps below end-to-end, install dependencies, and verify that `npm run test:fast` and `npm test` pass before finishing.

---

### 1. Architecture & Package Configuration

Create a full-stack TypeScript monorepo with a root `package.json`, `server/` (Express + TypeScript + `better-sqlite3` on port `3001`), and `client/` (React 18 + Vite + Tailwind CSS on port `5173`).

1. **Root `package.json`:**
   - `"name": "fulfillmenthub"`
   - Scripts:
     - `"dev": "concurrently -n \"SERVER,CLIENT\" -c \"blue,magenta\" \"npm --prefix server run dev\" \"npm --prefix client run dev\""`
     - `"test:fast": "npm --prefix server run test:fast"`
     - `"test": "npm --prefix server test && npm --prefix client run build"`
   - `devDependencies`: `"concurrently": "^8.2.2"`

2. **Backend `server/package.json`:**
   - `"name": "fulfillmenthub-server"`
   - Scripts:
     - `"dev": "tsx watch src/index.ts"`
     - `"build": "tsc"`
     - `"start": "node dist/index.js"`
     - `"test": "vitest run"`
     - `"test:fast": "vitest run --no-file-parallelism --no-isolate"`
     - `"audit": "tsx src/audit.ts"`
   - `dependencies`: `"better-sqlite3": "^11.3.0"`, `"cors": "^2.8.5"`, `"express": "^4.19.2"`
   - `devDependencies`: `"@types/better-sqlite3": "^7.6.11"`, `"@types/cors": "^2.8.17"`, `"@types/express": "^4.17.21"`, `"@types/node": "^20.14.10"`, `"@types/supertest": "^6.0.2"`, `"supertest": "^7.0.0"`, `"tsx": "^4.16.2"`, `"typescript": "^5.5.3"`, `"vitest": "^2.0.5"`

3. **Frontend `client/package.json` & Vite Config:**
   - React 18 (`react`, `react-dom`), Vite (`@vitejs/plugin-react`), Tailwind CSS (`tailwindcss`, `postcss`, `autoprefixer`), TypeScript.
   - Configure `client/vite.config.ts` to run on port `5173` and proxy `/api` to `http://localhost:3001`.

---

### 2. SQLite Database & Exact Seed Data (`server/src/db.ts`)

Use `better-sqlite3` (in-memory `:memory:` when `process.env.NODE_ENV === 'test'`, otherwise `server/data/orders.sqlite`). Enable `PRAGMA foreign_keys = ON`.

1. **Schema:**
   ```sql
   CREATE TABLE IF NOT EXISTS inventory (
     sku TEXT PRIMARY KEY,
     product_name TEXT NOT NULL,
     stock_count INTEGER NOT NULL
   );

   CREATE TABLE IF NOT EXISTS orders (
     id TEXT PRIMARY KEY,
     customer_name TEXT NOT NULL,
     sku TEXT NOT NULL,
     product_name TEXT NOT NULL,
     quantity INTEGER NOT NULL,
     status TEXT NOT NULL,
     is_expedited INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     FOREIGN KEY (sku) REFERENCES inventory(sku)
   );
   ```

2. **Exact Seeded Inventory (5 SKUs):**
   - `['SKU-1001', 'Cashmere Crewneck Sweater', 15]`
   - `['SKU-2040', 'Selvedge Denim Jacket', 12]`
   - `['SKU-3010', 'Leather Chelsea Boots', 8]`
   - `['SKU-4022', 'Linen Blazer', 20]`
   - `['SKU-5099', 'Silk Evening Scarf', 3]` *(intentionally `< 5` for low-stock alerts and audit skill)*

3. **Exact Seeded Orders (6 Orders):**
   - `['ORD-1001', 'Alice Smith', 'SKU-1001', 'Cashmere Crewneck Sweater', 1, 'PENDING', 1, '2026-10-20T09:15:00Z']`
   - `['ORD-1002', 'Bob Jones', 'SKU-2040', 'Selvedge Denim Jacket', 2, 'PROCESSING', 0, '2026-10-20T10:30:00Z']`
   - `['ORD-1003', 'Charlie Brown', 'SKU-3010', 'Leather Chelsea Boots', 1, 'SHIPPED', 0, '2026-10-19T16:20:00Z']`
   - `['ORD-1004', 'Diana Prince', 'SKU-4022', 'Linen Blazer', 1, 'PENDING', 0, '2026-10-20T11:45:00Z']`
   - `['ORD-1005', 'Evan Wright', 'SKU-5099', 'Silk Evening Scarf', 2, 'CANCELLED', 0, '2026-10-19T14:10:00Z']`
   - `['ORD-1006', 'Fiona Gallagher', 'SKU-5099', 'Silk Evening Scarf', 1, 'PENDING', 1, '2026-10-20T13:10:00Z']`

4. Export `initDb()`, `resetTestDb()` (drops and re-initializes tables when `NODE_ENV === 'test'`), and default `db`.

---

### 3. Backend Express Routes & Audit CLI (`server/src/`)

1. **`server/src/index.ts`:**
   - Mount `GET /api/health` (`{ status: 'ok', service: 'fulfillmenthub-server' }`), `/api/orders`, and `/api/inventory`. Listen on port `3001` when `NODE_ENV !== 'test'`. Export `app`.

2. **`server/src/routes/orders.ts`:**
   - `GET /api/orders`: Join `orders o` and `inventory i ON o.sku = i.sku` ordered by `o.id ASC`, returning `id, customer_name, sku, product_name, stock_count, quantity, status, is_expedited, created_at`.
   - `GET /api/orders/inventory`: Return all inventory items ordered by `sku ASC`.
   - `POST /api/orders/:id/cancel`: Cancel a single order by `id` (`UPDATE orders SET status = 'CANCELLED' WHERE id = ?` and `UPDATE inventory SET stock_count = stock_count + ? WHERE sku = ?`), returning `404` if not found or `200` with the updated order row.
   - `PATCH /api/orders/:id/status`: Validate status in `['PENDING', 'PROCESSING', 'SHIPPED', 'CANCELLED']` (`400` if invalid, `404` if not found) and return updated order row.
   - **IMPORTANT FOR `day2-start`:** Do NOT implement `POST /api/orders/bulk-cancel` yet.

3. **`server/src/routes/inventory.ts`:**
   - `GET /api/inventory`: Return all inventory items ordered by `sku ASC`.
   - `GET /api/inventory/low-stock`: Return inventory items where `stock_count < 5` ordered by `stock_count ASC`.

4. **`server/src/audit.ts` (`npm --prefix server run audit`):**
   - Query SQLite and print:
     1. Inventory Stock Counts & Demand Reconciliation table (`SKU | Product | Current Stock | Pending Demand | Cancelled Qty | Status` flagging `< 5` as `LOW STOCK (<5)`).
     2. Active `PENDING` / `PROCESSING` orders.
     3. `CANCELLED` orders (`ORD-1005`).

5. **`server/tests/orders.test.ts`:**
   - Write 4 Vitest + Supertest tests verifying:
     - `GET /api/orders` returns all 6 seeded orders with `product_name` and `stock_count`.
     - `GET /api/inventory` returns all 5 seeded SKUs with `SKU-5099` at `stock_count: 3`.
     - `POST /api/orders/:id/cancel` cancels `ORD-1001` and increments `SKU-1001` stock from `15` to `16`.
     - `PATCH /api/orders/:id/status` updates status and returns `404` for `ORD-9999`.

---

### 4. React 18 Frontend (`client/src/`)

1. **`client/src/App.tsx`:**
   - Dark header bar: `FulfillmentHub — Retail Order & Inventory Portal` with a `Refresh Queue` button.
   - 4 Summary KPI cards: `Total Orders`, `Pending Fulfillment` (`PENDING` + `PROCESSING`), `Shipped`, and `Cancelled`.
   - Low-Stock Inventory Alert Banner whenever any SKU has `stock_count < 5` (displays `SKU-5099` Silk Evening Scarf with `3 in stock`).
   - Queue Filter buttons: `All Orders (6)` and `⚡ Expedited Only (2)`.
   - Render `<OrderTable />`. (Do NOT include bulk-cancel checkboxes on `day2-start`).

2. **`client/src/components/OrderTable.tsx`:**
   - Columns: `Order ID` (with `⚡ Expedited` badge if `is_expedited === 1`), `Customer`, `Product` (showing SKU and `⚠️ Low stock: X left` badge if `stock_count < 5`), `Quantity`, `Status` badge, and `Actions` (status `<select>` dropdown + single-row `Cancel` button).

---

### 5. Repository Constitution & PRD (`GEMINI.md` & `PRD.md`)

1. **`./GEMINI.md`:**
   ```markdown
   # FulfillmentHub — Repository Constitution

   ## Architecture & Stack
   - **Backend (`server/`):** Node.js + TypeScript + Express (port 3001) + SQLite (`server/src/db.ts`).
   - **Frontend (`client/`):** React 18 + Vite (port 5173) + Tailwind CSS.
   - **Specs (`spec/`):** Durable feature specifications and evaluation rubrics.

   ## Mandatory Verification Commands
   - Fast backend unit tests: `npm run test:fast`
   - Full build & test check: `npm test`
   ```

2. **`./PRD.md`:**
   - Document Phase 1 as Completed (`GET /api/orders`, `GET /api/inventory`, single-order cancel, expedited filter, low-stock banner) and Phase 2 (Bulk Order Cancellation with Inventory Restock — `POST /api/orders/bulk-cancel` and bulk UI selection) as the Current Goal, including open architectural questions around batch atomicity, `SHIPPED` order eligibility (`ORD-1003`), idempotent retries on `CANCELLED` (`ORD-1005`), response contract, and scope boundaries.

3. **Clean Bare Harness Constraint:**
   - Ensure `.agents/` and `spec/` directories do NOT exist on `day2-start`.
   - Run `npm install` (root, `server`, and `client`), then verify `npm run test:fast` and `npm test` succeed cleanly.
````
