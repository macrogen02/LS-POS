import { ReactElement } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { RootState } from '../app/store';

export default function ProtectedRoute({ children, adminOnly = false }: { children: ReactElement; adminOnly?: boolean }) {
  const { token, user } = useSelector((s: RootState) => s.auth);
  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}
