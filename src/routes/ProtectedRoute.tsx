import React, { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type ProtectedRouteProps = {
  children?: ReactNode;
  requiredRole?: string[];
};

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, token, isLoading } = useAuth();
  const location = useLocation();
  const pathWithQuery = `${location.pathname}${location.search || ''}`;

  // Allow direct file/API access without auth checks (e.g., PDF receipts, assets, or proxy API paths)
  // This prevents redirects when opening links like /api/.../receipt.pdf?token=...
  if (/\.(pdf|png|jpg|jpeg|gif|svg)$/i.test(pathWithQuery) || location.pathname.startsWith('/api/')) {
    return children ? children : <Outlet />;
  }

  // Wait for auth restoration on hard refresh/deep links to avoid false redirects
  if (isLoading) {
    return <div className="p-6 text-slate-600">Loading…</div>;
  }

  if (!user || !token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requiredRole && !requiredRole.includes(user?.role || '')) {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
}
