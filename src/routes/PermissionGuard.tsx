import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PermissionDenied from '../components/PermissionDenied';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission: string;
  accessLevel: 'view' | 'edit' | 'full';
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({ children, requiredPermission, accessLevel }) => {
  const { user } = useAuth();

  // Superadmin bypasses all permissions
  if (user?.role === 'superadmin') {
    return <>{children}</>;
  }

  const hasPermission = user?.permissions?.some(
    (p) => 
      p.permission_id === requiredPermission && 
      (p.access_level === 'full' || 
       (accessLevel === 'edit' && p.access_level === 'edit') ||
       (accessLevel === 'view' && (p.access_level === 'view' || p.access_level === 'edit' || p.access_level === 'full')))
  );

  if (hasPermission) {
    return <>{children}</>;
  }

  return <PermissionDenied requiredPermission={`${requiredPermission} (${accessLevel})`} />;
};

export default PermissionGuard;
