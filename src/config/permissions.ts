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
  },
  {
    id: 'session_management',
    name: 'Session Management',
    description: 'View and manage user sessions',
    icon: '🔒',
    href: '/dashboard/session-management',
    requiredRole: ['admin', 'superadmin']
  },
  {
    id: 'activity_logs',
    name: 'Activity Logs',
    description: 'View system activity logs',
    icon: '📝',
    href: '/dashboard/activity-logs',
    requiredRole: ['admin', 'superadmin']
  },
  {
    id: 'view_session_logs',
    name: 'View Session Logs',
    description: 'View user session logs',
    icon: '',
    href: '',
    requiredRole: ['admin', 'superadmin']
  }
  ,
  {
    id: 'marriage_register',
    name: 'Marriage Register',
    description: 'Create and view marriage register entries',
    icon: '💍',
    href: '/dashboard/marriage/list',
    requiredRole: ['admin', 'superadmin']
  }
  ,
  {
    id: 'user_registrations',
    name: 'User Registrations',
    description: 'Temple user registrations (separate from members)',
    icon: '📝',
    href: '/dashboard/registrations/list',
    requiredRole: ['admin', 'superadmin']
  },
  {
    id: 'tax_registrations',
    name: 'Tax Registrations',
    description: 'Manage temple tax registrations (separate module)',
    icon: '🧾',
    href: '/dashboard/registrations/tax-view',
    requiredRole: ['admin', 'superadmin']
  }
];

export const permissions = {
  dashboard: {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'View temple dashboard',
  },
  members: {
    id: 'members',
    name: 'Members',
    description: 'Manage temple members',
  },
  master_data: {
    id: 'master-data',
    name: 'Master Data',
    description: 'Manage temple master data',
  },
  session_management: {
    id: 'session_management',
    name: 'Session Management',
    description: 'View and manage user sessions',
  },
  activity_logs: {
    id: 'activity_logs',
    name: 'Activity Logs',
    description: 'View system activity logs',
  },
  view_session_logs: {
    id: 'view_session_logs',
    name: 'View Session Logs',
    description: 'Allows viewing user session logs',
  },
  marriage_register: {
    id: 'marriage_register',
    name: 'Marriage Register',
    description: 'Allows creating and viewing marriage register entries',
  },
  user_registrations: {
    id: 'user_registrations',
    name: 'User Registrations',
    description: 'Allows managing temple user registrations (not members)'
  },
  tax_registrations: {
    id: 'tax_registrations',
    name: 'Tax Registrations',
    description: 'Allows managing separate temple tax registrations'
  },
};

export function hasPermission(requiredRoles: string[], userRole?: string) {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}

export function getPermissionsForRole(role: string) {
  return ALL_PERMISSIONS.filter(p => p.requiredRole.includes(role));
}
