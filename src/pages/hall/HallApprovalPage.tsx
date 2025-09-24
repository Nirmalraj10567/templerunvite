import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { listHallRequests, approveHallRequest, rejectHallRequest, updateHallRequest } from '@/services/hallApprovalService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

interface HallRequest {
  id: number;
  register_no?: string | null;
  date: string;
  time: string;
  event?: string | null;
  subdivision?: string | null;
  name: string;
  address?: string | null;
  village?: string | null;
  mobile: string;
  advance_amount?: string | null;
  total_amount?: string | null;
  balance_amount?: string | null;
  remarks?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  submitted_at?: string;
}

export default function HallApprovalPage() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [items, setItems] = useState<HallRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [status, setStatus] = useState<string>('pending');
  const [mobile, setMobile] = useState('');
  const { toast } = useToast();

  // Dialog state
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<{ 
    date?: string; time?: string; event?: string; name?: string; address?: string; village?: string; mobile?: string; 
    totalAmount?: string; advanceAmount?: string; balanceAmount?: string; remarks?: string; 
  }>({});

  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(undefined);
    try {
      const res = await listHallRequests({ status, mobile: mobile || undefined }, token!);
      setItems(res.data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const onApprove = (id: number) => {
    setSelectedId(id);
    setApproveNotes('');
    setApproveOpen(true);
  };

  const onEdit = (id: number) => {
    setSelectedId(id);
    const row = items.find(r => r.id === id);
    if (row) {
      setEditForm({
        date: row.date || '',
        time: row.time || '',
        event: row.event || '',
        name: row.name || '',
        address: row.address || '',
        village: row.village || '',
        mobile: row.mobile || '',
        totalAmount: (row.total_amount ?? '') as string,
        advanceAmount: (row.advance_amount ?? '') as string,
        balanceAmount: (row.balance_amount ?? '') as string,
        remarks: row.remarks || ''
      });
      setEditOpen(true);
    }
  };

  const confirmApprove = async () => {
    if (!token || selectedId == null) return;
    try {
      await approveHallRequest(selectedId, approveNotes || undefined, token);
      setApproveOpen(false);
      await load();
      toast({ title: t('Approved', 'அனுமதிக்கப்பட்டது'), description: t('Hall request approved.', 'மண்டப கோரிக்கை அனுமதிக்கப்பட்டது.') });
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('Approve failed', 'அனுமதி தோல்வியடைந்தது'), description: e?.message || 'Approve failed' });
    }
  };

  const onReject = (id: number) => {
    setSelectedId(id);
    setRejectReason('');
    setRejectNotes('');
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    if (!token || selectedId == null) return;
    if (!rejectReason.trim()) {
      toast({ variant: 'destructive', title: t('Reason required', 'காரணம் தேவை'), description: t('Please enter a rejection reason.', 'நிராகரிப்பிற்கான காரணத்தை உள்ளிடவும்.') });
      return;
    }
    try {
      await rejectHallRequest(selectedId, rejectReason, rejectNotes || undefined, token);
      setRejectOpen(false);
      await load();
      toast({ title: t('Rejected', 'நிராகரிக்கப்பட்டது'), description: t('Hall request rejected.', 'மண்டப கோரிக்கை நிராகரிக்கப்பட்டது.') });
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('Reject failed', 'நிராகரி தோல்வியடைந்தது'), description: e?.message || 'Reject failed' });
    }
  };

  // Edit handlers
  const onChangeEdit = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target as any;
    setEditForm(prev => {
      const next = { ...prev, [name]: value } as any;
      if (name === 'totalAmount' || name === 'advanceAmount') {
        const total = parseFloat(next.totalAmount || '0') || 0;
        const adv = parseFloat(next.advanceAmount || '0') || 0;
        const bal = Math.max(0, total - adv);
        next.balanceAmount = bal.toString();
      }
      return next;
    });
  };

  const confirmEdit = async () => {
    if (!token || selectedId == null) return;
    // Basic req fields
    if (!editForm.date || !editForm.name || !editForm.mobile) {
      toast({ variant: 'destructive', title: t('Missing fields', 'புலங்கள் இல்லை'), description: t('Please fill date, name and mobile.', 'தேதி, பெயர் மற்றும் மொபைல் நிரப்பவும்.') });
      return;
    }
    try {
      await updateHallRequest(selectedId, editForm as any, token);
      setEditOpen(false);
      await load();
      toast({ title: t('Updated', 'புதுப்பிக்கப்பட்டது'), description: t('Request updated successfully.', 'கோரிக்கை வெற்றிகரமாக புதுப்பிக்கப்பட்டது.') });
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('Update failed', 'புதுப்பிப்பு தோல்வியடைந்தது'), description: e?.message || 'Update failed' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto bg-white p-4 rounded shadow">
      <h1 className="text-xl font-semibold mb-4">{t('Hall Booking Approvals', 'மண்டப முன்பதிவு அனுமதிகள்')}</h1>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <select className="border p-2 rounded" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pending">{t('Pending', 'நிலுவையில்')}</option>
          <option value="approved">{t('Approved', 'அனுமதிக்கப்பட்டது')}</option>
          <option value="rejected">{t('Rejected', 'நிராகரிக்கப்பட்டது')}</option>
          <option value="cancelled">{t('Cancelled', 'ரத்துசெய்யப்பட்டது')}</option>
        </select>
        <input
          className="border p-2 rounded"
          placeholder={t('Search by mobile', 'மொபைல் மூலம் தேடுக')}
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
        />
        <button className="border px-4 py-2 rounded" onClick={load}>{t('Filter', 'வடிகட்டி')}</button>
      </div>

      {error && <div className="text-red-700 mb-3 text-sm">{error}</div>}
      {loading ? (
        <div>{t('Loading...', 'ஏற்றுகிறது...')}</div>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border">{t('Date', 'தேதி')}</th>
                <th className="text-left p-2 border">{t('Time', 'நேரம்')}</th>
                <th className="text-left p-2 border">{t('Name', 'பெயர்')}</th>
                <th className="text-left p-2 border">{t('Mobile', 'தொலைபேசி')}</th>
                <th className="text-left p-2 border">{t('Event', 'நிகழ்வு')}</th>
                <th className="text-left p-2 border">{t('Status', 'நிலை')}</th>
                <th className="text-left p-2 border">{t('Actions', 'செயல்கள்')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b">
                  <td className="p-2 border">{it.date}</td>
                  <td className="p-2 border">{it.time}</td>
                  <td className="p-2 border">{it.name}</td>
                  <td className="p-2 border">{it.mobile}</td>
                  <td className="p-2 border">{it.event || '-'}</td>
                  <td className="p-2 border capitalize">{it.status}</td>
                  <td className="p-2 border">
                    <div className="flex flex-wrap gap-2">
                      <Button className="px-3 py-1" variant="outline" onClick={() => onEdit(it.id)}>
                        {t('Edit', 'திருத்து')}
                      </Button>
                      {it.status === 'pending' ? (
                        <>
                          <Button className="bg-green-600 text-white px-3 py-1" onClick={() => onApprove(it.id)}>
                            {t('Approve', 'அனுமதி')}
                          </Button>
                          <Button className="bg-red-600 text-white px-3 py-1" onClick={() => onReject(it.id)}>
                            {t('Reject', 'நிராகரி')}
                          </Button>
                        </>
                      ) : (
                        <span className="text-gray-500">{t('No actions', 'செயல் இல்லை')}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="p-3 text-center text-gray-500" colSpan={7}>
                    {t('No records', 'பதிவுகள் இல்லை')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Approve Hall Booking', 'மண்டப முன்பதிவை அனுமதிக்க')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm">{t('Approval notes (optional)', 'அனுமதி குறிப்புகள் (விருப்பத்தேர்வு)')}</label>
            <Textarea value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)} placeholder={t('Enter notes', 'குறிப்புகளை உள்ளிடவும்')} />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setApproveOpen(false)}>{t('Cancel', 'ரத்து')}</Button>
            <Button onClick={confirmApprove}>{t('Approve', 'அனுமதி')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Reject Hall Booking', 'மண்டப முன்பதிவை நிராகரிக்க')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm">{t('Rejection reason', 'நிராகரிப்பிற்கான காரணம்')}</label>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder={t('Enter reason', 'காரணத்தை உள்ளிடவும்')} />
            <label className="text-sm">{t('Admin notes (optional)', 'நிர்வாக குறிப்புகள் (விருப்பத்தேர்வு)')}</label>
            <Textarea value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} placeholder={t('Enter notes', 'குறிப்புகளை உள்ளிடவும்')} />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRejectOpen(false)}>{t('Cancel', 'ரத்து')}</Button>
            <Button variant="destructive" onClick={confirmReject}>{t('Reject', 'நிராகரி')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('Edit Hall Request', 'மண்டப கோரிக்கை திருத்து')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="col-span-1">
              <div className="text-xs mb-1">{t('Date','தேதி')}</div>
              <Input type="date" name="date" value={editForm.date || ''} onChange={onChangeEdit} />
            </label>
            <label className="col-span-1">
              <div className="text-xs mb-1">{t('Time','நேரம்')}</div>
              <Input type="time" name="time" value={editForm.time || ''} onChange={onChangeEdit} />
            </label>
            <label className="col-span-1">
              <div className="text-xs mb-1">{t('Name','பெயர்')}</div>
              <Input name="name" value={editForm.name || ''} onChange={onChangeEdit} />
            </label>
            <label className="col-span-1">
              <div className="text-xs mb-1">{t('Mobile','தொலைபேசி')}</div>
              <Input name="mobile" value={editForm.mobile || ''} onChange={onChangeEdit} maxLength={10} />
            </label>
            <label className="col-span-2">
              <div className="text-xs mb-1">{t('Event','நிகழ்வு')}</div>
              <Input name="event" value={editForm.event || ''} onChange={onChangeEdit} />
            </label>
            <label className="col-span-2">
              <div className="text-xs mb-1">{t('Address','முகவரி')}</div>
              <Textarea name="address" value={editForm.address || ''} onChange={onChangeEdit} rows={2} />
            </label>
            <label className="col-span-2">
              <div className="text-xs mb-1">{t('Village','கிராமம்')}</div>
              <Input name="village" value={editForm.village || ''} onChange={onChangeEdit} />
            </label>
            <label className="col-span-1">
              <div className="text-xs mb-1">{t('Total Amount (₹)','மொத்தம் (₹)')}</div>
              <Input type="number" step="0.01" min="0" name="totalAmount" value={editForm.totalAmount || ''} onChange={onChangeEdit} />
            </label>
            <label className="col-span-1">
              <div className="text-xs mb-1">{t('Advance (₹)','முன்பணம் (₹)')}</div>
              <Input type="number" step="0.01" min="0" name="advanceAmount" value={editForm.advanceAmount || ''} onChange={onChangeEdit} />
            </label>
            <label className="col-span-1">
              <div className="text-xs mb-1">{t('Balance (₹)','இருப்பு (₹)')}</div>
              <Input readOnly name="balanceAmount" value={editForm.balanceAmount || ''} />
            </label>
            <label className="col-span-2">
              <div className="text-xs mb-1">{t('Remarks','குறிப்புகள்')}</div>
              <Textarea name="remarks" value={editForm.remarks || ''} onChange={onChangeEdit} rows={2} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>{t('Cancel','ரத்து')}</Button>
            <Button onClick={confirmEdit}>{t('Save Changes','மாற்றங்களை சேமிக்க')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
