import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/lib/language';
import { useAuth } from '@/contexts/AuthContext';
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { theme } from '@/styles/theme';

interface MoneyDonationLog {
  id: number;
  donation_id: number;
  action: string;
  created_at: string;
  created_by: number | null;
  receipt_number: string | null;
  register_no: string | null;
  details: any;
}

interface MoneyDonationLogViewProps {
  recentOnly?: boolean;
}

export default function MoneyDonationLogView({ recentOnly = false }: MoneyDonationLogViewProps) {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { language } = useLanguage();
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [logs, setLogs] = useState<MoneyDonationLog[]>([]);
  const [userDetails, setUserDetails] = useState<Record<number, { name: string; username?: string; mobile?: string }>>({});
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: recentOnly ? 10 : 50,
    total: 0,
    totalPages: 1,
  });
  
  // Fetch user details for logs
  const fetchUserDetails = useCallback(async (userIds: number[]) => {
    const uniqueIds = Array.from(new Set(userIds.filter((v): v is number => typeof v === 'number')));
    if (uniqueIds.length === 0) return;
    
    const missing = uniqueIds.filter(id => !userDetails[id]);
    if (missing.length === 0) return;

    const results = await Promise.all(
      missing.map(async (id) => {
        try {
          const res = await fetch(`http://localhost:4000/api/admin/members/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return null;
          const u = data?.data?.user || data?.data;
          if (!u) return null;
          const fullName = (u.full_name && String(u.full_name).trim()) || u.username || u.mobile || String(id);
          return { id, name: fullName, username: u.username, mobile: u.mobile };
        } catch {
          return null;
        }
      })
    );

    const detailsMap: Record<number, { name: string; username?: string; mobile?: string }> = {};
    results.forEach(r => {
      if (r) detailsMap[r.id] = { name: r.name, username: r.username, mobile: r.mobile };
    });

    if (Object.keys(detailsMap).length > 0) {
      setUserDetails(prev => ({ ...prev, ...detailsMap }));
    }
  }, [token, userDetails]);

  const fetchLogs = useCallback(async (page = 1, search = "") => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: recentOnly ? '10' : '50',
        ...(search && { search }),
        ...(recentOnly && { recent: 'true' })
      });

      const res = await fetch(
        `http://localhost:4000/api/money-donations/logs?${queryParams}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error('Failed to fetch logs');
      const result = await res.json();

      if (result.success) {
        const logsData = Array.isArray(result.data) ? result.data : [];
        setLogs(logsData);
        
        const total = Number(result.total || 0);
        const totalPages = Math.max(1, Math.ceil(total / (recentOnly ? 10 : 50)));
        
        setPagination({
          page,
          pageSize: recentOnly ? 10 : 50,
          total,
          totalPages,
        });

        // Fetch user details for the logs
        const userIds = logsData
          .map(log => log.created_by)
          .filter((id): id is number => id !== null && id !== undefined);
        
        if (userIds.length > 0) {
          await fetchUserDetails(userIds);
        }
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
      setLogs([]);
      setPagination(prev => ({ ...prev, page: 1, total: 0, totalPages: 1 }));
    } finally {
      setLoading(false);
    }
  }, [token, recentOnly, fetchUserDetails]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Handle search form submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearchTerm(searchTerm);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchLogs(newPage, debouncedSearchTerm);
  };

  // Fetch logs when debouncedSearchTerm or recentOnly changes
  useEffect(() => {
    fetchLogs(1, debouncedSearchTerm);
  }, [debouncedSearchTerm, recentOnly, fetchLogs]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={pageContainerStyles.container}>
      <Card className={pageContainerStyles.content}>
        <CardHeader className={theme.card.header}>
          <CardTitle className={formFieldStyles.tableHeader.title}>
            {t('Money Donation Logs', 'பண நன்கொடை பதிவுகள்')}
          </CardTitle>
        </CardHeader>

        {/* Filters */}
        <div className={formFieldStyles.moneyDonationList.filters.container}>
          <div className={formFieldStyles.moneyDonationList.filters.form}>
            <div className={formFieldStyles.moneyDonationList.filters.searchContainer}>
              <div className={formFieldStyles.moneyDonationList.filters.searchIcon}>
                <svg className={formFieldStyles.moneyDonationList.filters.searchIconSvg} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchSubmit(e);
                  }
                }}
                placeholder={t('Search by receipt number or name...', 'ரசீது எண் அல்லது பெயரைத் தேடுக...')}
                className={cn(theme.input.base, theme.input.size.md, formFieldStyles.moneyDonationList.filters.searchInput)}
                disabled={loading && debouncedSearchTerm === searchTerm}
              />
            </div>

            <div className={formFieldStyles.moneyDonationList.filters.buttonContainer}>
              <button
                onClick={() => handleSearchSubmit({ preventDefault: () => {} } as React.FormEvent)}
                className={formFieldStyles.moneyDonationList.filters.button}
                type="button"
                disabled={loading && debouncedSearchTerm === searchTerm}
              >
                {t('Search', 'தேடு')}
              </button>
              <button
                onClick={() => {
                  setSearchTerm('');
                  fetchLogs(1, '');
                }}
                className={formFieldStyles.moneyDonationList.filters.button}
                type="button"
              >
                {t('Clear', 'அழி')}
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={formFieldStyles.moneyDonationList.table.container}>
          <div className={formFieldStyles.moneyDonationList.table.scrollContainer}>
            <table className={formFieldStyles.moneyDonationList.table.table}>
              <thead className={formFieldStyles.moneyDonationList.table.thead}>
                <tr>
                  <th className={formFieldStyles.moneyDonationList.table.th}>
                    {t('Action', 'செயல்')}
                  </th>
                  <th className={formFieldStyles.moneyDonationList.table.th}>
                    {t('Date & Time', 'தேதி மற்றும் நேரம்')}
                  </th>
                  <th className={formFieldStyles.moneyDonationList.table.th}>
                    {t('Donation ID', 'நன்கொடை ஐடி')}
                  </th>
                  <th className={formFieldStyles.moneyDonationList.table.th}>
                    {t('Receipt No', 'ரசீது எண்')}
                  </th>
                  <th className={formFieldStyles.moneyDonationList.table.th}>
                    {t('Amount', 'தொகை')}
                  </th>
                  <th className={formFieldStyles.moneyDonationList.table.th}>
                    {t('User', 'பயனர்')}
                  </th>
                  <th className={formFieldStyles.moneyDonationList.table.th}>
                    {t('Details', 'விவரங்கள்')}
                  </th>
                </tr>
              </thead>
              <tbody className={formFieldStyles.moneyDonationList.table.tbody}>
                {loading && debouncedSearchTerm === searchTerm ? (
                  <tr>
                    <td colSpan={7} className={formFieldStyles.moneyDonationList.table.loadingCell}>
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={formFieldStyles.moneyDonationList.table.emptyCell}>
                      {t('No logs found', 'பதிவுகள் கிடைக்கவில்லை')}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className={formFieldStyles.moneyDonationList.table.tr}>
                      <td className={formFieldStyles.moneyDonationList.table.td}>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          log.action === 'create' ? 'bg-green-100 text-green-800' :
                          log.action === 'update' ? 'bg-blue-100 text-blue-800' :
                          log.action === 'delete' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.action === 'create' ? t('Created', 'உருவாக்கப்பட்டது') :
                           log.action === 'update' ? t('Updated', 'புதுப்பிக்கப்பட்டது') :
                           log.action === 'delete' ? t('Deleted', 'நீக்கப்பட்டது') :
                           log.action}
                        </span>
                      </td>
                      <td className={formFieldStyles.moneyDonationList.table.tdNowrap}>
                        {log.created_at ? formatDate(log.created_at) : '-'}
                      </td>
                      <td className={formFieldStyles.moneyDonationList.table.td}>{log.donation_id || '-'}</td>
                      <td className={formFieldStyles.moneyDonationList.table.td}>
                        {(() => {
                          // Try to get receipt number from multiple sources
                          const receiptNo = log.register_no || log.receipt_number;
                          if (receiptNo) return receiptNo;
                          
                          // Try to extract from details
                          try {
                            const details = typeof log.details === 'string' 
                              ? JSON.parse(log.details) 
                              : log.details || {};
                            const registerNo = details.register_no || details.after?.register_no || details.before?.register_no;
                            return registerNo || '-';
                          } catch {
                            return '-';
                          }
                        })()}
                      </td>
                      <td className={formFieldStyles.moneyDonationList.table.td}>
                        {log.details?.amount 
                          ? `₹${Number(log.details.amount).toLocaleString('en-IN')}`
                          : (log.amount ? `₹${Number(log.amount).toLocaleString('en-IN')}` : '-')}
                      </td>
                      <td className={formFieldStyles.moneyDonationList.table.td}>
                        {(() => {
                          const userId = log.created_by;
                          if (!userId) return '-';
                          const user = userDetails[userId];
                          if (user?.username) return `@${user.username}`;
                          if (user?.name) return user.name;
                          return `User ${userId}`;
                        })()}
                      </td>
                      <td className={formFieldStyles.moneyDonationList.table.td}>
                        <div className="text-sm text-gray-600 max-w-md">
                          {(() => {
                            try {
                              // Try to parse details if it's a string
                              const details = typeof log.details === 'string' 
                                ? JSON.parse(log.details) 
                                : log.details || {};

                              // If no valid details, return dash
                              if (!details || Object.keys(details).length === 0) {
                                return <span className="text-gray-400">-</span>;
                              }

                              // If details has a 'details' property, use that (nested case)
                              const displayDetails = details.details || details;

                              return (
                                <div className="bg-green-50 p-3 rounded border text-xs">
                                  <div className="font-medium text-green-700 mb-2">{t('Money Donation Details', 'பண நன்கொடை விவரங்கள்')}</div>
                                  <div className="space-y-1 text-gray-600">
                                    {displayDetails.register_no && (
                                      <div className="flex justify-between">
                                        <span className="font-medium">{t('Receipt No', 'ரசீது எண்')}:</span>
                                        <span>{displayDetails.register_no}</span>
                                      </div>
                                    )}
                                    {displayDetails.name && (
                                      <div className="flex justify-between">
                                        <span className="font-medium">{t('Name', 'பெயர்')}:</span>
                                        <span>{displayDetails.name}</span>
                                      </div>
                                    )}
                                    {displayDetails.amount && (
                                      <div className="flex justify-between">
                                        <span className="font-medium">{t('Amount', 'தொகை')}:</span>
                                        <span>₹{displayDetails.amount}</span>
                                      </div>
                                    )}
                                    {displayDetails.phone && (
                                      <div className="flex justify-between">
                                        <span className="font-medium">{t('Phone', 'கைபேசி')}:</span>
                                        <span>{displayDetails.phone}</span>
                                      </div>
                                    )}
                                    {displayDetails.reason && (
                                      <div className="flex justify-between">
                                        <span className="font-medium">{t('Reason', 'காரணம்')}:</span>
                                        <span>{displayDetails.reason}</span>
                                      </div>
                                    )}
                                    {displayDetails.date && (
                                      <div className="flex justify-between">
                                        <span className="font-medium">{t('Date', 'தேதி')}:</span>
                                        <span>{displayDetails.date}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            } catch (e) {
                              // If parsing fails, show the raw value
                              return (
                                <div className="text-xs text-gray-500">
                                  {typeof log.details === 'object' 
                                    ? JSON.stringify(log.details) 
                                    : String(log.details)}
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className={formFieldStyles.moneyDonationList.summary.container}>
            <div className={formFieldStyles.moneyDonationList.summary.info}>
              {t('Showing', 'காட்டப்படுகிறது')} <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>1</span> {t('to', 'இலிருந்து')}{' '}
              <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>{logs.length}</span> {t('of', 'மொத்தம்')}{' '}
              <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>{pagination.total}</span> {t('results', 'முடிவுகள்')}
            </div>
          </div>
        </div>

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className={formFieldStyles.moneyDonationList.pagination.container}>
            <div className={formFieldStyles.moneyDonationList.pagination.info}>
              {t('Total', 'மொத்தம்')}: <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>{pagination.total}</span>
            </div>
            <div className={formFieldStyles.moneyDonationList.pagination.controls}>
              <button
                className={formFieldStyles.moneyDonationList.pagination.button}
                disabled={pagination.page <= 1 || loading}
                onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
              >
                {t('Previous', 'முந்தைய')}
              </button>
              <span className="text-sm text-gray-600">
                {t('Page', 'பக்கம்')} {pagination.page} {t('of', 'இல்')} {pagination.totalPages}
              </span>
              <button
                className={formFieldStyles.moneyDonationList.pagination.button}
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))}
              >
                {t('Next', 'அடுத்தது')}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
