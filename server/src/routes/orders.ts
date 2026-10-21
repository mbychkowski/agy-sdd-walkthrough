import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

const VALID_STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'CANCELLED'] as const;

export interface OrderRow {
  id: string;
  customer_name: string;
  sku: string;
  product_name: string;
  quantity: number;
  status: string;
  created_at: string;
}

// GET /api/orders
// Intentionally joins only inventory.product_name (no stock_count or expedited flag in baseline)
router.get('/', (_req: Request, res: Response) => {
  try {
    const orders = db
      .prepare(
        `SELECT o.id,
                o.customer_name,
                o.sku,
                i.product_name,
                o.quantity,
                o.status,
                o.created_at
         FROM orders o
         JOIN inventory i ON o.sku = i.sku
         ORDER BY o.id ASC`
      )
      .all() as OrderRow[];

    res.json(orders);
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body as { status?: string };

  if (!status || !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    res.status(400).json({
      error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
    });
    return;
  }

  try {
    const updateResult = db
      .prepare('UPDATE orders SET status = ? WHERE id = ?')
      .run(status, id);

    if (updateResult.changes === 0) {
      res.status(404).json({ error: `Order ${id} not found` });
      return;
    }

    const updatedOrder = db
      .prepare(
        `SELECT o.id,
                o.customer_name,
                o.sku,
                i.product_name,
                o.quantity,
                o.status,
                o.created_at
         FROM orders o
         JOIN inventory i ON o.sku = i.sku
         WHERE o.id = ?`
      )
      .get(id) as OrderRow;

    res.json(updatedOrder);
  } catch (error) {
    console.error(`Failed to update status for order ${id}:`, error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

export default router;
