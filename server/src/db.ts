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
      quantity INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (sku) REFERENCES inventory(sku)
    );
  `);

  const inventoryCount = db
    .prepare('SELECT COUNT(*) as count FROM inventory')
    .get() as { count: number };

  if (inventoryCount.count === 0) {
    const insertInventory = db.prepare(
      'INSERT INTO inventory (sku, product_name, stock_count) VALUES (?, ?, ?)'
    );

    const seedInventory = [
      ['SKU-1049', 'Cashmere Crewneck Sweater', 4],
      ['SKU-2088', 'Selvedge Denim Jacket', 42],
      ['SKU-3012', 'Leather Chelsea Boots', 7],
      ['SKU-4055', 'Linen Blazer', 85],
      ['SKU-5099', 'Silk Evening Scarf', 2],
    ] as const;

    const seedTx = db.transaction(() => {
      for (const [sku, productName, stockCount] of seedInventory) {
        insertInventory.run(sku, productName, stockCount);
      }

      const insertOrder = db.prepare(
        'INSERT INTO orders (id, customer_name, sku, quantity, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      );

      const seedOrders = [
        ['ORD-1001', 'Elena Vance', 'SKU-1049', 2, 'PENDING', '2026-10-20T09:15:00Z'],
        ['ORD-1002', 'Marcus Sterling', 'SKU-2088', 1, 'PROCESSING', '2026-10-20T10:30:00Z'],
        ['ORD-1003', 'Aria Montgomery', 'SKU-3012', 1, 'PENDING', '2026-10-20T11:45:00Z'],
        ['ORD-1004', 'Julian Thorne', 'SKU-4055', 3, 'SHIPPED', '2026-10-19T16:20:00Z'],
        ['ORD-1005', 'Sophia Chen', 'SKU-5099', 1, 'PENDING', '2026-10-20T13:10:00Z'],
        ['ORD-1006', 'Devon Brooks', 'SKU-1049', 1, 'PROCESSING', '2026-10-20T14:05:00Z'],
      ] as const;

      for (const [id, customerName, sku, quantity, status, createdAt] of seedOrders) {
        insertOrder.run(id, customerName, sku, quantity, status, createdAt);
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
