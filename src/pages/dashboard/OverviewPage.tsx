import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useLanguage } from '../../lib/language'; // Added for language support
import { sidebarItems } from '../../config/navigation';
import {
  UsersIcon,
  BarChartIcon,
  CreditCardIcon,
  CalendarIcon,
  HeartIcon,
} from '../../components/icons';

export default function OverviewPage() {
  const navigate = useNavigate();
  const { user, token, userPermissions, isSuperAdmin } = useAuth();
  const { settings } = useSettings();
  const { language } = useLanguage(); // Get current language

  // Translation object
  const t = {
    tamil: {
      greeting: 'Hi',
      subtitle: 'Here’s what’s happening today',
      totalMembers: 'Total Members',
      paidMembers: 'Paid Members',
      unpaidMembers: 'Unpaid Members',
      upcomingEvents: 'Upcoming Events',
      recentMembers: 'Recent Members',
      noRecentMembers: 'No recent members',
      loading: 'Loading…',
      quickActions: 'Quick Actions',
      addMember: 'Add Member',
      addMemberDesc: 'Create a new member record',
      viewReports: 'View Reports',
      viewReportsDesc: 'Check today’s performance',
      collectPayment: 'Collect Payment',
      collectPaymentDesc: 'Record a new receipt',
      scheduleEvent: 'Schedule Event',
      scheduleEventDesc: 'Add to the events calendar',
      newLabel: 'New',
      totalRegistrations: 'Total registrations',
      paidThisMonth: 'Paid this month',
      unpaidThisMonth: 'Unpaid this month',
      fromTodayOnwards: 'From today onwards',
      approvalRequests: 'Approval Requests',
      poojaApproval: 'Pooja Approval',
      hallApprovals: 'Hall Approvals',
      annadhanamApproval: 'Annadhanam Approval',
  
    },
    english: {
       greeting: 'வணக்கம்',
      subtitle: 'இன்று நடக்கும் நிகழ்வுகள் இதோ',
      totalMembers: 'மொத்த உறுப்பினர்கள்',
      paidMembers: 'செலுத்திய உறுப்பினர்கள்',
      unpaidMembers: 'செலுத்தாத உறுப்பினர்கள்',
      upcomingEvents: 'வரவிருக்கும் நிகழ்வுகள்',
      recentMembers: 'சமீபத்திய உறுப்பினர்கள்',
      noRecentMembers: 'சமீபத்திய உறுப்பினர்கள் இல்லை',
      loading: 'ஏற்றுகிறது…',
      quickActions: 'விரைவு செயல்கள்',
      addMember: 'உறுப்பினரைச் சேர்',
      addMemberDesc: 'புதிய உறுப்பினரைப் பதிவு செய்க',
      viewReports: 'அறிக்கைகளைப் பார்',
      viewReportsDesc: 'இன்றைய செயல்பாட்டைச் சரிபார்க்கவும்',
      collectPayment: 'கட்டணத்தை வசூலி',
      collectPaymentDesc: 'புதிய ரசீதைப் பதிவு செய்க',
      scheduleEvent: 'நிகழ்வை அட்டவணைப்படுத்து',
      scheduleEventDesc: 'நிகழ்வுகள் நாட்காட்டியில் சேர்க்கவும்',
      newLabel: 'புதியது',
      totalRegistrations: 'மொத்தப் பதிவுகள்',
      paidThisMonth: 'இந்த மாதம் செலுத்தியது',
      unpaidThisMonth: 'இந்த மாதம் செலுத்தவில்லை',
      fromTodayOnwards: 'இன்று முதல்',
      approvalRequests: 'அனுமதி கோரிக்கைகள்',
      poojaApproval: 'பூஜை அங்கீகாரம்',
      hallApprovals: 'ஹால் அங்கீகாரங்கள்',
      annadhanamApproval: 'அன்னதானம் அங்கீகாரம்',
    },
  } as const;

  // State for dynamic data
  const [totalMembers, setTotalMembers] = useState<number | null>(null);
  const [recentMembers, setRecentMembers] = useState<Array<{ id: number; name: string; created_at?: string }>>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<number | null>(null);
  const [paidMembersThisMonth, setPaidMembersThisMonth] = useState<number | null>(null);
  const [unpaidMembersThisMonth, setUnpaidMembersThisMonth] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch dashboard stats for paid/unpaid + total
        const statsRes = await fetch(`/api/dashboard/stats`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const statsJson = await statsRes.json();
        if (!statsRes.ok) throw new Error(statsJson?.error || 'Failed to load stats');
        if (!cancelled) {
          setTotalMembers(Number(statsJson?.data?.totalMembers ?? 0));
          setPaidMembersThisMonth(Number(statsJson?.data?.paidMembersThisMonth ?? 0));
          setUnpaidMembersThisMonth(Number(statsJson?.data?.unpaidMembersThisMonth ?? 0));
        }

        // Fetch registrations (for total + recent)
        const regRes = await fetch(`/api/registrations?page=1&pageSize=5`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const regJson = await regRes.json();
        if (!regRes.ok) throw new Error(regJson?.error || 'Failed to load registrations');
        if (!cancelled) {
          // totalMembers already from stats; keep as fallback
          if (regJson?.total != null) setTotalMembers((prev) => prev ?? Number(regJson.total));
          setRecentMembers(Array.isArray(regJson?.data) ? regJson.data : []);
        }

        // Fetch events (for upcoming count)
        const evtRes = await fetch(`/api/events?from=${todayStr}&page=1&pageSize=1`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const evtJson = await evtRes.json();
        if (!evtRes.ok) throw new Error(evtJson?.error || 'Failed to load events');
        if (!cancelled) {
          setUpcomingEvents(Number(evtJson?.total ?? 0));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load dashboard data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [token, todayStr]);

  // Permission helpers (shared with approvals section)
  const levelRank = (lvl?: string) => (lvl === 'full' ? 3 : lvl === 'edit' ? 2 : lvl === 'view' ? 1 : 0);
  const hasPerm = (permissionId?: string, requiredLevel?: 'view' | 'edit' | 'full') => {
    if (!permissionId) return true;
    if (isSuperAdmin) return true;
    const need = levelRank(requiredLevel || 'view');
    const found = userPermissions?.find((p) => p.permission_id === permissionId);
    if (!found) return false;
    return levelRank(found.access_level) >= need;
  };

  return (
    <div className="space-y-6">
      {/* Top heading + language */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
            {t[language as 'tamil' | 'english'].greeting} {user?.name ? user.name.split(' ')[0] : 'User'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{t[language as 'tamil' | 'english'].subtitle}</p>
        </div>
      </div>

      {/* Stat gradient cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Members - Blue */}
        <div className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-90">{t[language as 'tamil' | 'english'].totalMembers}</div>
            <UsersIcon className="h-6 w-6 opacity-90" />
          </div>
          <div className="text-3xl font-bold mt-2">{totalMembers ?? '—'}</div>
          <div className="text-xs mt-2 opacity-90">
            {loading 
              ? t[language as 'tamil' | 'english'].loading 
              : t[language as 'tamil' | 'english'].totalRegistrations}
          </div>
        </div>
        {/* Paid Members - Green */}
        <div className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-green-500 via-green-600 to-green-600 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-90">{t[language as 'tamil' | 'english'].paidMembers}</div>
            <CreditCardIcon className="h-6 w-6 opacity-90" />
          </div>
          <div className="text-3xl font-bold mt-2">{paidMembersThisMonth ?? '—'}</div>
          <div className="text-xs mt-2 opacity-90">
            {loading 
              ? t[language as 'tamil' | 'english'].loading 
              : t[language as 'tamil' | 'english'].paidThisMonth}
          </div>
        </div>
        {/* Unpaid Members - Blue */}
        <div className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-90">{t[language as 'tamil' | 'english'].unpaidMembers}</div>
            <BarChartIcon className="h-6 w-6 opacity-90" />
          </div>
          <div className="text-3xl font-bold mt-2">{unpaidMembersThisMonth ?? '—'}</div>
          <div className="text-xs mt-2 opacity-90">
            {loading 
              ? t[language as 'tamil' | 'english'].loading 
              : t[language as 'tamil' | 'english'].unpaidThisMonth}
          </div>
        </div>
        {/* Upcoming Events - Green */}
        <div className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-green-500 via-green-600 to-green-600 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-90">{t[language as 'tamil' | 'english'].upcomingEvents}</div>
            <CalendarIcon className="h-6 w-6 opacity-90" />
          </div>
          <div className="text-3xl font-bold mt-2">{upcomingEvents ?? '—'}</div>
          <div className="text-xs mt-2 opacity-90">
            {loading 
              ? t[language as 'tamil' | 'english'].loading 
              : t[language as 'tamil' | 'english'].fromTodayOnwards}
          </div>
        </div>
      </div>

      {/* Quick actions from user settings (optional) */}
      {Array.isArray(settings?.quick_actions) && settings.quick_actions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">{t[language as 'tamil' | 'english'].quickActions}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const levelRank = (lvl?: string) => (lvl === 'full' ? 3 : lvl === 'edit' ? 2 : lvl === 'view' ? 1 : 0);
              const hasPerm = (permissionId?: string, requiredLevel?: string) => {
                if (!permissionId) return true;
                if (isSuperAdmin) return true;
                const need = levelRank(requiredLevel || 'view');
                const found = userPermissions?.find((p) => p.permission_id === permissionId);
                if (!found) return false;
                return levelRank(found.access_level) >= need;
              };

              type Leaf = { to: string; label: string; section?: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> };
              const leaves: Leaf[] = [];
              for (const item of sidebarItems) {
                const GroupIcon = (item as any).icon || UsersIcon;
                if ((item as any).to) {
                  const it = item as any;
                  if (hasPerm(it.permissionId, it.accessLevel)) {
                    leaves.push({ to: it.to, label: it.label, Icon: GroupIcon });
                  }
                } else if ((item as any).children) {
                  const group = item as any;
                  for (const child of group.children) {
                    if (hasPerm(child.permissionId, child.accessLevel)) {
                      leaves.push({ to: child.to, label: child.label, section: group.label, Icon: GroupIcon });
                    }
                  }
                }
              }
              const byPath = new Map(leaves.map((l) => [l.to, l] as const));
              return settings.quick_actions
                .map((path) => byPath.get(String(path)))
                .filter(Boolean)
                .map((conf) => {
                  const c = conf as Leaf;
                  const IconComp = c.Icon;
                  return (
                    <button
                      key={c.to}
                      onClick={() => navigate(c.to)}
                      className="w-full rounded-2xl p-5 bg-white border border-slate-200 hover:shadow-md text-left transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-600">{c.section || t[language as 'tamil' | 'english'].quickActions}</div>
                        <IconComp className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="text-lg font-semibold text-slate-900 mt-2">{c.label}</div>
                    </button>
                  );
                });
            })()}
          </div>
        </div>
      )}

    {/* Approval Requests - render only if at least one permission is available */}
    {(hasPerm('pooja_approval', 'view') || hasPerm('hall_approval', 'view') || hasPerm('annadhanam_approval', 'view')) && (
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">{t[language as 'tamil' | 'english'].approvalRequests}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pooja Approval */}
          {hasPerm('pooja_approval', 'view') && (
            <button
              onClick={() => navigate('/dashboard/pooja/approval')}
              className="w-full rounded-2xl p-5 bg-white border border-slate-200 hover:shadow-md text-left transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">{t[language as 'tamil' | 'english'].approvalRequests}</div>
                <CalendarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-lg font-semibold text-slate-900 mt-2">{t[language as 'tamil' | 'english'].poojaApproval}</div>
            </button>
          )}

          {/* Hall Approvals */}
          {hasPerm('hall_approval', 'view') && (
            <button
              onClick={() => navigate('/dashboard/hall/approvals')}
              className="w-full rounded-2xl p-5 bg-white border border-slate-200 hover:shadow-md text-left transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">{t[language as 'tamil' | 'english'].approvalRequests}</div>
                <CalendarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-lg font-semibold text-slate-900 mt-2">{t[language as 'tamil' | 'english'].hallApprovals}</div>
            </button>
          )}

          {/* Annadhanam Approval */}
          {hasPerm('annadhanam_approval', 'view') && (
            <button
              onClick={() => navigate('/dashboard/annadhanam/approval')}
              className="w-full rounded-2xl p-5 bg-white border border-slate-200 hover:shadow-md text-left transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">{t[language as 'tamil' | 'english'].approvalRequests}</div>
                <HeartIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-lg font-semibold text-slate-900 mt-2">{t[language as 'tamil' | 'english'].annadhanamApproval}</div>
            </button>
          )}
        </div>
      </div>
    )}
  </div>
);
}