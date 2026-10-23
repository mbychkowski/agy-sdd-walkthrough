import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import db, { resetTestDb } from '../src/db';

describe('POST /api/orders/bulk-cancel (Phase 2 Evaluation Rubric)', () => {
  beforeEach(() => {
    resetTestDb();
  });

  it('Rubric 1: cancels valid PENDING and PROCESSING orders in a single batch and restocks inventory (HTTP 200)', async () => {
    const res = await request(app)
      .post('/api/orders/bulk-cancel')
      .send({ orderIds: ['ORD-1001', 'ORD-1002'] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      cancelledIds: ['ORD-1001', 'ORD-1002'],
      restockedCount: 3,
    });

    const ord1001 = db
      .prepare('SELECT status FROM orders WHERE id = ?')
      .get('ORD-1001') as { status: string };
    const ord1002 = db
      .prepare('SELECT status FROM orders WHERE id = ?')
      .get('ORD-1002') as { status: string };
    expect(ord1001.status).toBe('CANCELLED');
    expect(ord1002.status).toBe('CANCELLED');

    const sku1001 = db
      .prepare('SELECT stock_count FROM inventory WHERE sku = ?')
      .get('SKU-1001') as { stock_count: number };
    const sku2040 = db
      .prepare('SELECT stock_count FROM inventory WHERE sku = ?')
      .get('SKU-2040') as { stock_count: number };
    expect(sku1001.stock_count).toBe(16); // 15 + 1
    expect(sku2040.stock_count).toBe(14); // 12 + 2
  });

  it('Rubric 2: treats already-CANCELLED orders (ORD-1005) as an idempotent no-op with 0-delta restock (HTTP 200)', async () => {
    const res = await request(app)
      .post('/api/orders/bulk-cancel')
      .send({ orderIds: ['ORD-1005', 'ORD-1006'] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      cancelledIds: ['ORD-1005', 'ORD-1006'],
      restockedCount: 1,
    });

    // SKU-5099 started at 3; ORD-1005 (qty 2, CANCELLED) adds 0, ORD-1006 (qty 1, PENDING) adds 1 -> 4
    const scarfStock = db
      .prepare('SELECT stock_count FROM inventory WHERE sku = ?')
      .get('SKU-5099') as { stock_count: number };
    expect(scarfStock.stock_count).toBe(4);

    // Retrying the exact same batch is completely idempotent (0 additional restock)
    const retryRes = await request(app)
      .post('/api/orders/bulk-cancel')
      .send({ orderIds: ['ORD-1005', 'ORD-1006'] });

    expect(retryRes.status).toBe(200);
    expect(retryRes.body).toEqual({
      cancelledIds: ['ORD-1005', 'ORD-1006'],
      restockedCount: 0,
    });

    const scarfStockAfterRetry = db
      .prepare('SELECT stock_count FROM inventory WHERE sku = ?')
      .get('SKU-5099') as { stock_count: number };
    expect(scarfStockAfterRetry.stock_count).toBe(4);
  });

  it('Rubric 3: atomically rolls back the entire batch with HTTP 409 when a SHIPPED order (ORD-1003) is included', async () => {
    const res = await request(app)
      .post('/api/orders/bulk-cancel')
      .send({ orderIds: ['ORD-1001', 'ORD-1003'] });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({
      code: 'ORDER_ALREADY_SHIPPED',
      failedOrderId: 'ORD-1003',
    });
    expect(typeof res.body.error).toBe('string');

    // Verify ORD-1001 was rolled back and NOT cancelled or restocked
    const ord1001 = db
      .prepare('SELECT status FROM orders WHERE id = ?')
      .get('ORD-1001') as { status: string };
    const sku1001 = db
      .prepare('SELECT stock_count FROM inventory WHERE sku = ?')
      .get('SKU-1001') as { stock_count: number };
    expect(ord1001.status).toBe('PENDING');
    expect(sku1001.stock_count).toBe(15);
  });

  it('Rubric 4: atomically rolls back the entire batch with HTTP 404 when a non-existent order ID is included', async () => {
    const res = await request(app)
      .post('/api/orders/bulk-cancel')
      .send({ orderIds: ['ORD-1001', 'ORD-9999'] });

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      code: 'ORDER_NOT_FOUND',
      failedOrderId: 'ORD-9999',
    });
    expect(typeof res.body.error).toBe('string');

    // Verify ORD-1001 was rolled back and NOT cancelled or restocked
    const ord1001 = db
      .prepare('SELECT status FROM orders WHERE id = ?')
      .get('ORD-1001') as { status: string };
    const sku1001 = db
      .prepare('SELECT stock_count FROM inventory WHERE sku = ?')
      .get('SKU-1001') as { stock_count: number };
    expect(ord1001.status).toBe('PENDING');
    expect(sku1001.stock_count).toBe(15);
  });

  it('Rubric 5: returns HTTP 400 with structured error for empty or invalid orderIds payload', async () => {
    const emptyRes = await request(app)
      .post('/api/orders/bulk-cancel')
      .send({ orderIds: [] });

    expect(emptyRes.status).toBe(400);
    expect(emptyRes.body).toMatchObject({
      code: 'INVALID_PAYLOAD',
    });

    const missingRes = await request(app)
      .post('/api/orders/bulk-cancel')
      .send({});

    expect(missingRes.status).toBe(400);
    expect(missingRes.body).toMatchObject({
      code: 'INVALID_PAYLOAD',
    });
  });
});
