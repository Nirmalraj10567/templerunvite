import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ProtectedRoute({
  children,
  requiredRole
}: {
  children: ReactNode;
  requiredRole: string[];
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user || !requiredRole.includes(user.role)) {
    navigate('/login');
    return null;
  }

  return <>{children}</>;
}
