import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { Modal } from '@/components/ui/modal';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar, 
  Clock, 
  Search,
  X,
  Plus,
  Loader2,
  ChevronDown
} from 'lucide-react';
import axios from 'axios';
import { getAuthToken } from '@/lib/auth';
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { theme } from '@/styles/theme';
import { accountService, type AccountItem } from '@/services/accountService';

const RAW_API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || window.location.origin;
const NORMALIZED_API_BASE = RAW_API_BASE.replace(/\/+$/, '');
const API_BASE_URL = NORMALIZED_API_BASE.endsWith('/api') ? NORMALIZED_API_BASE : `${NORMALIZED_API_BASE}/api`;

const generateReceiptNo = async (token: string): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/hall-bookings/generate-receipt-number`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to generate receipt number`);
    }

    const data = await response.json();
    return data.receiptNo;

  } catch (error) {
    const now = new Date();
    const fallbackNo = `${now.getFullYear()}-${Date.now().toString().slice(-6)}`;
    return fallbackNo;
  }
};

interface FormState {
  registerNo: string;
  entryDate: string;
  bookingDate: string;
  date: string;
  time: string;
  event: string;
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
  cleaning?: string;
  chair?: string;
  eb?: string;
  gas?: string;
  ac?: string;
  checkInDate?: string;
  checkInTime?: string;
  checkOutDate?: string;
  checkOutTime?: string;
  paymentMode?: 'cash' | 'bank' | 'upi';
  accountId?: number | null;
}

const initialState: FormState = {
  registerNo: '',
  entryDate: (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })(),
  bookingDate: (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })(),
  date: (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })(),
  time: (() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  })(),
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
  checkOutTime: '',
  paymentMode: 'cash',
  accountId: null
};

export default function HallEntryPage() {
  const { token, user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const formRef = useRef<HTMLFormElement>(null);

  const [form, setForm] = useState<FormState>({ ...initialState, registerNo: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [isError, setIsError] = useState(false);
  const [halls, setHalls] = useState<Array<{ id: number; name: string; base_price?: number | null }>>([]);
  const [hallEvents, setHallEvents] = useState<Array<{ id: number; name: string }>>([]);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAdditionalCharges, setShowAdditionalCharges] = useState(false);
  const [showCheckInOut, setShowCheckInOut] = useState(false);
  const [paymentAccounts, setPaymentAccounts] = useState<AccountItem[]>([]);

  // Hall & Event searchable dropdown state
  const [hallQuery, setHallQuery] = useState('');
  const [eventQuery, setEventQuery] = useState('');
  const [showHallDropdown, setShowHallDropdown] = useState(false);
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [addingHall, setAddingHall] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const hallDropdownRef = useRef<HTMLDivElement>(null);
  const eventDropdownRef = useRef<HTMLDivElement>(null);

  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  const fieldStyles = cn(theme.input.base, theme.input.size.md, "w-full");
  const textareaStyles = cn(theme.textarea.base, theme.textarea.size.md, "resize-none");

  // Click outside handlers for dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (hallDropdownRef.current && !hallDropdownRef.current.contains(e.target as Node)) setShowHallDropdown(false);
      if (eventDropdownRef.current && !eventDropdownRef.current.contains(e.target as Node)) setShowEventDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const loadAccounts = async () => {
      if (!token) return;
      try {
        const list = await accountService.list(token);
        setPaymentAccounts(list);
      } catch (e) {
        console.error('Failed to load payment accounts', e);
      }
    };
    loadAccounts();
  }, [token]);

  // Filtered lists (deduplicated by id)
  const filteredHalls = halls
    .filter((h, i, arr) => arr.findIndex(x => x.id === h.id) === i)
    .filter(h => h.name.toLowerCase().includes(hallQuery.toLowerCase()));
  const filteredEvents = hallEvents
    .filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i)
    .filter(e => e.name.toLowerCase().includes(eventQuery.toLowerCase()));

  // Refetch halls from server
  const refetchHalls = useCallback(async () => {
    if (!user?.templeId) return;
    try {
      const resp = await axios.get(`${API_BASE_URL}/master/halls/${user.templeId}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      setHalls(resp.data || []);
    } catch {}
  }, [user?.templeId]);

  // Refetch events from server
  const refetchEvents = useCallback(async () => {
    if (!user?.templeId) return;
    try {
      const resp = await axios.get(`${API_BASE_URL}/master/hall-events/${user.templeId}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      setHallEvents(resp.data || []);
    } catch {}
  }, [user?.templeId]);

  // Select a hall
  const selectHall = useCallback((h: { id: number; name: string }) => {
    setForm(prev => ({ ...prev, hallId: h.id }));
    setHallQuery(h.name);
    setShowHallDropdown(false);
  }, []);

  // Select an event
  const selectEvent = useCallback((ev: { id: number; name: string }) => {
    setForm(prev => ({ ...prev, eventId: ev.id }));
    setEventQuery(ev.name);
    setShowEventDropdown(false);
  }, []);

  // Create new hall via API then refetch
  const createHall = useCallback(async (name: string) => {
    if (!name.trim() || addingHall) return;
    const trimmed = name.trim();
    const dup = halls.find(h => h.name.toLowerCase() === trimmed.toLowerCase());
    if (dup) { selectHall(dup); return; }
    setAddingHall(true);
    try {
      await axios.post(`${API_BASE_URL}/master/halls`, { name: trimmed }, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      // Refetch fresh list then find the newly created item by name
      if (user?.templeId) {
        const resp = await axios.get(`${API_BASE_URL}/master/halls/${user.templeId}`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        });
        const freshHalls = resp.data || [];
        setHalls(freshHalls);
        const match = freshHalls.find((h: any) => h.name.toLowerCase() === trimmed.toLowerCase());
        if (match) selectHall(match);
        else { setHallQuery(trimmed); setShowHallDropdown(false); }
      }
    } catch (err) { console.error('Failed to create hall:', err); }
    finally { setAddingHall(false); }
  }, [halls, addingHall, selectHall, user?.templeId]);

  // Create new event via API then refetch
  const createEvent = useCallback(async (name: string) => {
    if (!name.trim() || addingEvent) return;
    const trimmed = name.trim();
    const dup = hallEvents.find(e => e.name.toLowerCase() === trimmed.toLowerCase());
    if (dup) { selectEvent(dup); return; }
    setAddingEvent(true);
    try {
      await axios.post(`${API_BASE_URL}/master/hall-events`, { name: trimmed }, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      // Refetch fresh list then find the newly created item by name
      if (user?.templeId) {
        const resp = await axios.get(`${API_BASE_URL}/master/hall-events/${user.templeId}`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        });
        const freshEvents = resp.data || [];
        setHallEvents(freshEvents);
        const match = freshEvents.find((e: any) => e.name.toLowerCase() === trimmed.toLowerCase());
        if (match) selectEvent(match);
        else { setEventQuery(trimmed); setShowEventDropdown(false); }
      }
    } catch (err) { console.error('Failed to create event:', err); }
    finally { setAddingEvent(false); }
  }, [hallEvents, addingEvent, selectEvent, user?.templeId]);

  const downloadReceipt = async (bookingId: number, registerNo: string | null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/hall-bookings/${bookingId}/receipt.pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch receipt');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${registerNo || bookingId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading receipt:", error);
    }
  };

  useEffect(() => {
    if (isEdit && id) {
      (async () => {
        setLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/hall-bookings/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await response.json();
          const booking = data.data || data;
          setForm({
            ...booking,
            entryDate: booking.entryDate || booking.date,
            bookingDate: booking.bookingDate || booking.date,
            advanceAmount: booking.advanceAmount?.toString() || '',
            totalAmount: booking.totalAmount?.toString() || '',
            balanceAmount: booking.balanceAmount?.toString() || '',
            cleaning: booking.cleaning?.toString() || '',
            chair: booking.chair?.toString() || '',
            eb: booking.eb?.toString() || '',
            gas: booking.gas?.toString() || '',
            ac: booking.ac?.toString() || '',
            paymentMode: (booking.payment_mode || booking.paymentMode || 'cash').toString().toLowerCase(),
            accountId: booking.account_id != null ? Number(booking.account_id) : (booking.accountId != null ? Number(booking.accountId) : null),
          });
          // Prefill hall/event search queries from loaded data
          if (booking.hallId) {
            const h = halls.find((x: any) => x.id === booking.hallId);
            if (h) setHallQuery(h.name);
          }
          if (booking.eventId) {
            const ev = hallEvents.find((x: any) => x.id === booking.eventId);
            if (ev) setEventQuery(ev.name);
          }
        } catch {
          setIsError(true);
          setMessage(t('Failed to load booking data', 'பதிவு தகவலை ஏற்ற முடியவில்லை'));
        } finally {
          setLoading(false);
        }
      })();
    } else {
      generateReceiptNo(token).then(receipt => setForm(prev => ({ ...prev, registerNo: receipt })));
    }
  }, [id, isEdit, token]);

  useEffect(() => {
    if (user?.templeId) {
      (async () => {
        try {
          const [hallsResp, eventsResp] = await Promise.all([
            axios.get(`${API_BASE_URL}/master/halls/${user.templeId}`, {
              headers: { Authorization: `Bearer ${getAuthToken()}` }
            }),
            axios.get(`${API_BASE_URL}/master/hall-events/${user.templeId}`, {
              headers: { Authorization: `Bearer ${getAuthToken()}` }
            }),
          ]);
          setHalls(hallsResp.data || []);
          setHallEvents(eventsResp.data || []);
        } catch {}
      })();
    }
  }, [user?.templeId]);

  // Sync hall/event queries when master data loads (edit mode)
  useEffect(() => {
    if (isEdit && form.hallId && halls.length > 0 && !hallQuery) {
      const h = halls.find(x => x.id === Number(form.hallId));
      if (h) setHallQuery(h.name);
    }
    if (isEdit && form.eventId && hallEvents.length > 0 && !eventQuery) {
      const ev = hallEvents.find(x => x.id === Number(form.eventId));
      if (ev) setEventQuery(ev.name);
    }
  }, [halls, hallEvents, form.hallId, form.eventId, isEdit]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'totalAmount' || name === 'advanceAmount') {
        const total = parseFloat(updated.totalAmount) || 0;
        const advance = parseFloat(updated.advanceAmount) || 0;
        updated.balanceAmount = Math.max(0, total - advance).toString();
      }
      return updated;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      const submitButton = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement;
      submitButton?.focus();
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(undefined);
    try {
      if ((form.paymentMode === 'bank' || form.paymentMode === 'upi') && !form.accountId) {
        throw new Error(t('Please select a Bank / UPI account', 'வங்கி / UPI கணக்கை தேர்ந்தெடுக்கவும்'));
      }
      const endpoint = isEdit ? `${API_BASE_URL}/hall-bookings/${id}` : `${API_BASE_URL}/hall-bookings`;
      const res = await fetch(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          fromAccount: 'HALL ENTRY A/C',
          amount: String(parseFloat(form.advanceAmount || form.totalAmount || '0') || 0),
          paymentMode: form.paymentMode || 'cash',
          accountId: (form.paymentMode === 'cash') ? null : (form.accountId ?? null),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      
      if (!isEdit) {
        setLastCreatedId(data.data?.id);
        setShowPrintPrompt(true);
        setForm({ ...initialState, registerNo: '' });
        generateReceiptNo(token).then(receipt => setForm(prev => ({ ...prev, registerNo: receipt })));
      } else {
        navigate('/dashboard/hall/list');
      }
      setIsError(false);
      setMessage(t('Saved successfully', 'சேமிக்கப்பட்டது'));
    } catch (error: any) {
      setIsError(true);
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

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
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteModal(true)}>
                {t('Delete', 'நீக்கு')}
              </Button>
            )}
          </CardHeader>

          <CardContent className="p-6">
            {/* Receipt Number */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="space-y-2 group">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 group-focus-within:text-orange-600 transition-colors">
                  {t('Receipt No', 'ரசீது எண்')}
                </Label>
                <div className="relative">
                  <Input
                    className={cn(theme.input.base, theme.input.size.md, "bg-gray-50 border-orange-200")}
                    value={form.registerNo}
                    readOnly
                    placeholder={t('Receipt No', 'ரசீது எண்')}
                  />
                </div>
              </div>
            </div>

            {message && (
              <Alert variant={isError ? 'destructive' : 'default'} className="mb-6">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <form ref={formRef} onSubmit={onSubmit} onKeyDown={handleKeyDown} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Entry Date */}
                <div className="space-y-2 group">
                  <Label className="text-sm font-semibold text-gray-700 group-focus-within:text-orange-600 transition-colors">
                    {t('Entry Date', 'பதிவு தேதி')}
                  </Label>
                  <div className="relative">
                    <Input 
                      type="date" 
                      name="entryDate" 
                      value={form.entryDate} 
                      onChange={onChange} 
                      className={cn(fieldStyles, '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer')} 
                      required 
                    />
                  </div>
                </div>

                {/* Booking Date */}
                <div className="space-y-2 group">
                  <Label className="text-sm font-semibold text-gray-700 group-focus-within:text-orange-600 transition-colors">
                    {t('Booking Date', 'பூஜை தேதி')}
                  </Label>
                  <div className="relative">
                    <Input 
                      type="date" 
                      name="bookingDate" 
                      value={form.bookingDate} 
                      onChange={onChange} 
                      className={cn(fieldStyles, '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer')} 
                      required 
                    />
                  </div>
                </div>

                {/* Time */}
                <div className="space-y-2 group">
                  <Label className="text-sm font-semibold text-gray-700 group-focus-within:text-orange-600 transition-colors">
                    {t('Time', 'நேரம்')}
                  </Label>
                  <div className="relative">
                    <Input 
                      type="time" 
                      name="time" 
                      value={form.time} 
                      onChange={onChange} 
                      className={cn(fieldStyles, '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer')} 
                      onClick={(e) => (e.target as any).showPicker?.()} 
                    />
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-2 group">
                  <Label className="text-sm font-semibold text-gray-700 group-focus-within:text-orange-600 transition-colors">
                    {t('Name', 'பெயர்')}
                  </Label>
                  <div className="relative">
                    <Input 
                      name="name" 
                      value={form.name} 
                      onChange={onChange} 
                      className={fieldStyles} 
                      placeholder={t('Name', 'பெயர்')} 
                      required 
                      autoFocus
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2 group">
                  <Label className="text-sm font-semibold text-gray-700 group-focus-within:text-orange-600 transition-colors">
                    {t('Phone', 'கைபேசி')}
                  </Label>
                  <div className="relative">
                    <Input name="mobile" value={form.mobile} onChange={onChange} className={fieldStyles} placeholder={t('Phone', 'கைபேசி எண்')} required />
                  </div>
                </div>

                {/* Village */}
                <div className="space-y-2 group">
                  <Label className="text-sm font-semibold text-gray-700 group-focus-within:text-orange-600 transition-colors">
                    {t('Village', 'கிராமம்')}
                  </Label>
                  <div className="relative">
                    <Input name="village" value={form.village} onChange={onChange} className={fieldStyles} placeholder={t('Village', 'கிராமம்')} />
                  </div>
                </div>

                {/* Hall - Searchable */}
                <div className="space-y-2 group" ref={hallDropdownRef}>
                  <Label className="text-sm font-semibold text-gray-700 group-focus-within:text-orange-600 transition-colors">
                    {t('Hall', 'மண்டபம்')}
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                    <input
                      type="text"
                      className={cn(fieldStyles, 'pl-10 pr-10')}
                      value={hallQuery}
                      onChange={(e) => { setHallQuery(e.target.value); setShowHallDropdown(true); if (!e.target.value) setForm(prev => ({ ...prev, hallId: '' })); }}
                      onFocus={() => setShowHallDropdown(true)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (filteredHalls.length === 1) selectHall(filteredHalls[0]); else if (hallQuery.trim()) createHall(hallQuery); } }}
                      placeholder={t('Search or add hall', 'மண்டபத்தைத் தேடவும்')}
                    />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    {showHallDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl max-h-60 overflow-auto py-1">
                        {filteredHalls.length > 0 ? filteredHalls.map(h => (
                          <div key={h.id} className="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-700 transition-colors" onClick={() => selectHall(h)}>{h.name}</div>
                        )) : null}
                        {hallQuery.trim() && !halls.some(h => h.name.toLowerCase() === hallQuery.trim().toLowerCase()) && (
                          <div className="px-4 py-2 cursor-pointer text-sm border-t border-gray-100 flex items-center gap-2 hover:bg-green-50 text-green-700" onClick={() => createHall(hallQuery)}>
                            {addingHall ? <><Loader2 className="w-4 h-4 animate-spin" />{t('Adding...', 'சேர்க்கிறது...')}</> : <><Plus className="w-4 h-4" />{t(`Add "${hallQuery}"`, `"${hallQuery}" சேர்க்க`)}</>}
                          </div>
                        )}
                        {!hallQuery && filteredHalls.length === 0 && <div className="px-4 py-2 text-sm text-gray-500 italic">{t('Type to search...', 'தேட தட்டச்சு செய்யவும்...')}</div>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Event - Searchable */}
                <div className="space-y-2 group" ref={eventDropdownRef}>
                  <Label className="text-sm font-semibold text-gray-700 group-focus-within:text-orange-600 transition-colors">
                    {t('Event', 'நிகழ்வு')}
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                    <input
                      type="text"
                      className={cn(fieldStyles, 'pl-10 pr-10')}
                      value={eventQuery}
                      onChange={(e) => { setEventQuery(e.target.value); setShowEventDropdown(true); if (!e.target.value) setForm(prev => ({ ...prev, eventId: '' })); }}
                      onFocus={() => setShowEventDropdown(true)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (filteredEvents.length === 1) selectEvent(filteredEvents[0]); else if (eventQuery.trim()) createEvent(eventQuery); } }}
                      placeholder={t('Search or add event', 'நிகழ்வைத் தேடவும்')}
                    />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    {showEventDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl max-h-60 overflow-auto py-1">
                        {filteredEvents.length > 0 ? filteredEvents.map(ev => (
                          <div key={ev.id} className="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-700 transition-colors" onClick={() => selectEvent(ev)}>{ev.name}</div>
                        )) : null}
                        {eventQuery.trim() && !hallEvents.some(e => e.name.toLowerCase() === eventQuery.trim().toLowerCase()) && (
                          <div className="px-4 py-2 cursor-pointer text-sm border-t border-gray-100 flex items-center gap-2 hover:bg-green-50 text-green-700" onClick={() => createEvent(eventQuery)}>
                            {addingEvent ? <><Loader2 className="w-4 h-4 animate-spin" />{t('Adding...', 'சேர்க்கிறது...')}</> : <><Plus className="w-4 h-4" />{t(`Add "${eventQuery}"`, `"${eventQuery}" சேர்க்க`)}</>}
                          </div>
                        )}
                        {!eventQuery && filteredEvents.length === 0 && <div className="px-4 py-2 text-sm text-gray-500 italic">{t('Type to search...', 'தேட தட்டச்சு செய்யவும்...')}</div>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2 group">
                  <Label className="text-sm font-semibold text-gray-700 group-focus-within:text-orange-600 transition-colors">
                    {t('Address', 'முகவரி')}
                  </Label>
                  <div className="relative">
                    <Input name="address" value={form.address} onChange={onChange} className={fieldStyles} placeholder={t('Enter address', 'முகவரியை உள்ளிடவும்')} />
                  </div>
                </div>

                {/* Total */}
                <div className="space-y-2 group">
                  <Label className="text-sm font-semibold text-gray-700 group-focus-within:text-orange-600 transition-colors">
                    {t('Total Amount', 'மொத்த தொகை')}
                  </Label>
                  <div className="relative">
                    <Input type="number" name="totalAmount" value={form.totalAmount} onChange={onChange} className={cn(fieldStyles, "pl-4")} placeholder={t('Enter total', 'மொத்தத்தை உள்ளிடவும்')} />
                  </div>
                </div>

                {/* Advance */}
                <div className="space-y-2 group">
                  <Label className="text-sm font-semibold text-gray-700 group-focus-within:text-orange-600 transition-colors">
                    {t('Advance Amount', 'முன்பணம்')}
                  </Label>
                  <div className="relative">
                    <Input type="number" name="advanceAmount" value={form.advanceAmount} onChange={onChange} className={cn(fieldStyles, "pl-4")} placeholder={t('Enter advance', 'முன்பணத்தை உள்ளிடவும்')} />
                  </div>
                </div>

                {/* Balance */}
                <div className="space-y-2 group">
                  <Label className="text-sm font-semibold text-gray-700 group-focus-within:text-orange-600 transition-colors">
                    {t('Balance Amount', 'மீதமுள்ள தொகை')}
                  </Label>
                  <div className="relative">
                    <Input readOnly value={form.balanceAmount} className={cn(fieldStyles, "bg-gray-50 pl-4")} placeholder={t('Auto calculated', 'தானாக கணக்கிடப்படும்')} />
                  </div>
                </div>

                {/* Payment Mode */}
                <div className="space-y-2 group">
                  <Label className="text-sm font-semibold text-gray-700 group-focus-within:text-orange-600 transition-colors">
                    {t('Payment Mode', 'பணம் செலுத்தும் முறை')}
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={form.paymentMode === 'cash' ? 'default' : 'outline'}
                      onClick={() => setForm(prev => ({ ...prev, paymentMode: 'cash', accountId: null }))}
                    >
                      {t('Cash', 'பணம்')}
                    </Button>
                    <Button
                      type="button"
                      variant={form.paymentMode === 'bank' ? 'default' : 'outline'}
                      onClick={() => setForm(prev => ({ ...prev, paymentMode: 'bank' }))}
                    >
                      {t('Bank', 'வங்கி')}
                    </Button>
                    <Button
                      type="button"
                      variant={form.paymentMode === 'upi' ? 'default' : 'outline'}
                      onClick={() => setForm(prev => ({ ...prev, paymentMode: 'upi' }))}
                    >
                      {t('UPI', 'UPI')}
                    </Button>
                  </div>
                </div>

                {(form.paymentMode === 'bank' || form.paymentMode === 'upi') && (
                  <div className="space-y-2 group">
                    <Label className="text-sm font-semibold text-gray-700 group-focus-within:text-orange-600 transition-colors">
                      {t('Bank / UPI Account', 'வங்கி / UPI கணக்கு')}
                    </Label>
                    <select
                      className={fieldStyles}
                      value={form.accountId ?? ''}
                      onChange={(e) => setForm(prev => ({ ...prev, accountId: e.target.value ? Number(e.target.value) : null }))}
                    >
                      <option value="">{t('Select account', 'கணக்கைத் தேர்ந்தெடுக்கவும்')}</option>
                      {paymentAccounts
                        .filter(a => a.accountType === form.paymentMode)
                        .map(a => (
                          <option key={a.id} value={a.id}>
                            {a.accountName}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

              </div>

              {/* Toggles */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <Button type="button" variant="outline" className="w-full justify-between py-6" onClick={() => setShowCheckInOut(!showCheckInOut)}>
                  {t('Check-in / Check-out Details', 'செக்-இன் / செக்-அவுட் விவரங்கள்')}
                  <span>{showCheckInOut ? '▲' : '▼'}</span>
                </Button>
                {showCheckInOut && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4 bg-gray-50 rounded-lg border">
                    <div className="space-y-2 group">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 group-focus-within:text-orange-600 transition-colors">{t('Check-in Date', 'செக்-இன் தேதி')}</Label>
                      <Input type="date" name="checkInDate" value={form.checkInDate} onChange={onChange} className={fieldStyles} />
                    </div>
                    <div className="space-y-2 group">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 group-focus-within:text-orange-600 transition-colors">{t('Check-in Time', 'செக்-இன் நேரம்')}</Label>
                      <Input type="time" name="checkInTime" value={form.checkInTime} onChange={onChange} className={fieldStyles} />
                    </div>
                    <div className="space-y-2 group">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 group-focus-within:text-orange-600 transition-colors">{t('Check-out Date', 'செக்-அவுட் தேதி')}</Label>
                      <Input type="date" name="checkOutDate" value={form.checkOutDate} onChange={onChange} className={fieldStyles} />
                    </div>
                    <div className="space-y-2 group">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 group-focus-within:text-orange-600 transition-colors">{t('Check-out Time', 'செக்-அவுட் நேரம்')}</Label>
                      <Input type="time" name="checkOutTime" value={form.checkOutTime} onChange={onChange} className={fieldStyles} />
                    </div>
                  </div>
                )}

                <Button type="button" variant="outline" className="w-full justify-between py-6" onClick={() => setShowAdditionalCharges(!showAdditionalCharges)}>
                  {t('Additional Charges', 'கூடுதல் கட்டணங்கள்')}
                  <span>{showAdditionalCharges ? '▲' : '▼'}</span>
                </Button>
                {showAdditionalCharges && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 p-4 bg-gray-50 rounded-lg border">
                    <div className="space-y-2 group">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 group-focus-within:text-orange-600 transition-colors">{t('Cleaning', 'சுத்தம் செய்தல்')}</Label>
                      <Input type="number" name="cleaning" value={form.cleaning} onChange={onChange} placeholder="Cleaning" className={fieldStyles} />
                    </div>
                    <div className="space-y-2 group">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 group-focus-within:text-orange-600 transition-colors">{t('Chair', 'நாற்காலி')}</Label>
                      <Input type="number" name="chair" value={form.chair} onChange={onChange} placeholder="Chair" className={fieldStyles} />
                    </div>
                    <div className="space-y-2 group">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 group-focus-within:text-orange-600 transition-colors">{t('EB', 'மின்சாரம்')}</Label>
                      <Input type="number" name="eb" value={form.eb} onChange={onChange} placeholder="EB" className={fieldStyles} />
                    </div>
                    <div className="space-y-2 group">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 group-focus-within:text-orange-600 transition-colors">{t('Gas', 'எரிவாயு')}</Label>
                      <Input type="number" name="gas" value={form.gas} onChange={onChange} placeholder="Gas" className={fieldStyles} />
                    </div>
                    <div className="space-y-2 group">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 group-focus-within:text-orange-600 transition-colors">{t('AC', 'ஏசி')}</Label>
                      <Input type="number" name="ac" value={form.ac} onChange={onChange} placeholder="AC" className={fieldStyles} />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <div className="w-full md:w-1/3">
                  <ExtrasSummary form={form} setForm={setForm} t={t} fieldStyles={fieldStyles} />
                </div>
              </div>

              <div className="space-y-2 group">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 group-focus-within:text-orange-600 transition-colors">{t('Remarks', 'குறிப்புகள்')}</Label>
                <Textarea name="remarks" value={form.remarks} onChange={onChange} rows={3} className={textareaStyles} placeholder={t('Enter remarks', 'குறிப்புகளை உள்ளிடவும்')} />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <Button type="button" variant="outline" className="px-8" onClick={() => setForm({ ...initialState, registerNo: '' })}>{t('Clear', 'அழிக்க')}</Button>
                <Button type="submit" disabled={saving} className={cn(theme.button.primary, "px-12")}>
                  {saving ? t('Saving...', 'சேமிக்கிறது...') : t('Save', 'சேமிக்க')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <SuccessModal
        isOpen={showPrintPrompt && lastCreatedId != null}
        onClose={() => setShowPrintPrompt(false)}
        onPrint={() => {
          downloadReceipt(lastCreatedId!, null);
        }}
      />

      {showDeleteModal && (
        <Modal title={t('Confirm Delete', 'நீக்குவதை உறுதிப்படுத்தவும்')} onClose={() => setShowDeleteModal(false)}>
          <div className="p-6 text-center">
            <p className="mb-6 text-gray-700">{t('Are you sure you want to delete this booking?', 'இந்த பதிவை நீக்க விரும்புகிறீர்களா?')}</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>{t('Cancel', 'ரத்து')}</Button>
              <Button variant="destructive" onClick={() => { /* handleDelete implementation */ }}>{t('Delete', 'நீக்கு')}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ExtrasSummary({ form, setForm, t, fieldStyles }: any) {
  const sum = (parseFloat(form.cleaning || '0') || 0) + (parseFloat(form.chair || '0') || 0) + (parseFloat(form.eb || '0') || 0) + (parseFloat(form.gas || '0') || 0) + (parseFloat(form.ac || '0') || 0);
  return (
    <div className="flex items-center gap-0 overflow-hidden rounded-md border border-gray-200">
      <div className="relative flex-1">
        <Input readOnly value={sum.toFixed(2)} className={cn(fieldStyles, "bg-gray-50 font-bold text-orange-700 border-0 rounded-none")} />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 uppercase font-semibold">{t('Extras', 'கூடுதல்')}</div>
      </div>
      <Button type="button" onClick={() => {
        const currentTotal = parseFloat(form.totalAmount || '0') || 0;
        setForm((prev: any) => ({ ...prev, totalAmount: (currentTotal + sum).toFixed(2) }));
      }} className="h-10 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-none border-l border-gray-200 flex items-center gap-2">
        {t('Add to Total', 'சேர்')}
      </Button>
    </div>
  );
}
