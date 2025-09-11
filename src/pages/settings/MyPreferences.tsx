import React, { useEffect, useMemo, useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { UsersIcon, BarChartIcon, CreditCardIcon, CalendarIcon } from '../../components/icons';
import { sidebarItems, NavItem } from '../../config/navigation';

const MyPreferences: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const { user, userPermissions, isSuperAdmin } = useAuth();

  const [landingRoute, setLandingRoute] = useState(settings.landing_route || '/dashboard');
  const [collapsed, setCollapsed] = useState(!!settings.sidebar_collapsed_default);
  const [hiddenMenuRaw, setHiddenMenuRaw] = useState((settings.hidden_menu_keys || []).join(', '));
  const [selectedActions, setSelectedActions] = useState<string[]>(Array.isArray(settings.quick_actions) ? settings.quick_actions : []);

  useEffect(() => {
    setLandingRoute(settings.landing_route || '/dashboard');
    setCollapsed(!!settings.sidebar_collapsed_default);
    setHiddenMenuRaw((settings.hidden_menu_keys || []).join(', '));
    setSelectedActions(Array.isArray(settings.quick_actions) ? settings.quick_actions : []);
  }, [settings]);

  const hiddenMenuKeys = useMemo(() => {
    return hiddenMenuRaw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [hiddenMenuRaw]);

  const onSave = async () => {
    await updateSettings({
      landing_route: landingRoute || '/dashboard',
      sidebar_collapsed_default: collapsed,
      hidden_menu_keys: hiddenMenuKeys,
      quick_actions: selectedActions,
    });
  };

  const levelRank = (lvl?: string) => (lvl === 'full' ? 3 : lvl === 'edit' ? 2 : lvl === 'view' ? 1 : 0);
  const hasPerm = (permissionId?: string, requiredLevel?: string) => {
    if (!permissionId) return true;
    if (isSuperAdmin) return true;
    const need = levelRank(requiredLevel || 'view');
    const found = userPermissions?.find((p) => p.permission_id === permissionId);
    if (!found) return false;
    return levelRank(found.access_level) >= need;
  };

  type Leaf = { to: string; label: string; section?: string; Icon: React.ComponentType<React.SVGProps<SVGSVGElement>> };
  const availableLeaves: Leaf[] = React.useMemo(() => {
    const out: Leaf[] = [];
    for (const item of sidebarItems) {
      const groupIcon = (item as any).icon || UsersIcon;
      if ((item as any).to) {
        const it = item as any;
        if (hasPerm(it.permissionId, it.accessLevel)) {
          out.push({ to: it.to, label: it.label, Icon: groupIcon });
        }
      } else if ((item as any).children) {
        const group = item as any;
        for (const child of group.children) {
          if (hasPerm(child.permissionId, child.accessLevel)) {
            out.push({ to: child.to, label: child.label, section: group.label, Icon: groupIcon });
          }
        }
      }
    }
    return out;
  }, [userPermissions, isSuperAdmin]);

  const toggleAction = (to: string) => {
    setSelectedActions((prev) => (prev.includes(to) ? prev.filter((k) => k !== to) : [...prev, to]));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Preferences</h1>
        <p className="text-slate-600">Manage your personal dashboard preferences.</p>
      </div>

      <div className="rounded-xl border bg-white/70 backdrop-blur p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">User</label>
          <div className="mt-1 text-slate-900">{user?.name} ({user?.role})</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Default landing page</label>
          <input
            value={landingRoute}
            onChange={(e) => setLandingRoute(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            placeholder="/dashboard"
          />
          <p className="text-xs text-slate-500 mt-1">Enter a route like /dashboard, /dashboard/ledger/list, etc.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            id="pref-collapsed"
            type="checkbox"
            className="h-4 w-4"
            checked={collapsed}
            onChange={(e) => setCollapsed(e.target.checked)}
          />
          <label htmlFor="pref-collapsed" className="text-sm text-slate-800">Collapse sidebar by default</label>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Hide menu entries</label>
          <textarea
            value={hiddenMenuRaw}
            onChange={(e) => setHiddenMenuRaw(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 min-h-[90px]"
            placeholder="Comma separated: Reports, /dashboard/members, Ledger/View Entries"
          />
          <p className="text-xs text-slate-500 mt-1">
            You can specify section labels (e.g., Reports), route paths (e.g., /dashboard/members),
            or Section/Item label pairs (e.g., Ledger/View Entries).
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Quick Actions (choose any)</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableLeaves.map((a) => (
              <button
                key={a.to}
                type="button"
                onClick={() => toggleAction(a.to)}
                className={`rounded-xl border p-4 text-left transition shadow-sm hover:shadow-md ${
                  selectedActions.includes(a.to)
                    ? 'bg-blue-50 border-blue-400'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <a.Icon className="w-6 h-6 text-blue-600" />
                  <div className="font-semibold text-slate-900">{a.label}</div>
                </div>
                {a.section && <div className="text-xs text-slate-500 mt-1">{a.section}</div>}
                <div className="mt-3">
                  <span className={`inline-block text-xs px-2 py-1 rounded ${
                    selectedActions.includes(a.to) ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {selectedActions.includes(a.to) ? 'Selected' : 'Tap to select'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="pt-2">
          <button
            onClick={onSave}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyPreferences;
