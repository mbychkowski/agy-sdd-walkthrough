import React from 'react';

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'CANCELLED';

export interface Order {
  id: string;
  customer_name: string;
  sku: string;
  product_name: string;
  quantity: number;
  status: OrderStatus;
  is_expedited: number;
  stock_count: number;
  created_at: string;
}

interface OrderTableProps {
  orders: Order[];
  selectedOrderIds?: string[];
  onToggleSelectOrder?: (orderId: string) => void;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  onCancelOrder: (orderId: string) => Promise<void>;
}

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20',
  PROCESSING: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10',
  SHIPPED: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
  CANCELLED: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/10',
};

const ALL_STATUSES: OrderStatus[] = ['PENDING', 'PROCESSING', 'SHIPPED', 'CANCELLED'];

export const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  selectedOrderIds = [],
  onToggleSelectOrder,
  onStatusChange,
  onCancelOrder,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Active Fulfillment Queue</h2>
          <p className="text-sm text-slate-500">
            Real-time retail order triage and fulfillment status controls
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {onToggleSelectOrder && (
                <th scope="col" className="w-10 px-4 py-3.5 text-left">
                  <span className="sr-only">Select</span>
                </th>
              )}
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Order ID
              </th>
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Customer
              </th>
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Product
              </th>
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Quantity
              </th>
              <th
                scope="col"
                className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                {onToggleSelectOrder && (
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      aria-label={`Select ${order.id}`}
                      checked={selectedOrderIds.includes(order.id)}
                      onChange={() => onToggleSelectOrder(order.id)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                    />
                  </td>
                )}
                <td className="whitespace-nowrap px-6 py-4 text-sm font-mono font-semibold text-slate-900">
                  <div className="flex items-center space-x-2">
                    <span>{order.id}</span>
                    {order.is_expedited === 1 && (
                      <span
                        title="Expedited Order"
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900 border border-amber-300"
                      >
                        ⚡ Expedited
                      </span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-800">
                  {order.customer_name}
                </td>
                <td className="px-6 py-4 text-sm text-slate-700">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900">{order.product_name}</span>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-xs font-mono text-slate-500">{order.sku}</span>
                      {order.stock_count < 5 ? (
                        <span className="inline-flex items-center rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-700 border border-rose-200">
                          ⚠️ Low stock: {order.stock_count} left
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          ({order.stock_count} in stock)
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-700">
                  {order.quantity}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <span
                    className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${
                      STATUS_STYLES[order.status] ?? STATUS_STYLES.PENDING
                    }`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm space-x-2">
                  <select
                    aria-label={`Change status for ${order.id}`}
                    value={order.status}
                    onChange={(e) => void onStatusChange(order.id, e.target.value as OrderStatus)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                  >
                    {ALL_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void onCancelOrder(order.id)}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition-colors"
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={onToggleSelectOrder ? 7 : 6} className="px-6 py-10 text-center text-sm text-slate-500">
                  No orders found in fulfillment queue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
