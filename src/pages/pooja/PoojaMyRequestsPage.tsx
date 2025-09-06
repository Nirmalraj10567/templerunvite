import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { poojaMobileService, PoojaMobileResponse } from '@/services/poojaMobileService';
import { Eye, XCircle, Clock, CheckCircle, AlertCircle, Phone, Calendar, FileText, User } from 'lucide-react';

export default function PoojaMyRequestsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [requests, setRequests] = useState<PoojaMobileResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<PoojaMobileResponse | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const fetchRequests = async () => {
    if (!mobileNumber.trim()) {
      toast({
        title: t('Error', 'பிழை'),
        description: t('Please enter your mobile number', 'உங்கள் மொபைல் எண்ணை உள்ளிடவும்'),
        variant: 'destructive'
      });
      return;
    }

    if (!poojaMobileService.validateMobileNumber(mobileNumber)) {
      toast({
        title: t('Invalid Mobile Number', 'தவறான மொபைல் எண்'),
        description: t('Please enter a valid 10-digit mobile number', 'சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்'),
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      const result = await poojaMobileService.getMyRequests(mobileNumber);
      
      if (result.success && result.data) {
        setRequests(result.data);
        if (result.data.length === 0) {
          toast({
            title: t('No Requests Found', 'கோரிக்கைகள் இல்லை'),
            description: t('No pooja requests found for this mobile number', 'இந்த மொபைல் எண்ணுக்கு பூஜை கோரிக்கைகள் இல்லை'),
          });
        }
      } else {
        throw new Error(result.error || 'Failed to fetch requests');
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: error instanceof Error ? error.message : t('Failed to fetch requests', 'கோரிக்கைகளைப் பெற முடியவில்லை'),
        variant: 'destructive'
      });
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!selectedRequest) return;

    try {
      const result = await poojaMobileService.cancelRequest(
        selectedRequest.id,
        mobileNumber,
        cancelReason
      );

      if (result.success) {
        toast({
          title: t('Request Cancelled', 'கோரிக்கை ரத்து செய்யப்பட்டது'),
          description: t('Your pooja request has been cancelled successfully', 'உங்கள் பூஜை கோரிக்கை வெற்றிகரமாக ரத்து செய்யப்பட்டது'),
        });

        // Refresh the requests list
        fetchRequests();
        setIsCancelDialogOpen(false);
        setCancelReason('');
        setSelectedRequest(null);
      } else {
        throw new Error(result.error || 'Failed to cancel request');
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: error instanceof Error ? error.message : t('Failed to cancel request', 'கோரிக்கையை ரத்து செய்ய முடியவில்லை'),
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        icon: Clock,
        text: t('Pending', 'நிலுவையில்')
      },
      approved: { 
        color: 'bg-green-100 text-green-800 border-green-200', 
        icon: CheckCircle,
        text: t('Approved', 'அனுமதிக்கப்பட்டது')
      },
      rejected: { 
        color: 'bg-red-100 text-red-800 border-red-200', 
        icon: XCircle,
        text: t('Rejected', 'நிராகரிக்கப்பட்டது')
      },
      cancelled: { 
        color: 'bg-gray-100 text-gray-800 border-gray-200', 
        icon: XCircle,
        text: t('Cancelled', 'ரத்து செய்யப்பட்டது')
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return poojaMobileService.formatDate(dateString);
  };

  const formatDateTime = (dateString: string) => {
    return poojaMobileService.formatDateTime(dateString);
  };

  const canCancelRequest = (request: PoojaMobileResponse) => {
    return request.status === 'pending';
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">
          {t('My Pooja Requests', 'எனது பூஜை கோரிக்கைகள்')}
        </h1>
        <p className="text-muted-foreground">
          {t('View and manage your submitted pooja requests', 'உங்கள் சமர்ப்பிக்கப்பட்ட பூஜை கோரிக்கைகளைப் பார்க்கவும் மற்றும் நிர்வகிக்கவும்')}
        </p>
      </div>

      {/* Mobile Number Input */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="mobileNumber">
                {t('Mobile Number', 'மொபைல் எண்')} *
              </Label>
              <Input
                id="mobileNumber"
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder={t('Enter your 10-digit mobile number', 'உங்கள் 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்')}
                maxLength={10}
              />
            </div>
            <Button onClick={fetchRequests} disabled={loading || !mobileNumber.trim()}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('Loading...', 'ஏற்றுகிறது...')}
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  {t('View Requests', 'கோரிக்கைகளைப் பார்க்கவும்')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      {requests.length > 0 && (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">{request.receipt_number}</span>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span>{request.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span>{request.mobile_number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>{formatDate(request.from_date)} - {formatDate(request.to_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>{request.time}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('Submitted on', 'சமர்ப்பிக்கப்பட்ட நேரம்')}: {formatDateTime(request.submitted_at)}
                    </div>
                    {request.approved_at && (
                      <div className="text-xs text-muted-foreground">
                        {request.status === 'approved' ? t('Approved on', 'அனுமதிக்கப்பட்ட நேரம்') : t('Processed on', 'செயல்படுத்தப்பட்ட நேரம்')}: {formatDateTime(request.approved_at)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request);
                        setIsViewDialogOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {t('View', 'பார்க்க')}
                    </Button>
                    {canCancelRequest(request) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setIsCancelDialogOpen(true);
                        }}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        {t('Cancel', 'ரத்து செய்')}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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

      {/* Cancel Request Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Cancel Request', 'கோரிக்கையை ரத்து செய்யவும்')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Are you sure you want to cancel this pooja request? This action cannot be undone.', 'இந்த பூஜை கோரிக்கையை ரத்து செய்ய விரும்புகிறீர்களா? இந்த செயலை திரும்பப் பெற முடியாது.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cancelReason">{t('Reason for Cancellation (Optional)', 'ரத்து செய்வதற்கான காரணம் (விருப்பமானது)')}</Label>
              <Input
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t('Please provide a reason...', 'காரணத்தை வழங்கவும்...')}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Keep Request', 'கோரிக்கையை வைத்திருக்கவும்')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelRequest}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('Cancel Request', 'கோரிக்கையை ரத்து செய்')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
