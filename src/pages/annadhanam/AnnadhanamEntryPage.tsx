import React, { useState, useEffect, useRef } from 'react';
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
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';

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

// Custom hook for Enter key navigation
const useEnterKeyNavigation = () => {
  const formRef = useRef<HTMLFormElement>(null);

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

  return { formRef, handleKeyDown };
};

interface AnnadhanamFormData {
  receiptNumber: string;
  name: string;
  mobileNumber: string;
  donationType: 'food' | 'product' | 'money';
  food?: string;
  peoples?: string;
  productName?: string;
  quantity?: string;
  amount?: string;
  time: string;
  fromDate: string;
  toDate: string;
  remarks?: string;
}

interface AnnadhanamLog {
  id: number;
  annadhanam_id: number;
  action: string;
  created_at: string;
  created_by: number | null;
  details: any;
}

export default function AnnadhanamEntryPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { language } = useLanguage();
  const { formRef, handleKeyDown } = useEnterKeyNavigation();

  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, reset, setValue, watch } = useForm<AnnadhanamFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);
  const [logs, setLogs] = useState<AnnadhanamLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  
  const tr = (en: string, ta: string) => language === 'english' ? ta : en;
  
  const normalizeDateString = (s?: string) => {
    if (!s) return '';
    return s.slice(0, 10);
  };

  const normalizeTimeString = (s?: string) => {
    if (!s) return '';
    const hm = s.match(/^\d{2}:\d{2}(:\d{2})?$/);
    if (hm) return s.slice(0, 5);
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
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    return '';
  };
  
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
      // ignore preview errors
    }
  };

  const fetchLogs = async () => {
    if (!id) return;
    try {
      setLogsLoading(true);
      const response = await fetch(`http://localhost:4000/api/annadhanam/${id}/logs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const result = await response.json();
      
      if (result.success) {
        setLogs(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch logs');
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchNextReceipt();
  }, [id, token]);

  useEffect(() => {
    if (id) return;
    const today = new Date().toISOString().slice(0, 10);
    setValue('fromDate', today);
    setValue('toDate', today);
  }, [id, setValue]);

  const fromDateWatch = watch('fromDate');
  const toDateWatch = watch('toDate');
  const donationType = watch('donationType', 'food');
  
  useEffect(() => {
    if (fromDateWatch && !toDateWatch) {
      setValue('toDate', fromDateWatch, { shouldValidate: true });
    }
  }, [fromDateWatch, toDateWatch, setValue]);

  useEffect(() => {
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
            let donationType: AnnadhanamFormData['donationType'] = 'food';
            let food = '';
            let peoples = data.peoples?.toString?.() ?? '1';
            let productName = '';
            let quantity = '';
            let amount = '';

            const storedFood = (data.food || '').toString();
            if (storedFood.startsWith('Product:')) {
              donationType = 'product';
              const rest = storedFood.replace(/^Product:\s*/i, '').trim();
              const parts = rest.split('|').map((p: string) => p.trim());
              productName = parts[0] || '';
              const qtyPart = parts.slice(1).find((p: string) => /qty/i.test(p) || /^\d+$/.test(p));
              if (qtyPart) {
                quantity = qtyPart.replace(/qty\s*[:]?/i, '').trim();
              }
            } else if (storedFood.startsWith('Money:')) {
              donationType = 'money';
              amount = storedFood.replace(/^Money:\s*/i, '').trim();
            } else {
              donationType = 'food';
              food = storedFood;
            }

            const formData: any = {
              receiptNumber: data.receipt_number || '',
              name: data.name,
              mobileNumber: data.mobile_number,
              donationType,
              food,
              peoples,
              productName,
              quantity,
              amount,
              time: normalizeTimeString(data.time),
              fromDate: normalizeDateString(data.from_date),
              toDate: normalizeDateString(data.to_date),
              remarks: data.remarks || ''
            };
            
            reset(formData as AnnadhanamFormData);
            setLastCreatedId(Number(id));
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

  useEffect(() => {
    const loadLogs = async () => {
      try {
        if (!id || !token) return;
        await fetchLogs();
      } catch (e) {
        console.error('Failed to load logs on mount:', e);
      }
    };
    loadLogs();
  }, [id, token]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading annadhanam data...</div>
      </div>
    );
  }

  const onSubmit = async (data: AnnadhanamFormData) => {
    try {
      setIsSubmitting(true);
      
      const singleDate = data.fromDate;

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

        const newId = id ? Number(id) : (result?.data?.id ?? null);
        if (typeof newId === 'number') {
          setLastCreatedId(newId);
          setShowPrintPrompt(true);
          
          if (id) {
            try {
              await fetchLogs();
            } catch (e) {
              console.error('Failed to load logs after update:', e);
            }
          }
          
          if (!id) {
            reset({
              receiptNumber: '',
              name: '',
              mobileNumber: '',
              donationType: 'food',
              food: '',
              peoples: '',
              productName: '',
              quantity: '',
              amount: '',
              time: '',
              fromDate: new Date().toISOString().slice(0, 10),
              toDate: new Date().toISOString().slice(0, 10),
              remarks: ''
            });
            fetchNextReceipt();
          }
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
    <div className={pageContainerStyles.container}>
      <div className={pageContainerStyles.content}>
        <Card className={formFieldStyles.card.container}>
          <CardHeader className={cn("bg-gradient-to-r from-orange-500 to-orange-600 text-white", formFieldStyles.card.header)}>
            <CardTitle className="text-lg font-bold text-center">
              {tr('Annadhanam Entry', 'அன்னதானம் பதிவு')}
            </CardTitle>
          </CardHeader>
          
          <CardContent className={formFieldStyles.card.content}>
            <form ref={formRef} onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className={formFieldStyles.form.container}>
              <div className={formFieldStyles.form.grid}>
                
                {/* Receipt Number */}
                <div>
                  <Label className={formFieldStyles.label} htmlFor="receiptNumber">
                    {tr('Receipt No.', 'ரசீது எண்')}
                  </Label>
                  <Input
                    id="receiptNumber"
                    className={cn(formFieldStyles.input, "bg-gray-100")}
                    readOnly
                    {...register('receiptNumber')}
                    placeholder={tr('Auto', 'தானாக')}
                  />
                </div>

                {/* Name */}
                <div>
                  <Label className={formFieldStyles.label} htmlFor="name">
                    {tr('Name', 'பெயர்')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    className={formFieldStyles.input}
                    {...register('name', { required: true })}
                    placeholder={tr('Enter name', 'பெயரை உள்ளிடவும்')}
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <Label className={formFieldStyles.label} htmlFor="mobileNumber">
                    {tr('Mobile', 'மொபைல்')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="mobileNumber"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    onInput={(e) => {
                      const el = e.currentTarget as HTMLInputElement;
                      const cleaned = el.value.replace(/\D/g, '').slice(0, 10);
                      if (el.value !== cleaned) {
                        el.value = cleaned;
                      }
                      setValue('mobileNumber', cleaned, { shouldValidate: true, shouldDirty: true });
                    }}
                    className={formFieldStyles.input}
                    {...register('mobileNumber', { 
                      required: true,
                      pattern: {
                        value: /^[0-9]{10}$/, 
                        message: 'Please enter a valid 10-digit mobile number'
                      }
                    })}
                    placeholder={tr('10 digits', '10 இலக்கம்')}
                  />
                </div>

                {/* Time */}
                <div>
                  <Label className={formFieldStyles.label} htmlFor="time">
                    {tr('Time', 'நேரம்')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    className={formFieldStyles.input}
                    {...register('time', { required: true })}
                  />
                </div>

                {/* Date */}
                <div>
                  <Label className={formFieldStyles.label} htmlFor="fromDate">
                    {tr('Date', 'தேதி')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fromDate"
                    type="date"
                    className={formFieldStyles.input}
                    {...register('fromDate', { required: true })}
                  />
                </div>

                {/* Donation Type */}
                <div>
                  <Label className={formFieldStyles.label} htmlFor="donationType">
                    {tr('Donation Type', 'தானத்தின் வகை')} <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <select
                      id="donationType"
                      className={formFieldStyles.select}
                      {...register('donationType', { required: true })}
                      defaultValue="food"
                    >
                      <option value="food">{tr('Food', 'உணவு')}</option>
                      <option value="product">{tr('Product', 'பொருள்')}</option>
                      <option value="money">{tr('Money', 'பணம்')}</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Placeholder to maintain grid alignment */}
                <div className="md:col-span-2 lg:col-span-1"></div>

                {/* Dynamic Fields Based on Donation Type - All same size */}
                {watch('donationType') === 'food' && (
                  <>
                    <div className="md:col-span-2">
                      <Label className={formFieldStyles.label} htmlFor="food">
                        {tr('Food Items', 'உணவு பொருட்கள்')} <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="food"
                        className={formFieldStyles.textarea}
                        rows={1}
                        {...register('food', { required: watch('donationType') === 'food' })}
                        placeholder={tr('Rice, Curry, etc.', 'சாதம், கறி, etc.')}
                      />
                    </div>
                    <div>
                      <Label className={formFieldStyles.label} htmlFor="peoples">
                        {tr('People Count', 'மக்கள் எண்ணிக்கை')}
                      </Label>
                      <Input
                        id="peoples"
                        type="number"
                        className={formFieldStyles.input}
                        {...register('peoples', {
                          validate: (v) => !v || parseInt(v, 10) >= 1 || 'Number must be at least 1'
                        })}
                        placeholder={tr('Count', 'எண்ணிக்கை')}
                        min="1"
                      />
                    </div>
                  </>
                )}

                {watch('donationType') === 'product' && (
                  <>
                    <div>
                      <Label className={formFieldStyles.label} htmlFor="productName">
                        {tr('Product Name', 'பொருளின் பெயர்')} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="productName"
                        className={formFieldStyles.input}
                        {...register('productName', { required: watch('donationType') === 'product' })}
                        placeholder={tr('Enter product name', 'பொருளின் பெயரை உள்ளிடவும்')}
                      />
                    </div>
                    <div>
                      <Label className={formFieldStyles.label} htmlFor="quantity">
                        {tr('Quantity', 'அளவு')} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="quantity"
                        type="number"
                        className={formFieldStyles.input}
                        {...register('quantity', { required: watch('donationType') === 'product', min: { value: 1, message: 'Quantity must be at least 1' } })}
                        placeholder={tr('Qty', 'அளவு')}
                        min="1"
                      />
                    </div>
                  </>
                )}

                {watch('donationType') === 'money' && (
                  <div>
                    <Label className={formFieldStyles.label} htmlFor="amount">
                      {tr('Amount (₹)', 'தொகை (₹)')} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      className={formFieldStyles.input}
                      {...register('amount', { required: watch('donationType') === 'money', min: { value: 1, message: 'Amount must be at least ₹1' } })}
                      placeholder={tr('Enter amount', 'தொகையை உள்ளிடவும்')}
                      min="1"
                    />
                  </div>
                )}

                {/* Remarks - Full width */}
                <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
                  <Label className={formFieldStyles.label} htmlFor="remarks">
                    {tr('Remarks', 'குறிப்புகள்')}
                  </Label>
                  <Textarea
                    id="remarks"
                    className={formFieldStyles.textarea}
                    rows={3}
                    {...register('remarks')}
                    placeholder={tr('Additional notes', 'கூடுதல் குறிப்புகள்')}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 justify-between items-center pt-6 border-t border-gray-200">
                <div className="flex gap-3">
                  {id && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="default"
                      className="px-6 py-2 text-sm border hover:bg-gray-50 rounded-md"
                      onClick={() => {
                        setShowLogs(!showLogs);
                        if (!showLogs) {
                          fetchLogs();
                        }
                      }}
                    >
                      {showLogs ? tr('Hide Logs', 'மறை') : tr('Show Logs', 'பதிவுகள்')}
                    </Button>
                  )}
                </div>
                
                <div className={formFieldStyles.actions.container}>
                  <div className={formFieldStyles.actions.buttonGroup}>
                    {/* Keyboard shortcut hint can be added here */}
                  </div>
                  
                  <div className={formFieldStyles.actions.buttonGroup}>
                    <Button 
                      type="submit"
                      size="default"
                      className={formFieldStyles.button.primary}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {tr('Saving...', 'சேமிக்கிறது...')}
                        </span>
                      ) : id ? (
                        tr('Update', 'புதுப்பிக்கவும்')
                      ) : (
                        tr('Save', 'சேமிக்கவும்')
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>


        {showLogs && id && (
          <Card className="shadow-lg border-0 bg-white rounded-lg">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-6 px-6 rounded-t-lg">
              <CardTitle className="text-xl font-bold">
                {tr('Activity Log', 'செயல்பாட்டு பதிவு')}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {logsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-lg text-gray-600">Loading logs...</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 border-b">
                            {tr('Action', 'செயல்')}
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 border-b">
                            {tr('Date & Time', 'தேதி மற்றும் நேரம்')}
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700 border-b">
                            {tr('Details', 'விவரங்கள்')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.length > 0 ? (
                          logs.map((log, index) => (
                            <tr key={log.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                              <td className="py-3 px-4 border-b">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  log.action === 'create' ? 'bg-green-100 text-green-800' :
                                  log.action === 'update' ? 'bg-blue-100 text-blue-800' :
                                  log.action === 'delete' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {log.action === 'create' ? tr('Created', 'உருவாக்கப்பட்டது') :
                                   log.action === 'update' ? tr('Updated', 'புதுப்பிக்கப்பட்டது') :
                                   log.action === 'delete' ? tr('Deleted', 'நீக்கப்பட்டது') :
                                   log.action}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-700 border-b">
                                {new Date(log.created_at).toLocaleString('en-IN', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="py-3 px-4 border-b">
                                <div className="text-sm text-gray-600 max-w-md">
                                  {log.details ? (
                                    <pre className="whitespace-pre-wrap break-words bg-gray-100 p-2 rounded text-xs max-h-32 overflow-y-auto">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="h-32 text-center text-gray-500 py-8">
                              {tr('No activity logs found', 'செயல்பாட்டு பதிவுகள் இல்லை')}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Print Receipt Modal */}
        {showPrintPrompt && lastCreatedId != null && (
          <Modal
            title={tr('Print Receipt?', 'ரசீது அச்சிட?')}
            onClose={() => setShowPrintPrompt(false)}
          >
            <div className="p-6">
              <p className="mb-6 text-base text-gray-700">
                {tr('Entry saved! Open PDF receipt for printing?', 'பதிவு சேமிக்கப்பட்டது! PDF ரசீதைத் திற?')}
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  className="px-4 py-2 rounded-md border text-sm hover:bg-gray-50" 
                  onClick={() => setShowPrintPrompt(false)}
                >
                  {tr('Not Now', 'இப்போது வேண்டாம்')}
                </button>
                <button
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
                  onClick={() => {
                    const q = token ? `?token=${encodeURIComponent(token)}` : '';
                    const url = `http://localhost:4000/api/annadhanam/${lastCreatedId}/receipt.pdf${q}`;
                    window.open(url, '_blank');
                    setShowPrintPrompt(false);
                  }} 
                >
                  {tr('Yes, Open', 'ஆம், திற')}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
