import {
  HomeIcon,
  UsersIcon,
  HeartIcon,
  CreditCardIcon,
  BarChartIcon,
  LandmarkIcon,
  HistoryIcon,
  SettingsIcon,
  CalendarIcon,
} from '../components/icons';

export type NavChild = {
  to: string;
  label: string;
  permissionId?: string;
  accessLevel?: 'view' | 'edit' | 'full';
};

export type NavItem =
  | {
      to: string;
      label: string;
      icon: any;
      permissionId?: string;
      accessLevel?: 'view' | 'edit' | 'full';
    }
  | {
      label: string;
      icon: any;
      permissionId?: string;
      children: NavChild[];
    };

export const sidebarItems: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: HomeIcon },
  { to: '/dashboard/members', label: 'Members', icon: UsersIcon, permissionId: 'member_entry' },
  {
    label: 'Reports',
    icon: BarChartIcon,
    children: [
      { to: '/dashboard/reports/daily', label: 'Daily Report', permissionId: 'reports' },
      { to: '/dashboard/reports/monthly', label: 'Monthly Report', permissionId: 'reports' },
      { to: '/dashboard/reports/journal-log', label: 'Journal Log', permissionId: 'reports' },
      { to: '/dashboard/reports/trial-balance', label: 'Trial Balance', permissionId: 'reports' },
      { to: '/dashboard/reports/balance-sheet', label: 'Balance Sheet', permissionId: 'reports' },
    ],
  },
  { to: '/dashboard/master-data', label: 'Master Data', icon: LandmarkIcon, permissionId: 'master_data' },
  {
    label: 'Ledger',
    icon: CreditCardIcon,
    children: [
      { to: '/dashboard/ledger/entry', label: 'New Entry', permissionId: 'ledger_management', accessLevel: 'edit' },
      { to: '/dashboard/ledger/list', label: 'View Entries', permissionId: 'ledger_management', accessLevel: 'view' },
      { to: '/dashboard/ledger/profit-and-loss', label: 'Profit & Loss', permissionId: 'reports' },
      { to: '/dashboard/ledger/cashflow-by-category', label: 'Cashflow by Category', permissionId: 'reports' },
      { to: '/dashboard/ledger/category-statement', label: 'Category Statement', permissionId: 'reports' },
    ],
  },
  {
    label: 'Pooja',
    icon: CalendarIcon,
    children: [
      { to: '/dashboard/pooja/list', label: 'Pooja List', permissionId: 'pooja_registrations' },
      { to: '/dashboard/pooja/entry', label: 'Pooja Entry', permissionId: 'pooja_registrations' },
      { to: '/dashboard/pooja/approval', label: 'Pooja Approval', permissionId: 'pooja_approval' },
      { to: '/dashboard/pooja/request', label: 'Pooja Request', permissionId: 'pooja_mobile_submit' },
      { to: '/dashboard/pooja/my-requests', label: 'My Requests', permissionId: 'pooja_mobile_submit' },
    ],
  },
  {
    label: 'Hall Booking',
    icon: CalendarIcon,
    children: [
      { to: '/dashboard/hall/list', label: 'Hall Bookings', permissionId: 'hall_booking', accessLevel: 'view' },
      { to: '/dashboard/hall/entry', label: 'New Booking', permissionId: 'hall_booking', accessLevel: 'edit' },
      { to: '/dashboard/hall/approvals', label: 'Hall Approvals', permissionId: 'hall_approval', accessLevel: 'view' },
    ],
  },
  {
    label: 'Donations',
    icon: HeartIcon,
    children: [
      { to: '/dashboard/donation-product/entry', label: 'Product Donations - Entry', permissionId: 'edit_donations' },
      { to: '/dashboard/donation-product/list', label: 'Product Donations - List', permissionId: 'view_donations' },
      { to: '/dashboard/donations/money-entry', label: 'Money Donation Entry', permissionId: 'edit_donations' },
      { to: '/dashboard/donations/money-list', label: 'Money Donation List', permissionId: 'view_donations' },
      { to: '/dashboard/donations/approval', label: 'Donations Approval', permissionId: 'donation_approval', accessLevel: 'view' },
    ],
  },
  {
    label: 'Events',
    icon: CalendarIcon,
    children: [
      { to: '/dashboard/events', label: 'Event List', permissionId: 'view_events' },
      { to: '/dashboard/events/new', label: 'New Event', permissionId: 'edit_events' },
      { to: '/dashboard/calendar/new-moon-days', label: 'New Moon Days', permissionId: 'view_events' },
    ],
  },
  {
    label: 'Annadhanam',
    icon: HeartIcon,
    children: [
      { to: '/dashboard/annadhanam/list', label: 'Annadhanam List', permissionId: 'annadhanam_registrations' },
      { to: '/dashboard/annadhanam/entry', label: 'Annadhanam Entry', permissionId: 'annadhanam_registrations' },
      { to: '/dashboard/annadhanam/approval', label: 'Annadhanam Approval', permissionId: 'annadhanam_approval' },
    ],
  },
  {
    label: 'Receipts',
    icon: LandmarkIcon,
    children: [
      { to: '/dashboard/receipt/list', label: 'Receipt List', permissionId: 'receipts', accessLevel: 'view' },
      { to: '/dashboard/receipt/entry', label: 'Receipt Entry', permissionId: 'receipts', accessLevel: 'edit' },
    ],
  },
  {
    label: 'Tax',
    icon: LandmarkIcon,
    permissionId: 'tax_registrations',
    children: [
      { to: '/dashboard/registrations/text-entry', label: 'User Register', permissionId: 'user_registrations' },
      { to: '/dashboard/registrations/list', label: 'User List', permissionId: 'user_registrations' },
      { to: '/dashboard/tax/entry', label: 'Tax Entry', permissionId: 'tax_registrations' },
      { to: '/dashboard/tax/list', label: 'Tax List', permissionId: 'tax_registrations' },
      { to: '/dashboard/tax/settings', label: 'Tax Settings', permissionId: 'tax_registrations' },
    ],
  },
  {
    label: 'Properties',
    icon: HomeIcon,
    children: [
      { to: '/dashboard/properties', label: 'Properties List', permissionId: 'property_registrations' },
      { to: '/dashboard/properties/new', label: 'New Property', permissionId: 'property_registrations' },
    ],
  },
  { to: '/dashboard/session-logs', label: 'Session Logs', icon: HistoryIcon, permissionId: 'view_session_logs' },
  {
    label: 'Settings',
    icon: SettingsIcon,
    children: [
      { to: '/dashboard/settings', label: 'General Settings', permissionId: 'setting' },
      { to: '/dashboard/settings/pdf', label: 'PDF Settings', permissionId: 'pdf_settings' },
      { to: '/dashboard/settings/my-preferences', label: 'My Preferences', permissionId: 'setting' },
    ],
  },
];
