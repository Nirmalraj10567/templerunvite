import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../lib/language'; // Added for language support
import {
  UsersIcon,
  BarChartIcon,
  CreditCardIcon,
  CalendarIcon,
} from '../../components/icons';

export default function OverviewPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
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

      {/* Two columns: Recent Members and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Members */}
        <div className="rounded-2xl bg-white border border-slate-200/60 backdrop-blur-sm shadow-sm p-4 sm:p-6">
          <h3 className="font-semibold text-slate-900 mb-4">{t[language as 'tamil' | 'english'].recentMembers}</h3>
          <div className="space-y-3">
            {(recentMembers || []).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar circle - Blue */}
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center">
                    {m.name?.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{m.name}</div>
                    <div className="text-xs text-slate-500">
                      {m.created_at ? new Date(m.created_at).toLocaleString() : ''}
                    </div>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {t[language as 'tamil' | 'english'].newLabel}
                </span>
              </div>
            ))}
            {!loading && recentMembers.length === 0 && (
              <div className="text-sm text-slate-500">{t[language as 'tamil' | 'english'].noRecentMembers}</div>
            )}
            {loading && (
              <div className="text-sm text-slate-500">{t[language as 'tamil' | 'english'].loading}</div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl bg-white border border-slate-200/60 backdrop-blur-sm shadow-sm p-4 sm:p-6">
          <h3 className="font-semibold text-slate-900 mb-4">{t[language as 'tamil' | 'english'].quickActions}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/dashboard/registrations/entry')}
              aria-label={t[language as 'tamil' | 'english'].addMember}
              className="group rounded-2xl p-6 text-left text-white bg-gradient-to-br from-green-500 via-green-600 to-green-600 shadow hover:shadow-lg hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 transition"
            >
              <div className="flex items-start gap-3">
                <UsersIcon className="h-6 w-6 opacity-90" />
                <div>
                  <div className="text-lg font-semibold">{t[language as 'tamil' | 'english'].addMember}</div>
                  <p className="text-xs mt-1 opacity-90">{t[language as 'tamil' | 'english'].addMemberDesc}</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => navigate('/dashboard/reports/daily')}
              aria-label={t[language as 'tamil' | 'english'].viewReports}
              className="group rounded-2xl p-6 text-left text-white bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 shadow hover:shadow-lg hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 transition"
            >
              <div className="flex items-start gap-3">
                <BarChartIcon className="h-6 w-6 opacity-90" />
                <div>
                  <div className="text-lg font-semibold">{t[language as 'tamil' | 'english'].viewReports}</div>
                  <p className="text-xs mt-1 opacity-90">{t[language as 'tamil' | 'english'].viewReportsDesc}</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => navigate('/dashboard/receipt/entry')}
              aria-label={t[language as 'tamil' | 'english'].collectPayment}
              className="group rounded-2xl p-6 text-left text-white bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 shadow hover:shadow-lg hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 transition"
            >
              <div className="flex items-start gap-3">
                <CreditCardIcon className="h-6 w-6 opacity-90" />
                <div>
                  <div className="text-lg font-semibold">{t[language as 'tamil' | 'english'].collectPayment}</div>
                  <p className="text-xs mt-1 opacity-90">{t[language as 'tamil' | 'english'].collectPaymentDesc}</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => navigate('/dashboard/events/new')}
              aria-label={t[language as 'tamil' | 'english'].scheduleEvent}
              className="group rounded-2xl p-6 text-left text-white bg-gradient-to-br from-green-500 via-green-600 to-green-600 shadow hover:shadow-lg hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 transition"
            >
              <div className="flex items-start gap-3">
                <CalendarIcon className="h-6 w-6 opacity-90" />
                <div>
                  <div className="text-lg font-semibold">{t[language as 'tamil' | 'english'].scheduleEvent}</div>
                  <p className="text-xs mt-1 opacity-90">{t[language as 'tamil' | 'english'].scheduleEventDesc}</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}