import { Link, Outlet } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Inventory', to: '/inventory' },
  { label: 'Reports', to: '/reports' },
  { label: 'Staff', to: '/staff' }
];

export default function AppLayout() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-slate-900 text-white p-4 space-y-2">
        <h1 className="text-xl font-bold mb-4">LaundryPOS</h1>
        {navItems.map((item) => (
          <Link className="block hover:underline" key={item.to} to={item.to}>{item.label}</Link>
        ))}
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
