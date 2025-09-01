import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

type PermissionLevel = 'view' | 'edit' | 'full';

export function useHasPermission() {
  const { user } = useContext(AuthContext);

  return (permissionId: string, requiredLevel: PermissionLevel = 'view'): boolean => {
    if (!user) return false;
    
    // Superadmin has all permissions
    if (user.role === 'superadmin') return true;
    
    // Check if user has the required permission
    const permission = user.permissions?.find(p => p.permission_id === permissionId);
    if (!permission) return false;
    
    // Check permission level
    switch (requiredLevel) {
      case 'view':
        return true; // If they have any level of this permission, they can view
      case 'edit':
        return ['edit', 'full'].includes(permission.access_level);
      case 'full':
        return permission.access_level === 'full';
      default:
        return false;
    }
  };
}
