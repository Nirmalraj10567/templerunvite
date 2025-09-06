import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CheckCircle, XCircle, Eye, Loader2, Search, Download } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DonationItem {
  id: number;
  product_name: string;
  donor_name: string;
  donor_contact: string;
  donation_date: string;
  price: number;
  quantity: number;
  approval_status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  submitted_by_mobile: string;
  submitted_at: string;
  admin_notes?: string;
  rejection_reason?: string;
  logs?: ApprovalLog[];
}

interface ApprovalLog {
  id: number;
  action: string;
  performed_by?: { id: number; full_name?: string; username?: string } | null;
  performed_at: string;
  notes?: string;
  old_status?: string;
  new_status?: string;
}

interface ApprovalStats {
  status_counts: {
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
  };
  total_requests: number;
}

export default function DonationApprovalPage() {
  const { t } = useLanguage();
  const { token } = useAuth();
  const { toast } = useToast();
  
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [filteredDonations, setFilteredDonations] = useState<DonationItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState({
    donations: false,
    stats: false,
    action: false,
    export: false,
  });
  const [selectedRequest, setSelectedRequest] = useState<DonationItem | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);

  const fetchDonations = async () => {
    try {
      setLoading(prev => ({ ...prev, donations: true }));
      const response = await fetch(
        `/api/donations-approval/pending?page=${pagination.page}&pageSize=${pagination.pageSize}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch donations');
      }
      const { data, total, totalPages } = await response.json();
      setDonations(data);
      setFilteredDonations(data);
      setPagination(prev => ({
        ...prev,
        totalItems: total,
        totalPages,
      }));
    } catch (error) {
      console.error('Error fetching donations:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: t('Failed to load donation requests. Please try again later.', 'நன்கொடை கோரிக்கைகளை ஏற்ற முடியவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும்.'),
        variant: 'destructive',
      });
    } finally {
      setLoading(prev => ({ ...prev, donations: false }));
    }
  };

  useEffect(() => {
    let result = [...donations];
    
    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        item =>
          item.donor_name?.toLowerCase().includes(term) ||
          item.product_name?.toLowerCase().includes(term) ||
          item.donor_contact?.includes(term) ||
          item.id.toString().includes(term)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(item => item.approval_status === statusFilter);
    }
    
    setFilteredDonations(result);
  }, [searchTerm, statusFilter, donations]);

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({
      ...prev,
      page: Math.max(1, Math.min(newPage, pagination.totalPages)),
    }));
  };

  const fetchStats = async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true }));
      const response = await fetch('/api/donations-approval/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      } else {
        toast({
          title: t('Error', 'பிழை'),
          description: t('Failed to load approval stats. Please try again later.', 'அனுமதி புள்ளிவிவரங்களை ஏற்ற முடியவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும்.'),
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: t('Failed to load approval stats. Please try again later.', 'அனுமதி புள்ளிவிவரங்களை ஏற்ற முடியவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும்.'),
        variant: 'destructive'
      });
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  // Initial load and when pagination changes
  useEffect(() => {
    fetchDonations();
    fetchStats();
  }, [pagination.page, pagination.pageSize, token]);

  const handleApprove = async (id: number) => {
    try {
      setLoading(prev => ({ ...prev, action: true }));
      const response = await fetch(`/api/donations-approval/approve/${id}`, {
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
        fetchDonations();
        fetchStats();
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: t('Failed to approve request', 'கோரிக்கையை அனுமதிக்க முடியவில்லை'),
        variant: 'destructive'
      });
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  };

  const handleReject = async (id: number) => {
    try {
      setLoading(prev => ({ ...prev, action: true }));
      const response = await fetch(`/api/donations-approval/reject/${id}`, {
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
        fetchDonations();
        fetchStats();
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: t('Failed to reject request', 'கோரிக்கையை நிராகரிக்க முடியவில்லை'),
        variant: 'destructive'
      });
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  };

  const handleViewDetails = (item: DonationItem) => {
    setSelectedRequest(item);
    setIsViewDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { variant: 'default' | 'secondary' | 'destructive' | 'outline', text: string } } = {
      pending: { variant: 'secondary', text: t('Pending', 'நிலுவையில்') },
      approved: { variant: 'default', text: t('Approved', 'அனுமதிக்கப்பட்டது') },
      rejected: { variant: 'destructive', text: t('Rejected', 'நிராகரிக்கப்பட்டது') },
      cancelled: { variant: 'outline', text: t('Cancelled', 'ரத்து செய்யப்பட்டது') }
    };
    
    const statusInfo = statusMap[status] || { variant: 'outline' as const, text: status };
    return <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">{t('Donation Approvals', 'நன்கொடை அனுமதிகள்')}</h1>
        <div className="flex gap-2 items-center">
          <Input
            placeholder={t('Search by donor or product...', 'தானம் அளிப்பவர் அல்லது பொருளைத் தேடுக...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('Filter by status', 'நிலை வாரியாக வடிகட்டு')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All', 'அனைத்தும்')}</SelectItem>
              <SelectItem value="pending">{t('Pending', 'நிலுவையில்')}</SelectItem>
              <SelectItem value="approved">{t('Approved', 'அனுமதிக்கப்பட்டது')}</SelectItem>
              <SelectItem value="rejected">{t('Rejected', 'நிராகரிக்கப்பட்டது')}</SelectItem>
              <SelectItem value="cancelled">{t('Cancelled', 'ரத்து செய்யப்பட்டது')}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                setLoading(prev => ({ ...prev, export: true }));
                const res = await fetch('/api/donations-approval/export', {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Export failed');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `donations_${new Date().toISOString().slice(0,10)}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                toast({ title: t('Exported', 'ஏற்றுமதி செய்யப்பட்டது'), description: t('File downloaded', 'கோப்பு பதிவிறக்கம் செய்யப்பட்டது') });
              } catch (e) {
                toast({ title: t('Error', 'பிழை'), description: t('Failed to export donation data', 'நன்கொடை தரவை ஏற்றுமதி செய்ய முடியவில்லை'), variant: 'destructive' });
              } finally {
                setLoading(prev => ({ ...prev, export: false }));
              }
            }}
            disabled={loading.export}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('Export', 'ஏற்றுமதி')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('Total Requests', 'மொத்த கோரிக்கைகள்')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_requests}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('Pending', 'நிலுவையில்')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.status_counts.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('Approved', 'அனுமதிக்கப்பட்டது')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.status_counts.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('Rejected', 'நிராகரிக்கப்பட்டது')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.status_counts.rejected + stats.status_counts.cancelled}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Pending Donation Requests', 'நிலுவையில் உள்ள தான கோரிக்கைகள்')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading.donations ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Product', 'பொருள்')}</TableHead>
                  <TableHead>{t('Donor', 'தானம் அளிப்பவர்')}</TableHead>
                  <TableHead>{t('Quantity', 'அளவு')}</TableHead>
                  <TableHead>{t('Date', 'தேதி')}</TableHead>
                  <TableHead>{t('Status', 'நிலை')}</TableHead>
                  <TableHead className="text-right">{t('Actions', 'செயல்கள்')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDonations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('No pending donation requests', 'நிலுவையில் எந்த தான கோரிக்கைகளும் இல்லை')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDonations.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell>
                        <div>{item.donor_name}</div>
                        <div className="text-sm text-muted-foreground">{item.donor_contact}</div>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{new Date(item.donation_date).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(item.approval_status)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(item)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t('View', 'பார்க்க')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {t('Showing', 'காட்டுகிறது')} {Math.min((pagination.page - 1) * pagination.pageSize + 1, pagination.totalItems)}-
            {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} {t('of', 'இல்')} {pagination.totalItems}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={pagination.page === 1 || loading.donations}>{t('First', 'முதல்')}</Button>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1 || loading.donations}>{t('Previous', 'முந்தைய')}</Button>
            <div className="px-2 text-sm">{t('Page', 'பக்கம்')} {pagination.page} {t('of', 'இல்')} {pagination.totalPages}</div>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages || loading.donations}>{t('Next', 'அடுத்தது')}</Button>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.totalPages)} disabled={pagination.page === pagination.totalPages || loading.donations}>{t('Last', 'கடைசி')}</Button>
          </div>
        </div>
      )}

      {/* View Request Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('Donation Request Details', 'தான கோரிக்கை விவரங்கள்')}</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {t('Product', 'பொருள்')}
                  </h4>
                  <p>{selectedRequest.product_name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {t('Quantity', 'அளவு')}
                  </h4>
                  <p>{selectedRequest.quantity}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {t('Amount', 'தொகை')}
                  </h4>
                  <p>₹{(selectedRequest.price ?? 0).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {t('Donor Name', 'தானம் அளிப்பவர் பெயர்')}
                  </h4>
                  <p>{selectedRequest.donor_name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {t('Contact', 'தொடர்பு எண்')}
                  </h4>
                  <p>{selectedRequest.donor_contact}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {t('Donation Date', 'தானம் செய்த தேதி')}
                  </h4>
                  <p>{new Date(selectedRequest.donation_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {t('Submitted Via', 'சமர்ப்பித்த முறை')}
                  </h4>
                  <p>{selectedRequest.submitted_by_mobile ? t('Mobile App', 'மொபைல் பயன்பாடு') : t('Web', 'வலை')}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {t('Submitted At', 'சமர்ப்பித்த நேரம்')}
                  </h4>
                  <p>{selectedRequest.submitted_at ? new Date(selectedRequest.submitted_at).toLocaleString() : '-'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {t('Status', 'நிலை')}
                  </h4>
                  <p>{getStatusBadge(selectedRequest.approval_status)}</p>
                </div>
                {selectedRequest.rejection_reason && (
                  <div className="col-span-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {t('Rejection Reason', 'நிராகரிக்கப்பட்ட காரணம்')}
                    </h4>
                    <p className="text-red-600">{selectedRequest.rejection_reason}</p>
                  </div>
                )}
                {selectedRequest.admin_notes && (
                  <div className="col-span-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {t('Admin Notes', 'நிர்வாகக் குறிப்புகள்')}
                    </h4>
                    <p className="whitespace-pre-line">{selectedRequest.admin_notes}</p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  {t('Approval Logs', 'அனுமதி பதிவுகள்')}
                </h4>
                <div className="border rounded-md divide-y">
                  {selectedRequest.logs && selectedRequest.logs.length > 0 ? (
                    selectedRequest.logs.map((log) => (
                      <div key={log.id} className="p-3 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">{log.action}</span>
                          <span className="text-muted-foreground">
                            {new Date(log.performed_at).toLocaleString()}
                          </span>
                        </div>
                        {log.notes && (
                          <p className="mt-1 text-muted-foreground">{log.notes}</p>
                        )}
                        {log.performed_by && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('By', 'மூலம்')}: {log.performed_by.full_name || log.performed_by.username}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="p-3 text-muted-foreground text-sm">
                      {t('No logs available', 'பதிவுகள் எதுவும் இல்லை')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              {t('Close', 'மூடு')}
            </Button>
            {selectedRequest?.approval_status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    setRejectionReason('');
                    setAdminNotes('');
                    setIsRejectDialogOpen(true);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {t('Reject', 'நிராகரிக்கவும்')}
                </Button>
                <Button
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    setAdminNotes('');
                    setIsApproveDialogOpen(true);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('Approve', 'அனுமதிக்கவும்')}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Approve Donation Request', 'தான கோரிக்கையை அனுமதிக்கவும்')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="adminNotes">
                {t('Admin Notes (Optional)', 'நிர்வாகக் குறிப்புகள் (விரும்பினால்)')}
              </Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={t('Add any notes...', 'ஏதேனும் குறிப்புகளைச் சேர்க்கவும்...')}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApproveDialogOpen(false)}
            >
              {t('Cancel', 'ரத்து செய்க')}
            </Button>
            <Button
              onClick={() => selectedRequest && handleApprove(selectedRequest.id)}
              disabled={loading.action}
            >
              {loading.action && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('Approve', 'அனுமதிக்கவும்')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Reject Donation Request', 'தான கோரிக்கையை நிராகரிக்கவும்')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">
                {t('Reason for Rejection', 'நிராகரிக்க காரணம்')} *
              </Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t('Enter the reason for rejection...', 'நிராகரிப்பதற்கான காரணத்தை உள்ளிடவும்...')}
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejectAdminNotes">
                {t('Admin Notes (Optional)', 'நிர்வாகக் குறிப்புகள் (விரும்பினால்)')}
              </Label>
              <Textarea
                id="rejectAdminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={t('Add any notes...', 'ஏதேனும் குறிப்புகளைச் சேர்க்கவும்...')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={loading.action}
            >
              {t('Cancel', 'ரத்து செய்க')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedRequest && handleReject(selectedRequest.id)}
              disabled={!rejectionReason.trim() || loading.action}
            >
              {loading.action && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('Reject', 'நிராகரிக்கவும்')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
