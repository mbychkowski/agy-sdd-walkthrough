import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const isTest = process.env.NODE_ENV === 'test';
const dbDir = path.resolve(__dirname, '../data');

if (!isTest && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = isTest ? ':memory:' : path.join(dbDir, 'orders.sqlite');
const db = new Database(dbPath);

export function initDb(): void {
  db.pragma('foreign_keys = ON');

  db.exec(`
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
  `);

  // Ensure schema and seed match the current workshop specification
  const orderCols = db.prepare('PRAGMA table_info(orders)').all() as Array<{ name: string }>;
  const hasProductName = orderCols.some((col) => col.name === 'product_name');
  const hasSku1001 = db
    .prepare('SELECT 1 FROM inventory WHERE sku = ?')
    .get('SKU-1001') as { 1: number } | undefined;

  if (!hasProductName) {
    db.exec('DROP TABLE IF EXISTS orders; DROP TABLE IF EXISTS inventory;');
    initDb();
    return;
  }

  const inventoryCount = db
    .prepare('SELECT COUNT(*) as count FROM inventory')
    .get() as { count: number };

  if (inventoryCount.count === 0 || !hasSku1001) {
    db.exec('DELETE FROM orders; DELETE FROM inventory;');

    const insertInventory = db.prepare(
      'INSERT INTO inventory (sku, product_name, stock_count) VALUES (?, ?, ?)'
    );

    const seedInventory = [
      ['SKU-1001', 'Cashmere Crewneck Sweater', 15],
      ['SKU-2040', 'Selvedge Denim Jacket', 12],
      ['SKU-3010', 'Leather Chelsea Boots', 8],
      ['SKU-4022', 'Linen Blazer', 20],
      ['SKU-5099', 'Silk Evening Scarf', 3],
    ] as const;

    const seedTx = db.transaction(() => {
      for (const [sku, productName, stockCount] of seedInventory) {
        insertInventory.run(sku, productName, stockCount);
      }

      const insertOrder = db.prepare(
        'INSERT INTO orders (id, customer_name, sku, product_name, quantity, status, is_expedited, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );

      const seedOrders = [
        ['ORD-1001', 'Alice Smith', 'SKU-1001', 'Cashmere Crewneck Sweater', 1, 'PENDING', 1, '2026-10-20T09:15:00Z'],
        ['ORD-1002', 'Bob Jones', 'SKU-2040', 'Selvedge Denim Jacket', 2, 'PROCESSING', 0, '2026-10-20T10:30:00Z'],
        ['ORD-1003', 'Charlie Brown', 'SKU-3010', 'Leather Chelsea Boots', 1, 'SHIPPED', 0, '2026-10-19T16:20:00Z'],
        ['ORD-1004', 'Diana Prince', 'SKU-4022', 'Linen Blazer', 1, 'PENDING', 0, '2026-10-20T11:45:00Z'],
        ['ORD-1005', 'Evan Wright', 'SKU-5099', 'Silk Evening Scarf', 2, 'CANCELLED', 0, '2026-10-19T14:10:00Z'],
        ['ORD-1006', 'Fiona Gallagher', 'SKU-5099', 'Silk Evening Scarf', 1, 'PENDING', 1, '2026-10-20T13:10:00Z'],
      ] as const;

      for (const [id, customerName, sku, productName, quantity, status, isExpedited, createdAt] of seedOrders) {
        insertOrder.run(id, customerName, sku, productName, quantity, status, isExpedited, createdAt);
      }
    });

    seedTx();
  }
}

export function resetTestDb(): void {
  if (process.env.NODE_ENV === 'test') {
    db.exec('DROP TABLE IF EXISTS orders; DROP TABLE IF EXISTS inventory;');
    initDb();
  }
}

initDb();

export default db;
