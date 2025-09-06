import React, { useState, useEffect } from 'react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Eye, Clock, User, Phone, Calendar, FileText } from 'lucide-react';

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
  const { t } = useLanguage();
  const { token } = useAuth();
  const { toast } = useToast();
  
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

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:4000/api/pooja-approval/pending?search=${searchTerm}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const result = await response.json();
      if (result.success) {
        setRequests(result.data);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: t('Failed to fetch requests', 'கோரிக்கைகளைப் பெற முடியவில்லை'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/pooja-approval/stats', {
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
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [searchTerm, token]);

  const handleApprove = async (requestId: number) => {
    try {
      const response = await fetch(`http://localhost:4000/api/pooja-approval/approve/${requestId}`, {
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
      const response = await fetch(`http://localhost:4000/api/pooja-approval/reject/${requestId}`, {
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
      const response = await fetch('http://localhost:4000/api/pooja-approval/bulk-action', {
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
    // Handle undefined/null status
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
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {t(status.charAt(0).toUpperCase() + status.slice(1), status)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          {t('Pooja Approval Panel', 'பூஜை அனுமதி பேனல்')}
        </h1>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('Pending', 'நிலுவையில்')}</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.status_counts.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('Approved', 'அனுமதிக்கப்பட்டது')}</p>
                  <p className="text-2xl font-bold text-green-600">{stats.status_counts.approved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('Rejected', 'நிராகரிக்கப்பட்டது')}</p>
                  <p className="text-2xl font-bold text-red-600">{stats.status_counts.rejected}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('Total', 'மொத்தம்')}</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.total_requests}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-md">
              <Input
                placeholder={t('Search by name, mobile, or receipt number...', 'பெயர், மொபைல் அல்லது ரசீது எண்ணால் தேடவும்...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {selectedRequests.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setBulkAction('approve');
                      setIsBulkActionDialogOpen(true);
                    }}
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
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
                    <XCircle className="w-4 h-4 mr-2" />
                    {t('Bulk Reject', 'மொத்த நிராகரிப்பு')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Pending Requests', 'நிலுவையில் உள்ள கோரிக்கைகள்')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-muted-foreground">{t('Loading...', 'ஏற்றுகிறது...')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
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
                    />
                  </TableHead>
                  <TableHead>{t('Receipt No', 'ரசீது எண்')}</TableHead>
                  <TableHead>{t('Name', 'பெயர்')}</TableHead>
                  <TableHead>{t('Mobile', 'மொபைல்')}</TableHead>
                  <TableHead>{t('Date Range', 'தேதி வரம்பு')}</TableHead>
                  <TableHead>{t('Time', 'நேரம்')}</TableHead>
                  <TableHead>{t('Submitted', 'சமர்ப்பிக்கப்பட்டது')}</TableHead>
                  <TableHead>{t('Actions', 'செயல்கள்')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
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
                      />
                    </TableCell>
                    <TableCell className="font-medium">{request.receipt_number}</TableCell>
                    <TableCell>{request.name}</TableCell>
                    <TableCell>{request.mobile_number}</TableCell>
                    <TableCell>
                      {formatDate(request.from_date)} - {formatDate(request.to_date)}
                    </TableCell>
                    <TableCell>{request.time}</TableCell>
                    <TableCell>{formatDateTime(request.submitted_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setIsApproveDialogOpen(true);
                          }}
                          className="text-green-600 border-green-600 hover:bg-green-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setIsRejectDialogOpen(true);
                          }}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Request Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
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
