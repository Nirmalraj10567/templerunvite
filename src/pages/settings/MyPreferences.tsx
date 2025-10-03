import React, { useEffect, useMemo, useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../lib/language';
import { UsersIcon, BarChartIcon, CreditCardIcon, CalendarIcon } from '../../components/icons';
import { sidebarItems, NavItem } from '../../config/navigation';
import { Modal } from '../../components/Modal';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formFieldStyles, pageContainerStyles } from '@/styles/formStyles';


const MyPreferences: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const { user, userPermissions, isSuperAdmin } = useAuth();
  const { language } = useLanguage();

  // Translation object
  const t = {
    english: {
      title: 'எனது விருப்பத்தேர்வுகள்',
      subtitle: 'உங்கள் டாஷ்போர்ட் அனுபவத்தை தனிப்பயனாக்கவும்',
      role: 'பங்கு',
      quickActionsTitle: 'விரைவு செயல்கள்',
      quickActionsSubtitle: 'பயன்படுத்தப்படும் அம்சங்களைத் தேர்ந்தெடுக்கவும்',
      actionsSelected: 'செயல்கள் தேர்ந்தெடுக்கப்பட்டன',
      noActions: 'செயல்கள் இல்லை',
      noActionsDesc: 'அனுமதிகள் சரிபார்க்கவும்',
      saveButton: '💾 அனைத்து விருப்பத்தேர்வுகளையும் சேமிக்கவும்',
      selected: '✓ தேர்ந்தெடுக்கப்பட்டது',
      clickToSelect: 'தேர்ந்தெடுக்க கிளிக் செய்க',
      quickActionsReady: 'விரைவு செயல்கள் தயார்!',
      actionsWillAppear: 'உங்கள் டாஷ்போர்டில் தோன்றும்',
      action: 'செயல்',
      actions: 'செயல்கள்'
    },
    tamil: {
      title: 'My Preferences',
      subtitle: 'Customize your dashboard experience',
      role: 'Role',
      quickActionsTitle: 'Quick Actions',
      quickActionsSubtitle: 'Select your most used features',
      actionsSelected: 'actions selected',
      noActions: 'No actions available',
      noActionsDesc: 'Check your permissions',
      saveButton: '💾 Save All Preferences',
      selected: '✓ Selected',
      clickToSelect: 'Click to select',
      quickActionsReady: 'Quick Actions Ready!',
      actionsWillAppear: 'will appear on your dashboard',
      action: 'action',
      actions: 'actions'
    },
  } as const;

  const [landingRoute, setLandingRoute] = useState(settings.landing_route || '/dashboard');
  const [collapsed, setCollapsed] = useState(!!settings.sidebar_collapsed_default);
  const [hiddenMenuRaw, setHiddenMenuRaw] = useState((settings.hidden_menu_keys || []).join(', '));
  const [selectedActions, setSelectedActions] = useState<string[]>(Array.isArray(settings.quick_actions) ? settings.quick_actions : []);
  const [showSuccess, setShowSuccess] = useState(false);
  const [shortcutMap, setShortcutMap] = useState<Record<string, string>>(settings.shortcuts || {});
  const [capturingFor, setCapturingFor] = useState<string | null>(null);

  useEffect(() => {
    setLandingRoute(settings.landing_route || '/dashboard');
    setCollapsed(!!settings.sidebar_collapsed_default);
    setHiddenMenuRaw((settings.hidden_menu_keys || []).join(', '));
    setSelectedActions(Array.isArray(settings.quick_actions) ? settings.quick_actions : []);
    setShortcutMap(settings.shortcuts || {});
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
      shortcuts: shortcutMap,
    });
    setShowSuccess(true);
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

  const normalizeShortcut = (e: KeyboardEvent | React.KeyboardEvent<HTMLInputElement>) => {
    const key = String((e as any).key || '').toLowerCase();
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    if ((e as any).metaKey) parts.push('meta');
    // Ignore pure modifier presses
    const isModifierOnly = key === 'control' || key === 'shift' || key === 'alt' || key === 'meta';
    if (!isModifierOnly) {
      parts.push(key);
    }
    return parts.join('+');
  };

  const onShortcutKeyDown = (route: string) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const combo = normalizeShortcut(e);
    if (!combo || combo.length === 0) return;
    setShortcutMap((prev) => {
      // Remove existing assignment for this combo to avoid duplicates
      const next: Record<string, string> = { ...prev };
      for (const [r, c] of Object.entries(prev)) {
        if (c === combo && r !== route) {
          delete next[r];
        }
      }
      next[route] = combo;
      return next;
    });
    setCapturingFor(null);
  };

  const clearShortcut = (route: string) => {
    setShortcutMap((prev) => {
      const next = { ...prev };
      delete next[route];
      return next;
    });
  };

  return (
    <div className={pageContainerStyles.container}>
   <Card className={pageContainerStyles.content}>
   
      {/* Success Modal */}
      <Modal open={showSuccess} onClose={() => setShowSuccess(false)}>
        <div className="p-6 text-center">
          <div className="text-4xl mb-2">✅</div>
          <h2 className="text-xl font-bold mb-2">Preferences Saved!</h2>
          <p className="mb-4">Your preferences have been updated successfully.</p>
          <button
            className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
            onClick={() => setShowSuccess(false)}
          >
            OK
          </button>
        </div>
      </Modal>

      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="mb-6">
          <div className="text-center">


            <CardHeader className={cn("bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-6 text-center", formFieldStyles.card.header)}>
            <CardTitle className="text-lg font-bold w-full">
            {t[language].title}
            </CardTitle>
            </CardHeader> 
          
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          
          {/* Left Panel - User Info & Basic Settings */}
          <div className="xl:col-span-4 space-y-6">
            {/* User Information Card */}
            <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-lg p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <UsersIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{user?.name}</h3>
                  <div>
                    <p className="text-xs text-slate-500">{t[language].role}</p>
                    <p className="text-sm font-medium text-blue-600 bg-blue-100 px-3 py-1 rounded-full inline-block">
                      {user?.role}
                    </p>
                  </div>
                </div>
              </div>
            </div>

         

          

            {/* Save Button */}
            <div className="mt-6">
              <button
                onClick={onSave}
                className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {t[language].saveButton}
              </button>
            </div>
          </div>

          {/* Right Panel - Quick Actions Grid */}
          <div className="xl:col-span-8">
            <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-lg p-6">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <CreditCardIcon className="w-6 h-6 text-blue-600" />
                  {t[language].quickActionsTitle}
                </h3>
                <p className="text-slate-600">{t[language].quickActionsSubtitle}</p>
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">{selectedActions.length}</span> {t[language].actionsSelected}
                  </p>
                </div>
              </div>

              {/* Enhanced Grid Layout */}
              <div className="flex overflow-x-auto pb-4 -mx-2 px-2">
                <div className="flex gap-3 flex-nowrap">
                {availableLeaves.map((action) => (
                  <button
                    key={action.to}
                    type="button"
                    onClick={() => toggleAction(action.to)}
                    className={`group relative rounded-xl border p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg flex-shrink-0 w-48 ${
                      selectedActions.includes(action.to)
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400 text-white shadow-lg'
                        : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {/* Icon and Title */}
                    <div className="flex items-center justify-center w-full mb-2">
                      <div className={`p-1.5 rounded-lg transition-colors ${
                        selectedActions.includes(action.to)
                          ? 'bg-white/20'
                          : 'bg-blue-100 group-hover:bg-blue-200'
                      }`}>
                        <action.Icon className={`w-5 h-5 transition-colors ${
                          selectedActions.includes(action.to)
                            ? 'text-white'
                            : 'text-blue-600'
                        }`} />
                      </div>
                    </div>

                    {/* Action Label */}
                    <div className={`font-medium text-sm mb-1 text-center ${
                      selectedActions.includes(action.to)
                        ? 'text-white'
                        : 'text-slate-900 group-hover:text-blue-900'
                    }`}>
                      {action.label}
                    </div>

                    {/* Section Badge */}
                    {action.section && (
                      <div className={`text-xs px-1.5 py-0.5 rounded-md mb-2 inline-block ${
                        selectedActions.includes(action.to)
                          ? 'bg-white/20 text-white/90'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700'
                      }`}>
                        {action.section}
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-1 right-1">
                      {selectedActions.includes(action.to) ? (
                        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-5 h-5 border-2 border-slate-300 rounded-full group-hover:border-blue-400 transition-colors" />
                      )}
                    </div>

                    {/* Bottom Status */}
                    <div className={`text-xs font-medium mt-1 pt-1 text-center ${
                      selectedActions.includes(action.to)
                        ? 'text-white/90'
                        : 'text-slate-500 group-hover:text-blue-600'
                    }`}>
                      {selectedActions.includes(action.to) ? t[language].selected : t[language].clickToSelect}
                    </div>
                  </button>
                ))}
                </div>
              </div>

              {/* Empty State */}
              {availableLeaves.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCardIcon className="w-12 h-12 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-lg">{t[language].noActions}</p>
                  <p className="text-slate-400 text-sm">{t[language].noActionsDesc}</p>
                </div>
              )}

              {/* Selection Summary */}
              {selectedActions.length > 0 && (
                <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-green-900 mb-1">{t[language].quickActionsReady}</h4>
                      <p className="text-sm text-green-700">
                        {selectedActions.length} {selectedActions.length !== 1 ? t[language].actions : t[language].action} {t[language].actionsWillAppear}
                      </p>
                    </div>
                    <div className="text-2xl">🚀</div>
                  </div>
                </div>
              )}
            </div>

            {/* Shortcuts Config */}
            <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-lg p-6 mt-6">
              <div className="mb-4">
                <h3 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <CalendarIcon className="w-6 h-6 text-indigo-600" />
                  Keyboard Shortcuts
                </h3>
                <p className="text-slate-600 text-sm">Click in a field, then press the desired key combination. Use Ctrl/Shift/Alt/Meta + key. Duplicates will be reassigned.</p>
              </div>

              <div className="max-h-96 overflow-y-auto divide-y">
                {availableLeaves.map((action) => (
                  <div key={`sc-${action.to}`} className="flex items-center gap-4 py-3">
                    <div className="w-6 h-6 flex items-center justify-center">
                      <action.Icon className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 truncate">{action.label}</div>
                      {action.section && <div className="text-xs text-slate-500">{action.section}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={shortcutMap[action.to] || ''}
                        placeholder={capturingFor === action.to ? 'Press keys…' : t[language].clickToSelect}
                        onFocus={() => setCapturingFor(action.to)}
                        onBlur={() => setCapturingFor((prev) => (prev === action.to ? null : prev))}
                        onKeyDown={onShortcutKeyDown(action.to)}
                        className="w-48 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {!!shortcutMap[action.to] && (
                        <button
                          type="button"
                          onClick={() => clearShortcut(action.to)}
                          className="px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      </Card>
    </div>
  );
};

export default MyPreferences;
