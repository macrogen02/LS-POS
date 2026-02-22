import { FormEvent, useEffect, useState } from 'react';
import api from '../services/api';

type Customer = { id: string; name: string; phone?: string; email?: string };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [name, setName] = useState('');

  const load = () => api.get('/customers').then((r) => setCustomers(r.data.data));
  useEffect(() => { load(); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post('/customers', { name });
    setName('');
    load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Customers</h2>
      <form onSubmit={submit} className="flex gap-2"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" /><button className="bg-blue-600 text-white">Add</button></form>
      <div className="bg-white rounded shadow">
        {customers.map((c) => <div key={c.id} className="p-2 border-b">{c.name}</div>)}
      </div>
    </div>
  );
}
