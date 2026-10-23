import { Router, Request, Response } from 'express';
import db from '../db';
import { getInventoryHandler, InventoryItem } from './orders';

const router = Router();

// GET /api/inventory
router.get('/', getInventoryHandler);

// GET /api/inventory/low-stock
router.get('/low-stock', (_req: Request, res: Response) => {
  try {
    const items = db
      .prepare(
        'SELECT sku, product_name, stock_count FROM inventory WHERE stock_count < 5 ORDER BY stock_count ASC'
      )
      .all() as InventoryItem[];
    res.json(items);
  } catch (error) {
    console.error('Failed to fetch low-stock inventory:', error);
    res.status(500).json({ error: 'Failed to fetch low-stock inventory' });
  }
});

export default router;
