# Specification: Phase 2 — Bulk Order Cancellation & Atomic Inventory Restock

**Status:** Approved (Post-Critique Revision)  
**Target Endpoint:** `POST /api/orders/bulk-cancel` (`server/src/routes/orders.ts`)  
**Database Schema:** `server/src/db.ts` (`orders`, `inventory`)

---

## 1. Problem Statement & Non-Goals

### Problem Statement
Warehouse operations managers need a reliable, atomic batch API (`POST /api/orders/bulk-cancel`) and UI workflow to cancel multiple customer orders simultaneously during fulfillment bottlenecks or supplier recalls, while accurately returning allocated item quantities back into `inventory.stock_count`.

Without strict transactional and state-machine invariants, naive batch cancellation introduces three critical production failure modes:
1. **Illegal State Transitions (`SHIPPED` Orders):** Cancelling an order that has already left the warehouse (e.g., `ORD-1003` with status `'SHIPPED'`) corrupts fulfillment records and creates phantom warehouse inventory.
2. **Non-Idempotent Retries (`CANCELLED` Orders):** Retrying a batch containing an already-cancelled order (e.g., `ORD-1005` with status `'CANCELLED'`, or duplicate IDs in the same request payload) double-restocks `inventory.stock_count` out of thin air.
3. **Partial Batch Mutation:** Looping over order IDs without an atomic SQLite transaction leaves previous orders mutated and restocked if a subsequent order ID in the batch fails validation.

### Explicit Non-Goals
- **No External Payment Gateway Refunds:** Phase 2 does not integrate Stripe or external payment refund APIs.
- **No Customer Email/SMS Notifications:** Phase 2 strictly manages internal warehouse order status and `inventory.stock_count` state.
- **No Schema Migrations Required:** Uses the existing `orders` and `inventory` tables in `server/src/db.ts`.

---

## 2. Evaluation Rubric (Pass/Fail Test Cases)

All test cases MUST be implemented in `server/tests/bulk-cancel.test.ts` and pass via `npm run test:fast`:

1. **PASS — Valid Multi-Order Cancellation & Inventory Restock (`200 OK`):**
   - Given `ORD-1001` (`PENDING`, `SKU-1001`, Qty `1`, initial stock `15`) and `ORD-1002` (`PROCESSING`, `SKU-2040`, Qty `2`, initial stock `12`),
   - When `POST /api/orders/bulk-cancel` is called with `{ orderIds: ['ORD-1001', 'ORD-1002'] }`,
   - Then it returns HTTP `200` with `{ cancelledIds: ['ORD-1001', 'ORD-1002'], restockedCount: 3 }`, updates both orders to `status = 'CANCELLED'`, and increments `inventory.stock_count` to `16` (`SKU-1001`) and `14` (`SKU-2040`).

2. **PASS — Idempotent No-Op on Already-`CANCELLED` Orders (`200 OK`, `delta = 0`):**
   - Given `ORD-1005` (`CANCELLED`, `SKU-5099`, Qty `2`, initial stock `3`) and `ORD-1006` (`PENDING`, `SKU-5099`, Qty `1`, initial stock `3`),
   - When `POST /api/orders/bulk-cancel` is called with `{ orderIds: ['ORD-1005', 'ORD-1006'] }` (or when a batch containing `ORD-1005` or duplicate IDs is retried),
   - Then `ORD-1005` is treated as an idempotent no-op (`0` units restocked), `ORD-1006` transitions to `'CANCELLED'` (`+1` unit restocked), `SKU-5099` `stock_count` becomes `4` (never `6`), and the endpoint returns HTTP `200` with `{ cancelledIds: ['ORD-1005', 'ORD-1006'], restockedCount: 1 }`.

3. **FAIL / ROLLBACK — Atomic Rollback When Batch Contains a `SHIPPED` Order (`409 Conflict`):**
   - Given a batch `{ orderIds: ['ORD-1001', 'ORD-1003'] }` where `ORD-1001` is `'PENDING'` and `ORD-1003` is `'SHIPPED'`,
   - When `POST /api/orders/bulk-cancel` is called,
   - Then the entire SQLite transaction rolls back: `ORD-1001` remains `'PENDING'`, `SKU-1001` `stock_count` remains `15`, and the endpoint returns HTTP `409` with `{ error: string, code: 'ORDER_ALREADY_SHIPPED', failedOrderId: 'ORD-1003' }`.

4. **FAIL / ROLLBACK — Atomic Rollback When Batch Contains a Non-Existent Order ID (`404 Not Found`):**
   - Given a batch `{ orderIds: ['ORD-1001', 'ORD-9999'] }`,
   - When `POST /api/orders/bulk-cancel` is called,
   - Then the entire SQLite transaction rolls back: `ORD-1001` remains `'PENDING'`, `SKU-1001` `stock_count` remains `15`, and the endpoint returns HTTP `404` with `{ error: string, code: 'ORDER_NOT_FOUND', failedOrderId: 'ORD-9999' }`.

5. **FAIL — Payload Validation (`400 Bad Request`):**
   - When `orderIds` is missing, not an array, empty (`[]`), or contains non-string/blank elements,
   - Then the endpoint returns HTTP `400` with `{ error: string, code: 'INVALID_PAYLOAD' }` before executing any database queries.

---

## 3. Technical Implementation Plan

### 3.1 API Contract (`POST /api/orders/bulk-cancel`)
- **Request Body:**
  ```json
  {
    "orderIds": ["ORD-1001", "ORD-1002"]
  }
  ```
- **Success Response (`200 OK`):**
  ```json
  {
    "cancelledIds": ["ORD-1001", "ORD-1002"],
    "restockedCount": 3
  }
  ```
- **Structured Error Responses (`400` / `404` / `409` / `500`):**
  ```json
  {
    "error": "Order ORD-1003 has already shipped and cannot be cancelled",
    "code": "ORDER_ALREADY_SHIPPED",
    "failedOrderId": "ORD-1003"
  }
  ```
  - `400 Bad Request`: `{ error: "orderIds must be a non-empty array of order IDs", code: "INVALID_PAYLOAD" }`
  - `404 Not Found`: `{ error: "Order <id> not found", code: "ORDER_NOT_FOUND", failedOrderId: "<id>" }`
  - `409 Conflict`: `{ error: "Order <id> has already shipped and cannot be cancelled", code: "ORDER_ALREADY_SHIPPED", failedOrderId: "<id>" }`
  - `500 Internal Server Error`: `{ error: "Failed to process bulk cancellation", code: "INTERNAL_ERROR" }`

### 3.2 Order Status State-Transition Matrix
| Current Order Status | Seeded Examples | Action Inside `db.transaction()` | Inventory Restock Delta | HTTP Status |
| :--- | :--- | :--- | :--- | :--- |
| `'PENDING'` | `ORD-1001`, `ORD-1004`, `ORD-1006` | `SET status = 'CANCELLED'` | `+order.quantity` | `200 OK` |
| `'PROCESSING'` | `ORD-1002` | `SET status = 'CANCELLED'` | `+order.quantity` | `200 OK` |
| `'CANCELLED'` | `ORD-1005` | Idempotent no-op (keep `'CANCELLED'`) | `0` (prevent double-restock) | `200 OK` |
| `'SHIPPED'` | `ORD-1003` | Throw domain error $\rightarrow$ abort & rollback entire batch | `0` (rolled back) | `409 Conflict` |
| *(Missing ID)* | `ORD-9999` | Throw domain error $\rightarrow$ abort & rollback entire batch | `0` (rolled back) | `404 Not Found` |

### 3.3 Transaction & Deduplication Logic
1. Validate `req.body.orderIds` is a non-empty array of non-empty strings; otherwise return HTTP `400` `{ error, code: 'INVALID_PAYLOAD' }`.
2. Deduplicate `orderIds` while preserving order (`Array.from(new Set(orderIds))`) so duplicate IDs in the same request cannot double-restock.
3. Execute a single synchronous `db.transaction((ids: string[]) => { ... })`:
   - For each `id` in `ids`:
     - Fetch `SELECT id, sku, quantity, status FROM orders WHERE id = ?`.
     - If missing, throw a typed `BulkCancelError(404, 'ORDER_NOT_FOUND', `Order ${id} not found`, id)`.
     - If `order.status === 'SHIPPED'`, throw `BulkCancelError(409, 'ORDER_ALREADY_SHIPPED', `Order ${id} has already shipped and cannot be cancelled`, id)`.
     - If `order.status === 'CANCELLED'`, record `id` in `cancelledIds` and add `0` to `restockedCount` (idempotent no-op).
     - If `order.status === 'PENDING' || order.status === 'PROCESSING'`, execute:
       - `UPDATE orders SET status = 'CANCELLED' WHERE id = ?`
       - `UPDATE inventory SET stock_count = stock_count + ? WHERE sku = ?`
       - Record `id` in `cancelledIds` and increment `restockedCount += order.quantity`.
4. Return HTTP `200` with `{ cancelledIds, restockedCount }`.

### 3.4 Atomic Execution Tasks
1. **Task 1 (Tests First):** Create `server/tests/bulk-cancel.test.ts` asserting all 5 Evaluation Rubric cases.
2. **Task 2 (Backend Route):** Implement `POST /api/orders/bulk-cancel` in `server/src/routes/orders.ts` using `db.transaction()`.
3. **Task 3 (Verification Gate):** Run `npm run test:fast` and verify all unit tests pass in `<500ms`.
