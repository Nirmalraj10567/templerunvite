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
  const { userPermissions, isSuperAdmin } = useAuth();

  // Superadmin bypasses all permissions
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  const hasPermission = (userPermissions || []).some((p) => {
    if (p.permission_id !== requiredPermission) return false;
    if (accessLevel === 'view') return true; // any level grants view
    if (accessLevel === 'edit') return p.access_level === 'edit' || p.access_level === 'full';
    if (accessLevel === 'full') return p.access_level === 'full';
    return false;
  });

  if (hasPermission) {
    return <>{children}</>;
  }

  return <PermissionDenied requiredPermission={`${requiredPermission} (${accessLevel})`} />;
};

export default PermissionGuard;
