import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DataTable } from '../components/ui/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';

import { useLanguage } from '@/lib/language';
import { FileDown } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { theme } from '@/styles/theme';
import { Input } from '@/components/ui/input';

export interface SessionLog {
  id: number;
  user_id: number;
  login_time: string;
  logout_time: string | null;
  ip_address: string;
  user_agent: string;
  duration_seconds: number | null;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

const SessionLogsPage = () => {
  const { token } = useAuth();
  const { language } = useLanguage();
  
  // Translation object
  const translations = {
    english: {
      // Page title
      sessionLogs: 'Session Logs',
      
      // Table headers
      id: 'ID',
      userId: 'User ID',
      loginTime: 'Login Time',
      logoutTime: 'Logout Time',
      ipAddress: 'IP Address',
      userAgent: 'User Agent',
      duration: 'Duration (seconds)',
      
      // Status
      stillLoggedIn: 'Still logged in',
      
      // Filters
      from: 'From',
      to: 'To',
      searchPlaceholder: 'Search by user/IP/agent',
      search: 'Search',
      clear: 'Clear',
      
      // Buttons
      exportCSV: 'Export CSV',
      exportPDF: 'Export PDF',
      
      // Pagination
      showing: 'Showing',
      of: 'of',
      results: 'results',
      
      // Analytics
      totalSessions: 'Total Sessions',
      activeSessions: 'Active Sessions',
      avgDuration: 'Avg Duration',
      totalDuration: 'Total Duration',
      
      // Context menu
      columns: 'Columns',
      visible: 'Visible',
      selectAll: 'Select all',
      clearAll: 'Clear all',
      reset: 'Reset',
      close: 'Close'
    },
    tamil: {
      // Page title
      sessionLogs: 'அமர்வு பதிவுகள்',
      
      // Table headers
      id: 'ஐடி',
      userId: 'பயனர் ஐடி',
      loginTime: 'உள்நுழை நேரம்',
      logoutTime: 'வெளியேறு நேரம்',
      ipAddress: 'ஐ.பி. முகவரி',
      userAgent: 'பயனர் முகவரி',
      duration: 'கால அளவு (நொடிகள்)',
      
      // Status
      stillLoggedIn: 'இன்னும் உள்நுழைந்திருக்கிறார்',
      
      // Filters
      from: 'தொடக்கம்',
      to: 'முடிவு',
      searchPlaceholder: 'பயனர்/ஐ.பி./ஏஜெண்ட் மூலம் தேடுக',
      search: 'தேடு',
      clear: 'அழி',
      
      // Buttons
      exportCSV: 'CSV ஏற்றுமதி',
      exportPDF: 'PDF ஏற்றுமதி',
      
      // Pagination
      showing: 'காட்டப்படுகிறது',
      of: 'மொத்தம்',
      results: 'முடிவுகள்',
      
      // Analytics
      totalSessions: 'மொத்த அமர்வுகள்',
      activeSessions: 'செயலில் உள்ள அமர்வுகள்',
      avgDuration: 'சராசரி கால அளவு',
      totalDuration: 'மொத்த கால அளவு',
      
      // Context menu
      columns: 'நெடுவரிசைகள்',
      visible: 'காட்டப்படும்',
      selectAll: 'அனைத்தையும் தேர்ந்தெடு',
      clearAll: 'அனைத்தையும் அழி',
      reset: 'மீட்டமை',
      close: 'மூடு'
    }
  };
  
  const translate = (key: keyof typeof translations.english): string => {
    return language === 'tamil' ? translations.english[key] : translations.tamil[key];
  };

  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [stats, setStats] = useState<{
    totalSessions?: number;
    activeSessions?: number;
    avgDuration?: number;
    totalDuration?: number;
  }>({});

  // Context Menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  // Column Keys
  type ColKey =
    | 'id'
    | 'user_id'
    | 'login_time'
    | 'logout_time'
    | 'ip_address'
    | 'user_agent'
    | 'duration_seconds';

  const allColumns: Array<{ key: ColKey; label: string }> = [
    { key: 'id', label: language === 'english' ? 'ஐடி' : 'ID' },
    { key: 'user_id', label: language === 'english' ? 'பயனர் ஐடி' : 'User ID' },
    { key: 'login_time', label: language === 'english' ? 'உள்நுழை நேரம்' : 'Login Time' },
    { key: 'logout_time', label: language === 'english' ? 'வெளியேறு நேரம்' : 'Logout Time' },
    { key: 'ip_address', label: language === 'english' ? 'ஐ.பி. முகவரி' : 'IP Address' },
    { key: 'user_agent', label: language === 'english' ? 'பயனர் முகவரி' : 'User Agent' },
    { key: 'duration_seconds', label: language === 'english' ? 'கால அளவு (நொடிகள்)' : 'Duration (seconds)' },
  ];

  const STORAGE_KEY = 'session_logs_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    id: true,
    user_id: true,
    login_time: true,
    logout_time: true,
    ip_address: true,
    user_agent: true,
    duration_seconds: true,
  };

  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultVisible, ...JSON.parse(saved) } : defaultVisible;
    } catch {
      return defaultVisible;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols));
    } catch {}
  }, [visibleCols]);

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  // Format duration
  const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Fetch session logs
  const fetchSessionLogs = async (page: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pagination.itemsPerPage),
        ...(search && { search }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const response = await fetch(`https://tmsapi.xesstechlink.com/api/session-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch session logs');

      const { data, pagination: paginationData } = await response.json();
      setSessionLogs(data);
      setPagination(paginationData);
    } catch (error) {
      console.error('Error fetching session logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionLogs(1);
  }, [token]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      fetchSessionLogs(1);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const response = await fetch(`https://tmsapi.xesstechlink.com/api/session-logs/export?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to export session logs');

      const { data, stats: exportStats } = await response.json();
      setStats(exportStats);

      const headers = allColumns.map(c => c.label);
      const rows = data.map(log => [
        log.id,
        log.user_id,
        new Date(log.login_time).toLocaleString(),
        log.logout_time ? new Date(log.logout_time).toLocaleString() : translate('stillLoggedIn'),
        log.ip_address,
        log.user_agent,
        formatDuration(log.duration_seconds),
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-logs-${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  const handleExportPDF = async () => {
    try {
      const params = new URLSearchParams();
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`https://tmsapi.xesstechlink.com/api/session-logs/export-pdf?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to export PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'session-logs.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      // toast.error('Failed to export PDF');
    }
  };

  // Define columns for DataTable
  const columns = useMemo<ColumnDef<SessionLog>[]>(() => {
    return allColumns
      .filter(col => visibleCols[col.key])
      .map(col => ({
        accessorKey: col.key,
        header: col.label,
        cell: ({ row }) => {
          const value = row.original[col.key];
          if (col.key === 'login_time' || (col.key === 'logout_time' && value))
            return new Date(value as string).toLocaleString();
          if (col.key === 'logout_time' && !value)
            return translate('stillLoggedIn');
          if (col.key === 'duration_seconds')
            return formatDuration(value as number | null);
          return value?.toString() || '-';
        },
      }));
  }, [visibleCols, language]);

  return (
    <div  className={pageContainerStyles.container} onContextMenu={onContextMenu}>
      {/* Header */}

     
      <Card className={pageContainerStyles.content}>
        <CardHeader className={theme.header.container}>
          <div className={theme.header.contentSpacing}>
            <CardTitle className={theme.header.main}>
            {translate('sessionLogs')}
            </CardTitle>
          </div>
        </CardHeader>


      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3 items-center">
          {/* Date Range */}
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative">
              <label className="text-xs text-gray-500 block mb-1">{translate('from')}</label>
              <div className="relative">
                <Input
                  type="text"
                  readOnly
                  value={startDate}
                  onClick={() => setShowStartCalendar(!showStartCalendar)}
                  placeholder="Select start date"
                  className={cn(theme.input.base, "w-full rounded-md py-2 pl-3 pr-10 text-sm")}
                />
                {showStartCalendar && (
                  <div className="absolute z-10 mt-1 bg-white border rounded-md shadow-lg">
                    <Calendar
                      mode="single"
                      selected={startDate ? new Date(startDate) : undefined}
                      onSelect={(date) => {
                        setStartDate(date?.toISOString().split('T')[0] || '');
                        setShowStartCalendar(false);
                      }}
                      className="border-0"
                      initialFocus={true}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="relative">
              <label className="text-xs text-gray-500 block mb-1">{translate('to')}</label>
              <div className="relative">
                <Input
                  type="text"
                  readOnly
                  value={endDate}
                  onClick={() => setShowEndCalendar(!showEndCalendar)}
                  placeholder="Select end date"
                  className={cn(theme.input.base, "w-full rounded-md py-2 pl-3 pr-10 text-sm")}
                />
                {showEndCalendar && (
                  <div className="absolute z-10 mt-1 bg-white border rounded-md shadow-lg">
                    <Calendar
                      mode="single"
                      selected={endDate ? new Date(endDate) : undefined}
                      onSelect={(date) => {
                        setEndDate(date?.toISOString().split('T')[0] || '');
                        setShowEndCalendar(false);
                      }}
                      className="border-0"
                      initialFocus={true}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <Input
              type="text"
              placeholder={translate('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearch}
              className={cn(theme.input.base, "pl-10")}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button onClick={() => fetchSessionLogs(1)}>
              {translate('search')}
            </Button>
            <Button variant="outline" onClick={() => setSearch('')}>
              {translate('clear')}
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <FileDown className="h-4 w-4 mr-1" />
              {translate('exportCSV')}
            </Button>
          </div>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={sessionLogs}
        isLoading={isLoading}
        pagination={{
          currentPage: pagination.currentPage,
          totalPages: pagination.totalPages,
          onPageChange: fetchSessionLogs,
        }}
      />

      {/* Summary Footer */}
      <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 mt-4">
        <div className="text-sm text-gray-700">
          {translate('showing')}{' '}
          <span className="font-medium">{sessionLogs.length}</span> {translate('of')}{' '}
          <span className="font-medium">{pagination.totalItems}</span> {translate('results')}
        </div>
        <div className="text-sm text-gray-700">
          {translate('totalSessions')}: <span className="font-medium">{pagination.totalItems}</span>
        </div>
      </div>

      {/* Analytics Summary */}
      {stats.totalSessions !== undefined && (
        <div className="bg-gray-50 rounded-lg p-4 mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-3 rounded shadow">
            <h3 className="text-sm font-medium text-gray-500">{translate('totalSessions')}</h3>
            <p className="text-2xl font-bold">{stats.totalSessions}</p>
          </div>
          <div className="bg-white p-3 rounded shadow">
            <h3 className="text-sm font-medium text-gray-500">{translate('activeSessions')}</h3>
            <p className="text-2xl font-bold">{stats.activeSessions}</p>
          </div>
          <div className="bg-white p-3 rounded shadow">
            <h3 className="text-sm font-medium text-gray-500">{translate('avgDuration')}</h3>
            <p className="text-2xl font-bold">{formatDuration(stats.avgDuration || 0)}</p>
          </div>
          <div className="bg-white p-3 rounded shadow">
            <h3 className="text-sm font-medium text-gray-500">{translate('totalDuration')}</h3>
            <p className="text-2xl font-bold">{formatDuration(stats.totalDuration || 0)}</p>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 w-64"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">{translate('columns')}</h3>
            <p className="text-xs text-gray-500">
              {language === 'tamil' ? 'காட்டப்படும்' : 'Visible'} {Object.values(visibleCols).filter(Boolean).length}/{allColumns.length}
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto p-2">
            {allColumns.map((col) => (
              <label
                key={col.key}
                className="flex items-center px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={!!visibleCols[col.key]}
                  onChange={() =>
                    setVisibleCols((prev) => ({ ...prev, [col.key]: !prev[col.key] }))
                  }
                  className={cn(theme.input.base, "h-4 w-4 text-blue-600 rounded")}
                />
                <span className="ml-2 text-sm text-gray-700">{col.label}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 p-2 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() =>
                setVisibleCols(
                  Object.fromEntries(allColumns.map((c) => [c.key, true])) as Record<ColKey, boolean>
                )
              }
            >
              {translate('selectAll')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() =>
                setVisibleCols(
                  Object.fromEntries(allColumns.map((c) => [c.key, false])) as Record<ColKey, boolean>
                )
              }
            >
              {translate('clearAll')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setVisibleCols({ ...defaultVisible })}
            >
              {translate('reset')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs ml-auto"
              onClick={() => setMenuOpen(false)}
            >
              {translate('close')}
            </Button>
          </div>
        </div>
      )}
      </Card>
    </div>
  );
};

export default SessionLogsPage;