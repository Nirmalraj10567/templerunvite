import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { Modal } from '@/components/ui/modal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import axios from 'axios';
import { getAuthToken } from '@/lib/auth';
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { theme } from '@/styles/theme';

const generateReceiptNo = async (token: string): Promise<string> => {
  try {
    console.log('Requesting new receipt number...');
    const response = await fetch('https://tmsapi.xesstechlink.com/api/hall-bookings/generate-receipt-number', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Receipt number API failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to generate receipt number: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.receiptNo) {
      throw new Error('Invalid response format from server');
    }
    
    console.log('Generated receipt number:', data.receiptNo);
    return data.receiptNo;
    
  } catch (error) {
    console.error('Receipt number generation error:', error);
    
    // Try to get the latest receipt number from the database as a fallback
    try {
      console.log('Attempting to get latest receipt from database...');
      const latestResponse = await fetch('https://tmsapi.xesstechlink.com/api/hall-bookings/latest', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (latestResponse.ok) {
        const latestData = await latestResponse.json();
        if (latestData?.register_no) {
          // Extract the number part and increment it
          const match = latestData.register_no.match(/^(\d{4})-(\d+)$/);
          if (match) {
            const year = match[1];
            const number = parseInt(match[2], 10) + 1;
            const newNumber = `${year}-${String(number).padStart(4, '0')}`;
            console.log('Generated receipt number from latest record:', newNumber);
            return newNumber;
          }
        }
      }
    } catch (fallbackError) {
      console.error('Fallback receipt number generation failed:', fallbackError);
    }
    
    // Last resort: use timestamp-based number
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const fallbackNo = `${year}-${month}${day}${hours}${minutes}${seconds}`;
    console.warn('Using timestamp-based fallback receipt number:', fallbackNo);
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
  date: (() => { 
    const d = new Date(); 
    const y = d.getFullYear(); 
    const m = String(d.getMonth() + 1).padStart(2, '0'); 
    const day = String(d.getDate()).padStart(2, '0'); 
    return `${y}-${m}-${day}`; 
  })(),
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

// Custom hook for Enter key navigation
const useEnterKeyNavigation = () => {
  const formRef = useRef<HTMLFormElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    const tag = t.tagName?.toLowerCase();
    if (!tag || ['button', 'textarea'].includes(tag)) return; // allow buttons and textareas to handle Enter normally
    e.preventDefault();
    // Focus the save button
    const submitButton = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (submitButton) {
      submitButton.focus();
    }
  };

  return { formRef, handleKeyDown };
};

export default function HallEntryPage() {
  const { token, user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { formRef, handleKeyDown } = useEnterKeyNavigation();

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

  // Use centralized form styles
  const fieldStyles = cn(theme.input.base, theme.input.size.md);
  const labelStyles = cn(formFieldStyles.label, "text-base mb-2");
  const textareaStyles = cn(theme.textarea.base, theme.textarea.size.md, "resize-none");

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

  // Auto-balance calculation
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
          const response = await fetch(`https://tmsapi.xesstechlink.com/api/hall-bookings/${idNum}`, { 
            headers: { Authorization: `Bearer ${token}` } 
          });
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
        const accountsResp = await axios.get('https://tmsapi.xesstechlink.com/api/ledger/accounts', { 
          headers: { Authorization: `Bearer ${getAuthToken()}` } 
        });
        const accs = (accountsResp?.data as any)?.data || accountsResp?.data || [];
        setAccounts(accs.map((a: any, i: number) => ({ 
          id: a.id ?? i + 1, 
          value: a.value || a.label, 
          label: a.label || a.value 
        })));
        
        if (user?.templeId) {
          const [hallsResp, eventsResp] = await Promise.all([
            axios.get(`https://tmsapi.xesstechlink.com/api/master/halls/${user.templeId}`, { 
              headers: { Authorization: `Bearer ${getAuthToken()}` } 
            }),
            axios.get(`https://tmsapi.xesstechlink.com/api/master/hall-events/${user.templeId}`, { 
              headers: { Authorization: `Bearer ${getAuthToken()}` } 
            }),
          ]);
          setHalls((hallsResp?.data as unknown as Array<{ id: number; name: string; base_price?: number | null }>) || []);
          setHallEvents((eventsResp?.data as unknown as Array<{ id: number; name: string }>) || []);
        } else {
          setHalls([]);
          setHallEvents([]);
        }
      } catch {
        setAccounts([]);
        setHalls([]);
        setHallEvents([]);
      }
    })();
  }, [user?.templeId]);

  // Generate receipt number for new entries
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

  // Auto-dismiss success messages
  useEffect(() => {
    if (message && !isError) {
      const timer = setTimeout(() => {
        setMessage(undefined);
        // After success message disappears, generate a fresh receipt number for the next entry
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

      // Auto-calculate total when additional charges change
      if (name === 'cleaning' || name === 'chair' || name === 'eb' || name === 'gas' || name === 'ac') {
        const cleaning = Number(updated.cleaning || '0') || 0;
        const chair = Number(updated.chair || '0') || 0;
        const eb = Number(updated.eb || '0') || 0;
        const gas = Number(updated.gas || '0') || 0;
        const ac = Number(updated.ac || '0') || 0;
        const extrasTotal = cleaning + chair + eb + gas + ac;
        
        // Get the base total (excluding any previously added extras)
        const currentTotal = Number(updated.totalAmount || '0') || 0;
        const baseTotal = Math.max(0, currentTotal - (Number(prev.cleaning || '0') + Number(prev.chair || '0') + Number(prev.eb || '0') + Number(prev.gas || '0') + Number(prev.ac || '0')));
        
        // Set new total as base total + new extras
        updated.totalAmount = (baseTotal + extrasTotal).toString();
        
        // Recalculate balance
        const advance = Number(updated.advanceAmount || '0') || 0;
        const balance = Math.max(0, baseTotal + extrasTotal - advance);
        updated.balanceAmount = balance.toString();
      }

      return updated;
    });
  };

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
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
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
      setMessage(t(
        isEdit ? 'Updated successfully' : 'Saved successfully', 
        isEdit ? 'புதுப்பிக்கப்பட்டது' : 'சேமிக்கப்பட்டது'
      ));
    } catch (error: any) {
      setIsError(true);
      setMessage(t(
        error.message || (isEdit ? 'Update failed' : 'Save failed'), 
        error.message || (isEdit ? 'புதுப்பிப்பில் தோல்வி' : 'சேமிப்பு தோல்வி')
      ));
    } finally {
      setSaving(false);
    }
  };

  const clearForm = () => {
    setForm({ ...initialState, registerNo: '' });
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
      setMessage(t(
        error.message || 'Delete failed', 
        error.message || 'நீக்குவதில் தோல்வி'
      ));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading hall booking data...</div>
      </div>
    );
  }
  
  

  return (
    <div className={pageContainerStyles.container}>
    <div className={pageContainerStyles.content}>
      <Card className={formFieldStyles.card.container}>
        <CardHeader className={theme.header.container}>
          <div className={theme.header.contentSpacing}>
            <CardTitle className={theme.header.main}>
                  {isEdit ? t('Edit Hall Booking', 'மண்டப பதிவு திருத்து') : t('Hall Booking Entry', 'மண்டப பதிவு')}
                </CardTitle>
          </div>
              {isEdit && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-white text-orange-600 border-white hover:bg-gray-50"
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
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    {t('Delete', 'நீக்கு')}
                  </Button>
                </div>
              )}
            
          </CardHeader>
          
          <CardContent className={formFieldStyles.card.content}>
            {/* Receipt Number Display */}
            <div className={cn(formFieldStyles.registerDisplay.container, "mb-6 p-4")}>
              <div className="text-lg">
                <span className={formFieldStyles.registerDisplay.label}>{t('Receipt No','ரசீது எண்')}:</span>
                <span className={cn(formFieldStyles.registerDisplay.value, "text-xl")}>{form.registerNo}</span>
              </div>
            </div>

            {/* Message Display */}
            {message && (
              <Alert variant={isError ? 'destructive' : 'default'} className="mb-6">
                <AlertTitle>{isError ? t('Error','பிழை') : t('Success','வெற்றி')}</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <form ref={formRef} onSubmit={onSubmit} onKeyDown={handleKeyDown} className={formFieldStyles.form.container}>
              {/* Enhanced Grid Layout - All fields same size */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Date */}
                <div>
                  <Input
                    id="date"
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={onChange}
                    className={fieldStyles}
                    placeholder={t('Date','Date') + ' *'}
                    required
                    autoFocus
                  />
                </div>

                {/* Time */}
                <div>
                  <Input
                    id="time"
                    type="time"
                    name="time"
                    value={form.time}
                    onChange={onChange}
                    className={fieldStyles}
                    placeholder={t('Time','Time')}
                  />
                </div>

                {/* Name */}
                <div>
                  <Input
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    className={fieldStyles}
                    placeholder={t('Name','Name') + ' *'}
                    required
                  />
                </div>

                {/* Mobile */}
                <div>
                  <Input
                    id="mobile"
                    name="mobile"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.mobile}
                    onInput={(e) => {
                      const el = e.currentTarget as HTMLInputElement;
                      const cleaned = el.value.replace(/\D/g, '').slice(0, 10);
                      if (el.value !== cleaned) {
                        el.value = cleaned;
                        setForm(prev => ({ ...prev, mobile: cleaned }));
                      }
                    }}
                    onChange={onChange}
                    className={fieldStyles}
                    placeholder={t('Phone','Phone') + ' *'}
                    required
                  />
                </div>

                {/* Village */}
                <div>
                  <Input
                    id="village"
                    name="village"
                    value={form.village}
                    onChange={onChange}
                    className={fieldStyles}
                    placeholder={t('Village','Village')}
                  />
                </div>

                {/* Hall */}
                <div>
                  <div className={formFieldStyles.selectDropdown.container}>
                    <select
                      id="hallId"
                      name="hallId"
                      value={form.hallId ?? ''}
                      onChange={onChange}
                      className={cn(theme.select.base, theme.select.size.md)}
                    >
                      <option value="">{t('Select hall','மண்டபத்தைத் தேர்வு')}</option>
                      {halls.length > 0 ? halls.map(h => (
                        <option key={h.id} value={h.id}>
                          {h.name}{h.base_price ? ` - ₹${h.base_price}` : ''}
                        </option>
                      )) : (
                        <option disabled>{t('No halls available', 'மண்டபங்கள் இல்லை')}</option>
                      )}
                    </select>
                    <div className={formFieldStyles.selectDropdown.dropdown}>
                      <svg className={formFieldStyles.selectDropdown.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Event */}
                <div>
                  <div className={formFieldStyles.selectDropdown.container}>
                    <select
                      id="eventId"
                      name="eventId"
                      value={form.eventId ?? ''}
                      onChange={onChange}
                      className={cn(theme.select.base, theme.select.size.md)}
                    >
                      <option value="">{t('Select event','நிகழ்வு தேர்வு')}</option>
                      {hallEvents.length > 0 ? hallEvents.map(ev => (
                        <option key={ev.id} value={ev.id}>{ev.name}</option>
                      )) : (
                        <option disabled>{t('No events available', 'நிகழ்வுகள் இல்லை')}</option>
                      )}
                    </select>
                    <div className={formFieldStyles.selectDropdown.dropdown}>
                      <svg className={formFieldStyles.selectDropdown.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Address - Full width */}
                <div>
                  <Input
                    id="address"
                    name="address"
                    value={form.address}
                    onChange={onChange}
                    className={fieldStyles}
                    placeholder={t('Enter address','முகவரியை உள்ளிடவும்')}
                  />
                </div>

                {/* Total Amount */}
                <div>
                  <Input
                    id="totalAmount"
                    name="totalAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.totalAmount}
                    onChange={onChange}
                    className={fieldStyles}
                    placeholder={t('Enter total','மொத்தத்தை உள்ளிடவும்')}
                  />
                </div>

                {/* Advance Amount */}
                <div>
                  <Input
                    id="advanceAmount"
                    name="advanceAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.advanceAmount}
                    onChange={onChange}
                    className={fieldStyles}
                    placeholder={t('Enter advance','முன்பணத்தை உள்ளிடவும்')}
                  />
                </div>

                {/* Balance Amount */}
                <div>
                  <Input
                    id="balanceAmount"
                    name="balanceAmount"
                    readOnly
                    value={form.balanceAmount}
                    className={`${fieldStyles} bg-gray-100`}
                    placeholder={t('Auto calculated','தானாக கணக்கிடப்படும்')}
                  />
                </div>

                {/* Extras Summary */}
                <ExtrasSummary form={form} setForm={setForm} t={t} fieldStyles={fieldStyles} />
              </div>

              {/* Check-in / Check-out Toggle */}
              <div className="space-y-4">
                <button
                  type="button"
                  className="flex items-center justify-between w-full p-4 bg-gray-100 border rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={() => setShowCheckInOut(!showCheckInOut)}
                >
                  <span className="font-medium text-base">
                    {t('Check-in / Check-out Details','செக்-இன் / செக்-அவுட் விவரங்கள்')}
                  </span>
                  <span className="text-lg">{showCheckInOut ? '▲' : '▼'}</span>
                </button>
                
                {/* Collapsible Check-in / Check-out Section */}
                {showCheckInOut && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <Input
                        id="checkInDate"
                        type="date"
                        name="checkInDate"
                        value={form.checkInDate || ''}
                        onChange={onChange}
                        className={fieldStyles}
                      />
                    </div>
                    <div>
                      <Input
                        id="checkInTime"
                        type="time"
                        name="checkInTime"
                        value={form.checkInTime || ''}
                        onChange={onChange}
                        className={fieldStyles}
                      />
                    </div>
                    <div>
                      <Input
                        id="checkOutDate"
                        type="date"
                        name="checkOutDate"
                        value={form.checkOutDate || ''}
                        onChange={onChange}
                        className={fieldStyles}
                      />
                    </div>
                    <div>
                      <Input
                        id="checkOutTime"
                        type="time"
                        name="checkOutTime"
                        value={form.checkOutTime || ''}
                        onChange={onChange}
                        className={fieldStyles}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Charges Toggle */}
              <div className="space-y-4">
                <button
                  type="button"
                  className="flex items-center justify-between w-full p-4 bg-gray-100 border rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={() => setShowAdditionalCharges(!showAdditionalCharges)}
                >
                  <span className="font-medium text-base">
                    {t('Additional Charges','கூடுதல் கட்டணங்கள்')}
                  </span>
                  <span className="text-lg">{showAdditionalCharges ? '▲' : '▼'}</span>
                </button>
                
                {/* Collapsible Additional Charges Section */}
                {showAdditionalCharges && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <Input
                        id="cleaning"
                        name="cleaning"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.cleaning || ''}
                        onChange={onChange}
                        className={fieldStyles}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Input
                        id="chair"
                        name="chair"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.chair || ''}
                        onChange={onChange}
                        className={fieldStyles}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Input
                        id="eb"
                        name="eb"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.eb || ''}
                        onChange={onChange}
                        className={fieldStyles}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Input
                        id="gas"
                        name="gas"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.gas || ''}
                        onChange={onChange}
                        className={fieldStyles}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Input
                        id="ac"
                        name="ac"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.ac || ''}
                        onChange={onChange}
                        className={fieldStyles}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-full text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                      {t(
                        'Tip: Additional charges are automatically added to the total amount. You can also manually adjust the total above.',
                        'குறிப்பு: கூடுதல் கட்டணங்கள் தானாக மொத்த தொகையில் சேர்க்கப்படும். மேலே மொத்தத்தை கைமுறையாக மாற்றலாம்.'
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Remarks */}
              <div>
                <Textarea
                  id="remarks"
                  name="remarks"
                  value={form.remarks}
                  onChange={onChange}
                  rows={3}
                  className={textareaStyles}
                  placeholder={t('Enter remarks','குறிப்புகளை உள்ளிடவும்')}
                />
              </div>

              {/* Action Buttons */}
              <div className={formFieldStyles.actions.container}>
                <div className={formFieldStyles.actions.buttonGroup}>
                  <Button
                    type="submit"
                    size="default"
                    className={formFieldStyles.moneyDonationButton.primary}
                    disabled={saving}
                  >
                    {saving ? t('Saving...','சேமிக்கிறது...') : t(isEdit?'Update':'Save', isEdit?'புதுப்பி':'சேமி')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearForm}
                    className="px-6 py-2 text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Print Modal */}
      {showPrintPrompt && lastCreatedId && (
        <Modal title={t('Print Receipt','ரசீது அச்சிடு')} onClose={() => setShowPrintPrompt(false)}>
          <div className={formFieldStyles.modal.container}>
            <p className={formFieldStyles.modal.content}>
              {t(
                'Receipt saved successfully! Would you like to print it now?',
                'ரசீது வெற்றிகரமாக சேமிக்கப்பட்டது! இப்போது அச்சிட வேண்டுமா?'
              )}
            </p>
            <div className={formFieldStyles.modal.actions}>
              <button 
                className={formFieldStyles.modal.button.cancel} 
                onClick={() => setShowPrintPrompt(false)}
              >
                {t('Skip','தவிர்')}
              </button>
              <button 
                className={formFieldStyles.modal.button.confirm} 
                onClick={() => {
                  const q = token ? `?token=${encodeURIComponent(token)}` : '';
                  const pdfUrl = `https://tmsapi.xesstechlink.com/api/hall-bookings/${lastCreatedId}/receipt.pdf${q}`;
                  printPDF(pdfUrl);
                  setShowPrintPrompt(false);
                }}
              >
                {t('Print Now','இப்போது அச்சிடு')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <Modal title={t('Confirm Delete','நீக்குவதை உறுதிப்படுத்தவும்')} onClose={() => setShowDeleteModal(false)}>
          <div className={formFieldStyles.modal.container}>
            <p className={formFieldStyles.modal.content}>
              {t(
                'Are you sure you want to delete this booking? This action cannot be undone.',
                'இந்த பதிவை நீக்க விரும்புகிறீர்களா? இந்த நடவடிக்கையை மாற்ற முடியாது.'
              )}
            </p>
            <div className={formFieldStyles.modal.actions}>
              <button 
                className={formFieldStyles.modal.button.cancel} 
                onClick={() => setShowDeleteModal(false)}
              >
                {t('Cancel','ரத்து')}
              </button>
              <button 
                className="px-4 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-700" 
                onClick={handleDelete}
              >
                {t('Delete','நீக்கு')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Enhanced helper component for extras total with consistent styling
function ExtrasSummary({ form, setForm, t, fieldStyles }: { 
  form: FormState; 
  setForm: React.Dispatch<React.SetStateAction<FormState>>; 
  t: (en: string, ta: string) => string;
  fieldStyles: string;
}) {
  const sum =
    (parseFloat(form.cleaning || '0') || 0) +
    (parseFloat(form.chair || '0') || 0) +
    (parseFloat(form.eb || '0') || 0) +
    (parseFloat(form.gas || '0') || 0) +
    (parseFloat(form.ac || '0') || 0);

  return (
    <div className="space-y-2">
      <Label className={cn(formFieldStyles.label, "text-base mb-2")}>
        {t('Extras Total','கூடுதல் மொத்தம்')}
      </Label>
      <div className="flex items-center gap-2">
        <div className={cn(fieldStyles, "bg-gray-100 font-medium")}>
          ₹{sum.toFixed(2)}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(formFieldStyles.button.sm, "whitespace-nowrap")}
          onClick={() => {
            // Get current base total (excluding extras)
            const currentTotal = Number(form.totalAmount || '0') || 0;
            const currentExtras = (Number(form.cleaning || '0') + Number(form.chair || '0') + Number(form.eb || '0') + Number(form.gas || '0') + Number(form.ac || '0'));
            const baseTotal = Math.max(0, currentTotal - currentExtras);
            
            // Set total to base + new extras
            setForm(prev => ({ 
              ...prev, 
              totalAmount: String(baseTotal + sum),
              balanceAmount: String(Math.max(0, (baseTotal + sum) - Number(prev.advanceAmount || '0')))
            }));
          }}
        >
          {t('Add to Total','மொத்தத்தில் சேர்')}
        </Button>
      </div>
    </div>
  );
}
