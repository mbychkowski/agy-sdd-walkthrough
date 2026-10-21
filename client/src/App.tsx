import React, { useEffect, useState, useCallback } from 'react';
import { Order, OrderStatus, OrderTable } from './components/OrderTable';

export const App: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/orders');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to load orders`);
      }
      const data = (await response.json()) as Order[];
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update status for ${orderId}`);
      }

      const updatedOrder = (await response.json()) as Order;
      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? updatedOrder : order))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    }
  };

  const totalOrders = orders.length;
  const pendingFulfillment = orders.filter(
    (o) => o.status === 'PENDING' || o.status === 'PROCESSING'
  ).length;
  const shippedCount = orders.filter((o) => o.status === 'SHIPPED').length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-white shadow-inner">
              OP
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                OrderPulse — Fulfillment &amp; Triage Portal
              </h1>
              <p className="text-xs text-slate-400">
                Enterprise Retail Warehouse Operations
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => void fetchOrders()}
              className="inline-flex items-center rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              Refresh Queue
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* 3 Summary KPI Cards */}
        <section aria-label="Key Performance Indicators" className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Orders
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{totalOrders}</p>
            <p className="mt-1 text-xs text-slate-500">Active retail queue</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Pending Fulfillment
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{pendingFulfillment}</p>
            <p className="mt-1 text-xs text-slate-500">Awaiting pick, pack, or carrier handoff</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Shipped
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{shippedCount}</p>
            <p className="mt-1 text-xs text-slate-500">Dispatched from fulfillment center</p>
          </div>
        </section>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-sm text-slate-500">
            Loading fulfillment queue...
          </div>
        ) : (
          <OrderTable orders={orders} onStatusChange={handleStatusChange} />
        )}
      </main>
    </div>
  );
};

export default App;
