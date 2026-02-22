import { useEffect, useState } from 'react';
import api from '../services/api';

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api.get('/inventory').then((r) => setItems(r.data.data)); }, []);
  return (
    <div>
      <h2 className="text-2xl font-bold mb-3">Inventory</h2>
      <div className="bg-white rounded shadow">{items.map((i) => <div key={i.id} className="p-2 border-b">{i.itemName}: {i.quantity} {i.unit}</div>)}</div>
    </div>
  );
}
