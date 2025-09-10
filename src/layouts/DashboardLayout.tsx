import React, { useMemo, useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { user, userPermissions, isSuperAdmin } = useAuth();
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Handle click outside to close mobile menu
  const mainContentRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Desktop-only auto behavior
      if (window.innerWidth < 768) return;

      // Tailwind widths: w-64 = 16rem (~256px), w-20 = 5rem (~80px)
      const expandedWidth = 256;
      const collapsedWidth = 80;
      const buffer = 40; // hysteresis to avoid flicker

      // Do not auto-collapse while the user is interacting with the sidebar itself
      if (!isSidebarCollapsed && isHoveringSidebar) return;

      // Auto-expand when near the left edge (within collapsed width + small buffer)
      if (isSidebarCollapsed && e.clientX <= collapsedWidth + buffer / 2) {
        setSidebarCollapsed(false);
        return;
      }

      // Auto-collapse when cursor moves sufficiently to the right of the expanded sidebar
      if (!isSidebarCollapsed && e.clientX > expandedWidth + buffer) {
        setSidebarCollapsed(true);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (window.innerWidth >= 768 || !isMobileMenuOpen) return;

      const target = e.target as HTMLElement;
      if (!target.closest('aside') && !target.closest('.mobile-menu-button')) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerdown', handleClickOutside);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isSidebarCollapsed, isMobileMenuOpen, isHoveringSidebar]);

  

  const sidebarItems = useMemo(
    () => [
      { to: '/dashboard', label: 'Overview', icon: HomeIcon },
      { to: '/dashboard/members', label: 'Members', icon: UsersIcon, permissionId: 'member_entry' },
      {
        label: 'Reports',
        icon: BarChartIcon,
        children: [
          { to: '/dashboard/reports/daily', label: 'Daily Report', permissionId: 'reports' },
          { to: '/dashboard/reports/monthly', label: 'Monthly Report', permissionId: 'reports' },
          { to: '/dashboard/reports/journal-log', label: 'Journal Log', permissionId: 'reports' },
        ]
      },
      { to: '/dashboard/balance-sheet', label: 'Balance Sheet', icon: LandmarkIcon, permissionId: 'balance_sheet' },
      { to: '/dashboard/master-data', label: 'Master Data', icon: LandmarkIcon, permissionId: 'master_data' },
      {
        label: 'Ledger',
        icon: CreditCardIcon,
        children: [
          { to: '/dashboard/ledger/entry', label: 'New Entry', permissionId: 'ledger_management', accessLevel: 'edit' },
          { to: '/dashboard/ledger/list', label: 'View Entries', permissionId: 'ledger_management', accessLevel: 'view' },
          { to: '/dashboard/ledger/profit-and-loss', label: 'Profit & Loss', permissionId: 'reports', accessLevel: 'view' },
          { to: '/dashboard/ledger/cashflow-by-category', label: 'Cashflow by Category', permissionId: 'reports', accessLevel: 'view' },
          { to: '/dashboard/ledger/category-statement', label: 'Category Statement', permissionId: 'reports', accessLevel: 'view' },
        ]
      },
      { to: '/dashboard/session-logs', label: 'Session Logs', icon: HistoryIcon, permissionId: 'view_session_logs' },
      {
        label: 'Settings',
        icon: SettingsIcon,
        children: [
          { to: '/dashboard/settings', label: 'General Settings', permissionId: 'settings' },
          { to: '/dashboard/tax/settings', label: 'Tax Settings', permissionId: 'tax_registrations' },
        ]
      },
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
      {
        label: 'Donations',
        icon: HeartIcon,
        children: [
          { to: '/dashboard/donation-product/list', label: 'Donations - List', permissionId: 'view_donations' },
          { to: '/dashboard/donation-product/entry', label: 'Donations - Entry', permissionId: 'edit_donations' },
          { to: '/dashboard/donations/money-list', label: 'Money Donation List', permissionId: 'view_donations' },
          { to: '/dashboard/donations/money-entry', label: 'Money Donation Entry', permissionId: 'edit_donations' },
          { to: '/dashboard/donations/approval', label: 'Donations Approval', permissionId: 'donation_approval', accessLevel: 'view' },
        ]
      },
      {
        label: 'Events',
        icon: CalendarIcon,
        children: [
          { to: '/dashboard/events', label: 'Event List', permissionId: 'view_events' },
          { to: '/dashboard/events/new', label: 'New Event', permissionId: 'edit_events' },
          { to: '/dashboard/calendar/new-moon-days', label: 'New Moon Days', permissionId: 'view_events' },
        ]
      },
      {
        label: 'Annadhanam',
        icon: HeartIcon,
        children: [
          { to: '/dashboard/annadhanam/list', label: 'Annadhanam List', permissionId: 'view_annadhanam' },
          { to: '/dashboard/annadhanam/entry', label: 'Annadhanam Entry', permissionId: 'edit_annadhanam' },
          { to: '/dashboard/annadhanam/approval', label: 'Annadhanam Approval', permissionId: 'annadhanam_approval' },
        ]
      },
      {
        label: 'Receipts',
        icon: LandmarkIcon,
        children: [
          { to: '/dashboard/receipt/list', label: 'Receipt List', permissionId: 'receipts', accessLevel: 'view' },
          { to: '/dashboard/receipt/entry', label: 'Receipt Entry', permissionId: 'receipts', accessLevel: 'edit' },
        ]
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
        ]
      },
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

  // Command palette helpers (defined after allowedSidebarItems)
  const flatRoutes = useMemo(() => {
    const out: Array<{ label: string; to: string; section?: string }> = [];
    for (const item of allowedSidebarItems) {
      if ((item as any).to) {
        out.push({ label: (item as any).label, to: (item as any).to });
      }
      if ((item as any).children) {
        for (const child of (item as any).children) {
          out.push({ label: child.label, to: child.to, section: (item as any).label });
        }
      }
    }
    return out;
  }, [allowedSidebarItems]);

  const filteredResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return flatRoutes;
    return flatRoutes.filter(r =>
      r.label.toLowerCase().includes(q) || (r.section?.toLowerCase() || '').includes(q)
    );
  }, [flatRoutes, searchQuery]);

  // Open palette on Ctrl+F, navigate with Enter, arrows to move
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Open with Ctrl+F
      if (e.key.toLowerCase() === 'f' && e.ctrlKey) {
        e.preventDefault();
        setIsSearchOpen(true);
        setSearchQuery('');
        setSelectedIndex(0);
        return;
      }
      if (!isSearchOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsSearchOpen(false);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, Math.max(0, filteredResults.length - 1)));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const sel = filteredResults[selectedIndex];
        if (sel) {
          setIsSearchOpen(false);
          setSearchQuery('');
          navigate(sel.to);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearchOpen, selectedIndex, navigate, filteredResults]);

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
          inset-y-0 left-0 z-40 flex-col bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 
          text-white transition-all duration-300 shadow-2xl border-r border-blue-800/20
          ${isSidebarCollapsed ? 'w-20' : 'w-72'}
          ${isMobile ? (isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full') : ''}
        `}
        onMouseEnter={() => setIsHoveringSidebar(true)}
        onMouseLeave={() => setIsHoveringSidebar(false)}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-blue-800/30 bg-gradient-to-r from-blue-900/50 to-indigo-900/50">
          {!isSidebarCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg">
                <span className="text-xl font-bold text-white">T</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Temple
              </span>
            </div>
          )}
          <button 
            onClick={() => setSidebarCollapsed(!isSidebarCollapsed)} 
            className="hidden md:flex p-3 rounded-xl hover:bg-blue-800/30 transition-all duration-200 
                       backdrop-blur-sm border border-blue-700/20 hover:border-blue-600/40"
          >
            {isSidebarCollapsed ? (
              <ChevronRightIcon className="w-5 h-5 text-blue-300" />
            ) : (
              <ChevronLeftIcon className="w-5 h-5 text-blue-300" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 
                       scrollbar-track-transparent hover:scrollbar-thumb-blue-500 transition-colors duration-200">
          {allowedSidebarItems.map((item, index) => {
            if (item.children) {
              const isExpanded = expandedItems.includes(item.label);
              return (
                <div key={item.label} className="space-y-2">
                  <div 
                    onClick={() => toggleItemExpansion(item.label)}
                    className={`
                      group flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200
                      hover:bg-gradient-to-r hover:from-blue-800/40 hover:to-indigo-800/40
                      hover:shadow-lg hover:shadow-blue-900/20 backdrop-blur-sm
                      ${isSidebarCollapsed ? 'justify-center' : ''} 
                      ${isExpanded ? 'bg-gradient-to-r from-blue-800/30 to-indigo-800/30 shadow-lg shadow-blue-900/10' : ''}
                    `}
                  >
                    <div className="relative">
                      <item.icon className="h-6 w-6 text-blue-300 group-hover:text-blue-200 transition-colors" />
                      {isExpanded && !isSidebarCollapsed && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full"></div>
                      )}
                    </div>
                    {!isSidebarCollapsed && (
                      <div className="flex-1 flex justify-between items-center ml-4">
                        <span className="font-medium text-blue-100 group-hover:text-white transition-colors">
                          {item.label}
                        </span>
                        <div className={`transform transition-transform duration-200 text-blue-400 ${isExpanded ? 'rotate-90' : ''}`}>
                          <ChevronRightIcon className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {!isSidebarCollapsed && isExpanded && (
                    <div className="pl-6 space-y-1 animate-in slide-in-from-top-2 duration-200">
                      {item.children.map((child, childIndex) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          end
                          className={({ isActive }) =>
                            `group flex items-center p-3 rounded-lg transition-all duration-200 relative
                            ${isActive 
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/30' 
                              : 'text-blue-200 hover:bg-blue-800/30 hover:text-white'
                            }`
                          }
                          onClick={() => isMobile && setMobileMenuOpen(false)}
                        >
                          <div className="w-2 h-2 rounded-full bg-blue-400 mr-3 opacity-60 group-hover:opacity-100 transition-opacity"></div>
                          <span className="font-medium">{child.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  `group flex items-center p-3 rounded-xl transition-all duration-200 backdrop-blur-sm
                  ${isSidebarCollapsed ? 'justify-center' : ''} 
                  ${isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/30' 
                    : 'text-blue-200 hover:bg-gradient-to-r hover:from-blue-800/40 hover:to-indigo-800/40 hover:text-white hover:shadow-lg hover:shadow-blue-900/20'
                  }`
                }
                onClick={() => isMobile && setMobileMenuOpen(false)}
              >
                <item.icon className="h-6 w-6 transition-colors" />
                {!isSidebarCollapsed && <span className="ml-4 font-medium">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-blue-800/30 bg-gradient-to-r from-blue-900/30 to-indigo-900/30">
          <div className={`flex items-center p-3 rounded-xl bg-gradient-to-r from-blue-800/30 to-indigo-800/30 
                          backdrop-blur-sm border border-blue-700/20 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 
                            flex items-center justify-center font-bold text-lg shadow-lg">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900"></div>
            </div>
            {!isSidebarCollapsed && (
              <div className="ml-4 flex-1">
                <p className="font-semibold text-white text-lg">{user?.name}</p>
                <p className="text-sm text-blue-300 capitalize bg-blue-900/40 px-2 py-1 rounded-md inline-block">
                  {user?.role}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    );
  };

  return (
    <div className="relative min-h-screen md:flex bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Mobile menu button */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex justify-between md:hidden shadow-lg">
        <button 
          onClick={() => setMobileMenuOpen(true)} 
          className="mobile-menu-button p-4 hover:bg-blue-800/50 transition-colors duration-200"
        >
          <MenuIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar */}
      <Sidebar />
      {isMobileMenuOpen && <Sidebar isMobile />}

      {/* Main content */}
      <div ref={mainContentRef} className={`flex-1 flex flex-col transition-all duration-300`}>
        <header className="flex items-center justify-end h-20 bg-white/80 backdrop-blur-lg border-b 
                         border-blue-200/50 px-6 shadow-sm">
          <Header />
        </header>
        
        <main className="flex-1 p-8 overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50 
                       scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-transparent 
                       hover:scrollbar-thumb-blue-500 transition-colors duration-200">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-all duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Command palette search (Ctrl+F) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40">
          <div className="w-full max-w-xl rounded-xl shadow-2xl bg-white/95 backdrop-blur-md border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-200">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSelectedIndex(0); }}
                placeholder="Search pages... (Esc to close)"
                className="w-full outline-none text-slate-800 placeholder-slate-400"
              />
            </div>
            <ul className="max-h-80 overflow-y-auto py-2">
              {filteredResults.length === 0 && (
                <li className="px-4 py-2 text-slate-500">No results</li>
              )}
              {filteredResults.map((r, idx) => (
                <li
                  key={`${r.section || 'root'}-${r.to}`}
                  className={`px-4 py-2 cursor-pointer ${idx === selectedIndex ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'}`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => { setIsSearchOpen(false); setSearchQuery(''); navigate(r.to); }}
                >
                  <div className="text-sm font-medium">{r.label}</div>
                  {r.section && <div className="text-xs opacity-70">{r.section}</div>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
