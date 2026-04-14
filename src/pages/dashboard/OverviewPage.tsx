import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useLanguage } from '../../lib/language'; // Added for language support
import { sidebarItems } from '../../config/navigation';
import Calendar from '../../components/Calendar';
import GlobalCalendar from '../../components/GlobalCalendar';
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
  const lang = (String(language).toLowerCase() === 'english' ? 'tamil' : 'english') as 'tamil' | 'english';

  // Translation object
  const t = {
    tamil: {
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
    english: {
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
        // Fetch registrations (for total + recent)
        const regRes = await fetch(`https://tmsapi.xesstechlink.com/api/registrations?page=1&pageSize=5`, {
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

        // Fetch full registrations list (for counts)
        const regAllRes = await fetch(`https://tmsapi.xesstechlink.com/api/registrations?page=1&pageSize=5000`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const regAllJson = await regAllRes.json();
        if (!regAllRes.ok) throw new Error(regAllJson?.error || 'Failed to load registrations list');

        // Fetch current year's tax setting
        const year = new Date().getFullYear();
        const taxSetRes = await fetch(`https://tmsapi.xesstechlink.com/api/tax-settings/year/${year}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const taxSetJson = await taxSetRes.json().catch(() => ({}));
        const currentYearTax = Number(taxSetJson?.data?.tax_amount || 0) || 0;

        // Fetch tax registrations (limit reasonably)
        const taxRes = await fetch(`https://tmsapi.xesstechlink.com/api/tax-registrations?page=1&pageSize=1000`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const taxJson = await taxRes.json();
        if (!taxRes.ok) throw new Error(taxJson?.error || 'Failed to load tax registrations');

        // Helpers
        const toNum = (v: any): number => {
          if (v === null || v === undefined) return 0;
          const n = Number(String(v).replace(/[\,\s]/g, ''));
          return Number.isFinite(n) ? n : 0;
        };
        const normalizeMobile = (m?: string) => (m ? String(m).replace(/\D/g, '') : '');

        // Build mobile sets
        const allRegs: any[] = Array.isArray(regAllJson?.data) ? regAllJson.data : [];
        console.log('Raw registrations data:', JSON.stringify(allRegs, null, 2));
        
        // Count all user records regardless of mobile number
        const totalUsers = allRegs.length;
        console.log('Total user records found:', totalUsers);
        
        // For reference, still track unique mobiles but don't use for counting
        const allMobiles = new Set<string>();
        allRegs.forEach((r) => {
          const mob = normalizeMobile(r.mobile_number ?? r.mobileNumber);
          if (mob) allMobiles.add(mob);
        });
        console.log('Unique mobile numbers (for reference):', allMobiles.size);

        // Map latest tax record per mobile for current year
        const taxRows: any[] = Array.isArray(taxJson?.data) ? taxJson.data : [];
        const byMobile = new Map<string, any>();
        const recordYear = (rec: any): number => {
          const y = Number(rec?.year);
          if (Number.isFinite(y) && y > 1900) return y;
          const dt = rec?.created_at || rec?.updated_at || rec?.date;
          if (dt) {
            const d = new Date(dt);
            if (!isNaN(d.getTime())) return d.getFullYear();
          }
          return year; // fallback assume current year
        };
        taxRows.forEach((r) => {
          const mob = normalizeMobile(r.mobile_number ?? r.mobileNumber);
          if (!mob) return;
          if (recordYear(r) !== year) return;
          const prev = byMobile.get(mob);
          const curTs = r.created_at ? new Date(r.created_at).getTime() : 0;
          const prevTs = prev && prev.created_at ? new Date(prev.created_at).getTime() : -1;
          if (!prev || curTs >= prevTs) byMobile.set(mob, r);
        });

        // Compute paid/unpaid
        const paidMobiles = new Set<string>();
        const pendingMobiles = new Set<string>();
        for (const [mob, r] of byMobile.entries()) {
          const tax = toNum(r.tax_amount ?? r.taxAmount ?? r.total_tax ?? r.totalAmount);
          const paid = toNum(r.amount_paid ?? r.amountPaid ?? r.paid_amount ?? r.paidAmount);
          const outstandingRaw = r.outstanding_amount ?? r.outstandingAmount;
          const outstanding = outstandingRaw !== null && outstandingRaw !== undefined ? toNum(outstandingRaw) : Math.max(0, tax - paid);
          if (outstanding <= 0) paidMobiles.add(mob);
          else pendingMobiles.add(mob);
        }

        // Calculate paid users from tax registrations
        const paid = paidMobiles.size;
        
        // Calculate unpaid users as total - paid
        // This ensures consistency between total and paid/unpaid counts
        const unpaid = Math.max(0, totalUsers - paid);
        
        const total = totalUsers; // Total from registrations API
        
        console.log('Overview counts:', {
          total,
          paid,
          unpaid,
          paidMobiles: Array.from(paidMobiles),
          totalUsers
        });

        if (!cancelled) {
          setTotalMembers(total);
          setPaidMembersThisMonth(paid);
          setUnpaidMembersThisMonth(unpaid);
        }

        // Fetch events (for upcoming count)
        const evtRes = await fetch(`https://tmsapi.xesstechlink.com/api/events?from=${todayStr}&page=1&pageSize=1`, {
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
            {t[lang].greeting} {user?.name ? user.name.split(' ')[0] : 'User'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{t[lang].subtitle}</p>
        </div>
      </div>

      {/* Stat gradient cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Members - Blue */}
        <div className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-orange-400 via-red-400 to-orange-500 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-90">{t[lang].totalMembers}</div>
            <UsersIcon className="h-6 w-6 opacity-90" />
          </div>
          <div className="text-3xl font-bold mt-2">{totalMembers ?? '—'}</div>
          <div className="text-xs mt-2 opacity-90">
            {loading ? t[lang].loading : t[lang].totalRegistrations}
          </div>
        </div>
        {/* Paid Members - Green */}
        <div className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-orange-300 via-red-300 to-orange-400 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-90">{t[lang].paidMembers}</div>
            <CreditCardIcon className="h-6 w-6 opacity-90" />
          </div>
          <div className="text-3xl font-bold mt-2">{paidMembersThisMonth ?? '—'}</div>
          <div className="text-xs mt-2 opacity-90">
            {loading ? t[lang].loading : t[lang].paidThisMonth}
          </div>
        </div>
        {/* Unpaid Members - Blue */}
        <div className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-orange-400 via-red-400 to-orange-500 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-90">{t[lang].unpaidMembers}</div>
            <BarChartIcon className="h-6 w-6 opacity-90" />
          </div>
          <div className="text-3xl font-bold mt-2">{unpaidMembersThisMonth ?? '—'}</div>
          <div className="text-xs mt-2 opacity-90">
            {loading ? t[lang].loading : t[lang].unpaidThisMonth}
          </div>
        </div>
        {/* Upcoming Events - Green */}
        <div className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-orange-300 via-red-300 to-orange-400 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-90">{t[lang].upcomingEvents}</div>
            <CalendarIcon className="h-6 w-6 opacity-90" />
          </div>
          <div className="text-3xl font-bold mt-2">{upcomingEvents ?? '—'}</div>
          <div className="text-xs mt-2 opacity-90">
            {loading ? t[lang].loading : t[lang].fromTodayOnwards}
          </div>
        </div>
      </div>

      {/* Quick actions from user settings (optional) */}
      {Array.isArray(settings?.quick_actions) && settings.quick_actions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">{t[lang].quickActions}</h3>
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

              type Leaf = {
                to: string;
                label: string;
                tamilLabel?: string;
                section?: string;
                sectionTamilLabel?: string;
                Icon: React.FC<React.SVGProps<SVGSVGElement>>;
              };
              const leaves: Leaf[] = [];
              for (const item of sidebarItems) {
                const GroupIcon = (item as any).icon || UsersIcon;
                if ((item as any).to) {
                  const it = item as any;
                  if (hasPerm(it.permissionId, it.accessLevel)) {
                    leaves.push({ to: it.to, label: it.label, tamilLabel: it.tamilLabel, Icon: GroupIcon });
                  }
                } else if ((item as any).children) {
                  const group = item as any;
                  for (const child of group.children) {
                    if (hasPerm(child.permissionId, child.accessLevel)) {
                      leaves.push({
                        to: child.to,
                        label: child.label,
                        tamilLabel: child.tamilLabel,
                        section: group.label,
                        sectionTamilLabel: group.tamilLabel,
                        Icon: GroupIcon,
                      });
                    }
                  }
                }
              }
              
              // Debug: Log all available leaves
              try {
                console.debug('[QuickAction] Available leaves:', leaves.map(l => ({ to: l.to, label: l.label, tamilLabel: l.tamilLabel, section: l.section })));
                console.debug('[QuickAction] User quick_actions setting:', settings.quick_actions);
                console.debug('[QuickAction] Current language:', language, 'normalized to:', lang);
              } catch {}
              
              // Build a lookup that supports matching by route path, English label, or Tamil label
              const byKey = new Map<string, Leaf>();
              for (const l of leaves) {
                byKey.set(l.to, l);
                byKey.set(l.label, l);
                if (l.tamilLabel) byKey.set(l.tamilLabel, l);
                if (l.section) byKey.set(l.section, l); // allow group label to resolve first child optionally
                if (l.sectionTamilLabel) byKey.set(l.sectionTamilLabel, l);
              }
              
              try {
                console.debug('[QuickAction] Lookup keys available:', Array.from(byKey.keys()));
              } catch {}
              
              const resolved = settings.quick_actions
                .map((k) => {
                  const key = String(k);
                  const match = byKey.get(key);
                  if (!match) {
                    try {
                      console.warn('[QuickAction] No match for key:', key);
                      console.warn('[QuickAction] Available keys:', Array.from(byKey.keys()));
                    } catch {}
                  } else {
                    try {
                      console.debug('[QuickAction] Matched key:', key, 'to item:', { to: match.to, label: match.label, tamilLabel: match.tamilLabel });
                    } catch {}
                  }
                  return match;
                })
                .filter(Boolean)
                .map((conf) => {
                  const c = conf as Leaf;
                  const IconComp = c.Icon;
                  return (
                    <button
                      key={c.to}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Debug click responsiveness
                        try { console.debug('[QuickAction] navigate ->', c.to); } catch {}
                        navigate(c.to);
                      }}
                      className="w-full rounded-2xl p-5 bg-white border border-slate-200 hover:shadow-md text-left transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-600">
                          {c.section
                            ? (lang === 'tamil' ? (c.sectionTamilLabel || c.section) : c.section)
                            : t[lang].quickActions}
                        </div>
                        <IconComp className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="text-lg font-semibold text-slate-900 mt-2">
                        {lang === 'tamil' ? (c.tamilLabel || c.label) : c.label}
                      </div>
                    </button>
                  );
                });
              return resolved;
            })()}
          </div>
        </div>
      )}

    {/* Approval Requests - render only if at least one permission is available 
    {(hasPerm('pooja_approval', 'view') || hasPerm('hall_approval', 'view') || hasPerm('annadhanam_approval', 'view')) && (
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">{t[lang].approvalRequests}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
          {hasPerm('pooja_approval', 'view') && (
            <button
              onClick={() => navigate('/dashboard/pooja/approval')}
              className="w-full rounded-2xl p-5 bg-white border border-slate-200 hover:shadow-md text-left transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">{t[lang].approvalRequests}</div>
                <CalendarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-lg font-semibold text-slate-900 mt-2">{t[lang].poojaApproval}</div>
            </button>
          )}

         
          {hasPerm('hall_approval', 'view') && (
            <button
              onClick={() => navigate('/dashboard/hall/approvals')}
              className="w-full rounded-2xl p-5 bg-white border border-slate-200 hover:shadow-md text-left transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">{t[lang].approvalRequests}</div>
                <CalendarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-lg font-semibold text-slate-900 mt-2">{t[lang].hallApprovals}</div>
            </button>
          )}

         
          {hasPerm('annadhanam_approval', 'view') && (
            <button
              onClick={() => navigate('/dashboard/annadhanam/approval')}
              className="w-full rounded-2xl p-5 bg-white border border-slate-200 hover:shadow-md text-left transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">{t[lang].approvalRequests}</div>
                <HeartIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-lg font-semibold text-slate-900 mt-2">{t[lang].annadhanamApproval}</div>
            </button>
          )}
          
        </div>
      </div>
    )}   

    */}

    {/* Calendar Section */}
    <div className="mt-6">
      <Calendar selectedDate={todayStr} />
    </div>

  
  </div>
);
}