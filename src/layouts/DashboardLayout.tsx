import React, { useMemo, useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
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
  ChevronLeftIcon,
  ChevronRightIcon,
  MenuIcon,
} from '../components/icons';

export default function DashboardLayout() {
  const { user, userPermissions, isSuperAdmin } = useAuth();
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarItems = useMemo(
    () => [
      { to: '/dashboard', label: 'Overview', icon: HomeIcon },
      { to: '/dashboard/members', label: 'Members', icon: UsersIcon, permissionId: 'member_entry' },
      { to: '/dashboard/transactions', label: 'Transactions', icon: CreditCardIcon, permissionId: 'transactions' },
      { to: '/dashboard/reports', label: 'Reports', icon: BarChartIcon, permissionId: 'reports' },
      { to: '/dashboard/balance-sheet', label: 'Balance Sheet', icon: LandmarkIcon, permissionId: 'balance_sheet' },
      { to: '/dashboard/master-data', label: 'Master Data', icon: LandmarkIcon, permissionId: 'master_data' },
      {
        label: 'Ledger',
        icon: CreditCardIcon,
        children: [
          { to: '/dashboard/ledger/entry', label: 'New Entry', permissionId: 'ledger_management', accessLevel: 'edit' },
          { to: '/dashboard/ledger/list', label: 'View Entries', permissionId: 'ledger_management', accessLevel: 'view' },
          { to: '/dashboard/ledger/profit-and-loss', label: 'Profit & Loss', permissionId: 'reports', accessLevel: 'view' },
        ]
      },
      { to: '/dashboard/session-logs', label: 'Session Logs', icon: HistoryIcon, permissionId: 'view_session_logs' },
      // Settings section with child routes
      {
        label: 'Settings',
        icon: SettingsIcon,
        children: [
          { to: '/dashboard/settings', label: 'General Settings', permissionId: 'settings' },
          { to: '/dashboard/tax/settings', label: 'Tax Settings', permissionId: 'tax_registrations' },
        ]
      },
      
      // Pooja section with parent and child routes
      {
        label: 'Pooja',
        icon: CalendarIcon,
        children: [
          { to: '/dashboard/pooja/list', label: 'Pooja List', permissionId: 'pooja_registrations' },
          { to: '/dashboard/pooja/entry', label: 'Pooja Entry', permissionId: 'pooja_registrations' },
          { to: '/dashboard/pooja/approval', label: 'Pooja Approval', permissionId: 'pooja_approval' },
        ]
      },
      {
        label: 'Hall Booking',
        icon: CalendarIcon,
        children: [
          { to: '/dashboard/hall/list', label: 'Hall Bookings', permissionId: 'hall_booking', accessLevel: 'view' },
          { to: '/dashboard/hall/entry', label: 'New Booking', permissionId: 'hall_booking', accessLevel: 'edit' },
          { to: '/dashboard/hall/approvals', label: 'Hall Approvals', permissionId: 'hall_approval', accessLevel: 'view' },
        ]
      },
      
      // Donation section with parent and child routes
      {
        label: 'Donations',
        icon: HeartIcon,
        children: [
          { to: '/dashboard/donation-product/list', label: 'Donations - List', permissionId: 'view_donations' },
          { to: '/dashboard/donation-product/entry', label: 'Donations - Entry', permissionId: 'edit_donations' },
          { to: '/dashboard/donations/approval', label: 'Donations Approval', permissionId: 'donation_approval', accessLevel: 'view' },
        ]
      },
      
      // Events section with parent and child routes
      {
        label: 'Events',
        icon: CalendarIcon,
        children: [
          { to: '/dashboard/events', label: 'Event List', permissionId: 'view_events' },
          { to: '/dashboard/events/new', label: 'New Event', permissionId: 'edit_events' },
          { to: '/dashboard/calendar/new-moon-days', label: 'New Moon Days', permissionId: 'view_events' },
        ]
      },
      
      // Annadhanam section with parent and child routes
      {
        label: 'Annadhanam',
        icon: HeartIcon,
        children: [
          { to: '/dashboard/annadhanam/list', label: 'Annadhanam List', permissionId: 'view_annadhanam' },
          { to: '/dashboard/annadhanam/entry', label: 'Annadhanam Entry', permissionId: 'edit_annadhanam' },
          { to: '/dashboard/annadhanam/approval', label: 'Annadhanam Approval', permissionId: 'annadhanam_approval' },
        ]
      },

      // Receipts section with parent and child routes
      {
        label: 'Receipts',
        icon: LandmarkIcon,
        children: [
          { to: '/dashboard/receipt/list', label: 'Receipt List', permissionId: 'receipts', accessLevel: 'view' },
          { to: '/dashboard/receipt/entry', label: 'Receipt Entry', permissionId: 'receipts', accessLevel: 'edit' },
        ]
      },
      
      // Tax section with parent and child routes
      {
        label: 'Tax',
        icon: LandmarkIcon,
        permissionId: 'tax_registrations',
        children: [
          { to: '/dashboard/registrations/text-entry', label: 'User Register', permissionId: 'user_registrations' },
          { to: '/dashboard/registrations/list', label: 'User  List', permissionId: 'user_registrations' },
          { to: '/dashboard/tax/entry', label: 'Tax Entry', permissionId: 'tax_registrations' },
          { to: '/dashboard/tax/list', label: 'Tax List', permissionId: 'tax_registrations' },
        ]
      },
      
      // Marriage Hall section with parent and child routes
      {
        label: 'Marriage Hall',
        icon: HomeIcon,
        children: [
          { to: '/dashboard/hall/entry', label: 'Hall Entry', permissionId: 'edit_hall' },
          { to: '/dashboard/hall/list', label: 'Hall List', permissionId: 'view_hall' },
        ]
      },
      
      // Properties section with parent and child routes
      {
        label: 'Properties',
        icon: HomeIcon,
        children: [
          { to: '/dashboard/properties', label: 'Properties List', permissionId: 'view_properties' },
          { to: '/dashboard/properties/new', label: 'New Property', permissionId: 'edit_properties' },
        ]
      },
    ],
    []
  );

  const allowedSidebarItems = useMemo(() => {
    if (isSuperAdmin) return sidebarItems;
    return sidebarItems.filter(item => 
      userPermissions?.some(p => p.permission_id === item.permissionId && p.access_level === 'full')
    );
  }, [userPermissions, isSuperAdmin, sidebarItems]);

  const Sidebar = ({ isMobile = false }) => {
    const [expandedItems, setExpandedItems] = useState<string[]>([]);

    const toggleItemExpansion = (label: string) => {
      setExpandedItems(prev => 
        prev.includes(label) 
          ? prev.filter(item => item !== label)
          : [...prev, label]
      );
    };

    return (
      <aside
        className={`
          ${isMobile ? 'fixed' : 'hidden md:flex'} 
          inset-y-0 left-0 z-40 flex-col bg-slate-900 text-white transition-all duration-300
          ${isSidebarCollapsed ? 'w-20' : 'w-64'}
          ${isMobile ? (isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full') : ''}
        `}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
          {!isSidebarCollapsed && <span className="text-xl font-bold">Temple</span>}
          <button onClick={() => setSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:block p-2 rounded-full hover:bg-slate-800">
            {isSidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-slate-900 hover:scrollbar-thumb-orange-400 transition-colors duration-200 pr-2">
          {allowedSidebarItems.map((item) => {
            // If item has children, render expandable menu
            if (item.children) {
              const isExpanded = expandedItems.includes(item.label);
              return (
                <div key={item.label} className="mb-2">
                  <div 
                    onClick={() => toggleItemExpansion(item.label)}
                    className={`
                      flex items-center p-2 rounded-lg cursor-pointer transition-colors
                      ${isSidebarCollapsed ? 'justify-center' : ''} 
                      hover:bg-slate-800
                    `}
                  >
                    <item.icon className="h-6 w-6" />
                    {!isSidebarCollapsed && (
                      <div className="flex-1 flex justify-between items-center ml-4">
                        <span>{item.label}</span>
                        {isExpanded ? '▼' : '▶'}
                      </div>
                    )}
                  </div>
                  {!isSidebarCollapsed && isExpanded && (
                    <div className="pl-4 mt-2 space-y-1">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          end
                          className={({ isActive }) =>
                            `block p-2 rounded-lg transition-colors 
                            ${isActive ? 'bg-orange-600' : 'hover:bg-slate-800'}`
                          }
                          onClick={() => isMobile && setMobileMenuOpen(false)}
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            
            // If item is a regular link, render as before
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  `flex items-center p-2 rounded-lg transition-colors 
                  ${isSidebarCollapsed ? 'justify-center' : ''} 
                  ${isActive ? 'bg-orange-600' : 'hover:bg-slate-800'}`
                }
                onClick={() => isMobile && setMobileMenuOpen(false)}
              >
                <item.icon className="h-6 w-6" />
                {!isSidebarCollapsed && <span className="ml-4">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            {!isSidebarCollapsed && (
              <div className="ml-3">
                <p className="font-semibold">{user?.name}</p>
                <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    );
  };

  return (
    <div className="relative min-h-screen md:flex">
      {/* Mobile menu button */}
      <div className="bg-gray-800 text-gray-100 flex justify-between md:hidden">
        <button onClick={() => setMobileMenuOpen(true)} className="p-4">
          <MenuIcon />
        </button>
      </div>

      {/* Sidebar */}
      <Sidebar />
      {isMobileMenuOpen && <Sidebar isMobile />}

      {/* Main content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-1' : 'md:ml-1'}`}>
        <header className="flex items-center justify-end h-16 bg-white border-b border-gray-200 px-4">
          <Header />
        </header>
        <main className="flex-1 p-6 overflow-y-auto bg-gray-100 scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-100 hover:scrollbar-thumb-orange-400 transition-colors duration-200 pr-4">
          <Outlet />
        </main>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
