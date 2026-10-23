import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import db, { resetTestDb } from '../src/db';

describe('FulfillmentHub Baseline API (/api/orders & /api/inventory)', () => {
  beforeEach(() => {
    resetTestDb();
  });

  it('GET /api/orders returns all 6 seeded orders with product_name and stock_count', async () => {
    const res = await request(app).get('/api/orders');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(6);

    const ord1001 = res.body.find((o: { id: string }) => o.id === 'ORD-1001');
    expect(ord1001).toMatchObject({
      id: 'ORD-1001',
      customer_name: 'Alice Smith',
      sku: 'SKU-1001',
      product_name: 'Cashmere Crewneck Sweater',
      quantity: 1,
      status: 'PENDING',
    });

    const ord1003 = res.body.find((o: { id: string }) => o.id === 'ORD-1003');
    expect(ord1003).toMatchObject({
      id: 'ORD-1003',
      customer_name: 'Charlie Brown',
      sku: 'SKU-3010',
      product_name: 'Leather Chelsea Boots',
      quantity: 1,
      status: 'SHIPPED',
    });

    const ord1005 = res.body.find((o: { id: string }) => o.id === 'ORD-1005');
    expect(ord1005).toMatchObject({
      id: 'ORD-1005',
      customer_name: 'Evan Wright',
      sku: 'SKU-5099',
      product_name: 'Silk Evening Scarf',
      quantity: 2,
      status: 'CANCELLED',
    });
  });

  it('GET /api/inventory returns all 5 seeded SKUs with SKU-5099 at stock_count 3', async () => {
    const res = await request(app).get('/api/inventory');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(5);

    const scarf = res.body.find((item: { sku: string }) => item.sku === 'SKU-5099');
    expect(scarf).toEqual({
      sku: 'SKU-5099',
      product_name: 'Silk Evening Scarf',
      stock_count: 3,
    });
  });

  it('POST /api/orders/:id/cancel cancels a single order and increments inventory stock_count', async () => {
    const beforeInv = db
      .prepare('SELECT stock_count FROM inventory WHERE sku = ?')
      .get('SKU-1001') as { stock_count: number };
    expect(beforeInv.stock_count).toBe(15);

    const res = await request(app).post('/api/orders/ORD-1001/cancel');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('ORD-1001');
    expect(res.body.status).toBe('CANCELLED');

    const afterInv = db
      .prepare('SELECT stock_count FROM inventory WHERE sku = ?')
      .get('SKU-1001') as { stock_count: number };
    expect(afterInv.stock_count).toBe(16);
  });

  it('PATCH /api/orders/:id/status updates an order status and returns 404 for unknown order', async () => {
    const res = await request(app)
      .patch('/api/orders/ORD-1001/status')
      .send({ status: 'PROCESSING' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PROCESSING');

    const notFound = await request(app)
      .patch('/api/orders/ORD-9999/status')
      .send({ status: 'PROCESSING' });
    expect(notFound.status).toBe(404);
  });
});
