import { useEffect, useState } from 'react';
import api from '../services/api';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => { api.get('/orders').then((r) => setOrders(r.data.data.items)); }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-3">Orders</h2>
      <div className="bg-white rounded shadow">
        {orders.map((o) => (
          <div key={o.id} className="p-2 border-b flex justify-between">
            <span>{o.customer?.name ?? 'Unknown'} - {o.status}</span>
            <span>${o.totalPrice}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
