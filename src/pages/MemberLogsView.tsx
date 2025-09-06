import React, { useEffect, useMemo, useState } from 'react';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

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
  language: 'tamil' | 'english' | string;
  membersOptions?: Array<{ user_id: number; name: string }>; // optional pre-fetched members for dropdown
}

export default function MemberLogsView({ token, language, membersOptions }: MemberLogsViewProps) {
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

  const t = (en: string, ta: string) => (language === 'tamil' ? ta : en);

  const fetchLogs = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (selectedUserId) params.set('userId', selectedUserId);
      if (fromDate) params.set('from', new Date(fromDate).toISOString());
      if (toDate) {
        const end = new Date(toDate);
        // Include the day end for inclusive range
        end.setHours(23, 59, 59, 999);
        params.set('to', end.toISOString());
      }
      const res = await fetch(`/api/session-logs?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data: SessionLog[] = await res.json();
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
    if (membersOptions && membersOptions.length) return; // already provided
    // Optionally, try to fetch minimal users for dropdown if not provided
    const fetchUsers = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/admin/members?minimal=1', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const arr = await res.json();
        const mapped = (arr || []).map((m: any) => ({ user_id: m.user_id || m.id, name: m.fullName || m.full_name || m.username || String(m.user_id || m.id) }));
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
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold">{t('Member Logs', 'உறுப்பினர் பதிவுகள்')}</h2>
        <div className="flex items-end gap-2">
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">{t('User', 'பயனர்')}</label>
            <select
              className="border rounded px-2 py-1 text-sm min-w-[220px]"
              value={selectedUserId}
              onChange={(e) => { setSelectedUserId(e.target.value); setPage(1); }}
            >
              <option value="">{t('All Users', 'அனைத்து பயனர்கள்')}</option>
              {users.map(u => (
                <option key={u.user_id} value={u.user_id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">{t('From', 'இருந்து')}</label>
            <input type="date" className="border rounded px-2 py-1 text-sm" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">{t('To', 'வரை')}</label>
            <input type="date" className="border rounded px-2 py-1 text-sm" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
          </div>
          <button
            className="bg-orange-600 hover:bg-orange-700 text-white text-sm px-3 py-2 rounded"
            onClick={() => fetchLogs()}
          >
            {t('Apply', 'பயிற்சி')}
          </button>
          <button
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm px-3 py-2 rounded"
            onClick={() => { setSelectedUserId(''); setFromDate(''); setToDate(''); setPage(1); fetchLogs(); }}
          >
            {t('Reset', 'மீட்டமை')}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('Name', 'பெயர்')}</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('User ID', 'பயனர் ஐடி')}</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('Login Time', 'உள்நுழைவு நேரம்')}</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('Logout Time', 'வெளியேறும் நேரம்')}</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('Duration', 'கால அளவு')}</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">IP</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('User Agent', 'பயனர் முகவர்')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">{t('Loading...', 'ஏற்றுகிறது...')}</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-red-600">{error}</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">{t('No logs found', 'பதிவுகள் இல்லை')}</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-900">{displayName(log)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{log.user_id}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{formatDate(log.login_time)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{formatDate(log.logout_time)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{formatDuration(log.duration_seconds ?? undefined)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{log.ip_address}</td>
                  <td className="px-4 py-2 text-xs text-gray-600 max-w-[320px] truncate" title={log.user_agent || ''}>{log.user_agent || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pt-2">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
                className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-3 py-2 text-sm text-gray-700">{t('Page', 'பக்கம்')} {page}</span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => { e.preventDefault(); if (hasNextPage) setPage((p) => p + 1); }}
                className={!hasNextPage ? 'pointer-events-none opacity-50' : ''}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
