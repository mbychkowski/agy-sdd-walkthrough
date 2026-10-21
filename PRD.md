# OrderPulse — Product Requirements Document (PRD)

## 1. Product Vision
**OrderPulse** is a retail fulfillment and inventory triage portal designed for warehouse operations teams to monitor incoming customer orders, update fulfillment statuses, identify low-stock bottlenecks, and execute safe batch cancellations with atomic inventory restocking.

## 2. Baseline Architecture
- **Frontend (`client/`):** React 18, Vite, Tailwind CSS, TypeScript (Port `5173`). Displays KPI summary cards (Total Orders, Pending Fulfillment, Shipped) and an interactive `<OrderTable />`.
- **Backend (`server/`):** Node.js, Express, TypeScript, `better-sqlite3` (Port `3001`). Exposes `GET /api/orders` and `PATCH /api/orders/:id/status`.
- **Database (`server/src/db.ts`):** SQLite (`server/data/orders.sqlite` in development/production, `:memory:` when `NODE_ENV=test`) with `PRAGMA foreign_keys = ON;`.

---

## 3. Roadmap & Upcoming Feature Phases

### Phase 1: Expedited Triage & Low-Stock Inventory Alerts
Operations teams need immediate visibility into high-priority expedited orders and SKUs at risk of stockout.

#### Requirements:
1. **Database Schema & Seed (`server/src/db.ts`):**
   - Add `is_expedited INTEGER DEFAULT 0` to the `orders` table.
   - Seed `ORD-1001` and `ORD-1003` with `is_expedited = 1`.
2. **Backend API (`server/src/routes/orders.ts`):**
   - Include `o.is_expedited` and `i.stock_count` in the `GET /api/orders` response payload.
   - Define the low-stock threshold as `stock_count < 10`.
3. **Frontend Triage UI (`client/src/components/OrderTable.tsx`):**
   - Add an **"Expedited Only"** filter toggle above the table.
   - Render a red `⚡ EXPEDITED` badge on orders where `is_expedited` is truthy.
   - Render an amber `⚠️ Low Stock ({stock_count} left)` badge next to the product when `stock_count < 10`.

---

### Phase 2: Bulk Order Cancellation with Atomic Inventory Restock & Audit Logging
When fulfillment bottlenecks occur or customers cancel multi-item orders, operators must be able to cancel multiple orders simultaneously while guaranteeing that allocated inventory is atomically returned to warehouse stock and recorded in an immutable audit log.

#### Requirements:
1. **Audit Log Schema (`server/src/db.ts`):**
   - Create an `audit_logs` table:
     `audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL, action TEXT NOT NULL, timestamp TEXT NOT NULL)`
2. **Atomic Bulk Cancel Endpoint (`server/src/routes/orders.ts`):**
   - Endpoint: `POST /api/orders/bulk-cancel`
   - Request Body: `{ orderIds: string[], reason?: string }`
   - Behavior (inside a single `db.transaction()`):
     - Validate that every order ID in `orderIds` exists and is not already `'CANCELLED'`. If any order is invalid or already cancelled, throw an error to roll back the entire transaction and return HTTP `400`.
     - Update each order's `status` to `'CANCELLED'`.
     - Increment `inventory.stock_count` by each cancelled order's `quantity` for the corresponding `sku`.
     - Insert an audit record into `audit_logs` for each cancelled order.
3. **Frontend Bulk Action UI (`client/src/components/OrderTable.tsx`):**
   - Add row selection checkboxes for non-cancelled orders and a "Select All" header checkbox.
   - Display a **"Cancel Selected ({count})"** action button when one or more orders are selected.
   - Refresh order statuses and restocked inventory counts immediately after cancellation.
4. **Verification & QA (`server/tests/orders.test.ts`):**
   - Test successful multi-order cancellation, verifying that `stock_count` increases by the cancelled quantities and `audit_logs` entries are persisted.
   - Test atomic rollback when a batch contains an invalid or already-cancelled order ID, confirming zero partial state mutations.
