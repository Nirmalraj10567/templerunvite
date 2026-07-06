import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PermissionDenied from '../components/PermissionDenied';
import RequireFeature from '../components/RequireFeature';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission: string;
  accessLevel: 'view' | 'edit' | 'full';
}

const PERMISSION_TO_FEATURE_MAP: Record<string, string> = {
  'hall_booking': 'module_hall_booking',
  'hall_approval': 'module_hall_booking',
  'ledger_management': 'module_accounting',
  'daybook': 'module_accounting',
  'reports': 'module_reports_full',
  'tax_registrations': 'module_tax',
  'user_registrations': 'module_tax',
  'asset_management': 'module_asset',
  'view_events': 'module_events',
  'edit_events': 'module_events',
  'marriage_register': 'module_marriage',
  'property_registrations': 'module_property',
};

const PermissionGuard: React.FC<PermissionGuardProps> = ({ children, requiredPermission, accessLevel }) => {
  const { userPermissions, isSuperAdmin, planFeatures } = useAuth();

  // Check if the plan allows this feature
  if (requiredPermission && !isSuperAdmin) {
    const featureKey = PERMISSION_TO_FEATURE_MAP[requiredPermission];
    if (featureKey !== undefined) {
      const val = planFeatures?.[featureKey];
      if (val === false || val === 0) {
        return <RequireFeature featureKey={featureKey}>{children}</RequireFeature>;
      }
    }
  }

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
