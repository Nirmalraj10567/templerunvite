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
  // What kind of donation is being made
  donationType: 'food' | 'product' | 'money';
  // Food specific
  food?: string;
  peoples?: string;
  // Product specific
  productName?: string;
  quantity?: string;
  // Money specific
  amount?: string;
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
  // Receipt number will be filled from backend (on edit or after create)
  
  // Translation function (inline helper)
  const tr = (en: string, ta: string) => language === 'english' ? ta : en;
  
  // Helpers to normalize API values into <input type="date"> / <input type="time"> formats
  const normalizeDateString = (s?: string) => {
    if (!s) return '';
    // Accept 'YYYY-MM-DD' or ISO strings 'YYYY-MM-DDTHH:mm:ssZ'
    return s.slice(0, 10);
  };

  const normalizeTimeString = (s?: string) => {
    if (!s) return '';
    // If already HH:MM or HH:MM:SS -> return HH:MM
    const hm = s.match(/^\d{2}:\d{2}(:\d{2})?$/);
    if (hm) return s.slice(0, 5);
    // Handle 12-hour formats like '12:00 PM' or '1:05 am'
    const ampm = s.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
    if (ampm) {
      let h = parseInt(ampm[1], 10);
      const m = ampm[2];
      const ap = ampm[3].toUpperCase();
      if (ap === 'PM' && h !== 12) h += 12;
      if (ap === 'AM' && h === 12) h = 0;
      const hh = String(h).padStart(2, '0');
      return `${hh}:${m}`;
    }
    // Fallback: try to Date-parse and extract HH:MM
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    return '';
  };
  
  // No client-side receipt generation; backend sets it on create and we display it
  useEffect(() => {
    const fetchNextReceipt = async () => {
      if (id) return;
      try {
        const resp = await fetch('http://localhost:4000/api/annadhanam/next-receipt', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!resp.ok) return;
        const res = await resp.json();
        if (res && (res.receipt_number || res.data?.receipt_number)) {
          setValue('receiptNumber', res.receipt_number || res.data?.receipt_number, { shouldValidate: true });
        }
      } catch (e) {
        // ignore preview errors; field can remain blank until submit
      }
    };
    fetchNextReceipt();
  }, [id, token, setValue]);

  // Set today's date for fromDate and toDate on new entry
  useEffect(() => {
    if (id) return; // don't override when editing
    const today = new Date().toISOString().slice(0, 10);
    setValue('fromDate', today);
    setValue('toDate', today);
  }, [id, setValue]);

  // Keep toDate in sync when it's empty (single-day convenience)
  const fromDateWatch = watch('fromDate');
  const toDateWatch = watch('toDate');
  const donationType = watch('donationType', 'food');
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
          const response = await fetch(`http://localhost:4000/api/annadhanam/${id}`, {
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
              receiptNumber: data.receipt_number || '',
              name: data.name,
              mobileNumber: data.mobile_number,
              donationType: 'food',
              food: data.food,
              peoples: data.peoples?.toString?.() ?? '1',
              time: normalizeTimeString(data.time),
              fromDate: normalizeDateString(data.from_date),
              toDate: normalizeDateString(data.to_date),
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
      
      // Single date usage: use fromDate as both from_date and to_date
      const singleDate = data.fromDate;

      // Map different donation types to existing backend fields
      let mappedFood = '';
      let mappedPeoples = 1;
      if (data.donationType === 'food') {
        mappedFood = data.food || '';
        mappedPeoples = parseInt(data.peoples || '1');
      } else if (data.donationType === 'product') {
        const pn = data.productName?.trim() || '';
        const qty = data.quantity?.trim() || '';
        mappedFood = `Product: ${pn}${qty ? ` | Qty: ${qty}` : ''}`;
        mappedPeoples = 1;
      } else if (data.donationType === 'money') {
        const amt = data.amount?.toString().trim() || '';
        mappedFood = `Money: ${amt}`;
        mappedPeoples = 1;
      }

      const payload = {
        receipt_number: data.receiptNumber,
        name: data.name,
        mobile_number: data.mobileNumber,
        food: mappedFood,
        peoples: mappedPeoples,
        time: data.time,
        from_date: singleDate,
        to_date: singleDate,
        remarks: data.remarks || ''
      };

      const url = id ? `http://localhost:4000/api/annadhanam/${id}` : 'http://localhost:4000/api/annadhanam';
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
        // Ensure the form shows the backend-generated receipt number after create
        if (!id && result?.data?.receipt_number) {
          setValue('receiptNumber', result.data.receipt_number, { shouldValidate: true });
        }
        const newId = id ? Number(id) : (result?.data?.id ?? null);
        if (typeof newId === 'number') {
          setLastCreatedId(newId);
          setShowPrintPrompt(true);
        }
      } else {
        throw new Error(result.error || 'Failed to save annadhanam data');
      }

      if (id) {
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
              <Label className="block text-xs mb-1" htmlFor="receiptNumber">
                {tr('Receipt Number', 'ரசீது எண்')}
              </Label>
              <Input
                id="receiptNumber"
                className="text-xs p-1 h-8"
                readOnly
                {...register('receiptNumber')}
                placeholder={tr('Auto-generated by system', 'கணினியால் தானாக உருவாக்கப்பட்டது')}
              />
            </div>

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
                  {tr('Date', 'தேதி')} *
                </Label>
                <Input
                  id="fromDate"
                  type="date"
                  className="text-xs p-1 h-8"
                  {...register('fromDate', { required: true })}
                />
              </div>

              <div>
                <Label className="block text-xs mb-1" htmlFor="donationType">
                  {tr('Donation Type', 'தானத்தின் வகை')} *
                </Label>
                <select
                  id="donationType"
                  className="text-xs p-1 h-8 w-full border rounded"
                  {...register('donationType', { required: true })}
                  defaultValue="food"
                >
                  <option value="food">{tr('Food', 'உணவு')}</option>
                  <option value="product">{tr('Product', 'பொருள்')}</option>
                  <option value="money">{tr('Money', 'பணம்')}</option>
                </select>
              </div>

              {watch('donationType') === 'food' && (
                <>
                  <div>
                    <Label className="block text-xs mb-1" htmlFor="food">
                      {tr('Food Items', 'உணவு பொருட்கள்')} *
                    </Label>
                    <Textarea
                      id="food"
                      className="text-xs p-1 min-h-[60px]"
                      {...register('food', { required: watch('donationType') === 'food' })}
                      placeholder={tr('Enter food items (e.g., Rice, Sambar, Curry)', 'உணவு பொருட்களை உள்ளிடவும் (எ.கா., அரிசி, சாம்பார், கறி)')}
                    />
                  </div>
                  <div>
                    <Label className="block text-xs mb-1" htmlFor="peoples">
                      {tr('Number of People', 'மக்கள் எண்ணிக்கை')}
                    </Label>
                    <Input
                      id="peoples"
                      type="number"
                      className="text-xs p-1 h-8"
                      {...register('peoples', {
                        validate: (v) => !v || parseInt(v, 10) >= 1 || 'Number of people must be at least 1'
                      })}
                      placeholder={tr('Enter number of people (optional)', 'மக்கள் எண்ணிக்கையை உள்ளிடவும் (விருப்பம்)')}
                    />
                  </div>
                </>
              )}

              {watch('donationType') === 'product' && (
                <>
                  <div>
                    <Label className="block text-xs mb-1" htmlFor="productName">
                      {tr('Product Name', 'பொருளின் பெயர்')} *
                    </Label>
                    <Input
                      id="productName"
                      className="text-xs p-1 h-8"
                      {...register('productName', { required: watch('donationType') === 'product' })}
                      placeholder={tr('Enter product name', 'பொருளின் பெயரை உள்ளிடவும்')}
                    />
                  </div>
                  <div>
                    <Label className="block text-xs mb-1" htmlFor="quantity">
                      {tr('Quantity', 'அளவு')} *
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      className="text-xs p-1 h-8"
                      {...register('quantity', { required: watch('donationType') === 'product', min: { value: 1, message: 'Quantity must be at least 1' } })}
                      placeholder={tr('Enter quantity', 'அளவை உள்ளிடவும்')}
                    />
                  </div>
                </>
              )}

              {watch('donationType') === 'money' && (
                <>
                  <div>
                    <Label className="block text-xs mb-1" htmlFor="amount">
                      {tr('Amount', 'தொகை')} *
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      className="text-xs p-1 h-8"
                      {...register('amount', { required: watch('donationType') === 'money', min: { value: 1, message: 'Amount must be at least 1' } })}
                      placeholder={tr('Enter amount', 'தொகையை உள்ளிடவும்')}
                    />
                  </div>
                </>
              )}

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
