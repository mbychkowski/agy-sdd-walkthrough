import db, { initDb } from './db';

interface AuditInventoryRow {
  sku: string;
  product_name: string;
  stock_count: number;
  pending_demand: number;
  cancelled_qty: number;
}

interface AuditOrderRow {
  id: string;
  customer_name: string;
  sku: string;
  product_name: string;
  quantity: number;
  status: string;
}

function runAudit(): void {
  initDb();

  const inventorySummary = db
    .prepare(
      `SELECT i.sku,
              i.product_name,
              i.stock_count,
              COALESCE(SUM(CASE WHEN o.status IN ('PENDING', 'PROCESSING') THEN o.quantity ELSE 0 END), 0) AS pending_demand,
              COALESCE(SUM(CASE WHEN o.status = 'CANCELLED' THEN o.quantity ELSE 0 END), 0) AS cancelled_qty
       FROM inventory i
       LEFT JOIN orders o ON i.sku = o.sku
       GROUP BY i.sku, i.product_name, i.stock_count
       ORDER BY i.sku ASC`
    )
    .all() as AuditInventoryRow[];

  const activeOrders = db
    .prepare(
      `SELECT id, customer_name, sku, product_name, quantity, status
       FROM orders
       WHERE status IN ('PENDING', 'PROCESSING')
       ORDER BY id ASC`
    )
    .all() as AuditOrderRow[];

  const cancelledOrders = db
    .prepare(
      `SELECT id, customer_name, sku, product_name, quantity, status
       FROM orders
       WHERE status = 'CANCELLED'
       ORDER BY id ASC`
    )
    .all() as AuditOrderRow[];

  console.log('=== FulfillmentHub Inventory & Order Discrepancy Audit ===\n');

  console.log('1. Inventory Stock Counts & Demand Reconciliation:');
  console.log('SKU       | Product                    | Current Stock | Pending Demand | Cancelled Qty | Status');
  console.log('----------|----------------------------|---------------|----------------|---------------|-------------');
  for (const row of inventorySummary) {
    const statusFlag = row.stock_count < 5 ? 'LOW STOCK (<5)' : 'OK';
    console.log(
      `${row.sku.padEnd(9)} | ${row.product_name.padEnd(26)} | ${String(row.stock_count).padEnd(13)} | ${String(row.pending_demand).padEnd(14)} | ${String(row.cancelled_qty).padEnd(13)} | ${statusFlag}`
    );
  }

  console.log('\n2. Active PENDING / PROCESSING Demand:');
  for (const order of activeOrders) {
    console.log(
      `- ${order.id}: ${order.customer_name} | ${order.sku} (${order.product_name}) | Qty: ${order.quantity} | Status: ${order.status}`
    );
  }

  console.log('\n3. CANCELLED Orders (Restock Verification):');
  for (const order of cancelledOrders) {
    console.log(
      `- ${order.id}: ${order.customer_name} | ${order.sku} (${order.product_name}) | Qty: ${order.quantity} | Status: ${order.status}`
    );
  }
}

runAudit();
