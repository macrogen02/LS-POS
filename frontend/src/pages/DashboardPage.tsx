import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

type OrderStatus = 'pending' | 'washing' | 'ready' | 'completed' | 'collected';
type WorkflowLane = 'pending' | 'washing' | 'drying' | 'ready' | 'picked_up';
type PaymentMethod = 'cash' | 'card' | 'online';
type ServiceKey = 'wash' | 'dry' | 'fold';

type Customer = { id: string; name: string; phone?: string };
type Service = { id: string; name: string; pricePerKg: number | string };
type Order = {
  id: string;
  status: OrderStatus;
  totalPrice: number | string;
  customer?: { id: string; name: string };
  payments: Array<{ amount: number | string }>;
  items: Array<{ service?: { id: string; name: string } }>;
};

const lanes: Array<{ key: WorkflowLane; label: string }> = [
  { key: 'pending', label: 'Pending' },
  { key: 'washing', label: 'Washing' },
  { key: 'drying', label: 'Drying' },
  { key: 'ready', label: 'Ready' },
  { key: 'picked_up', label: 'Picked up' }
];

const laneByStatus: Record<OrderStatus, WorkflowLane> = {
  pending: 'pending',
  washing: 'washing',
  completed: 'drying',
  ready: 'ready',
  collected: 'picked_up'
};

const serviceButtons: Array<{ key: ServiceKey; label: string; rate: number }> = [
  { key: 'wash', label: 'Wash', rate: 3 },
  { key: 'dry', label: 'Dry', rate: 2 },
  { key: 'fold', label: 'Fold', rate: 1.5 }
];

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [dailySales, setDailySales] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [selectedServices, setSelectedServices] = useState<Record<ServiceKey, boolean>>({
    wash: true,
    dry: false,
    fold: false
  });
  const [weight, setWeight] = useState(3);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  const loadDashboard = useCallback(async () => {
    setError('');
    try {
      const [ordersRes, customersRes, servicesRes] = await Promise.all([
        api.get('/orders?page=1&pageSize=100'),
        api.get('/customers'),
        api.get('/services')
      ]);

      const fetchedCustomers: Customer[] = customersRes.data.data;
      setOrders(ordersRes.data.data.items);
      setCustomers(fetchedCustomers);
      setServices(servicesRes.data.data);

      if (!customerId && fetchedCustomers[0]) setCustomerId(fetchedCustomers[0].id);
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
  }, [customerId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const byLane = useMemo(() => {
    const group: Record<WorkflowLane, Order[]> = { pending: [], washing: [], drying: [], ready: [], picked_up: [] };
    orders.forEach((order) => group[laneByStatus[order.status]].push(order));
    return group;
  }, [orders]);

  const topService = useMemo(() => {
    const counter = new Map<string, number>();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const name = item.service?.name;
        if (name) counter.set(name, (counter.get(name) ?? 0) + 1);
      });
    });
    return [...counter.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A';
  }, [orders]);

  const selectedServiceKeys = useMemo(
    () => (Object.keys(selectedServices) as ServiceKey[]).filter((key) => selectedServices[key]),
    [selectedServices]
  );

  const isValidServiceCombo = useMemo(() => {
    const hasWash = selectedServices.wash;
    const hasDry = selectedServices.dry;
    const hasFold = selectedServices.fold;
    if (hasFold && !hasWash && !hasDry) return false;
    if (hasFold && !(hasWash && hasDry)) return false;
    return hasWash || hasDry;
  }, [selectedServices]);

  const resolvedSelectedServices = useMemo(() => {
    const lower = services.map((service) => ({ ...service, lowerName: service.name.trim().toLowerCase() }));

    const findService = (key: ServiceKey) =>
      lower.find((service) => service.lowerName === key) ??
      lower.find((service) => service.lowerName.includes(key));

    return selectedServiceKeys
      .map((key) => findService(key))
      .filter((service, index, arr): service is (Service & { lowerName: string }) =>
        Boolean(service) && arr.findIndex((item) => item?.id === service?.id) === index
      );
  }, [selectedServiceKeys, services]);

  const estimatedPrice = useMemo(() => {
    const rate = resolvedSelectedServices.reduce((sum, service) => sum + Number(service.pricePerKg), 0);
    return (rate * weight).toFixed(2);
  }, [resolvedSelectedServices, weight]);

  const smsNotifications = useMemo(
    () =>
      byLane.ready.map(
        (order) =>
          `SMS sent to ${order.customer?.name ?? 'customer'}: Your order ${order.id.slice(0, 6).toUpperCase()} is ready for pickup.`
      ),
    [byLane.ready]
  );

  const loyaltyRows = useMemo(
    () =>
      customers.map((customer) => {
        const orderCount = orders.filter((order) => order.customer?.id === customer.id).length;
        return { ...customer, orderCount, points: orderCount * 2 };
      }),
    [customers, orders]
  );

  const addCustomer = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;
    await api.post('/customers', { name: newCustomerName, phone: newCustomerPhone || undefined });
    setNewCustomerName('');
    setNewCustomerPhone('');
    await loadDashboard();
  };

  const resolveServiceIds = () => resolvedSelectedServices.map((service) => service.id);

  const createOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!customerId || weight <= 0) return;
    if (!isValidServiceCombo) {
      setError('Invalid service combo. Allowed: Wash, Dry, Wash+Dry, or Wash+Dry+Fold.');
      return;
    }

    const serviceIds = resolveServiceIds();
    if (serviceIds.length !== selectedServiceKeys.length) {
      setError('Service setup missing. Please seed exact services: Wash, Dry, Fold.');
      return;
    }

    setError('');
    try {
      const items = serviceIds.map((serviceId) => ({ serviceId, weight }));
      const orderRes = await api.post('/orders', { customerId, items });
      const orderId = orderRes.data.data.id as string;
      const total = Number(orderRes.data.data.totalPrice);
      await api.post(`/orders/${orderId}/payments`, {
        amount: total,
        method: paymentMethod
      });
      await loadDashboard();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(message ?? 'Failed to create order.');
    }
  };

  const nextStatus = (status: OrderStatus): OrderStatus | null => {
    if (status === 'pending') return 'washing';
    if (status === 'washing') return 'completed';
    if (status === 'completed') return 'ready';
    if (status === 'ready') return 'collected';
    return null;
  };

  const actionLabel = (status: OrderStatus) => {
    if (status === 'pending') return 'Start Washing';
    if (status === 'washing') return 'Move to Drying';
    if (status === 'completed') return 'Mark as Ready';
    if (status === 'ready') return 'Hand-over to Customer';
    return '';
  };

  const advanceOrder = async (order: Order) => {
    const target = nextStatus(order.status);
    if (!target) return;
    setBusyOrderId(order.id);
    setError('');
    try {
      await api.put(`/orders/${order.id}/status`, { status: target });
      await loadDashboard();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(message ?? 'Failed to update order status.');
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <div className="space-y-3">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        <section className="xl:col-span-4 bg-white rounded-xl p-4 shadow-sm space-y-3">
          <div>
            <h2 className="text-3xl font-bold leading-none">Laundry POS</h2>
            <p className="text-slate-500 mt-2">New order, instant pricing, and payment capture.</p>
          </div>

          <form onSubmit={addCustomer} className="bg-slate-100 rounded-xl p-3 grid grid-cols-2 gap-2">
            <input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Customer name" className="bg-white" />
            <input value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} placeholder="Cellphone number" className="bg-white" />
            <button className="col-span-2 bg-slate-200">Add New Customer</button>
          </form>

          <form onSubmit={createOrder} className="space-y-2">
            <label className="block text-sm">Customer</label>
            <select className="w-full" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.phone ? ` (${c.phone})` : ''}
                </option>
              ))}
            </select>

            <label className="block text-sm">Services</label>
            <div className="grid grid-cols-3 gap-2">
              {serviceButtons.map((service) => (
                <button
                  key={service.key}
                  type="button"
                  onClick={() => setSelectedServices((prev) => ({ ...prev, [service.key]: !prev[service.key] }))}
                  className={`py-2 ${selectedServices[service.key] ? 'bg-indigo-100 border-indigo-400 text-indigo-700' : 'bg-white'}`}
                >
                  <div>{service.label}</div>
                  <div>₱{resolvedSelectedServices.find((s) => s.lowerName === service.key)?.pricePerKg ?? service.rate}/kg</div>
                </button>
              ))}
            </div>
            {!isValidServiceCombo && (
              <p className="text-xs text-red-600">Allowed: Wash, Dry, Wash+Dry, Wash+Dry+Fold. Fold requires both Wash and Dry.</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm">Weight (kg)</label>
                <input className="w-full" type="number" min={0.5} step={0.5} value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm">Payment</label>
                <select className="w-full" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="online">Online</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-100 rounded-xl p-3">
              <p className="text-slate-500">Auto-calculated price</p>
              <p className="text-3xl font-bold">₱{estimatedPrice}</p>
            </div>
            <button className="w-full bg-indigo-600 text-white py-2" disabled={!isValidServiceCombo}>
              Create Order + Record Payment
            </button>
          </form>
        </section>

        <section className="xl:col-span-8 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MetricCard title="Daily Sales" value={`₱${dailySales.toFixed(2)}`} />
            <MetricCard title="Monthly Sales (est.)" value={`₱${monthlyRevenue.toFixed(2)}`} />
            <MetricCard title="Top Service" value={topService} />
            <MetricCard title="Ready for Pickup" value={`${byLane.ready.length}`} />
            <MetricCard title="Picked up" value={`${byLane.picked_up.length}`} />
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="text-2xl font-bold mb-3">Laundry Workflow</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
              {lanes.map((lane) => (
                <div key={lane.key} className="bg-slate-100 rounded-lg p-2 min-h-[240px]">
                  <h4 className="font-medium mb-2">{lane.label}</h4>
                  <div className="space-y-2">
                    {byLane[lane.key].map((order) => (
                      <article key={order.id} className="bg-white border rounded p-2 text-sm leading-tight">
                        <p className="font-medium">L-{order.id.slice(0, 4).toUpperCase()}</p>
                        <p>{order.customer?.name ?? 'Walk-in'}</p>
                        <p>{order.items.map((item) => item.service?.name).filter(Boolean).join(' + ') || 'Laundry Service'}</p>
                        <p>₱{Number(order.totalPrice).toFixed(2)}</p>
                        {nextStatus(order.status) && (
                          <button
                            className="mt-1 w-full bg-slate-800 text-white py-1 rounded"
                            disabled={busyOrderId === order.id}
                            onClick={() => advanceOrder(order)}
                          >
                            {actionLabel(order.status)}
                          </button>
                        )}
                      </article>
                    ))}
                    {!byLane[lane.key].length && <p className="text-xs text-slate-500">No orders</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="text-2xl font-bold">SMS Notifications (Auto on Ready)</h3>
            <div className="mt-2 text-slate-500 text-sm space-y-1">
              {smsNotifications.length ? smsNotifications.map((msg) => <p key={msg}>{msg}</p>) : <p>No SMS sent yet.</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="text-2xl font-bold">Customers & Loyalty</h3>
            <div className="overflow-x-auto mt-2">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-1">Name</th>
                    <th className="py-1">Phone</th>
                    <th className="py-1">Orders</th>
                    <th className="py-1">Loyalty Points</th>
                  </tr>
                </thead>
                <tbody>
                  {loyaltyRows.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="py-1">{row.name}</td>
                      <td className="py-1">{row.phone ?? '-'}</td>
                      <td className="py-1">{row.orderCount}</td>
                      <td className="py-1">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <p className="text-slate-500 text-sm">{title}</p>
      <p className="text-4xl font-bold mt-1 leading-none">{value}</p>
    </div>
  );
}
