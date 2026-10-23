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
  is_expedited: number;
  stock_count: number;
  created_at: string;
}

export interface InventoryItem {
  sku: string;
  product_name: string;
  stock_count: number;
}

// GET /api/inventory
export const getInventoryHandler = (_req: Request, res: Response): void => {
  try {
    const items = db
      .prepare('SELECT sku, product_name, stock_count FROM inventory ORDER BY sku ASC')
      .all() as InventoryItem[];
    res.json(items);
  } catch (error) {
    console.error('Failed to fetch inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
};

// GET /api/orders
router.get('/', (_req: Request, res: Response) => {
  try {
    const orders = db
      .prepare(
        `SELECT o.id,
                o.customer_name,
                o.sku,
                o.product_name,
                i.stock_count,
                o.quantity,
                o.status,
                o.is_expedited,
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

// GET /api/orders/inventory (also mounted at GET /api/inventory)
router.get('/inventory', getInventoryHandler);

// POST /api/orders/:id/cancel
router.post('/:id/cancel', (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const order = db
      .prepare('SELECT * FROM orders WHERE id = ?')
      .get(id) as OrderRow | undefined;

    if (!order) {
      res.status(404).json({ error: `Order ${id} not found` });
      return;
    }

    db.prepare("UPDATE orders SET status = 'CANCELLED' WHERE id = ?").run(id);
    db.prepare('UPDATE inventory SET stock_count = stock_count + ? WHERE sku = ?').run(
      order.quantity,
      order.sku
    );

    const updatedOrder = db
      .prepare(
        `SELECT o.id,
                o.customer_name,
                o.sku,
                o.product_name,
                i.stock_count,
                o.quantity,
                o.status,
                o.is_expedited,
                o.created_at
         FROM orders o
         JOIN inventory i ON o.sku = i.sku
         WHERE o.id = ?`
      )
      .get(id) as OrderRow;

    res.json(updatedOrder);
  } catch (error) {
    console.error(`Failed to cancel order ${id}:`, error);
    res.status(500).json({ error: 'Failed to cancel order' });
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
                o.product_name,
                i.stock_count,
                o.quantity,
                o.status,
                o.is_expedited,
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
