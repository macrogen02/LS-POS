import { FormEvent, useEffect, useState } from 'react';
import api from '../services/api';

export default function NewOrderPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [weight, setWeight] = useState(1);

  useEffect(() => {
    api.get('/customers').then((r) => { setCustomers(r.data.data); setCustomerId(r.data.data[0]?.id ?? ''); });
    api.get('/services').then((r) => { setServices(r.data.data); setServiceId(r.data.data[0]?.id ?? ''); });
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!customerId || !serviceId || weight <= 0) return;
    await api.post('/orders', { customerId, items: [{ serviceId, weight }] });
    alert('Order created');
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <h2 className="text-2xl font-bold">New Order</h2>
      <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <input type="number" min={0.1} step={0.1} value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
      <button className="bg-blue-600 text-white">Create</button>
    </form>
  );
}
