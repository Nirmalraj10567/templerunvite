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
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  Building2, 
  PartyPopper, 
  IndianRupee, 
  Hash,
  EyeOff,
  Search,
  Tag,
  X,
  Wallet,
  CircleDollarSign,
  Plus,
  ArrowRight
} from 'lucide-react';
import axios from 'axios';
import { getAuthToken } from '@/lib/auth';
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { theme } from '@/styles/theme';

const generateReceiptNo = async (token: string): Promise<string> => {
  try {
    const response = await fetch('https://templeapi.agniplay.com/api/hall-bookings/generate-receipt-number', {
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
}

const initialState: FormState = {
  registerNo: '',
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
  checkOutTime: ''
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

  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  const fieldStyles = cn(theme.input.base, theme.input.size.md, "pl-10 w-full");
  const textareaStyles = cn(theme.textarea.base, theme.textarea.size.md, "resize-none");

  const downloadReceipt = async (bookingId: number, registerNo: string | null) => {
    try {
      const response = await fetch(`https://templeapi.agniplay.com/api/hall-bookings/${bookingId}/receipt.pdf`, {
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
          const response = await fetch(`https://templeapi.agniplay.com/api/hall-bookings/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await response.json();
          const booking = data.data || data;
          setForm({
            ...booking,
            advanceAmount: booking.advanceAmount?.toString() || '',
            totalAmount: booking.totalAmount?.toString() || '',
            balanceAmount: booking.balanceAmount?.toString() || '',
            cleaning: booking.cleaning?.toString() || '',
            chair: booking.chair?.toString() || '',
            eb: booking.eb?.toString() || '',
            gas: booking.gas?.toString() || '',
            ac: booking.ac?.toString() || ''
          });
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
            axios.get(`https://templeapi.agniplay.com/api/master/halls/${user.templeId}`, {
              headers: { Authorization: `Bearer ${getAuthToken()}` }
            }),
            axios.get(`https://templeapi.agniplay.com/api/master/hall-events/${user.templeId}`, {
              headers: { Authorization: `Bearer ${getAuthToken()}` }
            }),
          ]);
          setHalls(hallsResp.data || []);
          setHallEvents(eventsResp.data || []);
        } catch {}
      })();
    }
  }, [user?.templeId]);

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
      const endpoint = isEdit ? `https://templeapi.agniplay.com/api/hall-bookings/${id}` : 'https://templeapi.agniplay.com/api/hall-bookings';
      const res = await fetch(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          fromAccount: 'HALL ENTRY A/C',
          amount: String(parseFloat(form.advanceAmount || form.totalAmount || '0') || 0)
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
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className={cn(fieldStyles, "bg-gray-50 pl-10 border-orange-200")}
                  value={form.registerNo}
                  readOnly
                  placeholder={t('Receipt No', 'ரசீது எண்')}
                />
              </div>
            </div>

            {message && (
              <Alert variant={isError ? 'destructive' : 'default'} className="mb-6">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <form ref={formRef} onSubmit={onSubmit} onKeyDown={handleKeyDown} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Date */}
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-20" />
                  <Input 
                    type="date" 
                    name="date" 
                    value={form.date} 
                    onChange={onChange} 
                    className={cn(fieldStyles, '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer')} 
                    required 
                  />
                </div>

                {/* Time */}
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-20" />
                  <Input 
                    type="time" 
                    name="time" 
                    value={form.time} 
                    onChange={onChange} 
                    className={cn(fieldStyles, '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer')} 
                    onClick={(e) => (e.target as any).showPicker?.()} 
                  />
                </div>

                {/* Name */}
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-20" />
                  <Input 
                    name="name" 
                    value={form.name} 
                    onChange={onChange} 
                    className={fieldStyles} 
                    placeholder={t('Name *', 'பெயர் *')} 
                    required 
                    autoFocus
                  />
                </div>

                {/* Phone */}
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-20" />
                  <Input name="mobile" value={form.mobile} onChange={onChange} className={fieldStyles} placeholder={t('Phone *', 'கைபேசி எண் *')} required />
                </div>

                {/* Village */}
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-20" />
                  <Input name="village" value={form.village} onChange={onChange} className={fieldStyles} placeholder={t('Village', 'கிராமம்')} />
                </div>

                {/* Hall */}
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-20 pointer-events-none" />
                  <select name="hallId" value={form.hallId} onChange={onChange} className={cn(theme.select.base, theme.select.size.md, "pl-10 w-full")}>
                    <option value="">{t('Select hall', 'மண்டபத்தைத் தேர்வு')}</option>
                    {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>

                {/* Event */}
                <div className="relative">
                  <PartyPopper className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-20 pointer-events-none" />
                  <select name="eventId" value={form.eventId} onChange={onChange} className={cn(theme.select.base, theme.select.size.md, "pl-10 w-full")}>
                    <option value="">{t('Select event', 'நிகழ்வு தேர்வு')}</option>
                    {hallEvents.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>

                {/* Address */}
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-20" />
                  <Input name="address" value={form.address} onChange={onChange} className={fieldStyles} placeholder={t('Enter address', 'முகவரியை உள்ளிடவும்')} />
                </div>

                {/* Total */}
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-20" />
                  <Input type="number" name="totalAmount" value={form.totalAmount} onChange={onChange} className={fieldStyles} placeholder={t('Enter total', 'மொத்தத்தை உள்ளிடவும்')} />
                </div>

                {/* Advance */}
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-20" />
                  <Input type="number" name="advanceAmount" value={form.advanceAmount} onChange={onChange} className={fieldStyles} placeholder={t('Enter advance', 'முன்பணத்தை உள்ளிடவும்')} />
                </div>

                {/* Balance */}
                <div className="relative">
                  <CircleDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-20" />
                  <Input readOnly value={form.balanceAmount} className={cn(fieldStyles, "bg-gray-50")} placeholder={t('Auto calculated', 'தானாக கணக்கிடப்படும்')} />
                </div>

                {/* Extras */}
                <ExtrasSummary form={form} setForm={setForm} t={t} fieldStyles={fieldStyles} />
              </div>

              {/* Toggles */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <Button type="button" variant="outline" className="w-full justify-between py-6" onClick={() => setShowCheckInOut(!showCheckInOut)}>
                  {t('Check-in / Check-out Details', 'செக்-இன் / செக்-அவுட் விவரங்கள்')}
                  <span>{showCheckInOut ? '▲' : '▼'}</span>
                </Button>
                {showCheckInOut && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4 bg-gray-50 rounded-lg border">
                    <Input type="date" name="checkInDate" value={form.checkInDate} onChange={onChange} className={fieldStyles} />
                    <Input type="time" name="checkInTime" value={form.checkInTime} onChange={onChange} className={fieldStyles} />
                    <Input type="date" name="checkOutDate" value={form.checkOutDate} onChange={onChange} className={fieldStyles} />
                    <Input type="time" name="checkOutTime" value={form.checkOutTime} onChange={onChange} className={fieldStyles} />
                  </div>
                )}

                <Button type="button" variant="outline" className="w-full justify-between py-6" onClick={() => setShowAdditionalCharges(!showAdditionalCharges)}>
                  {t('Additional Charges', 'கூடுதல் கட்டணங்கள்')}
                  <span>{showAdditionalCharges ? '▲' : '▼'}</span>
                </Button>
                {showAdditionalCharges && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 p-4 bg-gray-50 rounded-lg border">
                    <Input type="number" name="cleaning" value={form.cleaning} onChange={onChange} placeholder="Cleaning" className={fieldStyles} />
                    <Input type="number" name="chair" value={form.chair} onChange={onChange} placeholder="Chair" className={fieldStyles} />
                    <Input type="number" name="eb" value={form.eb} onChange={onChange} placeholder="EB" className={fieldStyles} />
                    <Input type="number" name="gas" value={form.gas} onChange={onChange} placeholder="Gas" className={fieldStyles} />
                    <Input type="number" name="ac" value={form.ac} onChange={onChange} placeholder="AC" className={fieldStyles} />
                  </div>
                )}
              </div>

              <Textarea name="remarks" value={form.remarks} onChange={onChange} rows={3} className={textareaStyles} placeholder={t('Enter remarks', 'குறிப்புகளை உள்ளிடவும்')} />

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

      {showPrintPrompt && (
        <Modal title={t('Print Receipt', 'ரசீது அச்சிடு')} onClose={() => setShowPrintPrompt(false)}>
          <div className="p-6 text-center">
            <p className="mb-6 text-gray-700">{t('Receipt saved successfully! Do you want to print now?', 'ரசீது சேமிக்கப்பட்டது! அச்சிட வேண்டுமா?')}</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => setShowPrintPrompt(false)}>{t('Skip', 'தவிர்')}</Button>
              <Button onClick={() => { downloadReceipt(lastCreatedId!, null); setShowPrintPrompt(false); }}>{t('Print Now', 'இப்போது அச்சிடு')}</Button>
            </div>
          </div>
        </Modal>
      )}

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
        <Plus className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
        <Input readOnly value={`₹${sum.toFixed(2)}`} className={cn(fieldStyles, "bg-gray-50 font-bold text-orange-700 border-0 rounded-none")} />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 uppercase font-semibold">{t('Extras', 'கூடுதல்')}</div>
      </div>
      <Button type="button" onClick={() => {
        const currentTotal = parseFloat(form.totalAmount || '0') || 0;
        setForm((prev: any) => ({ ...prev, totalAmount: (currentTotal + sum).toFixed(2) }));
      }} className="h-10 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-none border-l border-gray-200 flex items-center gap-2">
        {t('Add to Total', 'சேர்')}
        <ArrowRight className="w-3 h-3" />
      </Button>
    </div>
  );
}
