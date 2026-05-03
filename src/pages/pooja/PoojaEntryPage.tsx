import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import PoojaCalendar from '@/components/PoojaCalendar';
import { poojaService, PoojaFormData } from '@/services/poojaService';
import { accountService, type AccountItem } from '@/services/accountService';
import axios from 'axios';
import { Calendar, EyeOff, Tag, User, Phone, Clock, IndianRupee, Hash, Sparkles, AlignLeft } from 'lucide-react';
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { theme } from '@/styles/theme';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { SuccessModal } from '@/components/ui/SuccessModal';

// Ensure date values are compatible with <input type="date"> (expects YYYY-MM-DD)
const toDateInputValue = (value: any): string => {
  try {
    if (!value) return '';
    const s = String(value);
    // If it already looks like YYYY-MM-DD, use it as-is
    const m = s.match(/^\d{4}-\d{2}-\d{2}/);
    if (m) return m[0];
    // Otherwise try to parse and convert to local YYYY-MM-DD
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      const off = dt.getTimezoneOffset();
      const local = new Date(dt.getTime() - off * 60000);
      return local.toISOString().slice(0, 10);
    }
    return '';
  } catch {
    return '';
  }
};

const RAW_API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || window.location.origin;
const NORMALIZED_API_BASE = RAW_API_BASE.replace(/\/+$/, '');
const API_BASE_URL = NORMALIZED_API_BASE.endsWith('/api') ? NORMALIZED_API_BASE : `${NORMALIZED_API_BASE}/api`;

const generateReceiptNo = async (token?: string) => {
  try {
    // Get the current year
    const year = new Date().getFullYear();

    // Get the latest receipt number from the database
    if (!token) {
      throw new Error('Missing auth token');
    }
    const response = await axios.get<any>(`${API_BASE_URL}/pooja/latest-receipt`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    let nextNumber = 1;

    if (response.data?.success && response.data?.latestReceipt) {
      // Extract the number part and increment it
      const lastNumber = parseInt(response.data.latestReceipt.split('-')[1], 10) || 0;
      nextNumber = lastNumber + 1;
    }

    // Format as YYYY-0001
    return `${year}-${nextNumber.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating receipt number:', error);
    // Fallback to a random number if there's an error
    return `${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
};



export default function PoojaEntryPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(!!id); // Only show loading if we have an ID (editing mode)
  const navigate = useNavigate();
  const { register, handleSubmit, reset, setValue, watch } = useForm<PoojaFormData>({
    defaultValues: {
      time: (() => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      })()
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);
  const [lastSavedId, setLastSavedId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showCalendar, setShowCalendar] = useState(true); // Default to showing calendar
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'bank' | 'upi'>('cash');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [poojaItems, setPoojaItems] = useState<Array<{ id: number; name: string; name_ta?: string; amount?: number }>>([]);
  // Guards to avoid duplicate effects in Strict Mode
  const newInitRef = useRef(false);
  const editLoadedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const t = (en: string, ta: string) => (language === 'tamil' ? en : ta);;

  // Handle Enter key navigation
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

  // Check for double-booking using service
  const checkDoubleBooking = async (fromDate: string, toDate: string, time: string, excludeId?: number) => {
    if (!token) return false;

    try {
      return await poojaService.checkDoubleBooking(fromDate, toDate, time, excludeId);
    } catch (error) {
      console.error('Error checking double booking:', error);
      return false;
    }
  };

  // Keep calendar in sync when user types or picks a date in the input
  const watchedBookingDate = watch('bookingDate');
  useEffect(() => {
    if (!watchedBookingDate) return;
    const v = toDateInputValue(watchedBookingDate);
    if (v && v !== selectedDate) {
      setSelectedDate(v);
    }
    // Keep internal fromDate/toDate aligned for API compatibility
    if (v) {
      setValue('fromDate', v);
      setValue('toDate', v);
    }
  }, [watchedBookingDate, selectedDate, setValue]);

  // Open PDF helper
  const openReceiptPdf = async (poojaId: number) => {
    try {
      if (!token) {
        toast({ title: t('Not authenticated', 'அங்கீகரிப்பு இல்லை'), description: t('Please login again.', 'தயவு செய்து மீண்டும் உள்நுழைக.') });
        return;
      }
      
      const response = await axios.get<Blob>(`${API_BASE_URL}/pooja/${poojaId}/receipt.pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob'
      });

      const blob = response.data instanceof Blob ? response.data : new Blob([response.data as unknown as BlobPart], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Open in a new tab (matches the modal's description "Open in a new tab")
      const newTab = window.open(url, '_blank');
      if (!newTab) {
        // Fallback to download if popup is blocked
        const link = document.createElement('a');
        link.href = url;
        const receiptNo = watch('receiptNumber') || String(poojaId);
        link.download = `receipt-${receiptNo}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      // Cleanup the URL after a short delay to allow the new tab to load it
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error('Print receipt failed:', e);
      toast({ title: t('Error', 'பிழை'), description: t('Failed to download receipt PDF', 'ரசீது PDF-ஐ பதிவிறக்க முடியவில்லை'), variant: 'destructive' });
    }
  };

  // Print receipt handler for existing entries via confirmation modal
  const handlePrintReceipt = () => {
    if (id) {
      setLastSavedId(parseInt(id));
      setShowPrintConfirm(true);
    } else {
      toast({ title: t('Save first', 'முதலில் சேமிக்கவும்'), description: t('Please save the entry before printing the receipt.', 'ரசீதை அச்சிடுவதற்கு முன் பதிவை சேமிக்கவும்.') });
    }
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setValue('bookingDate', date);
    // Auto-sync internal fromDate/toDate internally for API compatibility
    setValue('fromDate', date);
    setValue('toDate', date);
    // Keep calendar open - don't set setShowCalendar(false)
  };

  useEffect(() => {
    // Generate receipt number on component mount
    const generateAndSetReceiptNo = async () => {
      const receiptNo = await generateReceiptNo(token);
      const today = new Date().toISOString().slice(0, 10);
      setValue('receiptNumber', receiptNo);
      // Default transfer account for new entries
      setValue('transferTo', 'INCOME A/C');
      // Set default dates to today for new entries
      setValue('entryDate', today);
      setValue('bookingDate', today);
      setValue('fromDate', today);
      setValue('toDate', today);
      setSelectedDate(today);
    };

    if (!id && !newInitRef.current) {
      newInitRef.current = true;
      generateAndSetReceiptNo();
    }

    if (id && !editLoadedRef.current) {
      editLoadedRef.current = true;
      const fetchPooja = async () => {
        try {
          const result = await poojaService.getPoojaById(parseInt(id));

          if (result.success) {
            const data = result.data;
            const fullRemarks = data.remarks || '';
            const [poojaName, ...remarksPart] = fullRemarks.split(' - ');
            
            const formData: PoojaFormData = {
              receiptNumber: data.receipt_number,
              name: data.name || '',
              poojaName: poojaName || '',
              mobileNumber: data.mobile_number,
              time: data.time,
              entryDate: toDateInputValue(data.entry_date || data.created_at),
              bookingDate: toDateInputValue(data.booking_date || data.from_date),
              fromDate: toDateInputValue(data.from_date),
              toDate: toDateInputValue(data.to_date || data.from_date),
              remarks: remarksPart.join(' - ') || '',
              transferTo: data.transfer_to_account || '',
              amount: data.amount != null ? String(data.amount) : ''
            };
            reset(formData);
            const pm = (data as any).payment_mode ? String((data as any).payment_mode).toLowerCase() : 'cash';
            if (pm === 'bank' || pm === 'upi' || pm === 'cash') setPaymentMode(pm);
            const accId = (data as any).account_id;
            setAccountId(accId != null && accId !== '' ? Number(accId) : null);
            setSelectedDate(toDateInputValue(data.from_date));
          } else {
            throw new Error(result.error || 'Failed to load data');
          }
        } catch (error) {
          console.error('Error fetching pooja data:', error);
          toast({
            title: t('Error', 'பிழை'),
            description: t('Failed to load pooja data', 'பூஜை தரவை ஏற்ற முடியவில்லை'),
            variant: 'destructive'
          });
        } finally {
          setIsLoading(false);
        }
      };

      fetchPooja();
    }
    // Note: do not include `t` (translate function) in deps; it's not stable across renders and causes refetch loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, reset, setValue, token]);

  useEffect(() => {
    // Load payment accounts (Bank / UPI)
    const load = async () => {
      try {
        if (!token) return;
        const list = await accountService.list(token);
        setAccounts(list);
      } catch (e) {
        console.error('Failed to load accounts', e);
      }
    };
    load();
  }, [token]);

  // Load pooja items from master data
  const loadPoojaItems = useCallback(async () => {
    try {
      if (!token) return;
      const resp = await axios.get<any>(`${API_BASE_URL}/pooja-master/items`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.data?.success && Array.isArray(resp.data.data)) {
        setPoojaItems(resp.data.data);
      }
    } catch (e) {
      console.error('Failed to load pooja items', e);
    }
  }, [token]);

  useEffect(() => {
    loadPoojaItems();
  }, [loadPoojaItems]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <Card className="shadow-lg border-0 bg-white rounded-lg overflow-hidden">
            <CardHeader className={theme.header.container}>
              <div className={theme.header.contentSpacing}>
                <CardTitle className={theme.header.main}>
                  {t('Pooja Entry', 'பூஜை பதிவு')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 text-base">Loading pooja details...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: PoojaFormData) => {
    try {
      setIsSubmitting(true);

      if ((paymentMode === 'bank' || paymentMode === 'upi') && !accountId) {
        toast({
          title: t('Missing account', 'கணக்கு இல்லை'),
          description: t('Please select a Bank / UPI account.', 'வங்கி / UPI கணக்கை தேர்ந்தெடுக்கவும்.'),
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      // Check for double-booking (single date)
      const hasConflict = await checkDoubleBooking(data.fromDate, data.fromDate, data.time, id ? parseInt(id) : undefined);
      if (hasConflict) {
        toast({
          title: t('Booking Conflict', 'பதிவு மோதல்'),
          description: t('This time slot is already booked. Please choose a different time or date.', 'இந்த நேர இடம் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது. வேறு நேரம் அல்லது தேதியை தேர்ந்தெடுக்கவும்.'),
          variant: 'destructive'
        });
        return;
      }

      const payload: PoojaFormData & { fromAccount?: string } = {
        receiptNumber: data.receiptNumber,
        name: data.name,
        poojaName: data.poojaName,
        mobileNumber: data.mobileNumber,
        time: data.time,
        entryDate: data.entryDate,
        bookingDate: data.bookingDate,
        fromDate: data.bookingDate || data.fromDate,
        toDate: data.bookingDate || data.toDate || data.fromDate,
        remarks: data.remarks ? `${data.poojaName} - ${data.remarks}` : data.poojaName,
        transferTo: data.transferTo || 'INCOME A/C',
        amount: data.amount || '',
        fromAccount: 'POOJA A/C',
        paymentMode,
        accountId: paymentMode === 'cash' ? null : accountId,
      };

      const result = id
        ? await poojaService.updatePooja(parseInt(id), payload)
        : await poojaService.createPooja(payload);

      if (result.success) {
        toast({
          title: id ? t('Pooja updated successfully', 'பூஜை வெற்றிகரமாக புதுப்பிக்கப்பட்டது') : t('Pooja created successfully', 'பூஜை வெற்றிகரமாக உருவாக்கப்பட்டது'),
          description: t('Data saved successfully', 'தரவு வெற்றிகரமாக சேமிக்கப்பட்டது')
        });
        // Ask user if they want to print the receipt PDF
        try {
          let savedId = id ? parseInt(id) : (result as any)?.data?.id;
          if (!savedId && !id) {
            // Fallback: look up by receipt number
            const rn = payload.receiptNumber;
            if (rn) {
              try {
                const listResp = await poojaService.getPoojaList(1, 5, rn);
                const items = (listResp?.data || []) as any[];
                const match = items.find((it: any) => String(it.receipt_number) === String(rn));
                if (match?.id) savedId = match.id;
              } catch (lookupErr) {
                console.warn('Lookup by receiptNumber failed:', lookupErr);
              }
            }
          }
          if (savedId) {
            setLastSavedId(savedId);
            setShowPrintConfirm(true);
          }
        } catch (e) {
          console.warn('Failed to prepare receipt PDF:', e);
        }
      } else {
        throw new Error(result.error || 'Failed to save pooja data');
      }

      if (!id) {
        // Reset form for new entry
        reset();
        const rn = await generateReceiptNo(token);
        setValue('receiptNumber', rn);
        setValue('transferTo', 'INCOME A/C');
      } else {
        navigate('/dashboard/pooja');
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);
      const errorMessage = error.response?.data?.error || error.message || t('Failed to submit pooja form', 'பூஜை படிவத்தை சமர்ப்பிக்க முடியவில்லை');
      toast({
        title: t('Error', 'பிழை'),
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use centralized form styles with theme focus colors
  const fieldStyles = cn(
    theme.input.base,
    theme.input.size.md,
    "w-full bg-white transition-all duration-200 pl-10"
  );
  const labelStyles = "block text-sm font-medium mb-1.5 text-gray-700";
  const textareaStyles = cn(
    theme.textarea.base,
    theme.textarea.size.md,
    "min-h-[100px]"
  );

  const handleCancel = async () => {
    if (id) {
      navigate('/dashboard/pooja');
    } else {
      reset();
      const rn = await generateReceiptNo(token);
    }
  };

  return (
    <div className={pageContainerStyles.container}>
      <div className={pageContainerStyles.content}>
        <Card className="shadow-lg border-0 bg-white rounded-lg overflow-hidden">
          <CardHeader className={theme.header.container}>
            <div className={theme.header.contentSpacing}>
              <CardTitle className={theme.header.main}>
                {t('Pooja Entry', 'பூஜை பதிவு')}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Form Section */}
              <div className="space-y-6">
                <form
                  ref={formRef}
                  onSubmit={handleSubmit(onSubmit)}
                  onKeyDown={handleKeyDown}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Receipt Number */}
                    <div className="md:col-span-1">
                      <Label className={formFieldStyles.label}>
                        {t('Receipt Number', 'ரசீது எண்')}
                      </Label>
                      <div className="relative mt-1">
                        <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                        <Input
                          id="receiptNumber"
                          className={`${fieldStyles} bg-gray-50`}
                          {...register('receiptNumber', { required: true })}
                          readOnly
                          placeholder={t('Receipt Number', 'ரசீது எண்') + ' *'}
                        />
                      </div>
                    </div>

                    {/* Entry Date */}
                    <div className="md:col-span-1">
                      <Label className={formFieldStyles.label}>
                        {t('Entry Date', 'பதிவு தேதி')}
                      </Label>
                      <div className="relative flex items-center mt-1">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                        <Input
                          id="entryDate"
                          type="date"
                          className={cn(fieldStyles, "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer")}
                          {...register('entryDate', { required: true })}
                          onClick={(e) => (e.target as any).showPicker?.()}
                        />
                      </div>
                    </div>

                    {/* Booking Date */}
                    <div className="md:col-span-1">
                      <Label className={formFieldStyles.label}>
                        {t('Booking Date', 'பூஜை தேதி')}
                      </Label>
                      <div className="relative flex items-center mt-1">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                        <Input
                          id="bookingDate"
                          type="date"
                          className={cn(fieldStyles, "pr-12", "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer")}
                          {...register('bookingDate', { required: true })}
                          onClick={(e) => (e.target as any).showPicker?.()}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCalendar(!showCalendar)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-20"
                          title={showCalendar ? t('Hide Calendar', 'நாட்காட்டியை மறை') : t('Show Calendar', 'நாட்காட்டியை காட்டு')}
                        >
                          {showCalendar ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Calendar className="h-4 w-4 text-gray-400" />}
                        </button>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="md:col-span-1">
                      <Label className={formFieldStyles.label}>
                        {t('Time', 'நேரம்')}
                      </Label>
                      <div className="relative mt-1">
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                        <input
                          id="time"
                          type="time"
                          className={cn(fieldStyles, "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer")}
                          {...register('time', { required: true })}
                          onClick={(e) => (e.target as any).showPicker?.()}
                          placeholder={t('Time', 'நேரம்') + ' *'}
                        />
                      </div>
                    </div>

                    {/* User Name */}
                    <div className="md:col-span-1">
                      <Label className={formFieldStyles.label}>
                        {t('Name', 'பெயர்')}
                      </Label>
                      <div className="relative mt-1">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                        <Input
                          id="name"
                          className={fieldStyles}
                          {...register('name', { required: true })}
                          placeholder={t('Name', 'பெயர்') + ' *'}
                        />
                      </div>
                    </div>

                    {/* Mobile Number */}
                    <div className="md:col-span-1">
                      <Label className={formFieldStyles.label}>
                        {t('Mobile Number', 'கைபேசி எண்')}
                      </Label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                        <Input
                          id="mobileNumber"
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          onInput={(e) => {
                            const target = e.target as HTMLInputElement;
                            const digits = (target.value || '').replace(/\D+/g, '').slice(0, 10);
                            if (target.value !== digits) target.value = digits;
                            setValue('mobileNumber', digits, { shouldValidate: true, shouldDirty: true });
                          }}
                          className={fieldStyles}
                          placeholder={t('Mobile Number', 'கைபேசி எண்') + ' *'}
                        />
                        <input type="hidden" {...register('mobileNumber', { required: true })} />
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="md:col-span-1">
                      <Label className={formFieldStyles.label}>
                        {t('Amount', 'தொகை')}
                      </Label>
                      <div className="relative mt-1">
                        <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          className={fieldStyles}
                          placeholder={t('Amount', 'தொகை')}
                          {...register('amount')}
                        />
                      </div>
                    </div>

                    {/* Payment Mode */}
                    <div className="md:col-span-1">
                      <Label className={formFieldStyles.label}>
                        {t('Payment Mode', 'பணம் செலுத்தும் முறை')}
                      </Label>
                      <div className="flex gap-2 mt-1">
                        <Button
                          type="button"
                          variant={paymentMode === 'cash' ? 'default' : 'outline'}
                          onClick={() => {
                            setPaymentMode('cash');
                            setAccountId(null);
                          }}
                        >
                          {t('Cash', 'பணம்')}
                        </Button>
                        <Button
                          type="button"
                          variant={paymentMode === 'bank' ? 'default' : 'outline'}
                          onClick={() => setPaymentMode('bank')}
                        >
                          {t('Bank', 'வங்கி')}
                        </Button>
                        <Button
                          type="button"
                          variant={paymentMode === 'upi' ? 'default' : 'outline'}
                          onClick={() => setPaymentMode('upi')}
                        >
                          {t('UPI', 'UPI')}
                        </Button>
                      </div>
                    </div>

                    {/* Bank / UPI Account */}
                    {(paymentMode === 'bank' || paymentMode === 'upi') && (
                      <div className="md:col-span-1">
                        <Label className={formFieldStyles.label}>
                          {t('Bank / UPI Account', 'வங்கி / UPI கணக்கு')}
                        </Label>
                        <select
                          className={cn(fieldStyles, 'mt-1')}
                          value={accountId ?? ''}
                          onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">{t('Select account', 'கணக்கைத் தேர்ந்தெடுக்கவும்')}</option>
                          {accounts
                            .filter(a => a.accountType === paymentMode)
                            .map(a => (
                              <option key={a.id} value={a.id}>
                                {a.accountName}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {/* Pooja Name Dropdown */}
                    <div className="md:col-span-1">
                      <Label className={formFieldStyles.label}>
                        {t('Pooja Name', 'பூஜை பெயர்')}
                      </Label>
                      <div className="relative mt-1">
                        <Sparkles className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                        <SearchableSelect
                          value={watch('poojaName')}
                          onChange={(value) => {
                            setValue('poojaName', value, { shouldValidate: true });
                          }}
                          options={poojaItems.map(p => p.name)}
                          placeholder={t('Select Pooja', 'பூஜையைத் தேர்வு செய்க') + ' *'}
                          className={cn(fieldStyles, "pl-10")}
                          token={token || undefined}
                          createEndpoint={`${API_BASE_URL}/pooja-master/items`}
                          onCreated={loadPoojaItems}
                        />
                        <input type="hidden" {...register('poojaName', { required: true })} />
                      </div>
                    </div>

              
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 justify-end pt-6 border-t border-gray-200">
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(theme.input.base, "px-5 py-2.5 text-base hover:bg-gray-50 rounded-md")}
                      onClick={handleCancel}
                      disabled={isSubmitting}
                    >
                      {t('Cancel', 'ரத்து செய்')}
                    </Button>

                    {id && (
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(theme.input.base, "px-5 py-2.5 text-base hover:bg-gray-50 rounded-md")}
                        onClick={handlePrintReceipt}
                      >
                        {t('Print Receipt', 'ரசீதை அச்சிட')}
                      </Button>
                    )}


                    <Button
                      type="submit"
                      className="px-5 py-2.5 text-base bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-md"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? t('Saving...', 'சேமிக்கிறது...')
                        : id
                          ? t('Update ', 'புதுப்பிக்க')
                          : t('Save ', 'சேமிக்க')
                      }
                    </Button>
                  </div>
                </form>
              </div>

              {/* Calendar Section */}
              <div className="space-y-6">
                {showCalendar && (
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <PoojaCalendar
                      onDateSelect={handleDateSelect}
                      selectedDate={selectedDate}
                      className="w-full"
                      showBookingTimes={true}
                    />
                  </div>
                )}

                {/* Booking Info */}
                <Card className="border-0 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-medium text-gray-800">
                      {t('Booking Information', 'பதிவு தகவல்')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600 space-y-2">
                      <p>• {t('Red dates indicate existing bookings', 'சிவப்பு தேதிகள் ஏற்கனவே பதிவு செய்யப்பட்டவற்றை காட்டுகின்றன')}</p>
                      <p>• {t('Click on a date to select it and see existing booking times', 'தேதியை கிளிக் செய்து தேர்ந்தெடுத்து, ஏற்கனவே உள்ள பதிவு நேரங்களை பார்க்கவும்')}</p>
                      <p>• {t('Calendar stays open to help you choose the best time', 'காலெண்டர் திறந்தே இருக்கும், சிறந்த நேரத்தை தேர்ந்தெடுக்க உதவும்')}</p>
                      <p>• {t('The system will prevent double-booking automatically', 'கணினி தானாக இரட்டை பதிவை தடுக்கும்')}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print confirmation modal */}
      <SuccessModal
        isOpen={showPrintConfirm}
        onClose={() => setShowPrintConfirm(false)}
        onPrint={() => {
          if (lastSavedId) {
            openReceiptPdf(lastSavedId);
          }
        }}
      />
    </div>
  );
}