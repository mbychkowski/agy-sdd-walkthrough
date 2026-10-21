---
name: inventory-audit
description: Audits SQLite inventory stock levels and order allocation consistency
---

# Inventory Audit Skill

When asked to audit inventory, check warehouse stock levels, or verify order allocation consistency:

1. Query current inventory stock levels and active order allocations using `sqlite3`:
   ```bash
   sqlite3 -header -column server/data/orders.sqlite "
     SELECT i.sku,
            i.product_name,
            i.stock_count,
            COALESCE(SUM(CASE WHEN o.status != 'CANCELLED' THEN o.quantity ELSE 0 END), 0) AS allocated_qty
     FROM inventory i
     LEFT JOIN orders o ON i.sku = o.sku
     GROUP BY i.sku
     ORDER BY i.stock_count ASC;
   "
   ```
2. Flag any SKU where `stock_count < 10` as `CRITICAL_LOW_STOCK`.
3. Present findings in a clean Markdown table sorted by `stock_count ASC` and highlight any SKUs requiring immediate restock.
