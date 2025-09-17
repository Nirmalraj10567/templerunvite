import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import PoojaCalendar from '@/components/PoojaCalendar';
import { poojaService, PoojaFormData } from '@/services/poojaService';
import axios from 'axios';

const generateReceiptNo = async (token?: string) => {
  try {
    // Get the current year
    const year = new Date().getFullYear();
    
    // Get the latest receipt number from the database
    if (!token) {
      throw new Error('Missing auth token');
    }
    const response = await axios.get('/api/pooja/latest-receipt', {
      headers: { Authorization: `Bearer ${token}` }
    });
    let nextNumber = 1;
    
    if (response.data.success && response.data.latestReceipt) {
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
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, reset, setValue, watch } = useForm<PoojaFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showCalendar, setShowCalendar] = useState(true); // Default to showing calendar
  const [accounts, setAccounts] = useState<Array<{ id?: number; value: string; label: string }>>([]);

  const t = (en: string, ta: string) => language === 'english' ? ta : en;

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

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setValue('fromDate', date);
    setValue('toDate', date);
    // Keep calendar open - don't set setShowCalendar(false)
  };

  useEffect(() => {
    // Generate receipt number on component mount
    const generateAndSetReceiptNo = async () => {
      const receiptNo = await generateReceiptNo(token);
      setValue('receiptNumber', receiptNo);
    };
    
    if (!id) {
      generateAndSetReceiptNo();
    }
    
    if (id) {
      const fetchPooja = async () => {
        try {
          setIsLoading(true);
          const result = await poojaService.getPoojaById(parseInt(id));
          
          if (result.success) {
            const data = result.data;
            const formData: PoojaFormData = {
              receiptNumber: data.receipt_number,
              name: data.name,
              mobileNumber: data.mobile_number,
              time: data.time,
              fromDate: data.from_date,
              toDate: data.to_date,
              remarks: data.remarks || '',
              transferTo: data.transfer_to_account || '',
              amount: data.amount != null ? String(data.amount) : ''
            };
            reset(formData);
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
  }, [id, reset, setValue, token, t]);

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
    return <div className="p-8">Loading pooja data...</div>;
  }

  const onSubmit = async (data: PoojaFormData) => {
    try {
      setIsSubmitting(true);
      
      // Validate date range
      if (new Date(data.fromDate) > new Date(data.toDate)) {
        toast({
          title: t('Invalid Date Range', 'தவறான தேதி வரம்பு'),
          description: t('From date cannot be later than to date', 'தொடக்க தேதி முடிவு தேதியை விட பிற்பகுதியில் இருக்கக்கூடாது'),
          variant: 'destructive'
        });
        return;
      }

      // Check for double-booking
      const hasConflict = await checkDoubleBooking(data.fromDate, data.toDate, data.time, id ? parseInt(id) : undefined);
      if (hasConflict) {
        toast({
          title: t('Booking Conflict', 'பதிவு மோதல்'),
          description: t('This time slot is already booked. Please choose a different time or date.', 'இந்த நேர இடம் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது. வேறு நேரம் அல்லது தேதியை தேர்ந்தெடுக்கவும்.'),
          variant: 'destructive'
        });
        return;
      }

      const payload: PoojaFormData = {
        receiptNumber: data.receiptNumber,
        name: data.name,
        mobileNumber: data.mobileNumber,
        time: data.time,
        fromDate: data.fromDate,
        toDate: data.toDate,
        remarks: data.remarks || '',
        transferTo: data.transferTo || '',
        amount: data.amount || ''
      };

      const result = id 
        ? await poojaService.updatePooja(parseInt(id), payload)
        : await poojaService.createPooja(payload);

      if (result.success) {
        toast({
          title: id ? t('Pooja updated successfully', 'பூஜை வெற்றிகரமாக புதுப்பிக்கப்பட்டது') : t('Pooja created successfully', 'பூஜை வெற்றிகரமாக உருவாக்கப்பட்டது'),
          description: t('Data saved successfully', 'தரவு வெற்றிகரமாக சேமிக்கப்பட்டது')
        });
      } else {
        throw new Error(result.error || 'Failed to save pooja data');
      }

      if (!id) {
        // Reset form for new entry
        reset();
        setValue('receiptNumber', generateReceiptNo());
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

  const handleCancel = () => {
    if (id) {
      navigate('/dashboard/pooja');
    } else {
      reset();
      setValue('receiptNumber', generateReceiptNo());
    }
  };

  return (
    <div className="max-w-7xl mx-auto bg-white p-6 rounded-lg shadow-lg">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              {t('Pooja Entry', 'பூஜை பதிவு')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Receipt Number */}
              <div className="space-y-2">
                <Label htmlFor="receiptNumber">
                  {t('Receipt Number', 'ரசீது எண்')} *
                </Label>
                <Input
                  id="receiptNumber"
                  {...register('receiptNumber', { required: true })}
                  readOnly
                  className="bg-gray-100"
                />
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  {t('Name', 'பெயர்')} *
                </Label>
                <Input
                  id="name"
                  {...register('name', { required: true })}
                  placeholder={t('Enter full name', 'முழு பெயரை உள்ளிடவும்')}
                />
              </div>

              {/* Mobile Number */}
              <div className="space-y-2">
                <Label htmlFor="mobileNumber">
                  {t('Mobile Number', 'மொபைல் எண்')} *
                </Label>
                <Input
                  id="mobileNumber"
                  type="tel"
                  {...register('mobileNumber', { 
                    required: true,
                    pattern: {
                      value: /^[0-9]{10}$/,
                      message: 'Please enter a valid 10-digit mobile number'
                    }
                  })}
                  placeholder={t('Enter 10-digit mobile number', '10 இலக்க மொபைல் எண்ணை உள்ளிடவும்')}
                />
              </div>

              {/* Time */}
              <div className="space-y-2">
                <Label htmlFor="time">
                  {t('Time', 'நேரம்')} *
                </Label>
                <Input
                  id="time"
                  type="time"
                  {...register('time', { required: true })}
                />
              </div>

              {/* From Date */}
              <div className="space-y-2">
                <Label htmlFor="fromDate">
                  {t('From Date', 'தொடக்க தேதி')} *
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="fromDate"
                    type="date"
                    {...register('fromDate', { required: true })}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCalendar(!showCalendar)}
                    title={showCalendar ? t('Hide Calendar', 'காலெண்டரை மறை') : t('Show Calendar', 'காலெண்டரை காட்டு')}
                  >
                    {showCalendar ? '📅' : '📅'}
                  </Button>
                </div>
              </div>

              {/* To Date */}
              <div className="space-y-2">
                <Label htmlFor="toDate">
                  {t('To Date', 'முடிவு தேதி')} *
                </Label>
                <Input
                  id="toDate"
                  type="date"
                  {...register('toDate', { required: true })}
                />
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  {t('Amount', 'தொகை')}
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder={t('Enter amount', 'தொகையை உள்ளிடவும்')}
                  {...register('amount')}
                />
              </div>
            </div>

            {/* Transfer To Account */}
            <div className="space-y-2">
              <Label htmlFor="transferTo">
                {t('Transfer To Account', 'எந்த கணக்கிற்கு மாற்றுவது')}
              </Label>
              <select
                id="transferTo"
                className="w-full border p-2 rounded"
                {...register('transferTo')}
                defaultValue=""
              >
                <option value="">{t('Select', 'தேர்ந்தெடு')}</option>
                {accounts.map(acc => (
                  <option key={acc.id ?? acc.value} value={acc.value}>{acc.label}</option>
                ))}
              </select>
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label htmlFor="remarks">
                {t('Remarks', 'குறிப்புகள்')}
              </Label>
              <Textarea
                id="remarks"
                {...register('remarks')}
                placeholder={t('Enter any additional remarks', 'கூடுதல் குறிப்புகளை உள்ளிடவும்')}
                rows={3}
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                {t('Cancel', 'ரத்து செய்')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const d = watch('fromDate') || selectedDate || new Date().toISOString().slice(0,10);
                  navigate(`/dashboard/reports/daily?date=${d}`);
                }}
              >
                {t('Go to Daily Report', 'தினசரி அறிக்கைக்கு செல்ல')}
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-orange-600 hover:bg-orange-700"
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
        </CardContent>
      </Card>

      {/* Calendar Section */}
      <div className="space-y-4">
        {showCalendar && (
          <PoojaCalendar
            onDateSelect={handleDateSelect}
            selectedDate={selectedDate}
            className="w-full"
            showBookingTimes={true}
          />
        )}
        
        {/* Booking Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t('Booking Information', 'பதிவு தகவல்')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>• {t('Red dates indicate existing bookings', 'சிவப்பு தேதிகள் ஏற்கனவே பதிவு செய்யப்பட்டவற்றை காட்டுகின்றன')}</p>
              <p>• {t('Click on a date to select it and see existing booking times', 'தேதியை கிளிக் செய்து தேர்ந்தெடுத்து, ஏற்கனவே உள்ள பதிவு நேரங்களை பார்க்கவும்')}</p>
              <p>• {t('Calendar stays open to help you choose the best time', 'காலெண்டர் திறந்தே இருக்கும், சிறந்த நேரத்தை தேர்ந்தெடுக்க உதவும்')}</p>
              <p>• {t('The system will prevent double-booking automatically', 'கணினி தானாக இரட்டை பதிவை தடுக்கும்')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
