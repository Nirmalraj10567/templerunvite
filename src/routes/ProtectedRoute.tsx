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
