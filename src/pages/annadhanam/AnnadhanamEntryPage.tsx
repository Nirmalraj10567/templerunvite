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

const generateReceiptNo = () => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

interface AnnadhanamFormData {
  receiptNumber: string;
  name: string;
  mobileNumber: string;
  food: string;
  peoples: string;
  time: string;
  fromDate: string;
  toDate: string;
  remarks?: string;
}

export default function AnnadhanamEntryPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, reset, setValue } = useForm<AnnadhanamFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = (en: string, ta: string) => language === 'tamil' ? ta : en;

  useEffect(() => {
    // Generate receipt number on component mount
    setValue('receiptNumber', generateReceiptNo());
    
    if (id) {
      const fetchAnnadhanam = async () => {
        try {
          setIsLoading(true);
          const response = await fetch(`/api/annadhanam/${id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error('Failed to fetch annadhanam data');
          }

          const result = await response.json();
          
          if (result.success) {
            const data = result.data;
            const formData: AnnadhanamFormData = {
              receiptNumber: data.receipt_number,
              name: data.name,
              mobileNumber: data.mobile_number,
              food: data.food,
              peoples: data.peoples.toString(),
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
          console.error('Error fetching annadhanam data:', error);
          toast({
            title: t('Error', 'பிழை'),
            description: t('Failed to load annadhanam data', 'அன்னதானம் தரவை ஏற்ற முடியவில்லை'),
            variant: 'destructive'
          });
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchAnnadhanam();
    }
  }, [id, reset, setValue, token, t]);

  if (isLoading) {
    return <div className="p-8">Loading annadhanam data...</div>;
  }

  const onSubmit = async (data: AnnadhanamFormData) => {
    try {
      setIsSubmitting(true);
      
      // Validate date range
      if (new Date(data.fromDate) > new Date(data.toDate)) {
        toast({
          title: 'Invalid Date Range',
          description: 'From date cannot be later than to date',
          variant: 'destructive'
        });
        return;
      }

      const payload = {
        receiptNumber: data.receiptNumber,
        name: data.name,
        mobileNumber: data.mobileNumber,
        food: data.food,
        peoples: parseInt(data.peoples),
        time: data.time,
        fromDate: data.fromDate,
        toDate: data.toDate,
        remarks: data.remarks || ''
      };

      const url = id ? `/api/annadhanam/${id}` : '/api/annadhanam';
      const method = id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save annadhanam data');
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: id ? t('Annadhanam updated successfully', 'அன்னதானம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது') : t('Annadhanam created successfully', 'அன்னதானம் வெற்றிகரமாக உருவாக்கப்பட்டது'),
          description: t('Data saved successfully', 'தரவு வெற்றிகரமாக சேமிக்கப்பட்டது')
        });
      } else {
        throw new Error(result.error || 'Failed to save annadhanam data');
      }

      if (!id) {
        // Reset form for new entry
        reset();
        setValue('receiptNumber', generateReceiptNo());
      } else {
        navigate('/dashboard/annadhanam');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Error',
        description: t('Failed to submit annadhanam form', 'அன்னதானம் படிவத்தை சமர்ப்பிக்க முடியவில்லை'),
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (id) {
      navigate('/dashboard/annadhanam');
    } else {
      reset();
      setValue('receiptNumber', generateReceiptNo());
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-lg">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {t('Annadhanam Entry', 'அன்னதானம் பதிவு')}
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
                <Input
                  id="fromDate"
                  type="date"
                  {...register('fromDate', { required: true })}
                />
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

            {/* Food */}
            <div className="space-y-2">
              <Label htmlFor="food">
                {t('Food Items', 'உணவு பொருட்கள்')} *
              </Label>
              <Textarea
                id="food"
                {...register('food', { required: true })}
                placeholder={t('Enter food items (e.g., Rice, Sambar, Curry)', 'உணவு பொருட்களை உள்ளிடவும் (எ.கா., அரிசி, சாம்பார், கறி)')}
                rows={3}
              />
            </div>

            {/* Number of People */}
            <div className="space-y-2">
              <Label htmlFor="peoples">
                {t('Number of People', 'மக்கள் எண்ணிக்கை')} *
              </Label>
              <Input
                id="peoples"
                type="number"
                min="1"
                {...register('peoples', { 
                  required: true,
                  min: { value: 1, message: 'Number of people must be at least 1' }
                })}
                placeholder={t('Enter number of people', 'மக்கள் எண்ணிக்கையை உள்ளிடவும்')}
              />
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
                    ? t('Update Annadhanam', 'அன்னதானத்தை புதுப்பிக்க') 
                    : t('Save Annadhanam', 'அன்னதானத்தை சேமிக்க')
                }
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
