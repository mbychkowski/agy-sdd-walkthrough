---
trigger: model_decision
description: "Enforce atomic SQLite transactions (db.transaction()) and structured JSON error responses ({ error, code }) whenever creating or modifying backend route handlers or database mutations in server/src/."
---

# SQLite Mutation & Error Safety Rules

1. **Mandatory Atomic Transactions:** Any route handler that performs more than one SQL write (e.g., updating `orders.status` and modifying `inventory.stock_count` or inserting an audit record) MUST wrap all statements inside a single synchronous `db.transaction(() => { ... })()` block.
2. **Structured Error Contract:** Never return raw string errors. Always return HTTP `4xx`/`5xx` with `{ error: string, code: string }`.
