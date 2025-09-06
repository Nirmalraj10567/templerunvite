import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Eye, Clock, FileText, FileDown, Printer, Edit } from 'lucide-react';

interface AnnadhanamRequest {
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
  performed_by_username?: string;
  performed_by_full_name?: string;
}

interface ApprovalStats {
  status_counts: {
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
  };
  recent_activity: Array<{ action: string; count: number; }>;
  total_requests: number;
}

export default function AnnadhanamApprovalPage() {
  const { t } = useLanguage();
  const { token } = useAuth();
  const { toast } = useToast();

  const [requests, setRequests] = useState<AnnadhanamRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<AnnadhanamRequest | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
  const [isBulkActionDialogOpen, setIsBulkActionDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject'>('approve');
  const [isEditingStats, setIsEditingStats] = useState(false);
  const [hasEditPermission, setHasEditPermission] = useState(false);
  const [pendingCount, setPendingCount] = useState(stats?.status_counts.pending || 0);
  const [approvedCount, setApprovedCount] = useState(stats?.status_counts.approved || 0);
  const [rejectedCount, setRejectedCount] = useState(stats?.status_counts.rejected || 0);

  // Context Menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  // Column Keys
  type ColKey =
    | 'select'
    | 'receipt_number'
    | 'name'
    | 'mobile_number'
    | 'date_range'
    | 'time'
    | 'submitted_at'
    | 'status'
    | 'actions';

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = [
    { key: 'select', label: '', align: 'center' },
    { key: 'receipt_number', label: t('Receipt No', 'ரசீது எண்') },
    { key: 'name', label: t('Name', 'பெயர்') },
    { key: 'mobile_number', label: t('Mobile', 'மொபைல்') },
    { key: 'date_range', label: t('Date Range', 'தேதி வரம்பு') },
    { key: 'time', label: t('Time', 'நேரம்') },
    { key: 'submitted_at', label: t('Submitted', 'சமர்ப்பிக்கப்பட்டது') },
    { key: 'status', label: t('Status', 'நிலை'), align: 'center' },
    { key: 'actions', label: t('Actions', 'செயல்கள்'), align: 'center' },
  ];

  const STORAGE_KEY = 'annadhanam_approval_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    select: true,
    receipt_number: true,
    name: true,
    mobile_number: true,
    date_range: true,
    time: true,
    submitted_at: true,
    status: true,
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

  const visibleColCount = useMemo(() => Object.values(visibleCols).filter(Boolean).length, [visibleCols]);

  // Fetch helpers
  const fetchRequestDetails = async (requestId: number) => {
    try {
      const response = await fetch(`http://localhost:4000/api/annadhanam-approval/request/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch request details');
      const result = await response.json();
      if (result.success) {
        setSelectedRequest(result.data);
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: t('Failed to fetch request details', 'கோரிக்கை விவரங்களைப் பெற முடியவில்லை'),
        variant: 'destructive',
      });
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:4000/api/annadhanam-approval/pending?search=${searchTerm}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch requests');

      const result = await response.json();
      if (result.success) {
        setRequests(result.data);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: t('Failed to fetch requests', 'கோரிக்கைகளைப் பெற முடியவில்லை'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/annadhanam-approval/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch stats');

      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [searchTerm, token]);

  useEffect(() => {
    if (stats) {
      setPendingCount(stats.status_counts.pending);
      setApprovedCount(stats.status_counts.approved);
      setRejectedCount(stats.status_counts.rejected);
    }
  }, [stats]);

  // Actions
  const handleApprove = async (requestId: number) => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/annadhanam-approval/approve/${requestId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            admin_notes: adminNotes,
            log_action: 'approve',
            log_notes: `Approved by admin with notes: ${adminNotes}`
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to approve request');

      const result = await response.json();
      if (result.success) {
        toast({
          title: t('Success', 'வெற்றி'),
          description: t('Request approved successfully', 'கோரிக்கை வெற்றிகரமாக அனுமதிக்கப்பட்டது'),
        });
        setIsApproveDialogOpen(false);
        setAdminNotes('');
        fetchRequests();
        fetchStats();
        
        // Refresh logs
        if (selectedRequest) {
          fetchRequestDetails(selectedRequest.id);
        }
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: t('Failed to approve request', 'கோரிக்கையை அனுமதிக்க முடியவில்லை'),
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/annadhanam-approval/reject/${requestId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            rejection_reason, 
            admin_notes: adminNotes,
            log_action: 'reject',
            log_notes: `Rejected with reason: ${rejectionReason}. Admin notes: ${adminNotes}`
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to reject request');

      const result = await response.json();
      if (result.success) {
        toast({
          title: t('Success', 'வெற்றி'),
          description: t('Request rejected successfully', 'கோரிக்கை வெற்றிகரமாக நிராகரிக்கப்பட்டது'),
        });
        setIsRejectDialogOpen(false);
        setRejectionReason('');
        setAdminNotes('');
        fetchRequests();
        fetchStats();
        
        // Refresh logs
        if (selectedRequest) {
          fetchRequestDetails(selectedRequest.id);
        }
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: t('Failed to reject request', 'கோரிக்கையை நிராகரிக்க முடியவில்லை'),
        variant: 'destructive',
      });
    }
  };

  const handleBulkAction = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/annadhanam-approval/bulk-action', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: bulkAction,
          request_ids: selectedRequests,
          reason: bulkAction === 'reject' ? rejectionReason : undefined,
          admin_notes: adminNotes,
          log_action: `bulk_${bulkAction}`,
          log_notes: `Performed bulk ${bulkAction} on ${selectedRequests.length} requests. ` +
                    `${bulkAction === 'reject' ? 'Reason: ' + rejectionReason : ''}` +
                    `${adminNotes ? ' Notes: ' + adminNotes : ''}`
        }),
      });

      if (!response.ok) throw new Error('Failed to perform bulk action');

      const result = await response.json();
      if (result.success) {
        toast({
          title: t('Success', 'வெற்றி'),
          description: t(`Bulk ${bulkAction} completed`, `மொத்த ${bulkAction} முடிக்கப்பட்டது`),
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
        variant: 'destructive',
      });
    }
  };

  const handleSaveStats = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/annadhanam-approval/update-stats', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          log_action: 'stats_update',
          log_notes: `Updated stats to: Pending=${pendingCount}, Approved=${approvedCount}, Rejected=${rejectedCount}`
        })
      });

      if (!response.ok) throw new Error('Failed to update stats');
      
      const result = await response.json();
      if (result.success) {
        toast({
          title: t('Success', 'வெற்றி'),
          description: t('Stats updated successfully', 'புள்ளிவிவரங்கள் வெற்றிகரமாக புதுப்பிக்கப்பட்டது'),
        });
        fetchStats();
        setIsEditingStats(false);
      }
    } catch (error) {
      console.error('Error updating stats:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: t('Failed to update stats', 'புள்ளிவிவரங்களை புதுப்பிக்க முடியவில்லை'),
        variant: 'destructive',
      });
    }
  };

  // Format helpers
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();
  const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString();

  // Status badge
  const getStatusBadge = (status: string | undefined) => {
    if (!status) return null;
    
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-600', icon: XCircle },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: XCircle },
    } as const;

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status && t(status.charAt(0).toUpperCase() + status.slice(1), status)}
      </Badge>
    );
  };

  // Print individual request
  const handlePrintRequest = (request: AnnadhanamRequest) => {
    const printContent = `
      <div style="text-align:center; margin-bottom:20px;">
        <h2>${t('Annadhanam Request', 'அன்னதானம் கோரிக்கை')}</h2>
      </div>
      <div style="margin:20px;">
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Receipt No', 'ரசீது எண்')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${request.receipt_number}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Name', 'பெயர்')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${request.name}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Mobile', 'மொபைல்')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${request.mobile_number}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Date Range', 'தேதி வரம்பு')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${formatDate(request.from_date)} - ${formatDate(request.to_date)}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Time', 'நேரம்')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${request.time}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Status', 'நிலை')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${t(request.status, request.status)}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Submitted At', 'சமர்ப்பிக்கப்பட்ட நேரம்')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${formatDateTime(request.submitted_at)}</td></tr>
        </table>
      </div>
    `;

    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow?.document.write(`
      <html>
        <head><title>Annadhanam Request - ${request.receipt_number}</title></head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow?.document.close();
    printWindow?.focus();
    printWindow?.print();
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      t('Receipt No', 'ரசீது எண்'),
      t('Name', 'பெயர்'),
      t('Mobile', 'மொபைல்'),
      t('Date Range', 'தேதி வரம்பு'),
      t('Time', 'நேரம்'),
      t('Status', 'நிலை'),
      t('Submitted', 'சமர்ப்பிக்கப்பட்டது'),
    ];

    const rows = requests.map((r) => [
      r.receipt_number,
      r.name,
      r.mobile_number,
      `${formatDate(r.from_date)} - ${formatDate(r.to_date)}`,
      r.time,
      t(r.status, r.status),
      formatDateTime(r.submitted_at),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annadhanam-requests.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export PDF (via print)
  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow" onContextMenu={onContextMenu}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">{t('Annadhanam Approval Panel', 'அன்னதானம் அனுமதி பேனல்')}</h1>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-2">
          <div className="flex items-center gap-1 text-xs">
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-50 rounded">
              <Clock className="h-2.5 w-2.5 text-yellow-600" />
              <span className="font-medium text-yellow-600">{stats.status_counts.pending}</span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 rounded">
              <CheckCircle className="h-2.5 w-2.5 text-green-600" />
              <span className="font-medium text-green-600">{stats.status_counts.approved}</span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-50 rounded">
              <XCircle className="h-2.5 w-2.5 text-red-600" />
              <span className="font-medium text-red-600">{stats.status_counts.rejected}</span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 rounded">
              <FileText className="h-2.5 w-2.5 text-blue-600" />
              <span className="font-medium text-blue-600">{stats.total_requests}</span>
            </div>
            {hasEditPermission && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-1" onClick={() => setIsEditingStats(!isEditingStats)}>
                <Edit className="h-2.5 w-2.5" />
              </Button>
            )}
          </div>
          {isEditingStats && (
            <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Pending Count</Label>
                  <Input 
                    type="number" 
                    value={pendingCount} 
                    onChange={(e) => setPendingCount(Number(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Approved Count</Label>
                  <Input 
                    type="number" 
                    value={approvedCount} 
                    onChange={(e) => setApprovedCount(Number(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Rejected Count</Label>
                  <Input 
                    type="number" 
                    value={rejectedCount} 
                    onChange={(e) => setRejectedCount(Number(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="flex items-end gap-2 mt-2">
                <Button size="sm" className="text-xs h-8" onClick={handleSaveStats}>
                  Save
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setIsEditingStats(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-center">
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
                placeholder={t('Search by name, mobile, or receipt...', 'பெயர், மொபைல் அல்லது ரசீது மூலம் தேடுக')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Button onClick={fetchRequests}>{t('Search', 'தேடு')}</Button>
              <Button variant="outline" onClick={() => setSearchTerm('')}>
                {t('Clear', 'அழி')}
              </Button>
              <Button variant="outline" onClick={handleExportCSV}>
                <FileDown className="h-4 w-4 mr-1" />
                {t('Export CSV', 'CSV ஏற்றுமதி')}
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <FileDown className="h-4 w-4 mr-1" />
                {t('Export PDF', 'PDF ஏற்றுமதி')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {allColumns.map(
                  (col) =>
                    visibleCols[col.key] && (
                      <th
                        key={col.key}
                        className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {col.label}
                      </th>
                    )
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={visibleColCount} className="px-6 py-4 text-center text-sm text-gray-500">
                    {t('Loading...', 'ஏற்றுகிறது...')}
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={visibleColCount} className="px-6 py-4 text-center text-sm text-gray-500">
                    {t('No pending requests', 'நிலுவையில் உள்ள கோரிக்கைகள் இல்லை')}
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    {visibleCols.select && (
                      <TableCell className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={selectedRequests.includes(request.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRequests([...selectedRequests, request.id]);
                            } else {
                              setSelectedRequests(selectedRequests.filter((id) => id !== request.id));
                            }
                          }}
                        />
                      </TableCell>
                    )}
                    {visibleCols.receipt_number && (
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {request.receipt_number}
                      </TableCell>
                    )}
                    {visibleCols.name && (
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.name}
                      </TableCell>
                    )}
                    {visibleCols.mobile_number && (
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.mobile_number}
                      </TableCell>
                    )}
                    {visibleCols.date_range && (
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(request.from_date)} - {formatDate(request.to_date)}
                      </TableCell>
                    )}
                    {visibleCols.time && (
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.time}
                      </TableCell>
                    )}
                    {visibleCols.submitted_at && (
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(request.submitted_at)}
                      </TableCell>
                    )}
                    {visibleCols.status && (
                      <TableCell className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(request.status)}
                      </TableCell>
                    )}
                    {visibleCols.actions && (
                      <TableCell className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrintRequest(request)}
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            {t('Print', 'அச்சிட')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsViewDialogOpen(true);
                              fetchRequestDetails(request.id);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsApproveDialogOpen(true);
                            }}
                            className="text-green-600 hover:bg-green-50"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsRejectDialogOpen(true);
                            }}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-700">
            {t('Showing', 'காட்டப்படுகிறது')}{' '}
            <span className="font-medium">{requests.length}</span> {t('of', 'மொத்தம்')}{' '}
            <span className="font-medium">{stats?.total_requests || 0}</span> {t('results', 'முடிவுகள்')}
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-gray-700">
            <span>
              {t('Total', 'மொத்தம்')}: <span className="font-medium">{stats?.total_requests || 0}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Bulk Action Buttons */}
      {selectedRequests.length > 0 && (
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => {
              setBulkAction('approve');
              setIsBulkActionDialogOpen(true);
            }}
            className="text-green-600 border-green-600 hover:bg-green-50"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            {t('Bulk Approve', 'மொத்த அனுமதி')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setBulkAction('reject');
              setIsBulkActionDialogOpen(true);
            }}
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            <XCircle className="h-4 w-4 mr-1" />
            {t('Bulk Reject', 'மொத்த நிராகரிப்பு')}
          </Button>
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
            <h3 className="text-sm font-medium text-gray-900">{t('Columns', 'நெடுவரிசைகள்')}</h3>
            <p className="text-xs text-gray-500">
              {t('Visible', 'காட்டப்படும்')} {Object.values(visibleCols).filter(Boolean).length}/{allColumns.length}
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
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
              {t('Select all', 'அனைத்தையும் தேர்ந்தெடு')}
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
              {t('Clear all', 'அனைத்தையும் அழி')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setVisibleCols({ ...defaultVisible })}
            >
              {t('Reset', 'மீட்டமை')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs ml-auto"
              onClick={() => setMenuOpen(false)}
            >
              {t('Close', 'மூடு')}
            </Button>
          </div>
        </div>
      )}

      {/* View Request Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('Request Details', 'கோரிக்கை விவரங்கள்')}</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('Receipt Number', 'ரசீது எண்')}</Label>
                  <p className="font-medium">{selectedRequest.receipt_number}</p>
                </div>
                <div>
                  <Label>{t('Status', 'நிலை')}</Label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div>
                  <Label>{t('Name', 'பெயர்')}</Label>
                  <p className="font-medium">{selectedRequest.name}</p>
                </div>
                <div>
                  <Label>{t('Mobile Number', 'மொபைல் எண்')}</Label>
                  <p className="font-medium">{selectedRequest.mobile_number}</p>
                </div>
                <div>
                  <Label>{t('From Date', 'தொடக்க தேதி')}</Label>
                  <p className="font-medium">{formatDate(selectedRequest.from_date)}</p>
                </div>
                <div>
                  <Label>{t('To Date', 'முடிவு தேதி')}</Label>
                  <p className="font-medium">{formatDate(selectedRequest.to_date)}</p>
                </div>
                <div>
                  <Label>{t('Time', 'நேரம்')}</Label>
                  <p className="font-medium">{selectedRequest.time}</p>
                </div>
                <div>
                  <Label>{t('Submitted At', 'சமர்ப்பிக்கப்பட்ட நேரம்')}</Label>
                  <p className="font-medium">{formatDateTime(selectedRequest.submitted_at)}</p>
                </div>
              </div>
              {selectedRequest.remarks && (
                <div>
                  <Label>{t('Remarks', 'கருத்துகள்')}</Label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-md">{selectedRequest.remarks}</p>
                </div>
              )}
              {selectedRequest.admin_notes && (
                <div>
                  <Label>{t('Admin Notes', 'நிர்வாக குறிப்புகள்')}</Label>
                  <p className="mt-1 p-3 bg-blue-50 rounded-md">{selectedRequest.admin_notes}</p>
                </div>
              )}
              {selectedRequest.rejection_reason && (
                <div>
                  <Label>{t('Rejection Reason', 'நிராகரிப்பு காரணம்')}</Label>
                  <p className="mt-1 p-3 bg-red-50 rounded-md">{selectedRequest.rejection_reason}</p>
                </div>
              )}
              {/* Approval Logs */}
              {selectedRequest.logs && selectedRequest.logs.length > 0 && (
                <div>
                  <Label>{t('Approval Logs', 'அனுமதி பதிவுகள்')}</Label>
                  <div className="mt-2 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('Action', 'செயல்')}</TableHead>
                          <TableHead>{t('Performed By', 'நடைமுறைப்படுத்தியவர்')}</TableHead>
                          <TableHead>{t('When', 'எப்போது')}</TableHead>
                          <TableHead>{t('Status Change', 'நிலை மாற்றம்')}</TableHead>
                          <TableHead>{t('Notes', 'குறிப்புகள்')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRequest.logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="capitalize">{t(log.action, log.action)}</TableCell>
                            <TableCell>
                              {log.performed_by_name || log.performed_by_username || log.performed_by || '-'}
                            </TableCell>
                            <TableCell>{formatDateTime(log.performed_at)}</TableCell>
                            <TableCell>
                              {log.old_status ? (
                                <span>
                                  {t(log.old_status, log.old_status)} → {t(log.new_status || '', log.new_status || '')}
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs truncate" title={log.notes}>
                              {log.notes || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Approve Request', 'கோரிக்கையை அனுமதிக்கவும்')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="adminNotes">{t('Admin Notes (Optional)', 'நிர்வாக குறிப்புகள் (விருப்பமானது)')}</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={t('Add any notes about this approval...', 'இந்த அனுமதி பற்றி குறிப்புகளைச் சேர்க்கவும்...')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              {t('Cancel', 'ரத்து செய்')}
            </Button>
            <Button
              onClick={() => selectedRequest && handleApprove(selectedRequest.id)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {t('Approve', 'அனுமதி')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Reject Request', 'கோரிக்கையை நிராகரிக்கவும்')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">{t('Rejection Reason', 'நிராகரிப்பு காரணம்')} *</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t('Please provide a reason for rejection...', 'நிராகரிப்புக்கான காரணத்தை வழங்கவும்...')}
                required
              />
            </div>
            <div>
              <Label htmlFor="adminNotesReject">{t('Admin Notes (Optional)', 'நிர்வாக குறிப்புகள் (விருப்பமானது)')}</Label>
              <Textarea
                id="adminNotesReject"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={t('Add any additional notes...', 'கூடுதல் குறிப்புகளைச் சேர்க்கவும்...')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              {t('Cancel', 'ரத்து செய்')}
            </Button>
            <Button
              onClick={() => selectedRequest && handleReject(selectedRequest.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={!rejectionReason.trim()}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {t('Reject', 'நிராகரி')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={isBulkActionDialogOpen} onOpenChange={setIsBulkActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t(`Bulk ${bulkAction === 'approve' ? 'Approve' : 'Reject'}`, `மொத்த ${bulkAction === 'approve' ? 'அனுமதி' : 'நிராகரிப்பு'}`)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t(`You are about to ${bulkAction} ${selectedRequests.length} request(s).`, `நீங்கள் ${selectedRequests.length} கோரிக்கை(களை) ${bulkAction} செய்யப் போகிறீர்கள்.`)}
            </p>
            {bulkAction === 'reject' && (
              <div>
                <Label htmlFor="bulkRejectionReason">{t('Rejection Reason', 'நிராகரிப்பு காரணம்')} *</Label>
                <Textarea
                  id="bulkRejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={t('Please provide a reason for rejection...', 'நிராகரிப்புக்கான காரணத்தை வழங்கவும்...')}
                  required
                />
              </div>
            )}
            <div>
              <Label htmlFor="bulkAdminNotes">{t('Admin Notes (Optional)', 'நிர்வாக குறிப்புகள் (விருப்பமானது)')}</Label>
              <Textarea
                id="bulkAdminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={t('Add any notes about this action...', 'இந்த செயல்பற்றி குறிப்புகளைச் சேர்க்கவும்...')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkActionDialogOpen(false)}>
              {t('Cancel', 'ரத்து செய்')}
            </Button>
            <Button
              onClick={handleBulkAction}
              className={bulkAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              disabled={bulkAction === 'reject' && !rejectionReason.trim()}
            >
              {bulkAction === 'approve' ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {t('Approve All', 'அனைத்தையும் அனுமதி')}
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  {t('Reject All', 'அனைத்தையும் நிராகரி')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}