interface Permission {
  id: string;
  name: string;
  description: string;
  icon: string;
  href: string;
  requiredRole: string[];
}

export const ALL_PERMISSIONS: Permission[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'View temple dashboard',
    icon: '📊',
    href: '/dashboard',
    requiredRole: ['member', 'admin', 'superadmin']
  },
  {
    id: 'members',
    name: 'Members',
    description: 'Manage temple members',
    icon: '👥',
    href: '/dashboard/members',
    requiredRole: ['admin', 'superadmin']
  },
  {
    id: 'master-data',
    name: 'Master Data',
    description: 'Manage temple master data',
    icon: '🗃️',
    href: '/dashboard/master-data',
    requiredRole: ['admin', 'superadmin']
  }
];

export function hasPermission(requiredRoles: string[], userRole?: string) {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}

export function getPermissionsForRole(role: string) {
  return ALL_PERMISSIONS.filter(p => p.requiredRole.includes(role));
}
