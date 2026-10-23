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

class BulkCancelError extends Error {
  statusCode: number;
  code: string;
  failedOrderId?: string;

  constructor(statusCode: number, code: string, message: string, failedOrderId?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.failedOrderId = failedOrderId;
  }
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
    res.status(500).json({ error: 'Failed to fetch inventory', code: 'INTERNAL_ERROR' });
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
    res.status(500).json({ error: 'Failed to fetch orders', code: 'INTERNAL_ERROR' });
  }
});

// GET /api/orders/inventory (also mounted at GET /api/inventory)
router.get('/inventory', getInventoryHandler);

// POST /api/orders/bulk-cancel
router.post('/bulk-cancel', (req: Request, res: Response) => {
  const { orderIds } = req.body as { orderIds?: unknown };

  if (
    !Array.isArray(orderIds) ||
    orderIds.length === 0 ||
    !orderIds.every((id): id is string => typeof id === 'string' && id.trim().length > 0)
  ) {
    res.status(400).json({
      error: 'orderIds must be a non-empty array of order IDs',
      code: 'INVALID_PAYLOAD',
    });
    return;
  }

  const uniqueOrderIds = Array.from(new Set(orderIds));

  const selectOrderStmt = db.prepare(
    'SELECT id, sku, quantity, status FROM orders WHERE id = ?'
  );
  const cancelOrderStmt = db.prepare(
    "UPDATE orders SET status = 'CANCELLED' WHERE id = ?"
  );
  const restockInventoryStmt = db.prepare(
    'UPDATE inventory SET stock_count = stock_count + ? WHERE sku = ?'
  );

  const executeBulkCancel = db.transaction((ids: string[]) => {
    const cancelledIds: string[] = [];
    let restockedCount = 0;

    for (const id of ids) {
      const order = selectOrderStmt.get(id) as
        | { id: string; sku: string; quantity: number; status: string }
        | undefined;

      if (!order) {
        throw new BulkCancelError(
          404,
          'ORDER_NOT_FOUND',
          `Order ${id} not found`,
          id
        );
      }

      if (order.status === 'SHIPPED') {
        throw new BulkCancelError(
          409,
          'ORDER_ALREADY_SHIPPED',
          `Order ${id} has already shipped and cannot be cancelled`,
          id
        );
      }

      if (order.status === 'CANCELLED') {
        // Idempotent no-op: already cancelled orders restock 0 delta
        cancelledIds.push(id);
        continue;
      }

      cancelOrderStmt.run(id);
      restockInventoryStmt.run(order.quantity, order.sku);
      cancelledIds.push(id);
      restockedCount += order.quantity;
    }

    return { cancelledIds, restockedCount };
  });

  try {
    const result = executeBulkCancel(uniqueOrderIds);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof BulkCancelError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
        ...(error.failedOrderId ? { failedOrderId: error.failedOrderId } : {}),
      });
      return;
    }

    console.error('Failed to process bulk cancellation:', error);
    res.status(500).json({
      error: 'Failed to process bulk cancellation',
      code: 'INTERNAL_ERROR',
    });
  }
});

// POST /api/orders/:id/cancel
router.post('/:id/cancel', (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const cancelSingleTx = db.transaction((orderId: string) => {
      const order = db
        .prepare('SELECT * FROM orders WHERE id = ?')
        .get(orderId) as OrderRow | undefined;

      if (!order) {
        throw new BulkCancelError(404, 'ORDER_NOT_FOUND', `Order ${orderId} not found`, orderId);
      }

      if (order.status === 'SHIPPED') {
        throw new BulkCancelError(
          409,
          'ORDER_ALREADY_SHIPPED',
          `Order ${orderId} has already shipped and cannot be cancelled`,
          orderId
        );
      }

      if (order.status !== 'CANCELLED') {
        db.prepare("UPDATE orders SET status = 'CANCELLED' WHERE id = ?").run(orderId);
        db.prepare('UPDATE inventory SET stock_count = stock_count + ? WHERE sku = ?').run(
          order.quantity,
          order.sku
        );
      }

      return db
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
        .get(orderId) as OrderRow;
    });

    const updatedOrder = cancelSingleTx(id);
    res.status(200).json(updatedOrder);
  } catch (error) {
    if (error instanceof BulkCancelError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
      return;
    }
    console.error(`Failed to cancel order ${id}:`, error);
    res.status(500).json({ error: 'Failed to cancel order', code: 'INTERNAL_ERROR' });
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body as { status?: string };

  if (!status || !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    res.status(400).json({
      error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      code: 'INVALID_STATUS',
    });
    return;
  }

  try {
    const updateResult = db
      .prepare('UPDATE orders SET status = ? WHERE id = ?')
      .run(status, id);

    if (updateResult.changes === 0) {
      res.status(404).json({ error: `Order ${id} not found`, code: 'ORDER_NOT_FOUND' });
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
    res.status(500).json({ error: 'Failed to update order status', code: 'INTERNAL_ERROR' });
  }
});

export default router;
