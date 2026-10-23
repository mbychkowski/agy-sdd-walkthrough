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
