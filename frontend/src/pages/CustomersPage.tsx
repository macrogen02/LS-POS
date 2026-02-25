import { FormEvent, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

type Customer = { id: string; name: string; phone?: string; email?: string };
type OrderStatus = 'pending' | 'washing' | 'ready' | 'completed' | 'collected';
type Order = {
  id: string;
  status: OrderStatus;
  customer?: { id: string; name: string };
};

type ChatMessage = {
  from: 'system' | 'you';
  text: string;
  at: string;
};

type FormState = {
  name: string;
  phone: string;
  email: string;
};

const initialForm: FormState = { name: '', phone: '', email: '' };

const sanitizeName = (value: string) => value.replace(/[^A-Za-z\s'-]/g, '');
const sanitizePhone = (value: string) => value.replace(/\D/g, '');

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [chatCustomer, setChatCustomer] = useState<Customer | null>(null);
  const [chatDraft, setChatDraft] = useState('');
  const [chatLogs, setChatLogs] = useState<Record<string, ChatMessage[]>>({});

  const load = async () => {
    const [customersRes, ordersRes] = await Promise.all([api.get('/customers'), api.get('/orders?page=1&pageSize=100')]);
    setCustomers(customersRes.data.data);
    setOrders(ordersRes.data.data.items ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedId) ?? null,
    [customers, selectedId]
  );

  const filteredCustomers = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.email].some((field) => field?.toLowerCase().includes(key))
    );
  }, [customers, search]);

  const loyaltyRows = useMemo(
    () =>
      filteredCustomers.map((customer) => {
        const orderCount = orders.filter((order) => order.customer?.id === customer.id).length;
        return { ...customer, orderCount, points: orderCount * 2 };
      }),
    [filteredCustomers, orders]
  );

  const smsNotifications = useMemo(
    () =>
      orders
        .filter((order) => order.status === 'ready')
        .map(
          (order) =>
            `SMS sent to ${order.customer?.name ?? 'customer'}: Your order ${order.id.slice(0, 6).toUpperCase()} is ready for pickup.`
        ),
    [orders]
  );

  const validateForm = () => {
    if (!form.name.trim()) return 'Customer name is required.';
    if (!/^[A-Za-z\s'-]+$/.test(form.name.trim())) return 'Customer name must contain letters only.';
    if (!form.phone.trim()) return 'Cellphone number is required.';
    if (!/^\d+$/.test(form.phone)) return 'Cellphone number must contain numbers only.';
    return '';
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined
    };

    if (editingId) {
      await api.put(`/customers/${editingId}`, payload);
    } else {
      await api.post('/customers', payload);
    }

    setForm(initialForm);
    setEditingId(null);
    await load();
  };

  const onEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setForm({ name: customer.name ?? '', phone: customer.phone ?? '', email: customer.email ?? '' });
    setError('');
  };

  const onDelete = async (id: string) => {
    await api.delete(`/customers/${id}`);
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) {
      setEditingId(null);
      setForm(initialForm);
    }
    await load();
  };

  const onCancelEdit = () => {
    setEditingId(null);
    setForm(initialForm);
    setError('');
  };

  const onOpenMessage = (customer: Customer) => {
    setChatCustomer(customer);
    setChatDraft(`Hi ${customer.name}, your laundry update is ready for pickup.`);
    setChatLogs((prev) => {
      if (prev[customer.id]) return prev;
      return {
        ...prev,
        [customer.id]: [{ from: 'system', text: `Thread started with ${customer.name}.`, at: new Date().toLocaleTimeString() }]
      };
    });
  };

  const onSendMessage = () => {
    if (!chatCustomer || !chatDraft.trim()) return;
    const msg: ChatMessage = { from: 'you', text: chatDraft.trim(), at: new Date().toLocaleTimeString() };
    setChatLogs((prev) => ({ ...prev, [chatCustomer.id]: [...(prev[chatCustomer.id] ?? []), msg] }));
    setChatDraft('');
  };

  const activeChat = chatCustomer ? chatLogs[chatCustomer.id] ?? [] : [];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Customers</h2>

      <div className="bg-white rounded shadow p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{editingId ? 'Edit Customer' : 'Add Customer'}</h3>
          <input
            className="w-72"
            placeholder="Search name, phone, email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl">
              <h4 className="text-lg font-semibold text-red-600">Validation message</h4>
              <p className="mt-2 text-sm text-slate-700">{error}</p>
              <div className="mt-4 flex justify-end">
                <button type="button" className="rounded bg-blue-600 px-4 py-1.5 text-white" onClick={() => setError('')}>
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: sanitizeName(e.target.value) }))}
            placeholder="Customer name"
            required
          />
          <input
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: sanitizePhone(e.target.value) }))}
            placeholder="Cellphone number"
            inputMode="numeric"
            required
          />
          <input
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Email (optional)"
            type="email"
          />
          <div className="flex gap-2">
            <button className="bg-blue-600 text-white px-4">{editingId ? 'Update' : 'Add'}</button>
            {editingId && (
              <button type="button" onClick={onCancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded shadow p-4">
        <h3 className="text-2xl font-bold">SMS Notifications (Auto on Ready)</h3>
        <div className="mt-2 text-slate-500 text-sm space-y-1">
          {smsNotifications.length ? smsNotifications.map((msg) => <p key={msg}>{msg}</p>) : <p>No SMS sent yet.</p>}
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Cellphone</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Orders</th>
              <th className="p-2 text-left">Loyalty Points</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loyaltyRows.map((customer) => (
              <tr key={customer.id} className="border-t">
                <td className="p-2">{customer.name}</td>
                <td className="p-2">{customer.phone ?? '-'}</td>
                <td className="p-2">{customer.email ?? '-'}</td>
                <td className="p-2">{customer.orderCount}</td>
                <td className="p-2">{customer.points}</td>
                <td className="p-2 flex gap-2">
                  <button type="button" onClick={() => setSelectedId(customer.id)}>
                    View
                  </button>
                  <button type="button" onClick={() => onEdit(customer)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => onOpenMessage(customer)} className="rounded bg-emerald-600 text-white px-2 py-0.5">
                    Message
                  </button>
                  <button type="button" className="text-red-600" onClick={() => onDelete(customer.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!loyaltyRows.length && (
              <tr>
                <td className="p-3 text-slate-500" colSpan={6}>
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedCustomer && (
        <div className="bg-white rounded shadow p-4">
          <h3 className="text-lg font-semibold mb-2">Customer Details</h3>
          <p>
            <strong>Name:</strong> {selectedCustomer.name}
          </p>
          <p>
            <strong>Cellphone:</strong> {selectedCustomer.phone ?? '-'}
          </p>
          <p>
            <strong>Email:</strong> {selectedCustomer.email ?? '-'}
          </p>
        </div>
      )}

      {chatCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl overflow-hidden">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-semibold">Messaging App</p>
                <p className="text-xs text-slate-200">{chatCustomer.name}</p>
              </div>
              <button type="button" className="text-sm" onClick={() => setChatCustomer(null)}>
                Close
              </button>
            </div>

            <div className="h-72 overflow-y-auto bg-slate-50 p-3 space-y-2">
              {activeChat.map((msg, idx) => (
                <div key={`${msg.at}-${idx}`} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.from === 'you' ? 'ml-auto bg-indigo-600 text-white' : 'bg-white border'}`}>
                  <p>{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${msg.from === 'you' ? 'text-indigo-100' : 'text-slate-400'}`}>{msg.at}</p>
                </div>
              ))}
              {!activeChat.length && <p className="text-xs text-slate-500">No messages yet.</p>}
            </div>

            <div className="border-t p-3 flex gap-2">
              <input
                className="flex-1"
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder="Type your message"
              />
              <button type="button" className="rounded bg-indigo-600 text-white px-4" onClick={onSendMessage}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
