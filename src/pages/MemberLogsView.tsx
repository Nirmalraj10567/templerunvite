import React, { useEffect, useMemo, useState } from 'react';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useLanguage } from '@/lib/language'; // 👈 Language context
import { theme } from '@/styles/theme';
import { cn } from '@/lib/utils';

interface SessionLog {
  id: number;
  user_id: number;
  login_time: string;
  logout_time?: string | null;
  ip_address: string;
  user_agent?: string | null;
  duration_seconds?: number | null;
  full_name?: string | null;
  username?: string | null;
  mobile?: string | null;
}

interface MemberLogsViewProps {
  token?: string | null;
  membersOptions?: Array<{ user_id: number; name: string }>; // optional pre-fetched members for dropdown
}

export default function MemberLogsView({ token, membersOptions }: MemberLogsViewProps) {
  // 👇 Use context language for consistency across app
  const { language: currentLanguage } = useLanguage();
  const lang = currentLanguage as 'english' | 'tamil';

  // Translation object
  const t = {
    english: {
      memberLogs: 'உறுப்பினர் பதிவுகள்',
      user: 'பயனர்',
      allUsers: 'அனைத்து பயனர்கள்',
      from: 'இருந்து',
      to: 'வரை',
      apply: 'பயன்படுத்து',
      reset: 'மீட்டமை',
      name: 'பெயர்',
      userId: 'பயனர் ஐடி',
      loginTime: 'உள்நுழைவு நேரம்',
      logoutTime: 'வெளியேறும் நேரம்',
      duration: 'கால அளவு',
      userAgent: 'பயனர் முகவர்',
      ip: 'ஐபி முகவரி',
      loading: 'ஏற்றுகிறது...',
      noLogs: 'பதிவுகள் இல்லை',
      page: 'பக்கம்',
    },
    tamil: {
      memberLogs: 'Member Logs',
      user: 'User',
      allUsers: 'All Users',
      from: 'From',
      to: 'To',
      apply: 'Apply',
      reset: 'Reset',
      name: 'Name',
      userId: 'User ID',
      loginTime: 'Login Time',
      logoutTime: 'Logout Time',
      duration: 'Duration',
      userAgent: 'User Agent',
      ip: 'IP Address',
      loading: 'Loading...',
      noLogs: 'No logs found',
      page: 'Page',
    },
  } as const;

  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [users, setUsers] = useState<Array<{ user_id: number; name: string }>>(membersOptions || []);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const hasNextPage = useMemo(() => logs.length === pageSize, [logs, pageSize]);

  const fetchLogs = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (selectedUserId) params.set('userId', selectedUserId);
      if (fromDate) params.set('from', new Date(fromDate).toISOString());
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        params.set('to', end.toISOString());
      }
      const res = await fetch(`http://localhost:4000/api/session-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch logs');
      const body = await res.json();
      const data: SessionLog[] = Array.isArray(body)
        ? body
        : Array.isArray(body?.data)
        ? body.data
        : [];
      setLogs(data || []);
    } catch (err: any) {
      setError(err?.message || 'Error fetching logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    if (membersOptions && membersOptions.length) return;
    const fetchUsers = async () => {
      if (!token) return;
      try {
        const res = await fetch('http://localhost:4000/api/admin/members?minimal=1', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const payload = await res.json();
        const arr = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
          ? payload.data
          : [];
        const mapped = (arr || []).map((m: any) => ({
          user_id: m.user_id || m.id,
          name: m.name || m.fullName || m.full_name || m.username || String(m.user_id || m.id),
        }));
        setUsers(mapped);
      } catch {
        // ignore
      }
    };
    fetchUsers();
  }, [membersOptions, token]);

  const formatDate = (iso?: string | null) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds && seconds !== 0) return '-';
    const s = Number(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${sec}s`;
  };

  const displayName = (log: SessionLog) => {
    return (
      (log.full_name && log.full_name.trim()) ||
      (log.username && log.username.trim()) ||
      (log.mobile && log.mobile.trim()) ||
      String(log.user_id)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 p-4 bg-white rounded-lg shadow-sm border">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t[lang].memberLogs}</h2>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col min-w-[200px]">
            <label className="text-xs font-medium text-gray-600 mb-1">{t[lang].user}</label>
            <select
              className={cn(theme.select.base, theme.select.size.md)}
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                setPage(1);
              }}
              aria-label={t[lang].user}
            >
              <option value="">{t[lang].allUsers}</option>
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600 mb-1">{t[lang].from}</label>
            <input
              type="date"
              className={cn(theme.input.base, theme.input.size.md)}
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              aria-label={t[lang].from}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600 mb-1">{t[lang].to}</label>
            <input
              type="date"
              className={cn(theme.input.base, theme.input.size.md)}
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              aria-label={t[lang].to}
            />
          </div>

          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => fetchLogs()}
            aria-label={t[lang].apply}
          >
            {t[lang].apply}
          </button>

          <button
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium rounded-md shadow-sm transition focus:outline-none focus:ring-2 focus:ring-gray-400"
            onClick={() => {
              setSelectedUserId('');
              setFromDate('');
              setToDate('');
              setPage(1);
              fetchLogs();
            }}
            aria-label={t[lang].reset}
          >
            {t[lang].reset}
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t[lang].name}
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t[lang].userId}
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t[lang].loginTime}
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t[lang].logoutTime}
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t[lang].duration}
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t[lang].ip}
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t[lang].userAgent}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm">
                    {t[lang].loading}
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-red-600 text-sm">
                    {error}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-sm">
                    {t[lang].noLogs}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{displayName(log)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{log.user_id}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(log.login_time)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(log.logout_time)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{formatDuration(log.duration_seconds)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{log.ip_address}</td>
                    <td className="px-4 py-4 max-w-xs truncate text-xs text-gray-500" title={log.user_agent || ''}>
                      {log.user_agent || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {logs.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 rounded-b-lg">
          <div className="text-sm text-gray-700">
            {t[lang].page} {page}
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.max(1, p - 1));
                  }}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                    page <= 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-blue-600 hover:bg-blue-50'
                  }`}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (hasNextPage) setPage((p) => p + 1);
                  }}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                    !hasNextPage
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-blue-600 hover:bg-blue-50'
                  }`}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}