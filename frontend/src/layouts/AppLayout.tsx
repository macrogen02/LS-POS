import { useDispatch, useSelector } from 'react-redux';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { RootState } from '../app/store';
import { clearAuth } from '../features/auth/authSlice';

const navItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Customers', to: '/customers' },
  { label: 'Inventory', to: '/inventory' },
  { label: 'Reports', to: '/reports' },
  { label: 'Staff', to: '/staff' }
];

export default function AppLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  const onLogout = () => {
    dispatch(clearAuth());
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-56 bg-slate-900 text-white p-4 space-y-2">
        <h1 className="text-xl font-bold mb-4">LaundryPOS</h1>
        {navItems.map((item) => (
          <Link className="block hover:underline" key={item.to} to={item.to}>
            {item.label}
          </Link>
        ))}
      </aside>

      <main className="flex-1 p-6 space-y-4">
        <header className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-end gap-3">
          <div className="h-9 w-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
            </svg>
          </div>
          <div className="text-right leading-tight">
            <p className="text-sm font-semibold text-slate-800">{user?.name ?? 'Current User'}</p>
            <p className="text-xs text-slate-500">{user?.email ?? 'staff@laundrypos.local'}</p>
          </div>
          <button type="button" className="ml-2 rounded bg-slate-900 text-white px-3 py-1.5 text-sm" onClick={onLogout}>
            Logout
          </button>
        </header>

        <Outlet />
      </main>
    </div>
  );
}
