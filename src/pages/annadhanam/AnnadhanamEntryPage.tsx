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
import { Modal } from '@/components/ui/modal';
import { useLanguage } from '@/lib/language';

// Translation object
const texts = {
  englsih: {
    title: 'அன்னதானம் பதிவு',
    receiptNumber: 'ரசீது எண்',
    name: 'பெயர்',
    mobile: 'மொபைல்',
    food: 'உணவு வகை',
    peoples: 'நபர்கள் எண்ணிக்கை',
    time: 'நேரம்',
    fromDate: 'தொடக்க தேதி',
    toDate: 'இறுதி தேதி',
    remarks: 'கருத்து',
    save: 'சேமிக்கவும்',
    update: 'புதுப்பிக்கவும்',
    cancel: 'ரத்து செய்',
    success: 'வெற்றி',
    error: 'பிழை',
    requiredField: 'இந்த புலம் தேவையானது',
    invalidMobile: 'செல்லுபடியாகும் மொபைல் எண்ணை உள்ளிடவும்'
  },
  english: {
    title: 'Annadhanam Entry',
    receiptNumber: 'Receipt Number',
    name: 'Name',
    mobile: 'Mobile',
    food: 'Food Type',
    peoples: 'Number of People',
    time: 'Time',
    fromDate: 'From Date',
    toDate: 'To Date',
    remarks: 'Remarks',
    save: 'Save',
    update: 'Update',
    cancel: 'Cancel',
    success: 'Success',
    error: 'Error',
    requiredField: 'This field is required',
    invalidMobile: 'Please enter a valid mobile number'
  }
};

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
  const { register, handleSubmit, reset, setValue, watch } = useForm<AnnadhanamFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState('');
  
  // Translation function (inline helper)
  const tr = (en: string, ta: string) => language === 'english' ? ta : en;
  
  // Generate a temporary receipt number for display
  useEffect(() => {
    if (!id) {
      const year = new Date().getFullYear();
      setReceiptNumber(`${year}-${Math.floor(1000 + Math.random() * 9000).toString().padStart(4, '0')}`);
    }
  }, [id]);

  // Keep toDate in sync when it's empty (single-day convenience)
  const fromDateWatch = watch('fromDate');
  const toDateWatch = watch('toDate');
  useEffect(() => {
    if (fromDateWatch && !toDateWatch) {
      setValue('toDate', fromDateWatch, { shouldValidate: true });
    }
  }, [fromDateWatch, toDateWatch, setValue]);

  useEffect(() => {
    // Don't set receipt number here - it will be generated on the server
    
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
              receiptNumber: data.receipt_number || receiptNumber,
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
            title: tr('Error', 'பிழை'),
            description: tr('Failed to load annadhanam data', 'அன்னதானம் தரவை ஏற்ற முடியவில்லை'),
            variant: 'destructive'
          });
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchAnnadhanam();
    }
  }, [id, reset, setValue, token, language]);

  if (isLoading) {
    return <div className="p-4">Loading annadhanam data...</div>;
  }

  const onSubmit = async (data: AnnadhanamFormData) => {
    try {
      setIsSubmitting(true);
      
      // Validate date range
      if (new Date(data.fromDate) > new Date(data.toDate)) {
        toast({
          title: tr('Error', 'பிழை'),
          description: tr('From date cannot be later than to date', 'தொடங்கும் தேதி முடிவதற்கு முன்னதாக இருக்க முடியாது'),
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
          title: id ? tr('Annadhanam updated successfully', 'அன்னதானம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது') : tr('Annadhanam created successfully', 'அன்னதானம் வெற்றிகரமாக உருவாக்கப்பட்டது'),
          description: tr('Data saved successfully', 'தரவு வெற்றிகரமாக சேமிக்கப்பட்டது')
        });
        const newId = id ? Number(id) : (result?.data?.id ?? null);
        if (typeof newId === 'number') {
          setLastCreatedId(newId);
          setShowPrintPrompt(true);
        }
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
        description: tr('Failed to submit annadhanam form', 'அன்னதானம் படிவத்தை சமர்ப்பிக்க முடியவில்லை'),
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
    <div className="w-full max-w-4xl mx-auto bg-white p-3 rounded shadow text-sm">
      <Card className="w-full border-none shadow-none">
        <CardHeader className="p-2">
          <CardTitle className="text-lg font-semibold text-center">
            {tr('Annadhanam Entry', 'அன்னதானம் பதிவு')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="block text-xs mb-1" htmlFor="name">{tr('Name', 'பெயர்')} *</Label>
              <Input
                id="name"
                className="text-xs p-1 h-8"
                {...register('name', { required: true })}
              />
            </div>

            <div>
              <Label className="block text-xs mb-1" htmlFor="mobileNumber">
                {tr('Mobile Number', 'மொபைல் எண்')} *
              </Label>
              <Input
                id="mobileNumber"
                type="tel"
                className="text-xs p-1 h-8"
                {...register('mobileNumber', { 
                  required: true,
                  pattern: {
                    value: /^[0-9]{10}$/,
                    message: 'Please enter a valid 10-digit mobile number'
                  }
                })}
                placeholder={tr('Enter 10-digit mobile number', '10 இலக்க மொபைல் எண்ணை உள்ளிடவும்')}
              />
            </div>

            <div>
              <Label className="block text-xs mb-1" htmlFor="time">
                {tr('Time', 'நேரம்')} *
              </Label>
              <Input
                id="time"
                type="time"
                className="text-xs p-1 h-8"
                {...register('time', { required: true })}
              />
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="block text-xs mb-1" htmlFor="fromDate">
                  {tr('From Date', 'தொடக்க தேதி')} *
                </Label>
                <Input
                  id="fromDate"
                  type="date"
                  className="text-xs p-1 h-8"
                  {...register('fromDate', { required: true })}
                />
              </div>

              <div>
                <Label className="block text-xs mb-1" htmlFor="toDate">
                  {tr('To Date', 'இறுதி தேதி')} *
                </Label>
                <Input
                  id="toDate"
                  type="date"
                  className="text-xs p-1 h-8"
                  {...register('toDate', { required: true })}
                />
              </div>

              <div>
                <Label className="block text-xs mb-1" htmlFor="food">
                  {tr('Food Items', 'உணவு பொருட்கள்')} *
                </Label>
                <Textarea
                  id="food"
                  className="text-xs p-1 min-h-[60px]"
                  {...register('food', { required: true })}
                  placeholder={tr('Enter food items (e.g., Rice, Sambar, Curry)', 'உணவு பொருட்களை உள்ளிடவும் (எ.கா., அரிசி, சாம்பார், கறி)')}
                />
              </div>

              <div>
                <Label className="block text-xs mb-1" htmlFor="peoples">
                  {tr('Number of People', 'மக்கள் எண்ணிக்கை')} *
                </Label>
                <Input
                  id="peoples"
                  type="number"
                  min="1"
                  className="text-xs p-1 h-8"
                  {...register('peoples', { 
                    required: true,
                    min: { value: 1, message: 'Number of people must be at least 1' }
                  })}
                  placeholder={tr('Enter number of people', 'மக்கள் எண்ணிக்கையை உள்ளிடவும்')}
                />
              </div>

              <div>
                <Label className="block text-xs mb-1" htmlFor="remarks">
                  {tr('Remarks', 'குறிப்புகள்')}
                </Label>
                <Textarea
                  id="remarks"
                  className="text-xs p-1 min-h-[60px]"
                  {...register('remarks')}
                  placeholder={tr('Enter any additional remarks', 'கூடுதல் குறிப்புகளை உள்ளிடவும்')}
                />
              </div>
            </div>

            <div className="md:col-span-2 flex gap-2 justify-end pt-2 border-t">
              <Button 
                type="button" 
                variant="outline" 
                className="text-xs px-3 py-1 h-8"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                {tr('Cancel', 'ரத்து செய்')}
              </Button>
              <Button 
                type="submit" 
                className="text-xs px-3 py-1 h-8 bg-orange-600 hover:bg-orange-700"
                disabled={isSubmitting}
              >
                {isSubmitting 
                  ? tr('Saving...', 'சேமிக்கிறது...') 
                  : id 
                    ? tr('Update Annadhanam', 'அன்னதானத்தை புதுப்பிக்க') 
                    : tr('Save Annadhanam', 'அன்னதானத்தை சேமிக்க')
                }
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {showPrintPrompt && lastCreatedId != null && (
        <Modal
          title={tr('Print Receipt', 'ரசீதை அச்சிடவா?')}
          onClose={() => setShowPrintPrompt(false)}
        >
          <p className="mb-3 text-xs">{tr('Do you want to open the PDF receipt for printing?', 'PDF ரசீதை அச்சிட திறக்க விரும்புகிறீர்களா?')}</p>
          <div className="flex justify-end gap-2">
            <button className="px-3 py-1 rounded border text-xs" onClick={() => setShowPrintPrompt(false)}>
              {tr('No', 'இல்லை')}
            </button>
            <button
              className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs"
              onClick={() => {
                const q = token ? `?token=${encodeURIComponent(token)}` : '';
                const url = `http://localhost:4000/api/annadhanam/${lastCreatedId}/receipt.pdf${q}`;
                window.open(url, '_blank');
                setShowPrintPrompt(false);
              }}
            >
              {tr('Yes, Print', 'ஆம், அச்சிடு')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
