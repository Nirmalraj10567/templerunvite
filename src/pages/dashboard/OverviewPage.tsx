import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  UsersIcon,
  BarChartIcon,
  CreditCardIcon,
  CalendarIcon,
} from '../../components/icons';

export default function OverviewPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();

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
            Hi {user?.name ? user.name.split(' ')[0] : 'User'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">Here’s what’s happening today</p>
        </div>
      </div>

      {/* Stat gradient cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-orange-500 via-orange-600 to-amber-500 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-90">Total Members</div>
            <UsersIcon className="h-6 w-6 opacity-90" />
          </div>
          <div className="text-3xl font-bold mt-2">{totalMembers ?? '—'}</div>
          <div className="text-xs mt-2 opacity-90">{loading ? 'Loading…' : 'Total registrations'}</div>
        </div>
        <div className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-90">Paid Members</div>
            <CreditCardIcon className="h-6 w-6 opacity-90" />
          </div>
          <div className="text-3xl font-bold mt-2">{paidMembersThisMonth ?? '—'}</div>
          <div className="text-xs mt-2 opacity-90">{loading ? 'Loading…' : 'Paid this month'}</div>
        </div>
        <div className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-rose-600 via-rose-700 to-red-700 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-90">Unpaid Members</div>
            <BarChartIcon className="h-6 w-6 opacity-90" />
          </div>
          <div className="text-3xl font-bold mt-2">{unpaidMembersThisMonth ?? '—'}</div>
          <div className="text-xs mt-2 opacity-90">{loading ? 'Loading…' : 'Unpaid this month'}</div>
        </div>
        <div className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-90">Upcoming Events</div>
            <CalendarIcon className="h-6 w-6 opacity-90" />
          </div>
          <div className="text-3xl font-bold mt-2">{upcomingEvents ?? '—'}</div>
          <div className="text-xs mt-2 opacity-90">{loading ? 'Loading…' : 'From today onwards'}</div>
        </div>
      </div>

      {/* Two columns: Recent Members and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Members */}
        <div className="rounded-2xl bg-white border border-slate-200/60 backdrop-blur-sm shadow-sm p-4 sm:p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Recent Members</h3>
          <div className="space-y-3">
            {(recentMembers || []).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 font-semibold flex items-center justify-center">
                    {m.name?.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{m.name}</div>
                    <div className="text-xs text-slate-500">
                      {m.created_at ? new Date(m.created_at).toLocaleString() : ''}
                    </div>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">New</span>
              </div>
            ))}
            {!loading && recentMembers.length === 0 && (
              <div className="text-sm text-slate-500">No recent members</div>
            )}
            {loading && (
              <div className="text-sm text-slate-500">Loading…</div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl bg-white border border-slate-200/60 backdrop-blur-sm shadow-sm p-4 sm:p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/dashboard/registrations/entry')}
              aria-label="Add a new member"
              className="group rounded-2xl p-6 text-left text-white bg-gradient-to-br from-orange-500 via-orange-600 to-amber-500 shadow hover:shadow-lg hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 transition"
            >
              <div className="flex items-start gap-3">
                <UsersIcon className="h-6 w-6 opacity-90" />
                <div>
                  <div className="text-lg font-semibold">Add Member</div>
                  <p className="text-xs mt-1 opacity-90">Create a new member record</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => navigate('/dashboard/reports/daily')}
              aria-label="View daily reports"
              className="group rounded-2xl p-6 text-left text-white bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 shadow hover:shadow-lg hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 transition"
            >
              <div className="flex items-start gap-3">
                <BarChartIcon className="h-6 w-6 opacity-90" />
                <div>
                  <div className="text-lg font-semibold">View Reports</div>
                  <p className="text-xs mt-1 opacity-90">Check today’s performance</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => navigate('/dashboard/receipt/entry')}
              aria-label="Collect a payment"
              className="group rounded-2xl p-6 text-left text-white bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 shadow hover:shadow-lg hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 transition"
            >
              <div className="flex items-start gap-3">
                <CreditCardIcon className="h-6 w-6 opacity-90" />
                <div>
                  <div className="text-lg font-semibold">Collect Payment</div>
                  <p className="text-xs mt-1 opacity-90">Record a new receipt</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => navigate('/dashboard/events/new')}
              aria-label="Schedule a new event"
              className="group rounded-2xl p-6 text-left text-white bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-600 shadow hover:shadow-lg hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 transition"
            >
              <div className="flex items-start gap-3">
                <CalendarIcon className="h-6 w-6 opacity-90" />
                <div>
                  <div className="text-lg font-semibold">Schedule Event</div>
                  <p className="text-xs mt-1 opacity-90">Add to the events calendar</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

