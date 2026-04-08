import React, { useMemo, useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { getSidebarItems } from '../config/navigation';
import { useLanguage } from '../lib/language';
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
  const { user, userPermissions, isSuperAdmin, token } = useAuth();
  const { settings } = useSettings();
  const { language } = useLanguage();
  const location = useLocation();

    const lang = (String(language).toLowerCase() === 'english' ? 'tamil' : 'english') as 'tamil' | 'english';
  
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [headerVisible, setHeaderVisible] = useState(true);

  // Refs and scroll handling
  const mainContentRef = React.useRef<HTMLDivElement>(null);
  const mainScrollRef = React.useRef<HTMLDivElement>(null);
  const headerRef = React.useRef<HTMLElement>(null);

  // Handle scroll to show/hide header with advanced debouncing
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    let ticking = false;
    let isScrolling = false;
    let scrollEndTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      if (!mainScrollRef.current || ticking) return;
      
      ticking = true;
      isScrolling = true;
      
      requestAnimationFrame(() => {
        if (!mainScrollRef.current) {
          ticking = false;
          return;
        }
        
        const currentScrollY = mainScrollRef.current.scrollTop;
        const scrollingDown = currentScrollY > lastScrollY;
        const scrollDifference = Math.abs(currentScrollY - lastScrollY);
        
        // Clear any existing timeouts
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
        if (scrollEndTimeout) {
          clearTimeout(scrollEndTimeout);
        }
        
        // Only update if scrolled more than 25px to prevent jitter
        if (scrollDifference > 25) {
          const shouldShowHeader = !scrollingDown || currentScrollY < 50;
          
          // Immediate update for large scrolls, delayed for smaller ones
          if (scrollDifference > 100) {
            setHeaderVisible(shouldShowHeader);
            setLastScrollY(currentScrollY);
            ticking = false;
          } else {
            // Add a delay to prevent rapid state changes
            scrollTimeout = setTimeout(() => {
              setHeaderVisible(shouldShowHeader);
              setLastScrollY(currentScrollY);
              ticking = false;
            }, 100);
          }
        } else {
          ticking = false;
        }
        
        // Reset scrolling flag after a delay
        scrollEndTimeout = setTimeout(() => {
          isScrolling = false;
        }, 150);
      });
    };

    const scrollContainer = mainScrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      if (scrollEndTimeout) {
        clearTimeout(scrollEndTimeout);
      }
    };
  }, [lastScrollY]);

  // Sidebar items and permissions
  const sidebarItems = useMemo(() => getSidebarItems(lang), [lang]);

  const allowedSidebarItems = useMemo(() => {
    const hiddenKeys = new Set((settings?.hidden_menu_keys || []).map((s) => String(s)));

    const levelRank = (lvl?: string) => {
      if (lvl === 'full') return 3;
      if (lvl === 'edit') return 2;
      if (lvl === 'view') return 1;
      return 0;
    };

    const hasPerm = (permissionId?: string, requiredLevel?: string) => {
      if (!permissionId) return true;
      if (isSuperAdmin) return true;
      const need = levelRank(requiredLevel || 'view');
      const found = userPermissions?.find((p) => p.permission_id === permissionId);
      if (!found) return false;
      return levelRank(found.access_level) >= need;
    };

    const isHidden = (sectionLabel?: string, itemLabel?: string, to?: string) => {
      const candidates = [sectionLabel, itemLabel, to, [sectionLabel, itemLabel].filter(Boolean).join('/')].filter(Boolean) as string[];
      return candidates.some((c) => hiddenKeys.has(c));
    };

    const result: any[] = [];
    for (const item of sidebarItems) {
      // If this is a direct link item (no children)
      if ((item as any).to) {
        const direct = item as any;
        const allowed = hasPerm(direct.permissionId as any, (direct as any).accessLevel as any);
        if (!allowed) continue;
        if (isHidden(undefined, direct.label, direct.to)) continue;
        result.push(direct);
        continue;
      }

      // Group with children
      if ((item as any).children) {
        const group = { ...item } as any;
        const children = (Array.isArray(group.children) ? group.children : [])
          .filter(Boolean)
          .filter((child: any) => hasPerm(child?.permissionId, child?.accessLevel))
          .filter((child: any) => !isHidden(group.label, child?.label, child?.to));
        if (children.length === 0) {
          // Hide empty groups, or group explicitly hidden by label
          if (isHidden(group.label, undefined, undefined)) continue;
          else continue;
        }
        // If group itself hidden by label, skip the group entirely
        if (isHidden(group.label, undefined, undefined)) continue;
        group.children = children;
        result.push(group);
      }
    }
    return result;
  }, [settings?.hidden_menu_keys, isSuperAdmin, userPermissions, sidebarItems]);

  // If the current route matches any child of a sidebar group, keep the sidebar pinned open on desktop
  // Helper to normalize relative menu paths (like 'donation-product/entry') to absolute app paths
  // so that they can be compared reliably against location.pathname (e.g. '/dashboard/donation-product/entry').
  const normalizePath = (to?: string) => {
    const t = String(to || '');
    if (!t) return '';
    return t.startsWith('/') ? t : `/dashboard/${t}`;
  };
  const shouldPinOpen = useMemo(() => {
    const path = location.pathname;
    return (allowedSidebarItems as any[]).some(it => Array.isArray(it?.children) && it.children.some((c: any) => {
      const to = String(c?.to || '');
      if (!to) return false;
      const abs = normalizePath(to);
      return path === abs || (abs !== '/' && (path.startsWith(abs + '/') || path.startsWith(abs)));
    }));
  }, [location.pathname, allowedSidebarItems]);

  // Removed auto pin-open behavior so the sidebar can collapse when cursor moves out

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

      // Removed pin-open early return so the sidebar can auto-collapse on mouse move out

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
  }, [isSidebarCollapsed, isMobileMenuOpen, isHoveringSidebar, shouldPinOpen]);

  // Ensure main content scroll resets to top on route change
  useEffect(() => {
    // Scroll the scrollable main container
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
    // Also scroll window for cases where body scroll is active (mobile/safari)
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  // Translation object
  const t = {
    english: {
      searchPlaceholder: 'Search...',
      searchResults: 'Search Results',
      noResults: 'No results found',
      quickActions: 'Quick Actions',
      profile: 'Profile',
      settings: 'Settings',
      logout: 'Logout',
      close: 'Close',
      menu: 'Menu',
      toggleSidebar: 'Toggle Sidebar',
      masterAdmin: 'Master Admin',
      upgradeNow: 'Upgrade Now',
      temple: 'Temple'
    },
    tamil: {
      searchPlaceholder: 'தேடுக...',
      searchResults: 'தேடல் முடிவுகள்',
      noResults: 'முடிவுகள் இல்லை',
      quickActions: 'விரைவு செயல்கள்',
      profile: 'சுயவிவரம்',
      settings: 'அமைப்புகள்',
      logout: 'வெளியேறு',
      close: 'மூடு',
      menu: 'மெனு',
      toggleSidebar: 'பக்கப்பட்டையை மாற்று',
      masterAdmin: 'முதன்மை நிர்வாகி',
      upgradeNow: 'மேம்படுத்தவும்',
      temple: 'கோவில்'
    }
  } as const;

  // Apply default collapsed from user settings when settings change
  useEffect(() => {
    if (typeof settings?.sidebar_collapsed_default === 'boolean') {
      setSidebarCollapsed(!!settings.sidebar_collapsed_default);
    }
  }, [settings?.sidebar_collapsed_default]);

  // If the current route matches any child of a sidebar group, keep the sidebar pinned open on desktop

  // Determine current route's permission and whether user is view-only
  const { isViewOnlyForRoute, currentPermissionId, currentRequiredLevel, userLevelForPermission } = useMemo(() => {
    const levelRank = (lvl?: string) => {
      if (lvl === 'full') return 3;
      if (lvl === 'edit') return 2;
      if (lvl === 'view') return 1;
      return 0;
    };

    const path = location.pathname;

    // Flatten all items (including children) from navigation with permission metadata
    const flat: Array<{ to: string; permissionId?: string; accessLevel?: 'view'|'edit'|'full' }> = [];
    for (const item of sidebarItems as any[]) {
      if (item.to) flat.push({ to: normalizePath(item.to), permissionId: item.permissionId, accessLevel: item.accessLevel });
      if (Array.isArray(item.children)) {
        for (const c of item.children.filter(Boolean)) {
          if (!c) continue;
          flat.push({ to: normalizePath((c as any).to), permissionId: (c as any).permissionId, accessLevel: (c as any).accessLevel });
        }
      }
    }

    // Find the best match: exact first, then startsWith
    let match = flat.find(f => f.to === path);
    if (!match) {
      // choose the longest prefix match to avoid false positives
      const prefixMatches = flat.filter(f => path.startsWith(f.to + '/') || (f.to !== '/' && path.startsWith(f.to)));
      if (prefixMatches.length > 0) {
        match = prefixMatches.sort((a, b) => b.to.length - a.to.length)[0];
      }
    }

    const permissionId = match?.permissionId;
    const requiredLevel = match?.accessLevel || 'view';

    // Resolve user's level for this permission
    const userPerm = userPermissions?.find(p => p.permission_id === permissionId);
    const userLevel = isSuperAdmin ? 'full' : (userPerm?.access_level || undefined);

    // If no specific permission is defined for the route, not view-only
    if (!permissionId) {
      return { isViewOnlyForRoute: false, currentPermissionId: undefined, currentRequiredLevel: undefined, userLevelForPermission: undefined };
    }

    const isViewOnly = levelRank(userLevel) < levelRank('edit');

    return { isViewOnlyForRoute: isViewOnly, currentPermissionId: permissionId, currentRequiredLevel: requiredLevel, userLevelForPermission: userLevel };
  }, [location.pathname, sidebarItems, userPermissions, isSuperAdmin]);

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

  // Compute current page title from route
  const pageTitle = useMemo(() => {
    const path = location.pathname;
    console.log('Current path:', path);
    console.log('Flat routes:', flatRoutes);
    
    // Find exact match first
    const exactMatch = flatRoutes.find(r => {
      const routePath = normalizePath(r.to);
      console.log('Comparing:', routePath, 'with', path);
      return routePath === path || path.endsWith('/' + r.to);
    });
    
    if (exactMatch) {
      console.log('Found exact match:', exactMatch.label);
      return exactMatch.label;
    }
    
    // Find prefix match (for routes with params like /edit/:id)
    const prefixMatch = flatRoutes.find(r => {
      const routePath = normalizePath(r.to);
      return path.startsWith(routePath + '/') || path.startsWith('/dashboard/' + r.to + '/');
    });
    
    const title = prefixMatch?.label || '';
    console.log('Final page title:', title);
    return title;
  }, [location.pathname, flatRoutes]);

  // Global keyboard shortcuts from user settings
  const routeByShortcut = useMemo(() => {
    const mapping: Record<string, string> = {};
    const shortcuts = (settings as any)?.shortcuts || {};
    // Only include allowed routes
    const allowed = new Set(flatRoutes.map(r => r.to));
    for (const [route, combo] of Object.entries(shortcuts)) {
      if (!route || !combo) continue;
      const normalizedRoute = route.startsWith('/') ? route : `/dashboard/${route}`;
      if (allowed.has(normalizedRoute) || allowed.has(route)) {
        mapping[String(combo).toLowerCase()] = allowed.has(normalizedRoute) ? normalizedRoute : route;
      }
    }
    return mapping;
  }, [settings, flatRoutes]);

  // Year-end window: entire March (month index 2) and April 1st
  const isYearEndWindow = useMemo(() => {
    const now = new Date();
    const m = now.getMonth(); // 0=Jan
    const d = now.getDate();
    return m === 2 || (m === 3 && d === 1);
  }, []);

  // Backend-controlled year-end flags
  const [yearEndEnforced, setYearEndEnforced] = useState(false);
  const [yearEndLocked, setYearEndLocked] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('https://tmsapi.xesstechlink.com/api/system/year-end-status', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (!mounted) return;
        setYearEndEnforced(!!d?.data?.enforced);
        setYearEndLocked(!!d?.data?.locked);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [token]);

  // Permission check for viewing the Upgrade page
  const canViewUpgrade = useMemo(() => {
    if (isSuperAdmin) return true;
    const found = userPermissions?.find((p) => p.permission_id === 'dashboard');
    if (!found) return false;
    const rank = (lvl?: string) => (lvl === 'full' ? 3 : lvl === 'edit' ? 2 : lvl === 'view' ? 1 : 0);
    return rank(found.access_level) >= rank('view');
  }, [isSuperAdmin, userPermissions]);

  // Open palette on Ctrl+F, navigate with Enter, arrows to move
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // User-defined shortcuts (ignore when palette open to avoid conflicts)
      if (!isSearchOpen) {
        const key = String((e as any)?.key || '').toLowerCase();
        const parts: string[] = [];
        if (e.ctrlKey) parts.push('ctrl');
        if (e.shiftKey) parts.push('shift');
        if (e.altKey) parts.push('alt');
        if ((e as any).metaKey) parts.push('meta');
        const isModifierOnly = key === 'control' || key === 'shift' || key === 'alt' || key === 'meta';
        if (!isModifierOnly) parts.push(key);
        const combo = parts.join('+');
        const dest = routeByShortcut[combo];
        if (dest) {
          e.preventDefault();
          navigate(dest);
          return;
        }
      }
      // Open with Ctrl/Cmd + F
      const key = String((e as any)?.key || '').toLowerCase();
      if (key === 'f' && (e.ctrlKey || (e as any)?.metaKey)) {
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
  }, [isSearchOpen, selectedIndex, navigate, filteredResults, routeByShortcut]);

  const Sidebar = ({ isMobile = false }) => {
    // Compute which groups should be expanded based on current route
    const getActiveGroupLabels = () => {
      const path = location.pathname;
      const out: string[] = [];
      for (const it of allowedSidebarItems as any[]) {
        if (it.children && Array.isArray(it.children)) {
          const matched = it.children.some((c: any) => {
            const to = String(c?.to || '');
            if (!to) return false;
            const abs = normalizePath(to);
            return path === abs || (abs !== '/' && (path.startsWith(abs + '/') || path.startsWith(abs)));
          });
          if (matched) out.push(it.label);
        }
      }
      return out;
    };

    // Start with any groups that match the current route
    const [expandedItems, setExpandedItems] = useState<string[]>(() => getActiveGroupLabels());

    // When the route or sidebar items change, ensure matching groups are opened (merge with existing expanded)
    useEffect(() => {
      const active = getActiveGroupLabels();
      if (active.length === 0) return;
      setExpandedItems(prev => Array.from(new Set([...prev, ...active])));
    }, [location.pathname, allowedSidebarItems, isSidebarCollapsed]);

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
          ${isSidebarCollapsed ? 'w-20' : 'w-72'} h-screen flex-shrink-0
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
        <nav className="sidebar-nav flex-1 p-4 space-y-3 overflow-y-auto 
          transition-colors duration-200">
          {allowedSidebarItems.map((item, index) => {
            if (item.children) {
              const isExpanded = expandedItems.includes(item.label);
              return (
                <div 
                  key={item.label} 
                  className="space-y-2"
                >
                  <div 
                    onClick={() => toggleItemExpansion(item.label)}
                    className={`
                      group flex items-center p-3 rounded-xl cursor-pointer transition-all duration-500
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
                        <div className={`transform transition-transform duration-500 text-blue-400 ${isExpanded ? 'rotate-90' : ''}`}>
                          <ChevronRightIcon className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {!isSidebarCollapsed && isExpanded && (
                    <div className="pl-6 space-y-1 animate-in slide-in-from-top-2 duration-500">
                      {item.children.map((child, childIndex) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          end
                          className={({ isActive }) =>
                            `group flex items-center p-3 rounded-lg transition-all duration-500 relative
                            ${isActive 
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/30' 
                              : 'text-blue-200 hover:bg-blue-800/30 hover:text-white'
                            }`
                          }
                          onClick={() => isMobile && setMobileMenuOpen(false)}
                        >
                          <div className="w-2 h-2 rounded-full bg-blue-400 mr-3 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
                          <span className="font-medium">{child.label}</span>
                          <span className="sr-only">{t[lang].close}</span>
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

          {/* Conditional year-end Upgrade link (appended without reordering existing items) */}
          {(isYearEndWindow || yearEndEnforced) && canViewUpgrade && (
            <NavLink
              key="/dashboard/upgrade-now"
              to="/dashboard/upgrade-now"
              end
              className={({ isActive }) =>
                `group flex items-center p-3 rounded-xl transition-all duration-200 backdrop-blur-sm
                ${isSidebarCollapsed ? 'justify-center' : ''} 
                ${isActive 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-900/30' 
                  : 'text-amber-200 hover:bg-gradient-to-r hover:from-amber-800/40 hover:to-orange-800/40 hover:text-white hover:shadow-lg hover:shadow-orange-900/20'
                }`
              }
              onClick={() => isMobileMenuOpen && setMobileMenuOpen(false)}
            >
              <LandmarkIcon className="h-6 w-6" />
              {!isSidebarCollapsed && <span className="ml-4 font-medium">{t[lang].upgradeNow}</span>}
            </NavLink>
          )}

          {/* Superadmin-only Master Admin link 
          {isSuperAdmin && (
            <NavLink
              key="/dashboard/master-admin"
              to="/dashboard/master-admin"
              end
              className={({ isActive }) =>
                `group flex items-center p-3 rounded-xl transition-all duration-200 backdrop-blur-sm
                ${isSidebarCollapsed ? 'justify-center' : ''} 
                ${isActive 
                  ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-900/30' 
                  : 'text-emerald-200 hover:bg-gradient-to-r hover:from-emerald-800/40 hover:to-green-800/40 hover:text-white hover:shadow-lg hover:shadow-emerald-900/20'
                }`
              }
              onClick={() => isMobileMenuOpen && setMobileMenuOpen(false)}
            >
              <SettingsIcon className="h-6 w-6" />
              {!isSidebarCollapsed && <span className="ml-4 font-medium">{t[lang].masterAdmin}</span>}
            </NavLink>
          )}*/}
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
    <>
      <style>{`
        .sidebar-nav {
          scroll-behavior: smooth;
          scrollbar-width: thin;
          scrollbar-gutter: stable;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }
        
        .sidebar-nav::-webkit-scrollbar {
          width: 6px;
        }
        
        .sidebar-nav::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .sidebar-nav::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.6);
          border-radius: 3px;
          transition: background 0.2s ease;
        }
        
        .sidebar-nav::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.8);
        }
        
        /* Reduce scroll momentum */
        .sidebar-nav {
          scroll-margin: 0;
          scroll-padding: 0;
        }
        
        /* Prevent bounce and improve scroll performance */
        html, body {
          overscroll-behavior: none;
          -webkit-overflow-scrolling: touch;
        }
        
        /* Smooth transitions for header */
        .header-transition {
          transition: height 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                     opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                     transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: height, opacity, transform;
        }
        
        /* Prevent layout shift during transitions */
        .main-content {
          transition: padding-top 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: padding-top;
        }
      `}</style>
      <div className="relative h-screen w-full flex overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
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
      <div ref={mainContentRef} className="flex-1 flex flex-col overflow-hidden">
        <header 
          ref={headerRef}
          className={`flex items-center justify-between bg-white/80 backdrop-blur-lg border-b 
                     border-blue-200/50 px-6 shadow-sm
                     ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'}`}
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            height: headerVisible ? '5rem' : '0',
            overflow: headerVisible ? 'visible' : 'hidden',
            transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'height, opacity, transform',
          }}>
          {/* Left side: optional view-only badge */}
          <div className="flex items-center gap-3">
            {isViewOnlyForRoute && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                View-only
              </span>
            )}
          </div>
          <Header pageTitle={pageTitle} />
        </header>
        
        <main 
          ref={mainScrollRef} 
          className={`flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50 
                     scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-transparent 
                     hover:scrollbar-thumb-blue-500
                     ${headerVisible ? 'pt-2' : 'pt-0'}`} 
          data-view-only={isViewOnlyForRoute ? 'true' : 'false'}
          style={{ 
            WebkitOverflowScrolling: 'touch',
            transition: 'padding-top 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'padding-top'
          }}>
          <div className={`${headerVisible ? 'pb-8' : 'py-8'} px-8`} style={{
            transition: 'padding 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'padding'
          }}>
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
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
                placeholder={t[lang].searchPlaceholder}
                className="w-full outline-none text-slate-800 placeholder-slate-400"
              />
            </div>
            <ul className="max-h-80 overflow-y-auto py-2">
              {filteredResults.length === 0 && (
                <h3 className="px-4 py-2 text-sm font-medium text-gray-500">{t[lang].searchResults}</h3>
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
    </>
  );
}