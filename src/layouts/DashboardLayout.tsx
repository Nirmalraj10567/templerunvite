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
  Landmark,
  X,
  Users,
} from 'lucide-react';

export default function DashboardLayout() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const expanded = !collapsed || hovered;

  // Close mobile menu on resize > md breakpoint
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const items = useMemo(
    () => [
      { to: '/dashboard', label: 'Overview', icon: Home, roles: ['admin', 'finance', 'staff'] },
      { to: '/dashboard/members', label: 'Members', icon: Users, roles: ['admin', 'superadmin'] },
      { to: '/dashboard/transactions', label: 'Transactions', icon: CreditCard, roles: ['admin', 'finance'] },
      { to: '/dashboard/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'finance'] },
      { to: '/dashboard/master-data', label: 'Master Data', icon: Landmark, roles: ['admin', 'superadmin'] },
      { to: '/dashboard/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
    ],
    []
  );

  const allowedItems = items.filter(i => {
    console.log('Checking item:', i.label, 'for user role:', user?.role, 'required roles:', i.roles);
    if (process.env.NODE_ENV === 'development') return true;
    return user ? i.roles.includes(user.role) : false;
  });

  console.log('User object:', user);
  console.log('Allowed sidebar items:', allowedItems.map(i => i.label));

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 text-black flex flex-col">
      {/* Header with brand icon on left */}
      <Header>
        <div className="flex items-center gap-3 pl-4 md:pl-8">
          <div
            className="rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg h-12 w-12"
            style={{ zIndex: 40 }}
          >
            <span className="text-white text-2xl select-none">🕉️</span>
          </div>
          <div>
            <h1 className="text-indigo-900 font-bold uppercase tracking-wide text-lg select-none">
              NALLAKUMARASWAMY
            </h1>
            <p className="text-xs text-gray-500 select-none">Temple Management System</p>
          </div>
        </div>
      </Header>

      {/* Mobile menu toggle bar */}
      <div className="md:hidden flex justify-between items-center bg-slate-900 p-3 px-6">
        <button
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 text-white"
        >
          {mobileMenuOpen ? <X size={22} /> : <ChevronLeft size={22} />}
        </button>

        {/* Brand text visible on mobile toggle bar */}
        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg h-10 w-10">
            <span className="text-white text-xl select-none">🕉️</span>
          </div>
          <span className="text-white/90 font-semibold tracking-wide select-none">Temple</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-30 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-lg
            transform md:transform-none transition-transform duration-300 ease-in-out
            ${expanded ? 'md:w-72' : 'md:w-20'}
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
          `}
          onMouseEnter={() => !collapsed ? null : setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{ minHeight: 'calc(100vh - 8rem)' }}
          aria-label="Sidebar Navigation"
        >
          <div className="flex flex-col h-full relative px-4">
            {/* Sidebar brand area with floating icon */}
            <div
              className="relative flex items-center gap-3 py-4 pt-8 z-40"
              style={{ minHeight: 64 }}
            >
              {/* Floating brand icon overlapped outside sidebar */}
              <div
                className="absolute -right-10 top-1/2 -translate-y-1/2 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500
                  flex items-center justify-center h-12 w-12 shadow-lg border-4 border-white select-none"
                style={{ zIndex: 50 }}
              >
                <span className="text-white text-2xl">🕉️</span>
              </div>

              {/* Brand text shows when expanded */}
              {expanded && (
                <span className="text-white/90 font-semibold tracking-wide select-none">Temple</span>
              )}
            </div>

            {/* Navigation */}
            <nav
              id="sidebar-nav"
              className={`flex-1 pt-4 pb-6 space-y-1 overflow-y-auto ${
                !expanded ? 'md:space-y-0 md:pt-2' : ''
              }`}
            >
              {allowedItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end
                  className={({ isActive }) =>
                    `group flex items-center ${
                      !expanded ? 'justify-center' : ''
                    } gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-indigo-600/90 text-white shadow'
                        : 'text-slate-200 hover:text-white hover:bg-white/10'
                    }`
                  }
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${
                      'bg-white/10 text-white'
                    }`}
                  >
                    {Icon ? <Icon size={18} /> : <Landmark size={18} />}
                  </span>
                  {expanded && <span className="font-medium">{label}</span>}
                </NavLink>
              ))}
            </nav>

            {/* Bottom user info */}
            <div className="pb-4">
              <div
                className={`flex items-center ${
                  !expanded ? 'justify-center' : 'gap-3'
                } bg-white/10 rounded-lg p-2 text-white select-none`}
              >
                <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center font-semibold">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                {expanded && (
                  <div>
                    <p className="text-sm font-semibold leading-tight">{user?.username}</p>
                    <p className="text-xs leading-tight text-white/70 capitalize">{user?.role}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Main content */}
        <main
          className={`flex-1 min-h-[60vh] transition-all duration-300 ease-in-out overflow-auto ${
            expanded ? 'md:pl-72' : 'md:pl-20'
          } mt-16 md:mt-0`}
        >
          <div className="bg-white/80 backdrop-blur-sm border border-orange-100 rounded-2xl shadow-sm p-4 sm:p-6 m-4 md:m-6">
            <Outlet />
          </div>
          <footer className="text-xs text-gray-500 mt-4 text-center select-none">
            <span> 2025 Temple Trust Dashboard</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
