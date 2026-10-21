import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import db, { resetTestDb } from '../src/db';

describe('OrderPulse API (/api/orders)', () => {
  beforeEach(() => {
    resetTestDb();
  });

  it('GET /api/orders returns all 6 seeded orders joined with product_name', async () => {
    const res = await request(app).get('/api/orders');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(6);

    const firstOrder = res.body.find((o: { id: string }) => o.id === 'ORD-1001');
    expect(firstOrder).toBeDefined();
    expect(firstOrder).toMatchObject({
      id: 'ORD-1001',
      customer_name: 'Elena Vance',
      sku: 'SKU-1049',
      product_name: 'Cashmere Crewneck Sweater',
      quantity: 2,
      status: 'PENDING',
    });

    // Baseline check: stock_count is stored in inventory table
    const inv = db
      .prepare('SELECT stock_count FROM inventory WHERE sku = ?')
      .get('SKU-1049') as { stock_count: number };
    expect(inv.stock_count).toBe(4);
  });

  it('PATCH /api/orders/:id/status updates an order status and returns the updated order', async () => {
    const res = await request(app)
      .patch('/api/orders/ORD-1001/status')
      .send({ status: 'SHIPPED' });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('ORD-1001');
    expect(res.body.status).toBe('SHIPPED');

    const checkRes = await request(app).get('/api/orders');
    const updated = checkRes.body.find((o: { id: string }) => o.id === 'ORD-1001');
    expect(updated.status).toBe('SHIPPED');
  });

  it('PATCH /api/orders/:id/status returns 400 for invalid status', async () => {
    const res = await request(app)
      .patch('/api/orders/ORD-1001/status')
      .send({ status: 'INVALID_STATE' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('PATCH /api/orders/:id/status returns 404 for non-existent order ID', async () => {
    const res = await request(app)
      .patch('/api/orders/ORD-9999/status')
      .send({ status: 'PROCESSING' });

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('ORD-9999');
  });
});
