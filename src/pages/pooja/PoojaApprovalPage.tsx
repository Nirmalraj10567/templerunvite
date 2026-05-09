import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useLanguage } from '@/lib/language';
import { useAuth } from '@/contexts/AuthContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Eye, Clock, User, Phone, Calendar, FileText, Search, RefreshCw } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { theme, tableClasses, buttonClasses } from '@/styles/theme';

interface PoojaRequest {
  id: number;
  receipt_number: string;
  name: string;
  mobile_number: string;
  time: string;
  from_date: string;
  to_date: string;
  remarks?: string;
  submitted_by_mobile: string;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_at?: string;
  rejection_reason?: string;
  admin_notes?: string;
  logs?: ApprovalLog[];
}

interface ApprovalLog {
  id: number;
  action: string;
  performed_by?: number;
  performed_at: string;
  notes?: string;
  old_status?: string;
  new_status?: string;
  performed_by_name?: string;
}

interface ApprovalStats {
  status_counts: {
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
  };
  recent_activity: Array<{
    action: string;
    count: number;
  }>;
  total_requests: number;
}

export default function PoojaApprovalPage() {
  const { language } = useLanguage();
  const t = (en: string, ta: string) => (language === 'tamil' ? en : ta);;
  const { token } = useAuth();
  const { toast } = useToast();

  // State for pagination
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  const [requests, setRequests] = useState<PoojaRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<PoojaRequest | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
  const [isBulkActionDialogOpen, setIsBulkActionDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject'>('approve');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [requestLogs, setRequestLogs] = useState<ApprovalLog[]>([]);

  // Logs modal state
  const [logsFor, setLogsFor] = useState<number | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<Array<{ id: number; action: string; created_at: string; created_by: number | null; details: any }>>([]);

  // All Logs (temple scoped) state
  const [allLogsOpen, setAllLogsOpen] = useState(false);
  const [allLogsLoading, setAllLogsLoading] = useState(false);
  const [allLogs, setAllLogs] = useState<Array<{
    id: number;
    pooja_id: number;
    action: string;
    created_at: string;
    created_by: number | null;
    pooja_name: string | null;
    receipt_number: string | null;
    details: any;
  }>>([]);
  const [allLogsTotal, setAllLogsTotal] = useState(0);
  const [allLogsPage, setAllLogsPage] = useState(1);
  const allLogsPageSize = 50;

  // Column Keys
  type ColKey = 'receipt' | 'name' | 'mobile' | 'dateRange' | 'time' | 'status' | 'submitted' | 'actions';

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = [
    { key: 'receipt', label: t('Receipt No', 'ரசீது எண்') },
    { key: 'name', label: t('Name', 'பெயர்') },
    { key: 'mobile', label: t('Mobile', 'மொபைல்') },
    { key: 'dateRange', label: t('Date Range', 'தேதி வரம்பு') },
    { key: 'time', label: t('Time', 'நேரம்') },
    { key: 'status', label: t('Status', 'நிலை') },
    { key: 'submitted', label: t('Submitted', 'சமர்ப்பிக்கப்பட்டது') },
    { key: 'actions', label: t('Actions', 'செயல்கள்'), align: 'center' },
  ];

  const STORAGE_KEY = 'pooja_approval_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    receipt: true,
    name: true,
    mobile: true,
    dateRange: true,
    time: true,
    status: true,
    submitted: false, // Hidden by default to save space
    actions: true,
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
    } catch { }
  }, [visibleCols]);

  // Context Menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

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

  const visibleColCount = useMemo(
    () => Object.values(visibleCols).filter(Boolean).length + 1, // +1 for checkbox
    [visibleCols]
  );

  // Logs functions
  const openLogs = async (poojaId: number) => {
    setLogsFor(poojaId);
    setLogs([]);
    setLogsLoading(true);
    try {
      const res = await fetch(`https://templeapi.agniplay.com/api/pooja-approval/${poojaId}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error:', res.status, errorText);
        throw new Error(`Failed to fetch logs: ${res.status}`);
      }
      const result = await res.json();
      console.log('Logs API Response:', result); // Debug log
      if (result.success) {
        setLogs(Array.isArray(result.data) ? result.data : []);
      } else {
        console.error('API returned error:', result.error);
        setLogs([]);
      }
    } catch (e) {
      console.error('Failed to load logs:', e);
      setLogs([]);
      // Show user-friendly error
      alert(t('Failed to load logs. Please try again.', 'பதிவுகளை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'));
    } finally {
      setLogsLoading(false);
    }
  };

  const closeLogs = () => {
    setLogsFor(null);
    setLogs([]);
  };

  const openAllLogs = async () => {
    setAllLogsOpen(true);
    await loadAllPoojaLogs(1);
  };

  const loadAllPoojaLogs = async (pageNum: number) => {
    setAllLogsLoading(true);
    try {
      const res = await fetch(`https://templeapi.agniplay.com/api/pooja-approval/logs?page=${pageNum}&pageSize=${allLogsPageSize}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error:', res.status, errorText);
        throw new Error(`Failed to fetch logs: ${res.status}`);
      }
      const result = await res.json();
      console.log('All Logs API Response:', result); // Debug log
      if (result.success) {
        setAllLogs(Array.isArray(result.data) ? result.data : []);
        setAllLogsTotal(Number(result.total || 0));
        setAllLogsPage(pageNum);
      } else {
        console.error('API returned error:', result.error);
        throw new Error(result.error || 'Failed to load logs');
      }
    } catch (e) {
      console.error('Failed to load all logs:', e);
      setAllLogs([]);
      setAllLogsTotal(0);
      // Show user-friendly error
      alert(t('Failed to load logs. Please try again.', 'பதிவுகளை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'));
    } finally {
      setAllLogsLoading(false);
    }
  };

  const closeAllLogs = () => {
    setAllLogsOpen(false);
    setAllLogs([]);
  };

  const fetchRequests = async (page = pagination.page, pageSize = pagination.pageSize) => {
    try {
      setLoading(true);
      const response = await axios.get('https://templeapi.agniplay.com/api/pooja', {
        params: {
          q: searchTerm,
          status: statusFilter || undefined,
          page,
          pageSize,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setRequests(response.data.data);
      setPagination(prev => ({
        ...prev,
        page: response.data.pagination.page,
        pageSize: response.data.pagination.pageSize,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages,
      }));
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: t('Failed to fetch requests', 'கோரிக்கைகளைப் பெறுவதில் தோல்வி'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchRequests(newPage);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPagination(prev => ({
      ...prev,
      pageSize: newSize,
      page: 1, // Reset to first page when changing page size
    }));
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('https://templeapi.agniplay.com/api/pooja/stats/summary', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: t('Failed to fetch statistics', 'புள்ளிவிவரங்களைப் பெறுவதில் தோல்வி'),
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchRequests(pagination.page, pagination.pageSize);
    fetchStats();
  }, [searchTerm, token, statusFilter, pagination.pageSize]);

  const handleApprove = async (requestId: number) => {
    try {
      const response = await fetch(`https://templeapi.agniplay.com/api/pooja-approval/approve/${requestId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          admin_notes: adminNotes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to approve request');
      }

      const result = await response.json();
      if (result.success) {
        toast({
          title: t('Success', 'வெற்றி'),
          description: t('Request approved successfully', 'கோரிக்கை வெற்றிகரமாக அனுமதிக்கப்பட்டது')
        });
        setIsApproveDialogOpen(false);
        setAdminNotes('');
        fetchRequests();
        fetchStats();
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: t('Failed to approve request', 'கோரிக்கையை அனுமதிக்க முடியவில்லை'),
        variant: 'destructive'
      });
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      const response = await fetch(`https://templeapi.agniplay.com/api/pooja-approval/reject/${requestId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rejection_reason: rejectionReason,
          admin_notes: adminNotes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reject request');
      }

      const result = await response.json();
      if (result.success) {
        toast({
          title: t('Success', 'வெற்றி'),
          description: t('Request rejected successfully', 'கோரிக்கை வெற்றிகரமாக நிராகரிக்கப்பட்டது')
        });
        setIsRejectDialogOpen(false);
        setRejectionReason('');
        setAdminNotes('');
        fetchRequests();
        fetchStats();
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: t('Failed to reject request', 'கோரிக்கையை நிராகரிக்க முடியவில்லை'),
        variant: 'destructive'
      });
    }
  };

  const handleBulkAction = async () => {
    try {
      const response = await fetch('https://templeapi.agniplay.com/api/pooja-approval/bulk-action', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: bulkAction,
          request_ids: selectedRequests,
          reason: bulkAction === 'reject' ? rejectionReason : undefined,
          admin_notes: adminNotes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to perform bulk action');
      }

      const result = await response.json();
      if (result.success) {
        toast({
          title: t('Success', 'வெற்றி'),
          description: t(`Bulk ${bulkAction} completed`, `மொத்த ${bulkAction} முடிக்கப்பட்டது`)
        });
        setIsBulkActionDialogOpen(false);
        setSelectedRequests([]);
        setRejectionReason('');
        setAdminNotes('');
        fetchRequests();
        fetchStats();
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: t('Failed to perform bulk action', 'மொத்த செயலைச் செய்ய முடியவில்லை'),
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    if (!status) {
      status = 'pending';
    }

    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: XCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-xs h-5`}>
        <Icon className="w-2 h-2 mr-1" />
        {t(status.charAt(0).toUpperCase() + status.slice(1), status)}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const d = date.getDate().toString().padStart(2, '0');
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    } catch (e) {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Load request details with logs when opening the view dialog
  useEffect(() => {
    const loadDetails = async () => {
      try {
        if (!isViewDialogOpen || !selectedRequest) return;
        const res = await fetch(`https://templeapi.agniplay.com/api/pooja-approval/request/${selectedRequest.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        const logs: ApprovalLog[] = data?.data?.logs || [];
        setRequestLogs(logs);
      } catch {
        setRequestLogs([]);
      }
    };
    loadDetails();
  }, [isViewDialogOpen, selectedRequest, token]);

  return (
    <div className={pageContainerStyles.container}>
      <Card className={pageContainerStyles.content}>
        <CardHeader className={theme.header.container}>
          <div className={theme.header.contentSpacing}>
            <CardTitle className={theme.header.main}>
              {t("Pooja List Approval", "பூஜை பதிவு அனுமதி")}
            </CardTitle>
          </div>
        </CardHeader>
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          {requests.length} {t('requests', 'கோரிக்கைகள்')}
        </div>


        {/* Compact Statistics */}
        {stats?.status_counts && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            <Card>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">{t('Pending', 'நிலுவை')}</p>
                    <p className="text-lg font-bold text-yellow-600">{stats.status_counts.pending ?? 0}</p>
                  </div>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">{t('Approved', 'அனுமதி')}</p>
                    <p className="text-lg font-bold text-green-600">{stats.status_counts.approved ?? 0}</p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">{t('Rejected', 'நிராகரிப்பு')}</p>
                    <p className="text-lg font-bold text-red-600">{stats.status_counts.rejected ?? 0}</p>
                  </div>
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">{t('Total', 'மொத்தம்')}</p>
                    <p className="text-lg font-bold text-blue-600">{stats.total_requests ?? 0}</p>
                  </div>
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Compact Search and Actions */}
        <Card className="mb-3">
          <CardContent className="px-6 pt-6 pb-6 p-3">
            <div className={formFieldStyles.moneyDonationList.filters.form}>
              <div className={formFieldStyles.moneyDonationList.filters.searchContainer}>
                <div className={formFieldStyles.moneyDonationList.filters.searchIcon}>
                  <svg className={formFieldStyles.moneyDonationList.filters.searchIconSvg} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <Input
                  type="text"
                  placeholder={t('Search by name, mobile, receipt...', 'பெயர், மொபைல், ரசீது தேடு...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(theme.input.base, theme.input.size.sm, formFieldStyles.moneyDonationList.filters.searchInput)}
                />
              </div>

              {/* Status Filter */}
              <div className={formFieldStyles.moneyDonationList.filters.dateContainer}>
                <label className={formFieldStyles.moneyDonationList.filters.dateLabel} htmlFor="statusFilter">
                  {t('Status', 'நிலை')}
                </label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    // when changing filter, reset to first page
                    setPagination((p) => ({ ...p, page: 1 }));
                    fetchRequests(1, pagination.pageSize);
                    fetchStats();
                  }}
                  className={cn(theme.select.base, theme.select.size.sm, formFieldStyles.moneyDonationList.filters.dateInput)}
                >
                  <option value="">{t('All', 'அனைத்தும்')}</option>
                  <option value="pending">{t('Pending', 'நிலுவை')}</option>
                  <option value="approved">{t('Approved', 'அனுமதி')}</option>
                  <option value="rejected">{t('Rejected', 'நிராகரிப்பு')}</option>
                  <option value="cancelled">{t('Cancelled', 'ரத்து')}</option>
                </select>
              </div>

              {/* Bulk Actions */}
              <div className={formFieldStyles.moneyDonationList.filters.buttonContainer}>
                {selectedRequests.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBulkAction('approve');
                        setIsBulkActionDialogOpen(true);
                      }}
                      className={formFieldStyles.moneyDonationList.filters.button}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {t('Approve', 'அனுமதி')} ({selectedRequests.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBulkAction('reject');
                        setIsBulkActionDialogOpen(true);
                      }}
                      className={formFieldStyles.moneyDonationList.filters.button}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      {t('Reject', 'நிராகரி')} ({selectedRequests.length})
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={openAllLogs}
                  className={formFieldStyles.moneyDonationList.filters.button}
                >
                  {t('All Logs', 'அனைத்து பதிவுகள்')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    fetchRequests();
                    fetchStats();
                  }}
                  className={formFieldStyles.moneyDonationList.filters.button}
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compact Table */}
        <div className={tableClasses.scrollContainerWrapper} onContextMenu={onContextMenu}>
          <div className={tableClasses.scrollContainer}>
            <Table className={tableClasses.container}>
              <TableHeader className={tableClasses.header}>
                <TableRow className={tableClasses.row}>
                  <TableHead className={tableClasses.headerCell}>
                    <input
                      type="checkbox"
                      checked={selectedRequests.length === requests.length && requests.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRequests(requests.map(r => r.id));
                        } else {
                          setSelectedRequests([]);
                        }
                      }}
                      className="h-3 w-3"
                    />
                  </TableHead>
                  {allColumns.map(
                    (col) =>
                      visibleCols[col.key] && (
                        <TableHead
                          key={col.key}
                          className={cn(
                            tableClasses.headerCell,
                            col.align === 'right' ? 'text-right' :
                              col.align === 'center' ? 'text-center' :
                                'text-left'
                          )}
                        >
                          {col.label}
                        </TableHead>
                      )
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                   <TableRow  className="whitespace-nowrap">
                    <TableCell colSpan={visibleColCount} className={tableClasses.emptyState}>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      {t('Loading...', 'ஏற்றுகிறது...')}
                    </TableCell>
                  </TableRow>
                ) : requests.length > 0 ? (
                  requests.map((request) => (
                    <TableRow key={request.id} className={tableClasses.row}>
                      <TableCell className={tableClasses.cell}>
                        <input
                          type="checkbox"
                          checked={selectedRequests.includes(request.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRequests([...selectedRequests, request.id]);
                            } else {
                              setSelectedRequests(selectedRequests.filter(id => id !== request.id));
                            }
                          }}
                          className="h-3 w-3"
                        />
                      </TableCell>
                      {visibleCols.receipt && (
                        <TableCell className={tableClasses.cell}>
                          {request.receipt_number}
                        </TableCell>
                      )}
                      {visibleCols.name && (
                        <TableCell className={tableClasses.cell}>
                          <div className="max-w-28 truncate">
                            {request.name}
                          </div>
                        </TableCell>
                      )}
                      {visibleCols.mobile && (
                        <TableCell className={tableClasses.cell}>
                          {request.mobile_number}
                        </TableCell>
                      )}
                      {visibleCols.dateRange && (
                        <TableCell className={tableClasses.cell}>
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                            <div>
                              {formatDate(request.from_date)}
                              {request.from_date !== request.to_date && (
                                <div className="text-gray-400">- {formatDate(request.to_date)}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {visibleCols.time && (
                        <TableCell className={tableClasses.cell}>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1 text-gray-400" />
                            {request.time}
                          </div>
                        </TableCell>
                      )}
                      {visibleCols.status && (
                        <TableCell className={tableClasses.cell}>
                          {getStatusBadge(request.status)}
                        </TableCell>
                      )}
                      {visibleCols.submitted && (
                        <TableCell className={tableClasses.cell}>
                          {formatDateTime(request.submitted_at)}
                        </TableCell>
                      )}
                      {visibleCols.actions && (
                        <TableCell className={cn(tableClasses.cell, tableClasses.actionCell)}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsViewDialogOpen(true);
                              }}
                              className={cn(buttonClasses.actionSecondary, "h-6 w-6 p-0")}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openLogs(request.id)}
                              className={cn(buttonClasses.actionSecondary, "h-6 w-6 p-0 text-blue-600")}
                              title={t('Logs', 'பதிவுகள்')}
                            >
                              {t('L', 'ப')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsApproveDialogOpen(true);
                              }}
                              className={cn(buttonClasses.actionPrimary, "h-6 w-6 p-0 text-green-600")}
                            >
                              <CheckCircle className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsRejectDialogOpen(true);
                              }}
                              className={cn(buttonClasses.actionDanger, "h-6 w-6 p-0 text-red-600")}
                            >
                              <XCircle className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                   <TableRow  className="whitespace-nowrap">
                    <TableCell colSpan={visibleColCount} className={tableClasses.emptyState}>
                      {t('No pending requests found', 'நிலுவை கோரிக்கைகள் எதுவும் கிடைக்கவில்லை')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer */}
          <div className={tableClasses.pagination}>
            <div className="text-xs text-gray-700">
              {t('Showing', 'காட்டப்படுகிறது')} <span className="font-medium">{requests.length}</span> {t('requests', 'கோரிக்கைகள்')}
            </div>
            {selectedRequests.length > 0 && (
              <div className="text-xs text-gray-700">
                <span className="font-medium">{selectedRequests.length}</span> {t('selected', 'தேர்ந்தெடுக்கப்பட்டது')}
              </div>
            )}
          </div>
        </div>

        {/* Pagination Controls */}
        <div className={tableClasses.pagination}>

          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={pagination.page === 1}
              className={tableClasses.paginationButton}
            >
              {t('First', 'முதல்')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className={tableClasses.paginationButton}
            >
              {t('Previous', 'முந்தைய')}
            </Button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={pagination.page === pageNum ? "default" : "outline"}
                    size="sm"
                    className={cn(tableClasses.paginationButton, "w-8 h-8 p-0 text-xs", pagination.page === pageNum ? 'font-bold' : '')}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}

              {pagination.totalPages > 5 && pagination.page < pagination.totalPages - 2 && (
                <span className="px-2">...</span>
              )}

              {pagination.totalPages > 5 && pagination.page < pagination.totalPages - 1 && (
                <Button
                  variant={pagination.page === pagination.totalPages ? "default" : "outline"}
                  size="sm"
                  className={cn(tableClasses.paginationButton, "w-8 h-8 p-0 text-xs")}
                  onClick={() => handlePageChange(pagination.totalPages)}
                >
                  {pagination.totalPages}
                </Button>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className={tableClasses.paginationButton}
            >
              {t('Next', 'அடுத்து')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.totalPages)}
              disabled={pagination.page >= pagination.totalPages}
              className={tableClasses.paginationButton}
            >
              {t('Last', 'கடைசி')}
            </Button>
          </div>
        </div>

        {/* Context Menu */}
        {menuOpen && (
          <div
            ref={menuRef}
            className={tableClasses.contextMenu}
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <div className={tableClasses.contextMenuHeader}>
              <h3 className={tableClasses.contextMenuTitle}>{t('Columns', 'நெடுவரிசைகள்')}</h3>
              <p className={tableClasses.contextMenuSubtitle}>
                {t('Visible', 'காட்டப்படும்')} {Object.values(visibleCols).filter(Boolean).length}/{allColumns.length}
              </p>
            </div>
            <div className={tableClasses.contextMenuContent}>
              {allColumns.map((col) => (
                <label
                  key={col.key}
                  className={tableClasses.contextMenuItem}
                >
                  <input
                    type="checkbox"
                    checked={!!visibleCols[col.key]}
                    onChange={() =>
                      setVisibleCols((prev) => ({ ...prev, [col.key]: !prev[col.key] }))
                    }
                    className={tableClasses.contextMenuCheckbox}
                  />
                  <span className={tableClasses.contextMenuLabel}>{col.label}</span>
                </label>
              ))}
            </div>
            <div className={tableClasses.contextMenuActions}>
              <Button
                variant="outline"
                size="sm"
                className={tableClasses.contextMenuActionButton}
                onClick={() =>
                  setVisibleCols(Object.fromEntries(allColumns.map((c) => [c.key, true])) as any)
                }
              >
                {t('Select all', 'அனைத்தையும் தேர்ந்தெடு')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={tableClasses.contextMenuActionButton}
                onClick={() =>
                  setVisibleCols(Object.fromEntries(allColumns.map((c) => [c.key, false])) as any)
                }
              >
                {t('Clear all', 'அனைத்தையும் அழி')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={tableClasses.contextMenuCloseButton}
                onClick={() => setMenuOpen(false)}
              >
                {t('Close', 'மூடு')}
              </Button>
            </div>
          </div>
        )}

        {/* View Request Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">{t('Request Details', 'கோரிக்கை விவரங்கள்')}</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <Label className="text-xs text-gray-500">{t('Receipt Number', 'ரசீது எண்')}</Label>
                    <p className="font-medium">{selectedRequest.receipt_number}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">{t('Status', 'நிலை')}</Label>
                    <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">{t('Name', 'பெயர்')}</Label>
                    <p className="font-medium">{selectedRequest.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">{t('Mobile', 'மொபைல்')}</Label>
                    <p className="font-medium">{selectedRequest.mobile_number}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">{t('From Date', 'தொடக்க தேதி')}</Label>
                    <p className="font-medium">{formatDate(selectedRequest.from_date)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">{t('To Date', 'முடிவு தேதி')}</Label>
                    <p className="font-medium">{formatDate(selectedRequest.to_date)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">{t('Time', 'நேரம்')}</Label>
                    <p className="font-medium">{selectedRequest.time}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">{t('Submitted', 'சமர்ப்பிக்கப்பட்டது')}</Label>
                    <p className="font-medium">{formatDateTime(selectedRequest.submitted_at)}</p>
                  </div>
                </div>
                {selectedRequest.remarks && (
                  <div>
                    <Label className="text-xs text-gray-500">{t('Remarks', 'கருத்துகள்')}</Label>
                    <p className="mt-1 p-2 bg-gray-50 rounded text-xs">{selectedRequest.remarks}</p>
                  </div>
                )}
                {/* Approval History */}
                {requestLogs && requestLogs.length > 0 && (
                  <div>
                    <Label className="text-xs text-gray-500">{t('Approval History', 'அனுமதி வரலாறு')}</Label>
                    <div className="mt-1 space-y-2">
                      {requestLogs.map((log) => (
                        <div key={log.id} className="p-2 bg-gray-50 rounded text-xs text-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="font-medium capitalize">{log.action}</div>
                            <div className="text-gray-500">{formatDateTime(log.performed_at)}</div>
                          </div>
                          <div className="mt-1">
                            {t('Approved by', 'அனுமதித்தவர்')}: {log.performed_by_name || ''} {log.performed_by ?? ''}
                          </div>
                          {log.notes && (
                            <div className="mt-1 text-gray-600">{log.notes}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Approve Dialog */}
        <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">{t('Approve Request', 'கோரிக்கையை அனுமதிக்கவும்')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">{t('Admin Notes (Optional)', 'நிர்வாக குறிப்புகள்')}</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className={cn(theme.textarea.base, theme.textarea.size.md)}
                  placeholder={t('Add notes...', 'குறிப்புகள் சேர்க்க...')}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsApproveDialogOpen(false)} className="text-xs">
                {t('Cancel', 'ரத்து செய்')}
              </Button>
              <Button
                size="sm"
                onClick={() => selectedRequest && handleApprove(selectedRequest.id)}
                className="text-xs bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                {t('Approve', 'அனுமதி')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">{t('Reject Request', 'கோரிக்கையை நிராகரிக்கவும்')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">{t('Rejection Reason', 'நிராகரிப்பு காரணம்')} *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className={cn(theme.textarea.base, theme.textarea.size.md)}
                  placeholder={t('Reason for rejection...', 'நிராகரிப்பு காரணம்...')}
                  required
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs">{t('Admin Notes', 'நிர்வாக குறிப்புகள்')}</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className={cn(theme.textarea.base, theme.textarea.size.md)}
                  placeholder={t('Additional notes...', 'கூடுதல் குறிப்புகள்...')}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsRejectDialogOpen(false)} className="text-xs">
                {t('Cancel', 'ரத்து செய்')}
              </Button>
              <Button
                size="sm"
                onClick={() => selectedRequest && handleReject(selectedRequest.id)}
                className="text-xs bg-red-600 hover:bg-red-700"
                disabled={!rejectionReason.trim()}
              >
                <XCircle className="w-3 h-3 mr-1" />
                {t('Reject', 'நிராகரி')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Action Dialog */}
        <Dialog open={isBulkActionDialogOpen} onOpenChange={setIsBulkActionDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">
                {t(`Bulk ${bulkAction === 'approve' ? 'Approve' : 'Reject'}`, `மொத்த ${bulkAction === 'approve' ? 'அனுமதி' : 'நிராகரிப்பு'}`)}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-gray-600">
                {t(`You are about to ${bulkAction} ${selectedRequests.length} request(s).`, `நீங்கள் ${selectedRequests.length} கோரிக்கை(களை) ${bulkAction} செய்யப் போகிறீர்கள்.`)}
              </p>
              {bulkAction === 'reject' && (
                <div>
                  <Label className="text-xs">{t('Rejection Reason', 'நிராகரிப்பு காரணம்')} *</Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder={t('Reason for rejection...', 'நிராகரிப்பு காரணம்...')}
                    required
                    rows={2}
                    className="text-xs"
                  />
                </div>
              )}
              <div>
                <Label className="text-xs">{t('Admin Notes', 'நிர்வாக குறிப்புகள்')}</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={t('Additional notes...', 'கூடுதல் குறிப்புகள்...')}
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsBulkActionDialogOpen(false)} className="text-xs">
                {t('Cancel', 'ரத்து செய்')}
              </Button>
              <Button
                size="sm"
                onClick={handleBulkAction}
                className={`text-xs ${bulkAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                disabled={bulkAction === 'reject' && !rejectionReason.trim()}
              >
                {bulkAction === 'approve' ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {t('Approve All', 'அனைத்தையும் அனுமதி')}
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 mr-1" />
                    {t('Reject All', 'அனைத்தையும் நிராகரி')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* All Logs Modal */}
        {allLogsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={closeAllLogs} />
            <div className="relative bg-white rounded shadow-lg w-full max-w-5xl mx-2 p-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">{t('All Pooja Logs', 'அனைத்து பூஜை பதிவுகள்')}</h2>
                <button onClick={closeAllLogs} className="text-xs px-2 py-1 border rounded">{t('Close', 'மூடு')}</button>
              </div>
              {allLogsLoading ? (
                <div className="p-3 text-xs text-gray-600">{t('Loading logs...', 'பதிவுகள் ஏற்றப்படுகிறது...')}</div>
              ) : (
                <>
                  <div className="max-h-[70vh] overflow-y-auto border rounded">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-2 py-1">{t('Time', 'நேரம்')}</th>
                          <th className="text-left px-2 py-1">{t('Action', 'செயல்')}</th>
                          <th className="text-left px-2 py-1">{t('Pooja ID', 'பூஜை ஐடி')}</th>
                          <th className="text-left px-2 py-1">{t('Name', 'பெயர்')}</th>
                          <th className="text-left px-2 py-1">{t('Receipt No', 'ரசீது எண்')}</th>
                          <th className="text-left px-2 py-1">{t('User', 'பயனர்')}</th>
                          <th className="text-left px-2 py-1">{t('Details', 'விவரங்கள்')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allLogs.length === 0 ? (
                          <tr>
                            <td className="px-2 py-2 text-center text-gray-500" colSpan={7}>{t('No logs found', 'பதிவுகள் கிடைக்கவில்லை')}</td>
                          </tr>
                        ) : allLogs.map((lg) => (
                          <tr key={lg.id} className="border-t align-top">
                            <td className="px-2 py-1 whitespace-nowrap">{lg.created_at ? new Date(lg.created_at).toLocaleString(language === 'tamil' ? 'ta-IN' : 'en-IN') : '-'}</td>
                            <td className="px-2 py-1">{lg.action}</td>
                            <td className="px-2 py-1">{lg.pooja_id}</td>
                            <td className="px-2 py-1">{lg.pooja_name ?? '-'}</td>
                            <td className="px-2 py-1">{lg.receipt_number ?? '-'}</td>
                            <td className="px-2 py-1">{lg.created_by ?? '-'}</td>
                            <td className="px-2 py-1"><pre className="whitespace-pre-wrap break-words text-[10px] bg-gray-50 p-2 rounded border max-w-[40vw]">{JSON.stringify(lg.details, null, 2)}</pre></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <div className="text-gray-700">{t('Total', 'மொத்தம்')}: <span className="font-medium">{allLogsTotal}</span></div>
                    <div className="flex items-center gap-2">
                      <button
                        className={cn(theme.input.base, "px-2 py-1 rounded shadow-sm text-xs bg-white hover:bg-gray-50")}
                        disabled={allLogsPage <= 1}
                        onClick={() => loadAllPoojaLogs(allLogsPage - 1)}
                      >
                        {t('Previous', 'முந்தைய')}
                      </button>
                      <span>{t('Page', 'பக்கம்')} {allLogsPage}</span>
                      <button
                        className={cn(theme.input.base, "px-2 py-1 rounded shadow-sm text-xs bg-white hover:bg-gray-50")}
                        disabled={allLogsPage * allLogsPageSize >= allLogsTotal}
                        onClick={() => loadAllPoojaLogs(allLogsPage + 1)}
                      >
                        {t('Next', 'அடுத்தது')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Logs Modal */}
        {logsFor !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={closeLogs} />
            <div className="relative bg-white rounded shadow-lg w-full max-w-4xl mx-2 p-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">{t('Pooja Logs', 'பூஜை பதிவுகள்')} #{logsFor}</h2>
                <button onClick={closeLogs} className="text-xs px-2 py-1 border rounded">{t('Close', 'மூடு')}</button>
              </div>
              {logsLoading ? (
                <div className="p-3 text-xs text-gray-600">{t('Loading logs...', 'பதிவுகள் ஏறுகிறது...')}</div>
              ) : (
                <div className="max-h-[70vh] overflow-y-auto border rounded">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1">{t('Time', 'நேரம்')}</th>
                        <th className="text-left px-2 py-1">{t('Action', 'செயல்')}</th>
                        <th className="text-left px-2 py-1">{t('User', 'பயனர்')}</th>
                        <th className="text-left px-2 py-1">{t('Details', 'விவரங்கள்')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? (
                        <tr><td colSpan={4} className="px-2 py-2 text-center text-gray-500">{t('No logs found', 'பதிவுகள் கிடைக்கவில்லை')}</td></tr>
                      ) : logs.map(lg => (
                        <tr key={lg.id} className="border-t align-top">
                          <td className="px-2 py-1 whitespace-nowrap">{lg.created_at ? new Date(lg.created_at).toLocaleString(language === 'tamil' ? 'ta-IN' : 'en-IN') : '-'}</td>
                          <td className="px-2 py-1">{lg.action}</td>
                          <td className="px-2 py-1">{lg.created_by ?? '-'}</td>
                          <td className="px-2 py-1">
                            <pre className="whitespace-pre-wrap break-words text-[10px] bg-gray-50 p-2 rounded border max-w-[40vw]">{JSON.stringify(lg.details, null, 2)}</pre>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Card >
    </div>
  );
}
