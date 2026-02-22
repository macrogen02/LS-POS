import { Link, Outlet } from 'react-router-dom';

export default function AppLayout() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-slate-900 text-white p-4 space-y-2">
        <h1 className="text-xl font-bold mb-4">LaundryPOS</h1>
        {['dashboard', 'orders', 'customers', 'inventory', 'reports'].map((r) => (
          <Link className="block hover:underline" key={r} to={`/${r}`}>{r}</Link>
        ))}
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
