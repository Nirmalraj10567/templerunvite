import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { poojaMobileService, PoojaMobileRequest } from '@/services/poojaMobileService';
import { Calendar, Clock, User, Phone, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface FormData {
  receipt_number: string;
  name: string;
  mobile_number: string;
  time: string;
  from_date: string;
  to_date: string;
  remarks: string;
}

export default function PoojaMobileRequestPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset
  } = useForm<FormData>();

  const fromDate = watch('from_date');
  const toDate = watch('to_date');

  // Generate receipt number on component mount
  useEffect(() => {
    setValue('receipt_number', poojaMobileService.generateReceiptNumber());
  }, [setValue]);

  // Fetch available slots when date range changes
  useEffect(() => {
    if (fromDate && toDate && poojaMobileService.isValidDateRange(fromDate, toDate)) {
      fetchAvailableSlots(fromDate, toDate);
    }
  }, [fromDate, toDate]);

  const fetchAvailableSlots = async (fromDate: string, toDate: string) => {
    try {
      setLoadingSlots(true);
      const result = await poojaMobileService.getAvailableSlots(fromDate, toDate);
      if (result.success && result.data) {
        setAvailableSlots(result.data.available_slots);
        setBookedSlots(result.data.booked_slots);
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);

      // Validate form data
      if (!poojaMobileService.validateMobileNumber(data.mobile_number)) {
        toast({
          title: t('Invalid Mobile Number', 'தவறான மொபைல் எண்'),
          description: t('Please enter a valid 10-digit mobile number', 'சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்'),
          variant: 'destructive'
        });
        return;
      }

      if (!poojaMobileService.validateTimeFormat(data.time)) {
        toast({
          title: t('Invalid Time Format', 'தவறான நேர வடிவம்'),
          description: t('Please enter time in HH:MM format', 'நேரத்தை HH:MM வடிவத்தில் உள்ளிடவும்'),
          variant: 'destructive'
        });
        return;
      }

      if (!poojaMobileService.isValidDateRange(data.from_date, data.to_date)) {
        toast({
          title: t('Invalid Date Range', 'தவறான தேதி வரம்பு'),
          description: t('From date must be before or equal to to date', 'தொடக்க தேதி முடிவு தேதிக்கு முன் அல்லது சமமாக இருக்க வேண்டும்'),
          variant: 'destructive'
        });
        return;
      }

      if (!poojaMobileService.isFutureDate(data.from_date)) {
        toast({
          title: t('Invalid Date', 'தவறான தேதி'),
          description: t('Please select a future date', 'எதிர்கால தேதியைத் தேர்ந்தெடுக்கவும்'),
          variant: 'destructive'
        });
        return;
      }

      // Check if selected time is available
      if (bookedSlots.includes(data.time)) {
        toast({
          title: t('Time Slot Booked', 'நேர இடம் பதிவு செய்யப்பட்டது'),
          description: t('This time slot is already booked. Please choose another time.', 'இந்த நேர இடம் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது. வேறு நேரத்தைத் தேர்ந்தெடுக்கவும்.'),
          variant: 'destructive'
        });
        return;
      }

      const requestData: PoojaMobileRequest = {
        receipt_number: data.receipt_number,
        name: data.name,
        mobile_number: data.mobile_number,
        time: data.time,
        from_date: data.from_date,
        to_date: data.to_date,
        remarks: data.remarks || undefined,
        submitted_by_mobile: data.mobile_number
      };

      const result = await poojaMobileService.submitRequest(requestData);

      if (result.success) {
        toast({
          title: t('Request Submitted', 'கோரிக்கை சமர்ப்பிக்கப்பட்டது'),
          description: t('Your pooja request has been submitted successfully. You will be notified once it is approved.', 'உங்கள் பூஜை கோரிக்கை வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது. அது அனுமதிக்கப்பட்டவுடன் உங்களுக்கு அறிவிக்கப்படும்.'),
        });

        // Reset form
        reset();
        setValue('receipt_number', poojaMobileService.generateReceiptNumber());
        setAvailableSlots([]);
        setBookedSlots([]);
      } else {
        throw new Error(result.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: error instanceof Error ? error.message : t('Failed to submit request. Please try again.', 'கோரிக்கையை சமர்ப்பிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'),
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateNewReceiptNumber = () => {
    setValue('receipt_number', poojaMobileService.generateReceiptNumber());
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">
          {t('Pooja Request', 'பூஜை கோரிக்கை')}
        </h1>
        <p className="text-muted-foreground">
          {t('Submit your pooja booking request', 'உங்கள் பூஜை பதிவு கோரிக்கையை சமர்ப்பிக்கவும்')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('Request Form', 'கோரிக்கை படிவம்')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Receipt Number */}
            <div className="space-y-2">
              <Label htmlFor="receipt_number">
                {t('Receipt Number', 'ரசீது எண்')} *
              </Label>
              <div className="flex gap-2">
                <Input
                  id="receipt_number"
                  {...register('receipt_number', { required: true })}
                  readOnly
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateNewReceiptNumber}
                  size="sm"
                >
                  {t('Generate', 'உருவாக்கு')}
                </Button>
              </div>
              {errors.receipt_number && (
                <p className="text-sm text-red-600">{t('Receipt number is required', 'ரசீது எண் தேவை')}</p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                {t('Name', 'பெயர்')} *
              </Label>
              <Input
                id="name"
                {...register('name', { required: true, minLength: 2 })}
                placeholder={t('Enter your full name', 'உங்கள் முழு பெயரை உள்ளிடவும்')}
              />
              {errors.name && (
                <p className="text-sm text-red-600">
                  {errors.name.type === 'required' 
                    ? t('Name is required', 'பெயர் தேவை')
                    : t('Name must be at least 2 characters', 'பெயர் குறைந்தது 2 எழுத்துகள் இருக்க வேண்டும்')
                  }
                </p>
              )}
            </div>

            {/* Mobile Number */}
            <div className="space-y-2">
              <Label htmlFor="mobile_number">
                {t('Mobile Number', 'மொபைல் எண்')} *
              </Label>
              <Input
                id="mobile_number"
                type="tel"
                {...register('mobile_number', { 
                  required: true,
                  pattern: /^[6-9]\d{9}$/
                })}
                placeholder={t('Enter 10-digit mobile number', '10 இலக்க மொபைல் எண்ணை உள்ளிடவும்')}
                maxLength={10}
              />
              {errors.mobile_number && (
                <p className="text-sm text-red-600">
                  {errors.mobile_number.type === 'required' 
                    ? t('Mobile number is required', 'மொபைல் எண் தேவை')
                    : t('Please enter a valid 10-digit mobile number', 'சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்')
                  }
                </p>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from_date">
                  {t('From Date', 'தொடக்க தேதி')} *
                </Label>
                <Input
                  id="from_date"
                  type="date"
                  {...register('from_date', { required: true })}
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors.from_date && (
                  <p className="text-sm text-red-600">{t('From date is required', 'தொடக்க தேதி தேவை')}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="to_date">
                  {t('To Date', 'முடிவு தேதி')} *
                </Label>
                <Input
                  id="to_date"
                  type="date"
                  {...register('to_date', { required: true })}
                  min={fromDate || new Date().toISOString().split('T')[0]}
                />
                {errors.to_date && (
                  <p className="text-sm text-red-600">{t('To date is required', 'முடிவு தேதி தேவை')}</p>
                )}
              </div>
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
              {errors.time && (
                <p className="text-sm text-red-600">{t('Time is required', 'நேரம் தேவை')}</p>
              )}
            </div>

            {/* Available Time Slots */}
            {fromDate && toDate && (
              <div className="space-y-2">
                <Label>{t('Available Time Slots', 'கிடைக்கும் நேர இடங்கள்')}</Label>
                {loadingSlots ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-muted-foreground mt-2">{t('Loading...', 'ஏற்றுகிறது...')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                    {availableSlots.slice(0, 12).map((slot) => (
                      <Button
                        key={slot}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setValue('time', slot)}
                        className="text-xs"
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                )}
                {bookedSlots.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-1">
                      {t('Booked Slots', 'பதிவு செய்யப்பட்ட இடங்கள்')}:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {bookedSlots.slice(0, 8).map((slot) => (
                        <Badge key={slot} variant="secondary" className="text-xs">
                          {slot}
                        </Badge>
                      ))}
                      {bookedSlots.length > 8 && (
                        <Badge variant="secondary" className="text-xs">
                          +{bookedSlots.length - 8} {t('more', 'மேலும்')}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Remarks */}
            <div className="space-y-2">
              <Label htmlFor="remarks">
                {t('Remarks', 'கருத்துகள்')}
              </Label>
              <Textarea
                id="remarks"
                {...register('remarks')}
                placeholder={t('Any special requirements or notes...', 'எந்தவொரு சிறப்பு தேவைகள் அல்லது குறிப்புகள்...')}
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('Submitting...', 'சமர்ப்பிக்கிறது...')}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {t('Submit Request', 'கோரிக்கையை சமர்ப்பிக்கவும்')}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {t('Important Information', 'முக்கியமான தகவல்')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• {t('Your request will be reviewed by temple administration', 'உங்கள் கோரிக்கை கோவில் நிர்வாகத்தால் மதிப்பாய்வு செய்யப்படும்')}</p>
          <p>• {t('You will be notified via SMS once approved or rejected', 'அனுமதிக்கப்பட்டால் அல்லது நிராகரிக்கப்பட்டால் SMS மூலம் அறிவிக்கப்படுவீர்கள்')}</p>
          <p>• {t('Please ensure all information is accurate', 'அனைத்து தகவல்களும் துல்லியமானவை என்பதை உறுதிப்படுத்தவும்')}</p>
          <p>• {t('You can cancel your request if it is still pending', 'உங்கள் கோரிக்கை இன்னும் நிலுவையில் இருந்தால் அதை ரத்து செய்யலாம்')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
