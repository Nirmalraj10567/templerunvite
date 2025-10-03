import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/styles/formStyles";
import { formFieldStyles } from "@/styles/formStyles";

interface HallLogViewProps {
  recentOnly?: boolean;
}

interface HallBookingLog {
  id: number;
  hall_booking_id: number;
  action: string;
  created_at: string;
  created_by: number | null;
  hall_booking_name: string | null;
  receipt_number: string | null;
  register_no: string | null;
  details: any;
}

export default function HallLogView({ recentOnly = false }: HallLogViewProps) {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { language } = useLanguage();
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [logs, setLogs] = useState<HallBookingLog[]>([]);
  const [userDetails, setUserDetails] = useState<Record<number, { name: string; username?: string; mobile?: string }>>({});
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 1,
  });

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch user details
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

  // Fetch logs
  const fetchLogs = useCallback(async (page = 1, search = "") => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: recentOnly ? '10' : '50',
      ...(search && { search }),
      ...(recentOnly && { recent: 'true' })
    });
    try {
      setLoading(true);
      const res = await fetch(
        `http://localhost:4000/api/hall-bookings/logs?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error('Failed to fetch logs');
      const result = await res.json();

      if (result.success) {
        const logsData = Array.isArray(result.data) ? result.data : [];
        setLogs(logsData);
        
        const total = Number(result.total || 0);
        const totalPages = Math.max(1, Math.ceil(total / 50));
        
        setPagination({
          page,
          pageSize: 50,
          total,
          totalPages,
        });

        const userIds = logsData
          .map(log => log.created_by)
          .filter((id): id is number => id !== null && id !== undefined);
          
        if (userIds.length > 0) {
          await fetchUserDetails(userIds);
        }
      } else {
        setLogs([]);
        setPagination({ page: 1, pageSize: 50, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
      setLogs([]);
      setPagination({ page: 1, pageSize: 50, total: 0, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, [token, fetchUserDetails, recentOnly]);

  // Handle search form submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearchTerm(searchTerm);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchLogs(newPage, debouncedSearchTerm);
  };

  // Trigger API call when debounced search or initial load changes
  useEffect(() => {
    fetchLogs(1, debouncedSearchTerm);
  }, [debouncedSearchTerm, fetchLogs]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="mb-4">
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              {loading && debouncedSearchTerm === searchTerm ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </div>
            <Input
              placeholder={t('Search logs by name, receipt, or user...', 'பெயர், ரசீது அல்லது பயனர் மூலம் தேடவும்...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              disabled={loading && debouncedSearchTerm === searchTerm}
            />
          </div>
          <Button 
            type="submit" 
            variant="outline" 
            disabled={loading && debouncedSearchTerm === searchTerm}
          >
            {t('Search', 'தேடு')}
          </Button>
        </div>
      </form>

          {/* Table */}
          <div className="border rounded-md overflow-hidden">
            {loading && debouncedSearchTerm === searchTerm ? (
              <div className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">{t('Loading logs...', 'பதிவுகள் ஏற்றப்படுகிறது...')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Action', 'செயல்')}</TableHead>
                    <TableHead>{t('Date & Time', 'தேதி & நேரம்')}</TableHead>
                    <TableHead>{t('Booking ID', 'பதிவு ஐடி')}</TableHead>
                    <TableHead>{t('Name', 'பெயர்')}</TableHead>
                    <TableHead>{t('Receipt No', 'ரசீது எண்')}</TableHead>
                    <TableHead>{t('User', 'பயனர்')}</TableHead>
                    <TableHead>{t('Details', 'விவரங்கள்')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {t('No logs found', 'பதிவுகள் கிடைக்கவில்லை')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((lg) => (
                      <TableRow key={lg.id}>
                        <TableCell>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            lg.action === 'create' ? 'bg-green-100 text-green-800' :
                            lg.action === 'update' ? 'bg-blue-100 text-blue-800' :
                            lg.action === 'delete' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {lg.action === 'create' ? t('Created', 'உருவாக்கப்பட்டது') :
                             lg.action === 'update' ? t('Updated', 'புதுப்பிக்கப்பட்டது') :
                             lg.action === 'delete' ? t('Deleted', 'நீக்கப்பட்டது') :
                             lg.action}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{lg.created_at ? formatDate(lg.created_at) : '-'}</TableCell>
                        <TableCell>{lg.hall_booking_id}</TableCell>
                        <TableCell>{lg.hall_booking_name ?? '-'}</TableCell>
                        <TableCell>
                          {(() => {
                            // Try to get receipt number from multiple sources
                            const receiptNo = lg.register_no || lg.receipt_number;
                            if (receiptNo) return receiptNo;
                            
                            // Try to extract from details
                            try {
                              const details = typeof lg.details === 'string' 
                                ? JSON.parse(lg.details) 
                                : lg.details || {};
                              const registerNo = details.register_no || details.after?.register_no || details.before?.register_no;
                              return registerNo || '-';
                            } catch {
                              return '-';
                            }
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const userId = lg.created_by;
                            if (!userId) return '-';
                            const user = userDetails[userId];
                            if (user?.username) return `@${user.username}`;
                            if (user?.name) return user.name;
                            return `User ${userId}`;
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600 max-w-md">
                            {(() => {
                              // Parse hall booking details from the log data
                              const details = lg.details;
                              if (!details) return <span className="text-gray-400">-</span>;
                              
                              // Extract specific fields from the details
                              const registerNo = details.register_no || details.after?.register_no || details.before?.register_no;
                              const name = details.name || details.after?.name || details.before?.name;
                              const mobile = details.mobile || details.after?.mobile || details.before?.mobile;
                              const advanceAmount = details.advance_amount || details.after?.advance_amount || details.before?.advance_amount;
                              const totalAmount = details.total_amount || details.after?.total_amount || details.before?.total_amount;
                              const balanceAmount = details.balance_amount || details.after?.balance_amount || details.before?.balance_amount;
                              const event = details.event || details.after?.event || details.before?.event;
                              const date = details.date || details.after?.date || details.before?.date;
                              const time = details.time || details.after?.time || details.before?.time;
                              const village = details.village || details.after?.village || details.before?.village;
                              
                              return (
                                <div className="space-y-2">
                                  <div className="bg-blue-50 p-3 rounded border text-xs">
                                    <div className="font-medium text-blue-700 mb-2">{t('Hall Booking Details', 'மண்டப பதிவு விவரங்கள்')}</div>
                                    <div className="space-y-1 text-gray-600">
                                      {registerNo && (
                                        <div className="flex justify-between">
                                          <span className="font-medium">{t('Receipt No', 'ரசீது எண்')}:</span>
                                          <span>{registerNo}</span>
                                        </div>
                                      )}
                                      {name && (
                                        <div className="flex justify-between">
                                          <span className="font-medium">{t('Name', 'பெயர்')}:</span>
                                          <span>{name}</span>
                                        </div>
                                      )}
                                      {mobile && (
                                        <div className="flex justify-between">
                                          <span className="font-medium">{t('Phone', 'கைபேசி')}:</span>
                                          <span>{mobile}</span>
                                        </div>
                                      )}
                                      {event && (
                                        <div className="flex justify-between">
                                          <span className="font-medium">{t('Event', 'நிகழ்வு')}:</span>
                                          <span>{event}</span>
                                        </div>
                                      )}
                                      {date && (
                                        <div className="flex justify-between">
                                          <span className="font-medium">{t('Date', 'தேதி')}:</span>
                                          <span>{date}</span>
                                        </div>
                                      )}
                                      {time && (
                                        <div className="flex justify-between">
                                          <span className="font-medium">{t('Time', 'நேரம்')}:</span>
                                          <span>{time}</span>
                                        </div>
                                      )}
                                      {village && (
                                        <div className="flex justify-between">
                                          <span className="font-medium">{t('Village', 'கிராமம்')}:</span>
                                          <span>{village}</span>
                                        </div>
                                      )}
                                      {advanceAmount && (
                                        <div className="flex justify-between">
                                          <span className="font-medium">{t('Advance', 'முன்பணம்')}:</span>
                                          <span>₹{advanceAmount}</span>
                                        </div>
                                      )}
                                      {totalAmount && (
                                        <div className="flex justify-between">
                                          <span className="font-medium">{t('Total', 'மொத்தம்')}:</span>
                                          <span>₹{totalAmount}</span>
                                        </div>
                                      )}
                                      {balanceAmount && (
                                        <div className="flex justify-between">
                                          <span className="font-medium">{t('Balance', 'இருப்பு')}:</span>
                                          <span>₹{balanceAmount}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between py-4">
            <div className="text-sm text-muted-foreground">
              {t('Showing', 'காட்டப்படுகிறது')}{" "}
              <span className="font-medium">
                {logs.length > 0 
                  ? `${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.total)}` 
                  : '0'}
              </span>{" "}
              {t('of', 'இல்')}{" "}
              <span className="font-medium">{pagination.total}</span>{" "}
              {t('items', 'உருப்படிகள்')}
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={pagination.page <= 1 || loading}
                >
                  {t('First', 'முதல்')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                >
                  {t('Previous', 'முந்தைய')}
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  {t('Page', 'பக்கம்')} {pagination.page} {t('of', 'இலிருந்து')} {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                >
                  {t('Next', 'அடுத்தது')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.totalPages)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                >
                  {t('Last', 'கடைசி')}
                </Button>
              </div>
            )}
          </div>
    </div>
  );
}
