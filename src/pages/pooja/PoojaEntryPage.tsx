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
import { useLanguage } from '@/contexts/LanguageContext';
import PoojaCalendar from '@/components/PoojaCalendar';
import { poojaService, PoojaFormData } from '@/services/poojaService';

const generateReceiptNo = () => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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

  const t = (en: string, ta: string) => language === 'tamil' ? ta : en;

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
    setValue('receiptNumber', generateReceiptNo());
    
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
              remarks: data.remarks || ''
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

      const payload = {
        receiptNumber: data.receiptNumber,
        name: data.name,
        mobileNumber: data.mobileNumber,
        time: data.time,
        fromDate: data.fromDate,
        toDate: data.toDate,
        remarks: data.remarks || ''
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
