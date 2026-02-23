import { FormEvent, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

type Customer = { id: string; name: string; phone?: string; email?: string };

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
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    const res = await api.get('/customers');
    setCustomers(res.data.data);
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

  const validateForm = () => {
    if (!form.name.trim()) return 'Customer name is required.';
    if (!/^[A-Za-z\s'-]+$/.test(form.name.trim())) return 'Customer name must contain letters only.';
    if (form.phone && !/^\d+$/.test(form.phone)) return 'Cellphone number must contain numbers only.';
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
      phone: form.phone.trim() || undefined,
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

        {error && <p className="text-red-600 text-sm">{error}</p>}

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
          />
          <input
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Email (optional)"
            type="email"
          />
          <div className="flex gap-2">
            <button className="bg-blue-600 text-white px-4">{editingId ? 'Update' : 'Add'}</button>
            {editingId && <button type="button" onClick={onCancelEdit}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Cellphone</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} className="border-t">
                <td className="p-2">{customer.name}</td>
                <td className="p-2">{customer.phone ?? '-'}</td>
                <td className="p-2">{customer.email ?? '-'}</td>
                <td className="p-2 flex gap-2">
                  <button onClick={() => setSelectedId(customer.id)}>View</button>
                  <button onClick={() => onEdit(customer)}>Edit</button>
                  <button className="text-red-600" onClick={() => onDelete(customer.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!filteredCustomers.length && (
              <tr>
                <td className="p-3 text-slate-500" colSpan={4}>No customers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedCustomer && (
        <div className="bg-white rounded shadow p-4">
          <h3 className="text-lg font-semibold mb-2">Customer Details</h3>
          <p><strong>Name:</strong> {selectedCustomer.name}</p>
          <p><strong>Cellphone:</strong> {selectedCustomer.phone ?? '-'}</p>
          <p><strong>Email:</strong> {selectedCustomer.email ?? '-'}</p>
        </div>
      )}
    </div>
  );
}
