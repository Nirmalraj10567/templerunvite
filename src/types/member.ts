export interface Member {
  id: number;
  fullName: string;
  mobile: string;
  username?: string;
  email?: string;
  gotra?: string;
  nakshatra?: string;
  isBlocked?: boolean;
  // Additional optional profile fields captured in the UI
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  pinCode?: string;
  state?: string;
  // Account-related optional fields (used by the current form component)
  accountType?: string;
  initialDeposit?: string | number;
  monthlyIncome?: string;
  role?: 'member' | 'admin' | 'superadmin';
  userId?: number; // ID from users table, optional because it might not be present for new members
  templeId?: number;
  createdAt?: string;
  // Admin panel access creation controls (frontend-only)
  createLogin?: boolean;
  password?: string;
  permissionLevel?: 'view' | 'full';
  // Privilege settings to send to backend when creating/updating login
  customPermissions?: PagePermission[];
}

export interface PagePermission {
  id: string;
  name: string;
  description: string;
  icon: string;
  href: string;
  access: 'full' | 'view' | 'none';
}
