import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

type OrderStatus = 'pending' | 'washing' | 'ready' | 'completed' | 'collected';

type Order = {
  id: string;
  status: OrderStatus;
  totalPrice: number | string;
  createdAt: string;
  customer?: { name: string };
  payments: Array<{ amount: number | string }>;
};

const workflowOrder: OrderStatus[] = ['pending', 'washing', 'ready', 'completed', 'collected'];

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [dailySales, setDailySales] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setError('');
    try {
      const ordersRes = await api.get('/orders?page=1&pageSize=100');
      setOrders(ordersRes.data.data.items);
    } catch {
      setError('Unable to load workflow data. Check backend connection.');
      return;
    }

    const [dailyRes, monthlyRes] = await Promise.allSettled([
      api.get('/reports/daily-sales'),
      api.get('/reports/monthly-revenue')
    ]);

    setDailySales(dailyRes.status === 'fulfilled' ? Number(dailyRes.value.data.data.total ?? 0) : 0);
    setMonthlyRevenue(monthlyRes.status === 'fulfilled' ? Number(monthlyRes.value.data.data.total ?? 0) : 0);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const byStatus = useMemo(() => {
    const group: Record<OrderStatus, Order[]> = {
      pending: [],
      washing: [],
      ready: [],
      completed: [],
      collected: []
    };

    orders.forEach((order) => {
      group[order.status]?.push(order);
    });

    return group;
  }, [orders]);

  const updateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    setBusyOrderId(orderId);
    setError('');
    try {
      await api.put(`/orders/${orderId}/status`, { status: nextStatus });
      await loadDashboard();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(message ?? 'Failed to update order status.');
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Workflow Dashboard</h2>
        <button className="bg-slate-800 text-white px-3 py-1" onClick={loadDashboard}>Refresh</button>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded p-4 shadow">Orders Today: <strong>{orders.length}</strong></div>
        <div className="bg-white rounded p-4 shadow">Daily Sales: <strong>${dailySales.toFixed(2)}</strong></div>
        <div className="bg-white rounded p-4 shadow">Monthly Revenue: <strong>${monthlyRevenue.toFixed(2)}</strong></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {workflowOrder.map((status) => (
          <section key={status} className="bg-white rounded shadow p-3 min-h-64">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold capitalize">{status}</h3>
              <span className="text-xs bg-slate-200 rounded-full px-2 py-0.5">{byStatus[status].length}</span>
            </div>
            <div className="space-y-2">
              {byStatus[status].map((order) => {
                const paid = order.payments.reduce((acc, p) => acc + Number(p.amount), 0);
                const total = Number(order.totalPrice);
                return (
                  <article key={order.id} className="border rounded p-2 text-sm space-y-1">
                    <div className="font-medium">{order.customer?.name ?? 'Walk-in'}</div>
                    <div>Total: ${total.toFixed(2)}</div>
                    <div>Paid: ${paid.toFixed(2)}</div>
                    <select
                      className="w-full"
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
                      disabled={busyOrderId === order.id}
                    >
                      {workflowOrder.map((next) => <option key={next} value={next}>{next}</option>)}
                    </select>
                  </article>
                );
              })}
              {!byStatus[status].length && <p className="text-xs text-slate-500">No orders</p>}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
