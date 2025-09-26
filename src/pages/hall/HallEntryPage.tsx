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
  // Additional optional charges
  cleaning?: string;
  chair?: string;
  eb?: string;
  gas?: string;
  ac?: string;
  // Check-in / Check-out
  checkInDate?: string;
  checkInTime?: string;
  checkOutDate?: string;
  checkOutTime?: string;
}

const initialState: FormState = {
  registerNo: '',
  date: (() => { const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; })(),
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
  bookingStatus: 'completed',
  cleaning: '',
  chair: '',
  eb: '',
  gas: '',
  ac: '',
  checkInDate: '',
  checkInTime: '',
  checkOutDate: '',
  checkOutTime: ''
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
  const [showAdditionalCharges, setShowAdditionalCharges] = useState(false);
  const [showCheckInOut, setShowCheckInOut] = useState(false);

  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  // Print PDF in same tab using hidden iframe
  const printPDF = (pdfUrl: string) => {
    // Remove any existing print iframe
    const existingFrame = document.getElementById('print-frame');
    if (existingFrame) {
      existingFrame.remove();
    }

    // Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'print-frame';
    iframe.style.display = 'none';
    iframe.style.position = 'fixed';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    
    // Add iframe to body
    document.body.appendChild(iframe);

    // Load PDF and print
    iframe.onload = () => {
      try {
        // Small delay to ensure PDF is fully loaded
        setTimeout(() => {
          try {
            // Focus the iframe and trigger print
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (error) {
            console.error('Print error:', error);
            // Fallback: open in new tab if iframe method fails
            window.open(pdfUrl, '_blank');
          }
        }, 1000);
      } catch (error) {
        console.error('Iframe onload error:', error);
        // Fallback: open in new tab
        window.open(pdfUrl, '_blank');
      }
    };

    // Handle iframe error
    iframe.onerror = () => {
      console.error('Failed to load PDF in iframe');
      // Fallback: open in new tab
      window.open(pdfUrl, '_blank');
    };

    // Set the source to trigger loading
    iframe.src = pdfUrl;
  };

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
            bookingStatus: booking.bookingStatus || 'pending',
            cleaning: booking.cleaning?.toString() || '',
            chair: booking.chair?.toString() || '',
            eb: booking.eb?.toString() || '',
            gas: booking.gas?.toString() || '',
            ac: booking.ac?.toString() || '',
            checkInDate: booking.checkInDate || '',
            checkInTime: booking.checkInTime || '',
            checkOutDate: booking.checkOutDate || '',
            checkOutTime: booking.checkOutTime || ''
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
        const accountsResp = await axios.get('https://tmsapi.xesstechlink.com/api/ledger/accounts', { headers: { Authorization: `Bearer ${getAuthToken()}` } });
        const accs = accountsResp?.data?.data || accountsResp?.data || [];
        setAccounts(accs.map((a: any, i: number) => ({ id: a.id ?? i + 1, value: a.value || a.label, label: a.label || a.value })));
        if (user?.templeId) {
          const [hallsResp, eventsResp] = await Promise.all([
            axios.get(`https://tmsapi.xesstechlink.com/api/master/halls/${user.templeId}`, { headers: { Authorization: `Bearer ${getAuthToken()}` } }),
            axios.get(`https://tmsapi.xesstechlink.com/api/master/hall-events/${user.templeId}`, { headers: { Authorization: `Bearer ${getAuthToken()}` } }),
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

  // Auto-dismiss success messages after a short delay (keep errors sticky)
  useEffect(() => {
    if (message && !isError) {
      const timer = setTimeout(() => {
        setMessage(undefined);
        // After success message disappears, generate a fresh receipt number for the next entry (only for new entries)
        if (!isEdit) {
          generateReceiptNo(token)
            .then(receipt => setForm(prev => ({ ...prev, registerNo: receipt })))
            .catch(() => {/* ignore, initialState already applied */});
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [message, isError, isEdit, token]);

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
    if (!form.date || !form.name || !form.mobile) {
      setIsError(true);
      setMessage(t('Please fill all required fields', 'தேவையான அனைத்து புலங்களையும் நிரப்பவும்'));
      return;
    }
    setSaving(true);
    try {
      // Validate id for edit
      let endpoint = 'https://tmsapi.xesstechlink.com/api/hall-bookings';
      if (isEdit) {
        const idNum = Number(id);
        if (Number.isNaN(idNum)) {
          setIsError(true);
          setMessage(t('Invalid booking id', 'தவறான அடையாள எண்'));
          setSaving(false);
          return;
        }
        endpoint = `https://tmsapi.xesstechlink.com/api/hall-bookings/${idNum}`;
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
      } else {
        // For edit mode, redirect to list page after successful update
        navigate('/dashboard/hall/list');
        return;
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
        {isEdit && (
          <div className="flex gap-2">
            <button
              type="button"
              className="border px-2 py-1 rounded hover:bg-gray-50"
              onClick={() => {
                const idNum = Number(id);
                if (!Number.isNaN(idNum)) {
                  const q = token ? `?token=${encodeURIComponent(token)}` : '';
                  const pdfUrl = `https://tmsapi.xesstechlink.com/api/hall-bookings/${idNum}/receipt.pdf${q}`;
                  printPDF(pdfUrl);
                }
              }}
            >
              {t('Print', 'அச்சிடு')}
            </button>
            <button type="button" className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700" onClick={() => setShowDeleteModal(true)}>{t('Delete', 'நீக்கு')}</button>
          </div>
        )}
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
        <input type="date" name="date" value={form.date} onChange={onChange} className="border px-2 py-1 rounded" required />
        <input name="name" value={form.name} onChange={onChange} placeholder={t('Name','பெயர்')} className="border px-2 py-1 rounded" required />
        <div className="relative">
          <input name="mobile" value={form.mobile} onChange={onChange} placeholder={t('Phone','தொலைபேசி')} maxLength={10} className="border px-2 py-1 rounded w-full" required />
          <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-500">*</span>
        </div>
       
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
       {/* Check-in / Check-out Toggle */}
       <div className="col-span-2">
          <button
            type="button"
            className="flex items-center justify-between w-full p-2 bg-gray-100 border rounded hover:bg-gray-200"
            onClick={() => setShowCheckInOut(!showCheckInOut)}
          >
            <span className="font-medium text-xs">{t('Check-in / Check-out Details','செக்-இன் / செக்-அவுட் விவரங்கள்')}</span>
            <span>{showCheckInOut ? '▲' : '▼'}</span>
          </button>
          
          {/* Collapsible Check-in / Check-out Section */}
          {showCheckInOut && (
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <label className="block text-xs mb-1">{t('Check-in Date','செக்-இன் தேதி')}</label>
                <input type="date" name="checkInDate" value={form.checkInDate || ''} onChange={onChange} className="border px-2 py-1 rounded w-full" />
              </div>
              <div>
                <label className="block text-xs mb-1">{t('Check-in Time','செக்-இன் நேரம்')}</label>
                <input type="time" name="checkInTime" value={form.checkInTime || ''} onChange={onChange} className="border px-2 py-1 rounded w-full" />
              </div>
              <div>
                <label className="block text-xs mb-1">{t('Check-out Date','செக்-அவுட் தேதி')}</label>
                <input type="date" name="checkOutDate" value={form.checkOutDate || ''} onChange={onChange} className="border px-2 py-1 rounded w-full" />
              </div>
              <div>
                <label className="block text-xs mb-1">{t('Check-out Time','செக்-அவுட் நேரம்')}</label>
                <input type="time" name="checkOutTime" value={form.checkOutTime || ''} onChange={onChange} className="border px-2 py-1 rounded w-full" />
              </div>
            </div>
          )}
        </div>
        {/* Additional Charges Toggle */}
        <div className="col-span-2">
          <button
            type="button"
            className="flex items-center justify-between w-full p-2 bg-gray-100 border rounded hover:bg-gray-200"
            onClick={() => setShowAdditionalCharges(!showAdditionalCharges)}
          >
            <span className="font-medium text-xs">{t('Additional Charges','கூடுதல் கட்டணங்கள்')}</span>
            <span>{showAdditionalCharges ? '▲' : '▼'}</span>
          </button>
          
          {/* Collapsible Additional Charges Section */}
          {showAdditionalCharges && (
            <div className="grid grid-cols-2 gap-2 border rounded p-2 bg-gray-50 mt-1">
              <div>
                <label className="block text-xs mb-1">{t('Cleaning (₹)','துப்புரவு (₹)')}</label>
                <input name="cleaning" value={form.cleaning || ''} onChange={onChange} className="border px-2 py-1 rounded w-full" type="number" min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-xs mb-1">{t('Chair (₹)','நாற்காலி (₹)')}</label>
                <input name="chair" value={form.chair || ''} onChange={onChange} className="border px-2 py-1 rounded w-full" type="number" min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-xs mb-1">{t('EB (₹)','மின்சாரம் (₹)')}</label>
                <input name="eb" value={form.eb || ''} onChange={onChange} className="border px-2 py-1 rounded w-full" type="number" min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-xs mb-1">{t('Gas (₹)','எரிவாயு (₹)')}</label>
                <input name="gas" value={form.gas || ''} onChange={onChange} className="border px-2 py-1 rounded w-full" type="number" min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-xs mb-1">{t('AC (₹)','ஏசி (₹)')}</label>
                <input name="ac" value={form.ac || ''} onChange={onChange} className="border px-2 py-1 rounded w-full" type="number" min="0" step="0.01" />
              </div>
              <div className="col-span-2 text-[11px] text-gray-700">
                {t('Tip: These are optional. You can keep Total editable below.','குறிப்பு: இவை விருப்பமானவை. கீழே மொத்தத்தை மாற்றலாம்.')}
              </div>
            </div>
          )}
        </div>
        <input name="totalAmount" value={form.totalAmount} onChange={onChange} placeholder={t('Total','மொத்தம்')} className="border px-2 py-1 rounded" type="number" min="0" step="0.01" />
        {/* Extras summary and quick apply */}
        <ExtrasSummary form={form} setForm={setForm} t={t} />
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
          <button type="submit" disabled={saving} className="bg-orange-600 text-white px-3 py-1 rounded disabled:opacity-50 hover:bg-orange-700">
            {saving ? t('Saving...','சேமிக்கிறது...') : t(isEdit?'Update':'Save', isEdit?'புதுப்பி':'சேமி')}
          </button>
          <button type="button" className="border px-3 py-1 rounded hover:bg-gray-50" onClick={()=>navigate('/dashboard/hall/list')}>
            {t('View List','பட்டியல்')}
          </button>
          <button type="button" className="border px-3 py-1 rounded hover:bg-gray-50" onClick={()=>setForm({...initialState, registerNo: ''})}>
            {t('Clear','அழி')}
          </button>
        </div>
      </form>

      {/* Print Modal */}
      {showPrintPrompt && lastCreatedId && (
        <Modal title={t('Print Receipt','ரசீது அச்சிடு')} onClose={()=>setShowPrintPrompt(false)}>
          <p className="mb-4">{t('Receipt saved successfully! Would you like to print it now?','ரசீது வெற்றிகரமாக சேமிக்கப்பட்டது! இப்போது அச்சிட வேண்டுமா?')}</p>
          <div className="flex justify-end gap-2">
            <button className="border px-3 py-1 rounded hover:bg-gray-50" onClick={()=>setShowPrintPrompt(false)}>{t('Skip','தவிர்')}</button>
            <button className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700" onClick={()=>{
              const q = token?`?token=${encodeURIComponent(token)}`:'';
              const pdfUrl = `https://tmsapi.xesstechlink.com/api/hall-bookings/${lastCreatedId}/receipt.pdf${q}`;
              printPDF(pdfUrl);
              setShowPrintPrompt(false);
            }}>{t('Print Now','இப்போது அச்சிடு')}</button>
          </div>
        </Modal>
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <Modal title={t('Confirm Delete','நீக்குவதை உறுதிப்படுத்தவும்')} onClose={()=>setShowDeleteModal(false)}>
          <p className="mb-4">{t('Are you sure you want to delete this booking? This action cannot be undone.','இந்த பதிவை நீக்க விரும்புகிறீர்களா? இந்த நடவடிக்கையை மாற்ற முடியாது.')}</p>
          <div className="flex justify-end gap-2">
            <button className="border px-3 py-1 rounded hover:bg-gray-50" onClick={()=>setShowDeleteModal(false)}>{t('Cancel','ரத்து')}</button>
            <button className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700" onClick={handleDelete}>{t('Delete','நீக்கு')}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Small helper component to show extras total and a quick action to set total
function ExtrasSummary({ form, setForm, t }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>; t: (en: string, ta: string) => string }) {
  const sum =
    (parseFloat(form.cleaning || '0') || 0) +
    (parseFloat(form.chair || '0') || 0) +
    (parseFloat(form.eb || '0') || 0) +
    (parseFloat(form.gas || '0') || 0) +
    (parseFloat(form.ac || '0') || 0);

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="px-2 py-1 rounded bg-gray-100 border">{t('Extras Total','கூடுதல் மொத்தம்')}: ₹{sum.toFixed(2)}</div>
      <button
        type="button"
        className="border px-2 py-1 rounded hover:bg-gray-50"
        onClick={() => setForm(prev => ({ ...prev, totalAmount: String(sum) }))}
      >
        {t('Set Total = Extras','மொத்தம் = கூடுதல்')}
      </button>
    </div>
  );
}
