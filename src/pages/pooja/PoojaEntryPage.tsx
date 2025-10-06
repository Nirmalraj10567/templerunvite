import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import PoojaCalendar from '@/components/PoojaCalendar';
import { poojaService, PoojaFormData } from '@/services/poojaService';
import axios from 'axios';

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

const generateReceiptNo = async (token?: string) => {
  try {
    // Get the current year
    const year = new Date().getFullYear();

    // Get the latest receipt number from the database
    if (!token) {
      throw new Error('Missing auth token');
    }
    const response = await axios.get<any>('https://tmsapi.xesstechlink.com/api/pooja/latest-receipt', {
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
  const { register, handleSubmit, reset, setValue, watch } = useForm<PoojaFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);
  const [lastSavedId, setLastSavedId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showCalendar, setShowCalendar] = useState(true); // Default to showing calendar
  const [accounts, setAccounts] = useState<Array<{ id?: number; value: string; label: string }>>([]);
  // Guards to avoid duplicate effects in Strict Mode
  const newInitRef = useRef(false);
  const editLoadedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const t = (en: string, ta: string) => language === 'english' ? ta : en;

  // Handle Enter key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      if (!formRef.current) return;
      
      const focusableElements = formRef.current.querySelectorAll(
        'input:not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]):not([readonly]), button:not([disabled])'
      );
      
      const currentElement = document.activeElement;
      const currentIndex = Array.from(focusableElements).indexOf(currentElement as Element);
      
      if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
        const nextElement = focusableElements[currentIndex + 1] as HTMLElement;
        nextElement.focus();
      }
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
  const watchedFromDate = watch('fromDate');
  useEffect(() => {
    if (!watchedFromDate) return;
    const v = toDateInputValue(watchedFromDate);
    if (v && v !== selectedDate) {
      setSelectedDate(v);
    }
    // Keep toDate aligned for API compatibility
    if (v) setValue('toDate' as any, v);
  }, [watchedFromDate, selectedDate, setValue]);

  // Open PDF helper
  const openReceiptPdf = (poojaId: number) => {
    try {
      if (!token) {
        toast({ title: t('Not authenticated', 'அங்கீகரிப்பு இல்லை'), description: t('Please login again.', 'தயவு செய்து மீண்டும் உள்நுழைக.') });
        return;
      }
      const url = `/api/pooja/${poojaId}/receipt.pdf?token=${token}`;
      // Open the receipt in a new browser tab
      window.open(url, '_blank');
    } catch (e) {
      console.error('Print receipt failed:', e);
      toast({ title: t('Error', 'பிழை'), description: t('Failed to open receipt PDF', 'ரசீது PDF-ஐ திறக்க முடியவில்லை'), variant: 'destructive' });
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
    setValue('fromDate', date);
    // Auto-sync toDate internally for API compatibility
    setValue('toDate' as any, date);
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
      // Set default date to today for new entries
      setValue('fromDate', today);
      setValue('toDate' as any, today);
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
            const formData: PoojaFormData = {
              receiptNumber: data.receipt_number,
              name: data.name,
              mobileNumber: data.mobile_number,
              time: data.time,
              fromDate: toDateInputValue(data.from_date),
              toDate: toDateInputValue(data.to_date || data.from_date),
              remarks: data.remarks || '',
              transferTo: data.transfer_to_account || '',
              amount: data.amount != null ? String(data.amount) : ''
            };
            reset(formData);
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
    // Load ledger accounts for Transfer To select
    const load = async () => {
      try {
        if (!token) return;
        const resp = await axios.get<any>('/api/ledger/accounts', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = (resp?.data && Array.isArray(resp.data.data)) ? resp.data.data : (Array.isArray(resp?.data) ? resp.data : []);
        const mapped = (data || []).map((item: any, index: number) => {
          if (typeof item === 'string') return { id: index + 1, value: item, label: item };
          return { id: item.id ?? index + 1, value: item.value || item.label, label: item.label || item.value };
        });
        setAccounts(mapped);
      } catch (e) {
        console.error('Failed to load accounts', e);
      }
    };
    load();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <Card className="shadow-lg border-0 bg-white rounded-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 py-6 px-6">
              <CardTitle className="text-2xl font-bold text-center text-white">
                {t('Pooja Entry', 'பூஜை பதிவு')}
              </CardTitle>
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
        mobileNumber: data.mobileNumber,
        time: data.time,
        fromDate: data.fromDate,
        toDate: data.toDate || data.fromDate,
        remarks: data.remarks || '',
        transferTo: data.transferTo || 'INCOME A/C',
        amount: data.amount || '',
        fromAccount: 'POOJA A/C'
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
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Error',
        description: t('Failed to submit pooja form', 'பூஜை படிவத்தை சமர்ப்பிக்க முடியவில்லை'),
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (id) {
      navigate('/dashboard/pooja');
    } else {
      reset();
      const rn = await generateReceiptNo(token);
      setValue('receiptNumber', rn);
      setValue('transferTo', 'INCOME A/C');
    }
  };

  // Consistent field styling
  const fieldStyles = "text-base py-2.5 px-3 h-11 border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-md w-full transition-all duration-200";
  const labelStyles = "block text-sm font-medium mb-1.5 text-gray-700";
  const textareaStyles = "text-base py-2.5 px-3 border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-md w-full transition-all duration-200 min-h-[100px]";

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-lg border-0 bg-white rounded-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 py-6 px-6">
            <CardTitle className="text-2xl font-bold text-center text-white">
              {t('Pooja Entry', 'பூஜை பதிவு')}
            </CardTitle>
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
                    <div>
                      <Label className={labelStyles}>
                        {t('Receipt Number', 'ரசீது எண்')} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="receiptNumber"
                        className={`${fieldStyles} bg-gray-100`}
                        {...register('receiptNumber', { required: true })}
                        readOnly
                      />
                    </div>

                    {/* Name */}
                    <div>
                      <Label className={labelStyles}>
                        {t('Name', 'பெயர்')} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        className={fieldStyles}
                        {...register('name', { required: true })}
                        placeholder={t('Enter full name', 'முழு பெயரை உள்ளிடவும்')}
                      />
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <Label className={labelStyles}>
                        {t('Mobile Number', 'மொபைல் எண்')} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="mobileNumber"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        onInput={(e) => {
                          const target = e.target as HTMLInputElement;
                          // keep only digits and cap at 10
                          const digits = (target.value || '').replace(/\D+/g, '').slice(0, 10);
                          if (target.value !== digits) target.value = digits;
                          setValue('mobileNumber', digits, { shouldValidate: true, shouldDirty: true });
                        }}
                        onKeyDown={(e) => {
                          // Block non-digit typing except control keys
                          const allowed = [
                            'Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'
                          ];
                          if (allowed.includes(e.key)) return;
                          if (!/^[0-9]$/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        className={fieldStyles}
                        {...register('mobileNumber', {
                          required: true,
                          pattern: {
                            value: /^[0-9]{10}$/,
                            message: t('Please enter a valid 10-digit mobile number', 'செல்லுபடியாகும் 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்')
                          }
                        })}
                        placeholder={t('Enter 10-digit mobile number', '10 இலக்க மொபைல் எண்ணை உள்ளிடவும்')}
                      />
                    </div>

                    {/* Time */}
                    <div>
                      <Label className={labelStyles}>
                        {t('Time', 'நேரம்')} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="time"
                        type="time"
                        className={fieldStyles}
                        {...register('time', { required: true })}
                      />
                    </div>

                    {/* From Date */}
                    <div>
                      <Label className={labelStyles}>
                        {t('Date', 'தொடக்க தேதி')} <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="fromDate"
                          type="date"
                          className={fieldStyles}
                          {...register('fromDate', { required: true })}
                          onChange={(e) => {
                            setValue('fromDate', e.target.value, { shouldValidate: true });
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCalendar(!showCalendar)}
                          className="px-3 py-2.5 text-sm border-gray-300 hover:bg-gray-50 rounded-md"
                          title={showCalendar ? t('Hide Calendar', 'காலெண்டரை மறை') : t('Show Calendar', 'காலெண்டரை காட்டு')}
                        >
                          {showCalendar ? '📅' : '📅'}
                        </Button>
                      </div>
                    </div>

                    {/* Amount */}
                    <div>
                      <Label className={labelStyles}>
                        {t('Amount', 'தொகை')}
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        className={fieldStyles}
                        placeholder={t('Enter amount', 'தொகையை உள்ளிடவும்')}
                        {...register('amount')}
                      />
                    </div>

                    {/* Remarks */}
                    <div className="md:col-span-2">
                      <Label className={labelStyles}>
                        {t('Remarks', 'குறிப்புகள்')}
                      </Label>
                      <Textarea
                        id="remarks"
                        className={textareaStyles}
                        {...register('remarks')}
                        placeholder={t('Enter any additional remarks', 'கூடுதல் குறிப்புகளை உள்ளிடவும்')}
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 justify-end pt-6 border-t border-gray-200">
                    <Button
                      type="button"
                      variant="outline"
                      className="px-5 py-2.5 text-base border-gray-300 hover:bg-gray-50 rounded-md"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                    >
                      {t('Cancel', 'ரத்து செய்')}
                    </Button>
                    
                    {id && (
                      <Button
                        type="button"
                        variant="outline"
                        className="px-5 py-2.5 text-base border-gray-300 hover:bg-gray-50 rounded-md"
                        onClick={handlePrintReceipt}
                      >
                        {t('Print Receipt', 'ரசீதை அச்சிட')}
                      </Button>
                    )}
                    
                    <Button
                      type="button"
                      variant="outline"
                      className="px-5 py-2.5 text-base border-gray-300 hover:bg-gray-50 rounded-md"
                      onClick={() => {
                        const d = watch('fromDate') || selectedDate || new Date().toISOString().slice(0, 10);
                        navigate(`/dashboard/reports/daily?date=${d}`);
                      }}
                    >
                      {t('Go to Daily Report', 'தினசரி அறிக்கைக்கு செல்ல')}
                    </Button>
                    
                    <Button
                      type="submit"
                      className="px-5 py-2.5 text-base bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-md"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? t('Saving...', 'சேமிக்கிறது...')
                        : id
                          ? t('Update Pooja', 'பூஜையை புதுப்பிக்க')
                          : t('Save Pooja', 'பூஜையை சேமிக்க')
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
      <Dialog open={showPrintConfirm} onOpenChange={setShowPrintConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {t('Print Receipt', 'ரசீதை அச்சிட')}
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              {t('Do you want to open the receipt PDF in a new tab?', 'ரசீது PDF-ஐ புதிய தாளில் திறக்க உங்களுக்குத் தோன்றுகிறதா?')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3">
            <Button 
              variant="outline" 
              className="px-4 py-2 text-sm border-gray-300 hover:bg-gray-50 rounded-md"
              onClick={() => setShowPrintConfirm(false)}
            >
              {t('No', 'இல்லை')}
            </Button>
            <Button
              className="px-4 py-2 text-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-md"
              onClick={() => {
                if (lastSavedId) {
                  openReceiptPdf(lastSavedId);
                }
                setShowPrintConfirm(false);
              }}
            >
              {t('Yes, Open', 'ஆம், திறக்க')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}