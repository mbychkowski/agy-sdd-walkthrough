import React, { useEffect, useState, useCallback } from 'react';
import { Order, OrderStatus, OrderTable } from './components/OrderTable';

interface InventoryItem {
  sku: string;
  product_name: string;
  stock_count: number;
}

export const App: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filterExpeditedOnly, setFilterExpeditedOnly] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, inventoryRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/inventory'),
      ]);

      if (!ordersRes.ok) {
        throw new Error(`HTTP ${ordersRes.status}: Failed to load orders`);
      }
      if (!inventoryRes.ok) {
        throw new Error(`HTTP ${inventoryRes.status}: Failed to load inventory`);
      }

      const ordersData = (await ordersRes.json()) as Order[];
      const inventoryData = (await inventoryRes.json()) as InventoryItem[];

      setOrders(ordersData);
      setInventory(inventoryData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

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

      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel order ${orderId}`);
      }

      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order cancellation failed');
    }
  };

  const totalOrders = orders.length;
  const pendingFulfillment = orders.filter(
    (o) => o.status === 'PENDING' || o.status === 'PROCESSING'
  ).length;
  const shippedCount = orders.filter((o) => o.status === 'SHIPPED').length;
  const cancelledCount = orders.filter((o) => o.status === 'CANCELLED').length;
  const expeditedCount = orders.filter((o) => o.is_expedited === 1).length;
  const lowStockItems = inventory.filter((item) => item.stock_count < 5);

  const displayedOrders = filterExpeditedOnly
    ? orders.filter((o) => o.is_expedited === 1)
    : orders;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-white shadow-inner">
              FH
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                FulfillmentHub — Retail Order &amp; Inventory Portal
              </h1>
              <p className="text-xs text-slate-400">
                Enterprise Retail Warehouse Operations
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => void fetchData()}
              className="inline-flex items-center rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              Refresh Queue
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* 4 Summary KPI Cards */}
        <section aria-label="Key Performance Indicators" className="grid grid-cols-1 gap-5 sm:grid-cols-4">
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
            <p className="mt-1 text-xs text-slate-500">Already on delivery carrier truck</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Cancelled
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{cancelledCount}</p>
            <p className="mt-1 text-xs text-slate-500">Cancelled &amp; restocked earlier</p>
          </div>
        </section>

        {/* Low-Stock Inventory Alert Banner */}
        {lowStockItems.length > 0 && (
          <section aria-label="Low Stock Alerts" className="rounded-xl border border-rose-200 bg-rose-50/70 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">⚠️</span>
                <div>
                  <h2 className="text-sm font-semibold text-rose-900">
                    Low-Stock Inventory Alert ({lowStockItems.length} {lowStockItems.length === 1 ? 'SKU' : 'SKUs'} &lt; 5 units)
                  </h2>
                  <p className="text-xs text-rose-700">
                    The following SKUs are below safety threshold and require inventory reconciliation:
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockItems.map((item) => (
                <div
                  key={item.sku}
                  className="flex items-center justify-between rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs shadow-2xs"
                >
                  <div className="truncate mr-2">
                    <p className="font-semibold text-slate-900 truncate">{item.product_name}</p>
                    <p className="font-mono text-slate-500 text-[11px]">{item.sku}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-rose-100 px-2.5 py-1 font-bold text-rose-800 text-[11px]">
                    {item.stock_count} in stock
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Table Controls / Filter Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-600">Filter Queue:</span>
            <button
              type="button"
              onClick={() => setFilterExpeditedOnly(false)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                !filterExpeditedOnly
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All Orders ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterExpeditedOnly(true)}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterExpeditedOnly
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>⚡ Expedited Only</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                filterExpeditedOnly ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {expeditedCount}
              </span>
            </button>
          </div>
        </div>

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
          <OrderTable
            orders={displayedOrders}
            onStatusChange={handleStatusChange}
            onCancelOrder={handleCancelOrder}
          />
        )}
      </main>
    </div>
  );
};

export default App;
