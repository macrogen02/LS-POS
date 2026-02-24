import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

type OrderStatus = 'pending' | 'washing' | 'ready' | 'completed' | 'collected';
type WorkflowLane = 'pending' | 'washing' | 'drying' | 'folding' | 'ready' | 'picked_up';
type PaymentMethod = 'cash' | 'card' | 'online';
type ServiceKey = 'wash' | 'dry' | 'fold';

type Customer = { id: string; name: string; phone?: string };
type Service = { id: string; name: string; pricePerKg: number | string };
type LoadEntry = { id: number; selectedServices: Record<ServiceKey, boolean>; weight: number };
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
  { key: 'folding', label: 'Folding' },
  { key: 'ready', label: 'Ready' },
  { key: 'picked_up', label: 'Picked up' }
];

const serviceButtons: Array<{ key: ServiceKey; label: string; rate: number }> = [
  { key: 'wash', label: 'Wash', rate: 3 },
  { key: 'dry', label: 'Dry', rate: 2 },
  { key: 'fold', label: 'Fold', rate: 1.5 }
];

const FOLDING_STAGE_KEY = 'dashboard-folding-stage-order-ids';
const MIN_MACHINE_LOAD_KG = 1;
const MAX_MACHINE_LOAD_KG = 15;

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [dailySales, setDailySales] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [foldingStageOrderIds, setFoldingStageOrderIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem(FOLDING_STAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  });

  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [paymentOrderId, setPaymentOrderId] = useState('');
  const [loadEntries, setLoadEntries] = useState<LoadEntry[]>([
    { id: 1, selectedServices: { wash: true, dry: false, fold: false }, weight: 3 }
  ]);
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
      let fetchedServices: Service[] = servicesRes.data.data;

      const canonicalServices: Array<{ name: string; pricePerKg: number }> = [
        { name: 'Wash', pricePerKg: 3 },
        { name: 'Dry', pricePerKg: 2 },
        { name: 'Fold', pricePerKg: 1.5 }
      ];
      const hasExact = (name: string) => fetchedServices.some((service) => service.name.trim().toLowerCase() === name.toLowerCase());

      const missingCanonical = canonicalServices.filter((service) => !hasExact(service.name));
      if (missingCanonical.length) {
        await Promise.allSettled(missingCanonical.map((service) => api.post('/services', service)));
        const refreshedServicesRes = await api.get('/services');
        fetchedServices = refreshedServicesRes.data.data;
      }

      setOrders(ordersRes.data.data.items);
      setCustomers(fetchedCustomers);
      setServices(fetchedServices);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(FOLDING_STAGE_KEY, JSON.stringify(foldingStageOrderIds));
  }, [foldingStageOrderIds]);

  useEffect(() => {
    setFoldingStageOrderIds((prev) => {
      const activeIds = new Set(
        orders
          .filter((order) => order.status === 'completed' && hasFoldService(order))
          .map((order) => order.id)
      );
      const next = prev.filter((id) => activeIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [orders]);

  const hasWashService = (order: Order) => {
    return order.items.some((item) => {
      const name = item.service?.name?.trim().toLowerCase() ?? '';
      return name === 'wash' || name.includes('wash');
    });
  };

  const hasFoldService = (order: Order) => {
    return order.items.some((item) => {
      const name = item.service?.name?.trim().toLowerCase() ?? '';
      return name === 'fold' || name.includes('fold');
    });
  };

  const hasDryService = (order: Order) => {
    return order.items.some((item) => {
      const name = item.service?.name?.trim().toLowerCase() ?? '';
      return name === 'dry' || name.includes('dry');
    });
  };

  const isWashOnlyOrder = (order: Order) => hasWashService(order) && !hasDryService(order) && !hasFoldService(order);
  const isInFoldingStage = (order: Order) => order.status === 'completed' && hasFoldService(order) && foldingStageOrderIds.includes(order.id);

  const laneForOrder = (order: Order): WorkflowLane => {
    if (order.status === 'pending') return 'pending';
    if (order.status === 'washing') return 'washing';
    if (order.status === 'completed') return isInFoldingStage(order) ? 'folding' : 'drying';
    if (order.status === 'ready') return 'ready';
    return 'picked_up';
  };

  const byLane = useMemo(() => {
    const group: Record<WorkflowLane, Order[]> = { pending: [], washing: [], drying: [], folding: [], ready: [], picked_up: [] };
    orders.forEach((order) => group[laneForOrder(order)].push(order));
    return group;
  }, [orders, foldingStageOrderIds]);

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

  const serviceByKey = useMemo(() => {
    const map = new Map<ServiceKey, Service>();
    services.forEach((service) => {
      const normalized = service.name.trim().toLowerCase();
      if (normalized === 'wash' || normalized === 'dry' || normalized === 'fold') {
        map.set(normalized, service);
      }
    });
    return map;
  }, [services]);

  const isValidServiceComboFor = (selectedServices: Record<ServiceKey, boolean>) => {
    const hasWash = selectedServices.wash;
    const hasDry = selectedServices.dry;
    const hasFold = selectedServices.fold;

    const isWashOnly = hasWash && !hasDry && !hasFold;
    const isDryOnly = !hasWash && hasDry && !hasFold;
    const isWashDry = hasWash && hasDry && !hasFold;
    const isWashDryFold = hasWash && hasDry && hasFold;
    const isDryFold = !hasWash && hasDry && hasFold;

    return isWashOnly || isDryOnly || isWashDry || isWashDryFold || isDryFold;
  };

  const isValidServiceCombo = useMemo(() => loadEntries.every((load) => isValidServiceComboFor(load.selectedServices)), [loadEntries]);

  const estimatedPrice = useMemo(() => {
    const total = loadEntries.reduce((sum, load) => {
      const rate = (Object.keys(load.selectedServices) as ServiceKey[])
        .filter((key) => load.selectedServices[key])
        .reduce((inner, key) => inner + Number(serviceByKey.get(key)?.pricePerKg ?? serviceButtons.find((btn) => btn.key === key)?.rate ?? 0), 0);
      return sum + rate * load.weight;
    }, 0);
    return total.toFixed(2);
  }, [loadEntries, serviceByKey]);

  const resolveItemsByLoad = () => {
    const items: Array<{ serviceId: string; weight: number }> = [];
    for (const load of loadEntries) {
      const selectedKeys = (Object.keys(load.selectedServices) as ServiceKey[]).filter((key) => load.selectedServices[key]);
      for (const key of selectedKeys) {
        const service = serviceByKey.get(key);
        if (!service) return null;
        items.push({ serviceId: service.id, weight: load.weight });
      }
    }
    return items;
  };

  const addLoad = () => {
    setLoadEntries((prev) => [
      ...prev,
      { id: (prev[prev.length - 1]?.id ?? 0) + 1, selectedServices: { wash: true, dry: false, fold: false }, weight: 3 }
    ]);
  };

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

  const selectedCustomer = useMemo(() => customers.find((customer) => customer.id === customerId), [customerId, customers]);

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) => {
      const haystack = `${customer.name} ${customer.phone ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [customerSearch, customers]);

  useEffect(() => {
    if (!filteredCustomers.length) return;
    if (!filteredCustomers.some((customer) => customer.id === customerId)) {
      setCustomerId(filteredCustomers[0].id);
    }
  }, [filteredCustomers, customerId]);

  const outstandingBalance = (order: Order) => {
    const paid = order.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    return Math.max(0, Number(order.totalPrice) - paid);
  };

  const paymentStatus = (order: Order) => (outstandingBalance(order) <= 0 ? 'Paid' : 'Unpaid');

  const unpaidOrders = useMemo(() => {
    return orders
      .filter((order) => outstandingBalance(order) > 0)
      .filter((order) => !customerId || order.customer?.id === customerId)
      .sort((a, b) => (a.id < b.id ? 1 : -1));
  }, [orders, customerId]);

  useEffect(() => {
    if (!paymentOrderId && unpaidOrders[0]) {
      setPaymentOrderId(unpaidOrders[0].id);
      return;
    }

    if (paymentOrderId && !unpaidOrders.some((order) => order.id === paymentOrderId)) {
      setPaymentOrderId(unpaidOrders[0]?.id ?? '');
    }
  }, [unpaidOrders, paymentOrderId]);

  const createOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!customerId) return;
    if (loadEntries.some((load) => load.weight <= 0 || load.weight < MIN_MACHINE_LOAD_KG || load.weight > MAX_MACHINE_LOAD_KG)) {
      setError(`Each load weight must be between ${MIN_MACHINE_LOAD_KG}kg and ${MAX_MACHINE_LOAD_KG}kg.`);
      return;
    }
    if (!isValidServiceCombo) {
      setError('Invalid service combo. Allowed: Wash only, Dry only, Wash + Dry, Dry + Fold, or Wash + Dry + Fold.');
      return;
    }

    const items = resolveItemsByLoad();
    if (!items?.length) {
      setError('Service setup missing. Please seed exact services: Wash, Dry, Fold.');
      return;
    }

    setError('');
    try {
      const orderRes = await api.post('/orders', { customerId, items });
      const orderId = orderRes.data.data.id as string;
      setPaymentOrderId(orderId);
      await loadDashboard();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(message ?? 'Failed to create order.');
    }
  };

  const recordPayment = async () => {
    if (!paymentOrderId) {
      setError('Select an order to record payment.');
      return;
    }

    const order = orders.find((item) => item.id === paymentOrderId);
    if (!order) {
      setError('Order not found for payment recording.');
      return;
    }

    const amount = outstandingBalance(order);
    if (amount <= 0) {
      setError('Selected order is already fully paid.');
      return;
    }

    setError('');
    try {
      await api.post(`/orders/${order.id}/payments`, { amount, method: paymentMethod });
      await loadDashboard();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(message ?? 'Failed to record payment.');
    }
  };

  const nextStatus = (order: Order): OrderStatus | null => {
    if (order.status === 'pending') return hasWashService(order) ? 'washing' : 'completed';
    if (order.status === 'washing') return isWashOnlyOrder(order) ? 'ready' : 'completed';
    if (order.status === 'completed') return 'ready';
    if (order.status === 'ready') return 'collected';
    return null;
  };

  const actionLabel = (order: Order) => {
    if (order.status === 'pending') return hasWashService(order) ? 'Start Washing' : 'Move to Drying';
    if (order.status === 'washing') return isWashOnlyOrder(order) ? 'Mark as Ready' : 'Move to Drying';
    if (order.status === 'completed') return isInFoldingStage(order) ? 'Mark as Ready' : hasFoldService(order) ? 'Move to Folding' : 'Mark as Ready';
    if (order.status === 'ready') return 'Hand-over to Customer';
    return '';
  };


  const summarizeOrderServices = (order: Order) => {
    const names = order.items.map((item) => item.service?.name?.trim().toLowerCase()).filter((name): name is string => Boolean(name));

    const exact = new Set(names.filter((name): name is 'wash' | 'dry' | 'fold' => name === 'wash' || name === 'dry' || name === 'fold'));
    if (exact.size) {
      const ordered = (['wash', 'dry', 'fold'] as const).filter((key) => exact.has(key));
      return ordered.map((key) => key[0].toUpperCase() + key.slice(1)).join(' + ');
    }

    const hasWash = names.some((name) => name.includes('wash'));
    const hasDry = names.some((name) => name.includes('dry'));
    const labels: string[] = [];
    if (hasWash) labels.push('Wash');
    if (hasDry) labels.push('Dry');
    return labels.join(' + ') || 'Laundry Service';
  };

  const advanceOrder = async (order: Order) => {
    if (order.status === 'completed' && hasFoldService(order) && !isInFoldingStage(order)) {
      setFoldingStageOrderIds((prev) => (prev.includes(order.id) ? prev : [...prev, order.id]));
      return;
    }

    const target = nextStatus(order);
    if (!target) return;
    setBusyOrderId(order.id);
    setError('');
    try {
      await api.put(`/orders/${order.id}/status`, { status: target });
      if (target === 'ready' || target === 'collected') {
        setFoldingStageOrderIds((prev) => prev.filter((id) => id !== order.id));
      }
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

          <form onSubmit={createOrder} className="space-y-2">
            <label className="block text-sm">Search Customer</label>
            <input
              className="w-full"
              placeholder="Type customer name or phone"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />

            <label className="block text-sm">Customer</label>
            <select className="w-full" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              {filteredCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.phone ? ` (${c.phone})` : ''}
                </option>
              ))}
            </select>
            <div className="bg-slate-50 rounded-lg p-2 text-sm text-slate-600">
              <p><span className="font-medium">Name:</span> {selectedCustomer?.name ?? '-'}</p>
              <p><span className="font-medium">Phone:</span> {selectedCustomer?.phone ?? '-'}</p>
            </div>

            <label className="block text-sm">Services</label>
            <div className="space-y-3">
              {loadEntries.map((load, index) => (
                <div key={load.id} className="rounded-lg border p-2 space-y-2">
                  <p className="text-sm font-medium">Load {index + 1}</p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    {serviceButtons.map((service) => (
                      <button
                        key={`${load.id}-${service.key}`}
                        type="button"
                        onClick={() =>
                          setLoadEntries((prev) =>
                            prev.map((entry) =>
                              entry.id === load.id
                                ? {
                                    ...entry,
                                    selectedServices: { ...entry.selectedServices, [service.key]: !entry.selectedServices[service.key] }
                                  }
                                : entry
                            )
                          )
                        }
                        className={`py-2 ${load.selectedServices[service.key] ? 'bg-indigo-100 border-indigo-400 text-indigo-700' : 'bg-white'}`}
                      >
                        <div>{service.label}</div>
                        <div>₱{Number(serviceByKey.get(service.key)?.pricePerKg ?? service.rate)}/kg</div>
                      </button>
                    ))}
                    <div>
                      <label className="block text-sm">Weight (kg)</label>
                      <input
                        className="w-full"
                        type="number"
                        min={MIN_MACHINE_LOAD_KG}
                        max={MAX_MACHINE_LOAD_KG}
                        step={0.5}
                        value={load.weight}
                        onChange={(e) =>
                          setLoadEntries((prev) =>
                            prev.map((entry) => (entry.id === load.id ? { ...entry, weight: Number(e.target.value) } : entry))
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="text-sm rounded border px-3 py-1" onClick={addLoad}>
              Add Load
            </button>
            {!isValidServiceCombo && (
              <p className="text-xs text-red-600">Allowed combinations per load: Wash only, Dry only, Wash + Dry, Dry + Fold, Wash + Dry + Fold.</p>
            )}

            <p className="text-xs text-slate-500">Machine load: minimum {MIN_MACHINE_LOAD_KG}kg, maximum {MAX_MACHINE_LOAD_KG}kg.</p>

            <div>
              <label className="block text-sm">Payment</label>
              <select className="w-full" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="online">Online</option>
              </select>
            </div>

            <div className="bg-slate-100 rounded-xl p-3">
              <p className="text-slate-500">Auto-calculated price</p>
              <p className="text-3xl font-bold">₱{estimatedPrice}</p>
            </div>
            <button className="w-full bg-indigo-600 text-white py-2" disabled={!isValidServiceCombo}>
              Create Order
            </button>

            <div className="border rounded-xl p-3 space-y-2">
              <p className="font-medium">Record Payment</p>
              <select className="w-full" value={paymentOrderId} onChange={(e) => setPaymentOrderId(e.target.value)}>
                {unpaidOrders.length ? (
                  unpaidOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      L-{order.id.slice(0, 4).toUpperCase()} • {order.customer?.name ?? 'Walk-in'} • ₱{outstandingBalance(order).toFixed(2)} due
                    </option>
                  ))
                ) : (
                  <option value="">No unpaid orders</option>
                )}
              </select>
              <button
                type="button"
                className="w-full bg-slate-800 text-white py-2 rounded disabled:opacity-60"
                disabled={!unpaidOrders.length || !paymentOrderId}
                onClick={recordPayment}
              >
                Record Payment
              </button>
            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-2">
              {lanes.map((lane) => (
                <div key={lane.key} className="bg-slate-100 rounded-lg p-2 min-h-[240px]">
                  <h4 className="font-medium mb-2">{lane.label}</h4>
                  <div className="space-y-2">
                    {byLane[lane.key].map((order) => (
                      <article key={order.id} className="bg-white border rounded p-2 text-sm leading-tight">
                        <p className="font-medium">L-{order.id.slice(0, 4).toUpperCase()}</p>
                        <p>{order.customer?.name ?? 'Walk-in'}</p>
                        <p>{summarizeOrderServices(order)}</p>
                        <p>₱{Number(order.totalPrice).toFixed(2)}</p>
                        <p className={`text-xs font-medium ${paymentStatus(order) === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {paymentStatus(order)}
                        </p>
                        {nextStatus(order) && (
                          <button
                            className="mt-1 w-full bg-slate-800 text-white py-1 rounded"
                            disabled={busyOrderId === order.id}
                            onClick={() => advanceOrder(order)}
                          >
                            {actionLabel(order)}
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
