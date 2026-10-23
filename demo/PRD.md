# FulfillmentHub — Product Requirements Document (PRD)

## 1. Product Vision
**FulfillmentHub** is a retail order fulfillment and inventory triage portal used by warehouse operations teams to monitor incoming customer orders, track SKU inventory levels, and process order cancellations.

## 2. Current System Baseline
- **Frontend (`client/`):** React 18, Vite, Tailwind CSS, TypeScript (Port `5173`). Displays KPI summary cards, low-stock alerts, and the `<OrderTable />` fulfillment queue.
- **Backend (`server/`):** Node.js, Express, TypeScript, `better-sqlite3` (Port `3001`).
- **Database (`server/src/db.ts`):** SQLite (`server/data/orders.sqlite` in development, `:memory:` in tests) with `orders` (`id`, `customer_name`, `sku`, `product_name`, `quantity`, `status`) and `inventory` (`sku`, `product_name`, `stock_count`).

---

## 3. Delivery Phases

### Phase 1: Core Order Queue, Inventory Tracking & Single-Order Triage (Completed ✅)
- Seeded warehouse catalog (`SKU-1001`, `SKU-2040`, `SKU-3010`, `SKU-4022`, `SKU-5099`) and active order queue (`ORD-1001` through `ORD-1006`).
- Implemented `GET /api/orders`, `GET /api/inventory`, `PATCH /api/orders/:id/status`, and single-order `POST /api/orders/:id/cancel`.
- Added Expedited Queue filtering and Low-Stock (`stock_count < 5`) alert banners in the React dashboard.

---

### Phase 2: Bulk Order Cancellation with Inventory Restock (Current Goal 🎯)
During warehouse bottlenecks or supplier recalls, operations managers need to select and cancel multiple orders at once while accurately returning allocated item quantities back to `inventory.stock_count`.

#### High-Level Feature Goals:
1. **Bulk Cancel API (`POST /api/orders/bulk-cancel`):**
   - Accept a batch payload `{ orderIds: string[] }` in `server/src/routes/orders.ts`.
   - Transition eligible orders to `'CANCELLED'` and restock their `quantity` into `inventory.stock_count` for the matching `sku`.
2. **Bulk Selection UI (`client/src/components/OrderTable.tsx`):**
   - Allow warehouse operators to select multiple orders and trigger a **"Cancel Selected"** action.
3. **Open Architectural & Edge-Case Questions to Resolve in Spec Design:**
   - **Batch Atomicity:** What happens if a batch contains 5 order IDs and the 3rd order ID is invalid (`404`) or un-cancellable?
   - **Order Status Eligibility:** How should the endpoint handle orders that are already `'SHIPPED'` (e.g., `ORD-1003` on the delivery truck) or already `'CANCELLED'` (e.g., `ORD-1005` on a network retry)?
   - **Response & Error Contract:** What exact HTTP status codes and JSON payload shapes should be returned on success vs. failure?
   - **Scope Boundaries:** Should Phase 2 trigger external payment gateway refunds or customer email notifications, or strictly manage warehouse order/inventory state?
