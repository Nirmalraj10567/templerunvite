import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { Modal } from '@/components/ui/modal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import axios from 'axios';
import { getAuthToken } from '@/lib/auth';

const generateReceiptNo = async (token: string) => {
  try {
    const response = await fetch('https://tmsapi.xesstechlink.com/api/hall-bookings/generate-receipt-number', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      console.error('Receipt number API failed:', response.status, response.statusText);
      throw new Error('Failed to generate receipt number');
    }
    const data = await response.json();
    console.log('Generated receipt number:', data.receiptNo);
    return data.receiptNo;
  } catch (error) {
    console.error('Receipt number generation error:', error);
    // Enhanced fallback: generate sequential number based on current date/time
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    // Create a more unique fallback number
    const fallbackNo = `${year}-${month}${day}${hours}${minutes}${seconds}`;
    console.log('Using enhanced fallback receipt number:', fallbackNo);
    return fallbackNo;
  }
};

interface FormState {
  registerNo: string;
  date: string;
  time: string;
  event: string; // legacy label for PDFs/exports
  name: string;
  address: string;
  village: string;
  mobile: string;
  advanceAmount: string;
  totalAmount: string;
  balanceAmount: string;
  remarks: string;
  transferTo?: string;
  hallId?: number | '';
  eventId?: number | '';
  bookingStatus?: string;
}

const initialState: FormState = {
  registerNo: '',
  date: '',
  time: '',
  event: '',
  name: '',
  address: '',
  village: '',
  mobile: '',
  advanceAmount: '',
  totalAmount: '',
  balanceAmount: '',
  remarks: '',
  transferTo: 'INCOME A/C',
  hallId: '',
  eventId: '',
  bookingStatus: 'pending'
};

export default function HallEntryPage() {
  const { token, user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>({ ...initialState, registerNo: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [isError, setIsError] = useState(false);
  const [accounts, setAccounts] = useState<Array<{ id?: number; value: string; label: string }>>([]);
  const [halls, setHalls] = useState<Array<{ id: number; name: string; base_price?: number | null }>>([]);
  const [hallEvents, setHallEvents] = useState<Array<{ id: number; name: string }>>([]);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  // Auto-balance
  useEffect(() => {
    const total = parseFloat(form.totalAmount) || 0;
    const advance = parseFloat(form.advanceAmount) || 0;
    const balance = Math.max(0, total - advance);
    if (form.totalAmount && form.advanceAmount) {
      setForm(prev => ({ ...prev, balanceAmount: balance.toString() }));
    }
  }, [form.totalAmount, form.advanceAmount]);

  // Load booking data if editing
  useEffect(() => {
    if (isEdit && id) {
      const idNum = Number(id);
      if (Number.isNaN(idNum)) {
        setIsError(true);
        setMessage(t('Invalid booking id', 'தவறான அடையாள எண்'));
        return;
      }
      (async () => {
        setLoading(true);
        try {
          const response = await fetch(`https://tmsapi.xesstechlink.com/api/hall-bookings/${idNum}`, { headers: { Authorization: `Bearer ${token}` } });
          const data = await response.json();
          const booking = data.data || data;
          setForm({
            registerNo: booking.registerNo || '',
            date: booking.date || '',
            time: booking.time || '',
            event: booking.event || '',
            name: booking.name || '',
            address: booking.address || '',
            village: booking.village || '',
            mobile: booking.mobile || '',
            advanceAmount: booking.advanceAmount?.toString() || '',
            totalAmount: booking.totalAmount?.toString() || '',
            balanceAmount: booking.balanceAmount?.toString() || '',
            remarks: booking.remarks || '',
            transferTo: booking.transferTo || 'INCOME A/C',
            hallId: booking.hallId || '',
            eventId: booking.eventId || '',
            bookingStatus: booking.bookingStatus || 'pending'
          });
        } catch {
          setIsError(true);
          setMessage(t('Failed to load booking data', 'பதிவு தகவலை ஏற்ற முடியவில்லை'));
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id, isEdit, token]);

  // Load accounts and master data (halls, hall-events)
  useEffect(() => {
    (async () => {
      try {
        const accountsResp = await axios.get('/api/ledger/accounts', { headers: { Authorization: `Bearer ${getAuthToken()}` } });
        const accs = accountsResp?.data?.data || accountsResp?.data || [];
        setAccounts(accs.map((a: any, i: number) => ({ id: a.id ?? i + 1, value: a.value || a.label, label: a.label || a.value })));
        if (user?.templeId) {
          const [hallsResp, eventsResp] = await Promise.all([
            axios.get(`/api/master/halls/${user.templeId}`, { headers: { Authorization: `Bearer ${getAuthToken()}` } }),
            axios.get(`/api/master/hall-events/${user.templeId}`, { headers: { Authorization: `Bearer ${getAuthToken()}` } }),
          ]);
          setHalls((hallsResp?.data as unknown as Array<{ id: number; name: string; base_price?: number | null }>) || []);
          setHallEvents((eventsResp?.data as unknown as Array<{ id: number; name: string }> ) || []);
        } else {
          setHalls([]); setHallEvents([]);
        }
      } catch {
        setAccounts([]); setHalls([]); setHallEvents([]);
      }
    })();
  }, [user?.templeId]);

  // Generate receipt number for new
  useEffect(() => {
    if (!isEdit) {
      generateReceiptNo(token)
        .then(receipt => {
          setForm(prev => ({ ...prev, registerNo: receipt }));
        })
        .catch(error => {
          console.error('Failed to generate receipt number:', error);
          // Set a default receipt number if generation fails
          const now = new Date();
          const year = now.getFullYear();
          const timestamp = Date.now().toString().slice(-6);
          const defaultReceipt = `${year}-${timestamp}`;
          setForm(prev => ({ ...prev, registerNo: defaultReceipt }));
        });
    }
  }, [isEdit, token]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'eventId') {
      const idNum = value ? Number(value) : '' as any;
      const selected = hallEvents.find(ev => ev.id === Number(idNum));
      setForm(prev => ({ ...prev, eventId: idNum, event: selected?.name || '' }));
      return;
    }
    if (name === 'hallId') {
      const idNum = value ? Number(value) : '' as any;
      setForm(prev => ({ ...prev, hallId: idNum }));
      return;
    }

    setForm(prev => {
      const updated = { ...prev, [name]: value };

      // Auto-calculate balance when total or advance changes
      if (name === 'totalAmount' || name === 'advanceAmount') {
        const total = Number(updated.totalAmount) || 0;
        const advance = Number(updated.advanceAmount) || 0;
        const balance = Math.max(0, total - advance);
        updated.balanceAmount = balance.toString();
      }

      return updated;
    });
  };

  // Journal entry is handled by backend using fromAccount/transferTo/amount payload

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(undefined);
    if (!form.date || !form.time || !form.name || !form.mobile) {
      setIsError(true);
      setMessage(t('Please fill all required fields', 'தேவையான அனைத்து புலங்களையும் நிரப்பவும்'));
      return;
    }
    setSaving(true);
    try {
      // Validate id for edit
      let endpoint = '/api/hall-bookings';
      if (isEdit) {
        const idNum = Number(id);
        if (Number.isNaN(idNum)) {
          setIsError(true);
          setMessage(t('Invalid booking id', 'தவறான அடையாள எண்'));
          setSaving(false);
          return;
        }
        endpoint = `/api/hall-bookings/${idNum}`;
      }

      const payload = {
        ...form,
        fromAccount: 'HALL ENTRY A/C',
        transferTo: form.transferTo || 'INCOME A/C',
        // Amount used for journal mirror (prefer advance, fallback to total)
        amount: String(parseFloat(form.advanceAmount || form.totalAmount || '0') || 0)
      } as any;

      // Create or update the booking
      const res = await fetch(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save booking');
      }

      const rawId = data?.data?.id;
      const createdIdNum = typeof rawId === 'number' ? rawId : Number(rawId);

      if (!isEdit) {
        if (!Number.isNaN(createdIdNum)) {
          setLastCreatedId(createdIdNum);
        }
        setShowPrintPrompt(true);
        setForm({ ...initialState, registerNo: '' });
      }
      
      setIsError(false);
      setMessage(t(isEdit ? 'Updated successfully' : 'Saved successfully', isEdit ? 'புதுப்பிக்கப்பட்டது' : 'சேமிக்கப்பட்டது'));
    } catch (error: any) {
      setIsError(true);
      setMessage(t(error.message || (isEdit ? 'Update failed' : 'Save failed'), error.message || (isEdit ? 'புதுப்பிப்பில் தோல்வி' : 'சேமிப்பு தோல்வி')));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const idNum = Number(id);
      if (Number.isNaN(idNum)) {
        setIsError(true);
        setMessage(t('Invalid booking id', 'தவறான அடையாள எண்'));
        return;
      }

      const res = await fetch(`https://tmsapi.xesstechlink.com/api/hall-bookings/${idNum}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to delete booking');
      }

      setMessage(t('Deleted successfully', 'வெற்றிகரமாக நீக்கப்பட்டது'));
      setShowDeleteModal(false);
      navigate('/dashboard/hall/list');
    } catch (error: any) {
      setIsError(true);
      setMessage(t(error.message || 'Delete failed', error.message || 'நீக்குவதில் தோல்வி'));
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto bg-white p-3 rounded shadow text-xs">
        <div className="p-4 text-center">
          <div className="animate-pulse">{t('Loading...', 'ஏற்றுகிறது...')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white p-3 rounded shadow text-xs">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-sm font-semibold">
          {isEdit ? t('Edit Hall Booking', 'மண்டப பதிவு திருத்து') : t('Hall Booking Entry', 'மண்டப பதிவு')}
        </h1>
        {isEdit && <button type="button" className="bg-red-600 text-white px-2 py-1 rounded" onClick={() => setShowDeleteModal(true)}>{t('Delete', 'நீக்கு')}</button>}
      </div>

      {message && (
        <Alert variant={isError ? 'destructive' : 'default'} className="mb-2">
          <AlertTitle>{isError ? t('Error','பிழை') : t('Success','வெற்றி')}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Compact Form Grid */}
      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-2">
        <input name="registerNo" readOnly value={form.registerNo} className="col-span-1 border px-2 py-1 rounded bg-gray-100" placeholder={t('Receipt No','ரசீது எண்')} />
        <select name="bookingStatus" value={form.bookingStatus} onChange={onChange} className="border px-2 py-1 rounded">
          <option value="pending">{t('Pending','நிலுவை')}</option>
          <option value="confirmed">{t('Confirmed','உறுதி')}</option>
          <option value="cancelled">{t('Cancelled','ரத்து')}</option>
          <option value="completed">{t('Completed','முடிந்தது')}</option>
        </select>
        <input type="date" name="date" value={form.date} onChange={onChange} className="border px-2 py-1 rounded" required />
        <input type="time" name="time" value={form.time} onChange={onChange} className="border px-2 py-1 rounded" required />
        <input name="name" value={form.name} onChange={onChange} placeholder={t('Name','பெயர்')} className="border px-2 py-1 rounded" required />
        <textarea name="address" rows={2} value={form.address} onChange={onChange} placeholder={t('Address','முகவரி')} className="col-span-2 border px-2 py-1 rounded" />
        <input name="village" value={form.village} onChange={onChange} placeholder={t('Village','கிராமம்')} className="border px-2 py-1 rounded" />
        <select name="hallId" value={form.hallId ?? ''} onChange={onChange} className="border px-2 py-1 rounded col-span-1">
          <option value="">{t('Select hall','மண்டபத்தைத் தேர்வு')}</option>
          {halls.length > 0 ? halls.map(h => (
            <option key={h.id} value={h.id}>{h.name}{h.base_price ? ` - ₹${h.base_price}` : ''}</option>
          )) : <option disabled>{t('No halls available', 'மண்டபங்கள் இல்லை')}</option>}
        </select>
        <select name="eventId" value={form.eventId ?? ''} onChange={onChange} className="border px-2 py-1 rounded">
          <option value="">{t('Event','நிகழ்வு')}</option>
          {hallEvents.length > 0 ? hallEvents.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.name}</option>
          )) : <option disabled>{t('No events available', 'நிகழ்வுகள் இல்லை')}</option>}
        </select>
        <input name="mobile" value={form.mobile} onChange={onChange} placeholder={t('Phone','தொலைபேசி')} maxLength={10} className="border px-2 py-1 rounded" required />
        <input name="totalAmount" value={form.totalAmount} onChange={onChange} placeholder={t('Total','மொத்தம்')} className="border px-2 py-1 rounded" type="number" min="0" step="0.01" />
        <input name="advanceAmount" value={form.advanceAmount} onChange={onChange} placeholder={t('Advance','முன்பணம்')} className="border px-2 py-1 rounded" type="number" min="0" step="0.01" />
        <input name="balanceAmount" readOnly value={form.balanceAmount} placeholder={t('Balance','இருப்பு')} className="border px-2 py-1 rounded bg-gray-50" />

        {false && (
        <select name="transferTo" value={form.transferTo} onChange={onChange} className="col-span-2 border px-2 py-1 rounded">
          <option value="">{t('Select account','கணக்கு')}</option>
          {accounts.map(a => (<option key={a.id} value={a.value}>{a.label}</option>))}
        </select>
        )}
        <textarea name="remarks" rows={2} value={form.remarks} onChange={onChange} placeholder={t('Remarks','குறிப்புகள்')} className="col-span-2 border px-2 py-1 rounded" />
        <div className="col-span-2 flex flex-wrap gap-2 mt-1">
          <button type="submit" disabled={saving} className="bg-orange-600 text-white px-3 py-1 rounded disabled:opacity-50">
            {saving ? t('Saving...','சேமிக்கிறது...') : t(isEdit?'Update':'Save', isEdit?'புதுப்பி':'சேமி')}
          </button>
          <button type="button" className="border px-3 py-1 rounded" onClick={()=>navigate('/dashboard/hall/list')}>
            {t('View List','பட்டியல்')}
          </button>
          <button type="button" className="border px-3 py-1 rounded" onClick={()=>setForm({...initialState, registerNo: ''})}>
            {t('Clear','அழி')}
          </button>
        </div>
      </form>

      {/* Print Modal */}
      {showPrintPrompt && lastCreatedId &&
        <Modal title={t('Print Receipt','ரசீது அச்சிடு')} onClose={()=>setShowPrintPrompt(false)}>
          <p className="mb-2">{t('Open PDF receipt?','PDF ரசீதை திறக்கவா?')}</p>
          <div className="flex justify-end gap-2">
            <button className="border px-3 py-1 rounded" onClick={()=>setShowPrintPrompt(false)}>{t('No','இல்லை')}</button>
            <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={()=>{
              const q = token?`?token=${encodeURIComponent(token)}`:'';
              window.open(`/api/hall-bookings/${lastCreatedId}/receipt.pdf${q}`,'_blank'); setShowPrintPrompt(false);
            }}>{t('Yes','ஆம்')}</button>
          </div>
        </Modal>}

      {/* Delete modal */}
      {showDeleteModal &&
        <Modal title={t('Confirm Delete','நீக்குவதை உறுதிப்படுத்தவும்')} onClose={()=>setShowDeleteModal(false)}>
          <p className="mb-2">{t('Are you sure to delete?','நீக்க வேண்டுமா?')}</p>
          <div className="flex justify-end gap-2">
            <button className="border px-3 py-1 rounded" onClick={()=>setShowDeleteModal(false)}>{t('Cancel','ரத்து')}</button>
            <button className="bg-red-600 text-white px-3 py-1 rounded" onClick={handleDelete}>{t('Delete','நீக்கு')}</button>
          </div>
        </Modal>}
    </div>
  );
}
