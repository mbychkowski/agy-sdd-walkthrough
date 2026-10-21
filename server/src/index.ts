import express from 'express';
import cors from 'cors';
import ordersRouter from './routes/orders';

export const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'order-pulse-server' });
});

app.use('/api/orders', ordersRouter);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`OrderPulse backend listening on http://localhost:${PORT}`);
  });
}

export default app;
