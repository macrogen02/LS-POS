import { useEffect, useRef, useState } from 'react';
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const onLogout = () => {
    dispatch(clearAuth());
    navigate('/login');
  };

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

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
        <header className="relative flex justify-end">
          <div ref={userMenuRef} className="relative">
            <button
              type="button"
              className="h-10 w-10 rounded-full bg-white text-slate-700 shadow-sm border flex items-center justify-center"
              aria-label="Open user menu"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
              </svg>
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white border shadow-lg p-3 flex items-center gap-3 z-20">
                <div className="h-10 w-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{user?.name ?? 'Current User'}</p>
                  <p className="text-sm text-slate-500 truncate">{user?.email ?? 'staff@laundrypos.local'}</p>
                </div>
                <button type="button" className="ml-auto rounded bg-slate-900 text-white px-3 py-1.5 text-sm" onClick={onLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}
