import express from 'express';
import cors from 'cors';
import ordersRouter from './routes/orders';
import inventoryRouter from './routes/inventory';

export const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'fulfillmenthub-server' });
});

app.use('/api/orders', ordersRouter);
app.use('/api/inventory', inventoryRouter);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`FulfillmentHub backend listening on http://localhost:${PORT}`);
  });
}

export default app;
