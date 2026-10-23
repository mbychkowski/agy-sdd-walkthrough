# One-Shot Bootstrap Prompt — `day2-harness-upgrade` (Engineered Harness State)

If you are unable to clone or pull the `day2-harness-upgrade` (or `main`) branch of the **FulfillmentHub** repository, copy and paste the prompt below into Antigravity to build or upgrade the workspace to the complete **Engineered Harness** state (including the formal SDD spec, atomic `POST /api/orders/bulk-cancel` implementation, Vitest evaluation rubric suite, React bulk-selection UI, and all `.agents/` rules, hooks, skills, and subagents).

- **Upgrading from `day2-start`?** Paste the prompt below directly—it will detect the existing baseline and apply Phase 2 and `.agents/` upgrades cleanly.
- **Starting from an empty folder?** The prompt includes the full baseline schema, seed data, and app structure so it can also build the entire repository from scratch in one shot.

---

## Copy-Paste One-Shot Prompt (`day2-harness-upgrade`)

````text
Bring this workspace to the complete "day2-harness-upgrade" (Engineered Harness) state of the FulfillmentHub retail order and inventory triage portal.

Execute all sections below end-to-end, verify that `.agents/hooks/verify.sh` returns `{}` and `npm run test:fast` & `npm test` pass 100%.

---

### 1. Baseline Architecture & Seeded SQLite State (If Not Already Present)

Ensure the monorepo has:
- **Root `package.json`:** scripts for `"dev"`, `"test:fast": "npm --prefix server run test:fast"`, and `"test": "npm --prefix server test && npm --prefix client run build"`.
- **Constitution (`./GEMINI.md`):**
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
- **SQLite Database (`server/src/db.ts`):**
  - Uses `better-sqlite3` (`:memory:` when `NODE_ENV === 'test'`, otherwise `server/data/orders.sqlite`).
  - Tables:
    - `inventory (sku TEXT PRIMARY KEY, product_name TEXT NOT NULL, stock_count INTEGER NOT NULL)`
    - `orders (id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, sku TEXT NOT NULL, product_name TEXT NOT NULL, quantity INTEGER NOT NULL, status TEXT NOT NULL, is_expedited INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (sku) REFERENCES inventory(sku))`
  - Seeded Inventory (5 SKUs):
    - `['SKU-1001', 'Cashmere Crewneck Sweater', 15]`
    - `['SKU-2040', 'Selvedge Denim Jacket', 12]`
    - `['SKU-3010', 'Leather Chelsea Boots', 8]`
    - `['SKU-4022', 'Linen Blazer', 20]`
    - `['SKU-5099', 'Silk Evening Scarf', 3]`
  - Seeded Orders (6 Orders):
    - `['ORD-1001', 'Alice Smith', 'SKU-1001', 'Cashmere Crewneck Sweater', 1, 'PENDING', 1, '2026-10-20T09:15:00Z']`
    - `['ORD-1002', 'Bob Jones', 'SKU-2040', 'Selvedge Denim Jacket', 2, 'PROCESSING', 0, '2026-10-20T10:30:00Z']`
    - `['ORD-1003', 'Charlie Brown', 'SKU-3010', 'Leather Chelsea Boots', 1, 'SHIPPED', 0, '2026-10-19T16:20:00Z']`
    - `['ORD-1004', 'Diana Prince', 'SKU-4022', 'Linen Blazer', 1, 'PENDING', 0, '2026-10-20T11:45:00Z']`
    - `['ORD-1005', 'Evan Wright', 'SKU-5099', 'Silk Evening Scarf', 2, 'CANCELLED', 0, '2026-10-19T14:10:00Z']`
    - `['ORD-1006', 'Fiona Gallagher', 'SKU-5099', 'Silk Evening Scarf', 1, 'PENDING', 1, '2026-10-20T13:10:00Z']`
- **Deterministic Audit Script (`server/src/audit.ts` & `"audit": "tsx src/audit.ts"` in `server/package.json`):**
  - Queries SQLite and prints Inventory Stock Counts & Demand Reconciliation (flagging `stock_count < 5` as `LOW STOCK (<5)`), Active `PENDING`/`PROCESSING` orders, and `CANCELLED` orders.

---

### 2. Formal SDD Specification (`spec/bulk-order-cancellation.md`)

Create `spec/bulk-order-cancellation.md` containing:
1. **Section 1: Problem Statement & Non-Goals**
   - Operations managers need `POST /api/orders/bulk-cancel` and bulk UI selection to cancel multiple orders simultaneously and restock allocated quantities into `inventory.stock_count` inside a single atomic SQLite `db.transaction()`.
   - Explicit Non-Goals: No external payment gateway refunds, no email/SMS notifications, no carrier recall for `SHIPPED` orders, no schema migrations.
2. **Section 2: Evaluation Rubric (Pass/Fail Criteria)**
   - **Rubric 1 (200 OK):** Batch `['ORD-1001', 'ORD-1002']` transitions both to `'CANCELLED'`, increments `SKU-1001` (`15 -> 16`) and `SKU-2040` (`12 -> 14`), and returns `{ cancelledIds: ['ORD-1001', 'ORD-1002'], restockedCount: 3 }`.
   - **Rubric 2 (200 OK Idempotent Retry):** Batch `['ORD-1005', 'ORD-1006']` treats already-`'CANCELLED'` `ORD-1005` as a `0`-delta no-op and cancels `'PENDING'` `ORD-1006` (`SKU-5099` `3 -> 4`), returning `{ cancelledIds: ['ORD-1005', 'ORD-1006'], restockedCount: 1 }`. Re-submitting the same batch returns `restockedCount: 0` and leaves `SKU-5099` at `4`.
   - **Rubric 3 (409 Conflict Atomic Rollback):** Batch `['ORD-1001', 'ORD-1003']` (where `ORD-1003` is `'SHIPPED'`) rolls back the entire transaction (`ORD-1001` stays `'PENDING'`, `SKU-1001` stays `15`) and returns HTTP `409` `{ error, code: 'ORDER_ALREADY_SHIPPED', failedOrderId: 'ORD-1003' }`.
   - **Rubric 4 (404 Not Found Atomic Rollback):** Batch `['ORD-1001', 'ORD-9999']` rolls back the entire transaction and returns HTTP `404` `{ error, code: 'ORDER_NOT_FOUND', failedOrderId: 'ORD-9999' }`.
   - **Rubric 5 (400 Bad Request):** Missing, empty (`[]`), or non-string `orderIds` returns HTTP `400` `{ error, code: 'INVALID_PAYLOAD' }`.
3. **Section 3: Technical Implementation Plan**
   - API contract, State-Transition Matrix, deduplication via `Array.from(new Set(orderIds))`, and atomic execution tasks.

---

### 3. Backend Implementation & Rubric Test Suite (`server/`)

1. **`server/src/routes/orders.ts`:**
   - Implement `POST /api/orders/bulk-cancel`:
     - Validate `orderIds` is a non-empty array of non-empty strings; otherwise return HTTP `400` `{ error: 'orderIds must be a non-empty array of order IDs', code: 'INVALID_PAYLOAD' }`.
     - Deduplicate `orderIds` with `Array.from(new Set(orderIds))`.
     - Wrap all lookups and mutations in `db.transaction((ids: string[]) => { ... })`.
     - Throw `BulkCancelError(404, 'ORDER_NOT_FOUND', ...)` if an order ID is missing, or `BulkCancelError(409, 'ORDER_ALREADY_SHIPPED', ...)` if `status === 'SHIPPED'`.
     - Treat `status === 'CANCELLED'` as an idempotent no-op (`0` restock delta, include ID in `cancelledIds`).
     - For `PENDING` / `PROCESSING`, update `orders.status = 'CANCELLED'`, increment `inventory.stock_count` by `order.quantity`, and accumulate `restockedCount`.
     - Return HTTP `200` with `{ cancelledIds, restockedCount }`.
   - Ensure all error responses across `server/src/routes/orders.ts` return structured `{ error: string, code: string, failedOrderId?: string }`.

2. **`server/tests/bulk-cancel.test.ts`:**
   - Create 5 Vitest + Supertest tests covering Rubrics 1–5 above (alongside the 4 existing baseline tests in `server/tests/orders.test.ts`, totaling 9 passing tests).

---

### 4. React Bulk Cancellation UI (`client/src/`)

1. **`client/src/components/OrderTable.tsx`:**
   - Accept optional `selectedOrderIds?: string[]` and `onToggleSelectOrder?: (orderId: string) => void` props.
   - Render a checkbox `<input type="checkbox" aria-label={`Select ${order.id}`} />` in the first column of each row.
2. **`client/src/App.tsx`:**
   - Track `selectedOrderIds` state.
   - When `selectedOrderIds.length > 0`, display a rose action button `Cancel Selected (${selectedOrderIds.length})` in the filter bar that sends `POST /api/orders/bulk-cancel` with `{ orderIds: selectedOrderIds }`, clears selection on success, refreshes the queue, or displays `body.error` in the error banner on `4xx`/`5xx`.

---

### 5. Create All `.agents/` Harness Upgrades

Create the following files with exact paths and contents:

1. **Scoped Rule (`.agents/rules/sqlite-safety.md`):**
   ```markdown
   ---
   trigger: model_decision
   description: "Enforce atomic SQLite transactions (db.transaction()) and structured JSON error responses ({ error, code }) whenever creating or modifying backend route handlers or database mutations in server/src/."
   ---

   # SQLite Mutation & Error Safety Rules

   1. **Mandatory Atomic Transactions:** Any route handler that performs more than one SQL write (e.g., updating `orders.status` and modifying `inventory.stock_count` or inserting an audit record) MUST wrap all statements inside a single synchronous `db.transaction(() => { ... })()` block.
   2. **Structured Error Contract:** Never return raw string errors. Always return HTTP `4xx`/`5xx` with `{ error: string, code: string }`.
   ```

2. **Stop Hook Config (`.agents/hooks.json`):**
   ```json
   {
     "fast-test-gate": {
       "Stop": [
         {
           "type": "command",
           "command": "bash \"$(git rev-parse --show-toplevel)/.agents/hooks/verify.sh\"",
           "timeout": 15
         }
       ]
     }
   }
   ```

3. **Executable Verification Gate (`.agents/hooks/verify.sh`, run `chmod +x`):**
   ```bash
   #!/usr/bin/env bash
   set -uo pipefail

   REPO_ROOT="$(git rev-parse --show-toplevel)"

   # Run fast Vitest suite (<500ms)
   if OUTPUT=$(npm --prefix "$REPO_ROOT/server" run test:fast 2>&1); then
     # Passing gate outputs empty JSON -> allows agent to stop cleanly (0 tokens)
     echo '{}'
   else
     # Failing gate outputs {"decision": "continue", "reason": "..."} -> blocks stop & forces auto-repair!
     REASON=$(printf "❌ Deterministic Stop Hook Failed (npm run test:fast):\n%s\nFix the broken test contract before finishing your turn." "$OUTPUT" | tail -n 25 | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
     echo "{\"decision\": \"continue\", \"reason\": $REASON}"
   fi
   ```

4. **On-Demand Audit Skill (`.agents/skills/inventory-audit/SKILL.md`):**
   ```markdown
   ---
   name: inventory-audit
   description: >-
     Use this skill when the user asks to audit inventory stock levels,
     investigate order-to-stock discrepancies, or verify allocation consistency
     for cancelled or pending orders in FulfillmentHub.
   ---

   # FulfillmentHub Inventory & Order Discrepancy Audit Runbook

   ## Step 1: Run the Deterministic Audit Script
   Execute the built-in Node SQLite audit command from the repository root:
   ```bash
   npm --prefix server run audit
   ```

   ## Step 2: Reconciliation Rules
   1. Cross-reference `orders` with `status = 'CANCELLED'` (such as `ORD-1005` for `SKU-5099`) against current `inventory.stock_count`.
   2. Flag any SKU where `stock_count < 5` alongside active `PENDING` or `PROCESSING` orders (`ORD-1001`, `ORD-1002`, `ORD-1006`).
   3. Output a Markdown reconciliation table with `SKU`, `Product`, `Current Stock`, `Pending Demand`, and `Status (OK / LOW STOCK / DISCREPANCY)`.
   ```

5. **Critic Goldfish Subagent (`.agents/agents/spec-critic/agent.md`):**
   ```markdown
   ---
   name: spec-critic
   description: >-
     Skeptical Principal Engineer and Adversarial Spec Critic. Invoke this subagent
     to stress-test a specification in spec/*.md against the database schema and
     existing codebase before any implementation code is written.
   model: pro
   subagent: true
   mainAgent: false
   tools:
     - view_file
     - read_file
     - code_search
     - grep_search
   ---

   # Adversarial Spec Critic Persona

   You are a skeptical Principal Software Engineer with zero attachment to how a specification was drafted. Your sole job is to catch unhandled edge cases before code is written.

   # Audit Protocol

   1. Read the target specification file and compare it against `server/src/db.ts` and `server/src/routes/orders.ts`.
   2. Check for:
      - Missing transaction boundaries (`db.transaction()`)
      - Unhandled order status transitions (`PENDING`, `PROCESSING`, `SHIPPED`, `CANCELLED`)
      - Idempotency & retry traps (double-restocking inventory)
      - Ambiguous HTTP status codes
   3. Return a PASS/FAIL verdict and exact Markdown patches. Never write application code.
   ```

6. **Builder Goldfish Subagent (`.agents/agents/flash-builder/agent.md`):**
   ```markdown
   ---
   name: flash-builder
   description: >-
     Clean-room TDD Implementation Goldfish running on Gemini Flash. Invoke this
     subagent ONLY after a specification in spec/*.md has passed critique to
     generate unit tests, write implementation code, and verify green tests.
   model: flash
   subagent: true
   mainAgent: false
   commandExecutionPolicy: auto
   tools:
     - view_file
     - read_file
     - replace_file_content
     - edit_file
     - write_to_file
     - write_file
     - run_command
   ---

   # Builder Goldfish Execution Protocol

   You are a stateless, high-velocity implementation engineer running on Gemini Flash. You execute approved specifications in `spec/*.md` with 100% test-driven fidelity.

   # Mandatory Execution Order

   1. Read the approved spec file and its Section 2 Evaluation Rubric.
   2. Write or update the Vitest test suite in `server/tests/` covering every rubric item first.
   3. Implement the minimal TypeScript code required to satisfy the spec and workspace rules.
   4. Run `npm run test:fast` (and pass the `Stop` verification hook) before completing.
   ```

7. **GitHub MCP Template (`.agents/mcp_config.example.json`):**
   - Provide the GitHub MCP server configuration template (`@modelcontextprotocol/server-github`) and the copy-paste markdown template for GitHub Issue #2 (`PRD: Phase 2 Bulk Order Cancellation & Atomic Inventory Restock`).
````
