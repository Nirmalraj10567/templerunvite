import React, { useMemo, useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  CreditCard,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Menu,
  Users,
  History,
  Heart,
} from 'lucide-react';

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
      { to: '/dashboard', label: 'Overview', icon: Home },
      { to: '/dashboard/members', label: 'Members', icon: Users, permissionId: 'member_entry' },
      { to: '/dashboard/marriage/entry', label: 'Marriage Entry', icon: Heart, permissionId: 'marriage_register' },
      { to: '/dashboard/marriage/list', label: 'Marriage List', icon: Heart, permissionId: 'marriage_register' },
      { to: '/dashboard/transactions', label: 'Transactions', icon: CreditCard, permissionId: 'transactions' },
      { to: '/dashboard/reports', label: 'Reports', icon: BarChart3, permissionId: 'reports' },
      { to: '/dashboard/balance-sheet', label: 'Balance Sheet', icon: Landmark, permissionId: 'balance_sheet' },
      { to: '/dashboard/master-data', label: 'Master Data', icon: Landmark, permissionId: 'master_data' },
      { to: '/dashboard/session-logs', label: 'Session Logs', icon: History, permissionId: 'view_session_logs' },
      { to: '/dashboard/settings', label: 'Settings', icon: Settings, permissionId: 'settings' },
    ],
    []
  );

  const allowedSidebarItems = useMemo(() => {
    if (isSuperAdmin) return sidebarItems;
    return sidebarItems.filter(item => 
      userPermissions?.some(p => p.permission_id === item.permissionId && p.access_level === 'full')
    );
  }, [userPermissions, isSuperAdmin, sidebarItems]);

  const Sidebar = ({ isMobile = false }) => (
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
          {isSidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {allowedSidebarItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex items-center p-2 rounded-lg transition-colors 
              ${isSidebarCollapsed ? 'justify-center' : ''} 
              ${isActive ? 'bg-orange-600' : 'hover:bg-slate-800'}`
            }
            onClick={() => isMobile && setMobileMenuOpen(false)}
          >
            <Icon className="h-6 w-6" />
            {!isSidebarCollapsed && <span className="ml-4">{label}</span>}
          </NavLink>
        ))}
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

  return (
    <div className="relative min-h-screen md:flex">
      {/* Mobile menu button */}
      <div className="bg-gray-800 text-gray-100 flex justify-between md:hidden">
        <button onClick={() => setMobileMenuOpen(true)} className="p-4">
          <Menu />
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
        <main className="flex-1 p-6 overflow-y-auto bg-gray-100">
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
