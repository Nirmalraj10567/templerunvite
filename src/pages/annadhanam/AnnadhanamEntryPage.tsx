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
import { theme } from '@/styles/theme';
import { 
  Download, 
  Printer, 
  History, 
  Save, 
  X, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Tag, 
  FileText,
  Coffee,
  Package,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

// Custom hook for Enter key - only submits form
const useEnterKeyNavigation = () => {
  const formRef = useRef<HTMLFormElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only handle Enter key on textarea to allow newlines
    if (e.key === 'Enter' && !e.shiftKey) {
      const target = e.target as HTMLElement;
      
      // Allow Enter in textarea for new lines
      if (target.tagName === 'TEXTAREA') {
        return; // Let default behavior happen
      }
      
      // On other fields, Enter will naturally submit the form
      // Tab key handles field navigation naturally
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
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<AnnadhanamFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);
  const [logs, setLogs] = useState<AnnadhanamLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  
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
            title: 'Error',
            description: 'Failed to load annadhanam data',
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: AnnadhanamFormData) => {
    console.log('onSubmit called with data:', data);
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
          title: id ? 'Annadhanam updated successfully' : 'Annadhanam created successfully',
          description: 'Data saved successfully',
          className: 'bg-green-50 border-green-200'
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
              time: '',
              fromDate: '',
              toDate: '',
              food: '',
              peoples: '',
              productName: '',
              quantity: '',
              amount: '',
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
        description: 'Failed to submit annadhanam form',
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

  const getDonationTypeIcon = () => {
    switch(donationType) {
      case 'food': return <Coffee className="w-5 h-5" />;
      case 'product': return <Package className="w-5 h-5" />;
      case 'money': return <DollarSign className="w-5 h-5" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Main Form Card */}
        <Card className="shadow-xl border-0 overflow-hidden">
          <CardHeader className={theme.card.header}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Donation Details
              </CardTitle>
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                {getDonationTypeIcon()}
                <span className="text-sm font-medium">
                  {donationType === 'food' && 'Food Donation'}
                  {donationType === 'product' && 'Product Donation'}
                  {donationType === 'money' && 'Money Donation'}
                </span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <form ref={formRef} onSubmit={handleSubmit(onSubmit, (errors) => {
                    console.log('Validation errors:', errors);
                    toast({
                      title: 'Validation Error',
                      description: 'Please fill in all required fields',
                      variant: 'destructive'
                    });
                  })} onKeyDown={handleKeyDown}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Receipt Number */}
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="receiptNumber"
                    className={cn(theme.input.base, "pl-10 bg-gray-50")}
                    readOnly
                    {...register('receiptNumber')}
                    placeholder="Receipt No."
                  />
                </div>

                {/* Name */}
                <div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="name"
                      autoFocus
                      className={cn(theme.input.base, `pl-10 ${errors.name ? 'border-red-500' : ''}`)}
                      {...register('name', { required: 'Name is required', onChange: (e) => { const val = e.target.value; if (val) e.target.value = val.charAt(0).toUpperCase() + val.slice(1); } })} onChange={(e) => { const val = e.target.value; setValue('name', val ? val.replace(/\b\w/g, (char) => char.toUpperCase()) : val, { shouldValidate: true }); }}
                      placeholder="Name *"
                    />
                  </div>
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>

                {/* Mobile Number */}
                <div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                    className={cn(theme.input.base, `pl-10 ${errors.mobileNumber ? 'border-red-500' : ''}`)}
                    {...register('mobileNumber', { 
                      required: 'Mobile number is required',
                      pattern: {
                        value: /^[0-9]{10}$/, 
                        message: 'Please enter a valid 10-digit mobile number'
                      }
                    })}
                    placeholder="Mobile *"
                  />
                  </div>
                  {errors.mobileNumber && <p className="text-red-500 text-xs mt-1">{errors.mobileNumber.message}</p>}
                </div>

                {/* Time */}
                <div>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="time"
                      type="time" className={`pl-10 border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none shadow-sm focus:shadow-md transition-all duration-200 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${errors.time ? 'border-red-500' : ''}`}
                      {...register('time', { required: 'Time is required' })}
                      placeholder="Time *"
                    />
                  </div>
                  {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time.message}</p>}
                </div>

                {/* Date */}
                <div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="fromDate"
                      type="date" className={`[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer pl-10 border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none shadow-sm focus:shadow-md transition-all duration-200 ${errors.fromDate ? 'border-red-500' : ''}`}
                      {...register('fromDate', { required: 'Date is required' })}
                      placeholder="Date *"
                    />
                  </div>
                  {errors.fromDate && <p className="text-red-500 text-xs mt-1">{errors.fromDate.message}</p>}
                </div>

                {/* Donation Type */}
                <div>
                  <div className="relative">
                    <select
                      id="donationType"
                      className={cn(theme.select.base, `w-full ${errors.donationType ? 'border-red-500' : ''}`)}
                      {...register('donationType', { required: 'Donation type is required' })}
                      defaultValue="food"
                    >
                      <option value="food">Food Donation</option>
                      <option value="product">Product Donation</option>
                      <option value="money">Money Donation</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {donationType === 'food' && <Coffee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500" />}
                    {donationType === 'product' && <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-500" />}
                    {donationType === 'money' && <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />}
                  </div>
                  {errors.donationType && <p className="text-red-500 text-xs mt-1">{errors.donationType.message}</p>}
                </div>

                {/* Dynamic Fields Based on Donation Type */}
                {watch('donationType') === 'food' && (
                  <>
                    <div>
                      <Input
                        id="food"
                        className={cn(theme.input.base, `border ${errors.food ? 'border-red-500' : ''}`)}
                        {...register('food', { required: 'Food items is required' })} onChange={(e) => { const val = e.target.value; setValue('food', val ? val.replace(/\b\w/g, (char) => char.toUpperCase()) : val, { shouldValidate: true }); }}
                        placeholder="Food Items *"
                      />
                      {errors.food && <p className="text-red-500 text-xs mt-1">{errors.food.message}</p>}
                    </div>
                    <div>
                      <Input
                        id="peoples"
                        type="number"
                        className={cn(theme.input.base, `border ${errors.peoples ? 'border-red-500' : ''}`)}
                        {...register('peoples', {
                          required: 'People count is required',
                          min: { value: 1, message: 'Number must be at least 1' }
                        })}
                        placeholder="People Count *"
                        min="1"
                      />
                      {errors.peoples && <p className="text-red-500 text-xs mt-1">{errors.peoples.message}</p>}
                    </div>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="remarks"
                        className="pl-10 border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none shadow-sm focus:shadow-md transition-all duration-200"
                        {...register('remarks')} onChange={(e) => { const val = e.target.value; setValue('remarks', val ? val.replace(/\b\w/g, (char) => char.toUpperCase()) : val, { shouldValidate: true }); }}
                        placeholder="Remarks"
                      />
                    </div>
                  </>
                )}

                {watch('donationType') === 'product' && (
                  <>
                    <div>
                      <Input
                        id="productName"
                        className={`border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none shadow-sm focus:shadow-md transition-all duration-200 ${errors.productName ? 'border-red-500' : ''}`}
                        {...register('productName', { required: 'Product name is required' })} onChange={(e) => { const val = e.target.value; setValue('productName', val ? val.replace(/\b\w/g, (char) => char.toUpperCase()) : val, { shouldValidate: true }); }}
                        placeholder="Product Name *"
                      />
                      {errors.productName && <p className="text-red-500 text-xs mt-1">{errors.productName.message}</p>}
                    </div>
                    <div>
                      <Input
                        id="quantity"
                        type="number"
                        className={`border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none shadow-sm focus:shadow-md transition-all duration-200 ${errors.quantity ? 'border-red-500' : ''}`}
                        {...register('quantity', { required: 'Quantity is required', min: { value: 1, message: 'Quantity must be at least 1' } })}
                        placeholder="Quantity *"
                        min="1"
                      />
                      {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
                    </div>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="remarks"
                        className="pl-10 border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none shadow-sm focus:shadow-md transition-all duration-200"
                        {...register('remarks')} onChange={(e) => { const val = e.target.value; setValue('remarks', val ? val.replace(/\b\w/g, (char) => char.toUpperCase()) : val, { shouldValidate: true }); }}
                        placeholder="Remarks"
                      />
                    </div>
                  </>
                )}

                {watch('donationType') === 'money' && (
                  <>
                    <div>
                      <Input
                        id="amount"
                        type="number"
                        className={`border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none shadow-sm focus:shadow-md transition-all duration-200 ${errors.amount ? 'border-red-500' : ''}`}
                        {...register('amount', { required: 'Amount is required', min: { value: 1, message: 'Amount must be at least Rs1' } })}
                        placeholder="Amount (Rs) *"
                        min="1"
                      />
                      {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
                    </div>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="remarks"
                        className="pl-10 border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none shadow-sm focus:shadow-md transition-all duration-200"
                        {...register('remarks')} onChange={(e) => { const val = e.target.value; setValue('remarks', val ? val.replace(/\b\w/g, (char) => char.toUpperCase()) : val, { shouldValidate: true }); }}
                        placeholder="Remarks"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end pt-8 mt-6 border-t-2 border-gray-100">
                <div className="flex gap-3">
                  <Button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-2 bg-gradient-to-r from-orange-400 to-red-500 text-white hover:from-orange-500 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {id ? 'Update' : 'Save'}
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => reset({
              receiptNumber: '',
              name: '',
              mobileNumber: '',
              donationType: 'food',
              time: '',
              fromDate: '',
              toDate: '',
              food: '',
              peoples: '',
              productName: '',
              quantity: '',
              amount: '',
              remarks: ''
            })}
                    className="px-6 py-2 text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Activity Logs Section */}
        {showLogs && id && (
          <Card className="shadow-xl border-0 overflow-hidden animate-fadeIn">
            <CardHeader className="bg-gradient-to-r from-blue-300 to-indigo-400 text-white py-5 px-6">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5" />
                <CardTitle className="text-lg font-bold">
                  Activity Log
                </CardTitle>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              {logsLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : logs.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {logs.map((log, index) => (
                    <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`p-2 rounded-lg ${
                            log.action === 'create' ? 'bg-green-100' :
                            log.action === 'update' ? 'bg-blue-100' :
                            'bg-red-100'
                          }`}>
                            {log.action === 'create' && <CheckCircle className="w-4 h-4 text-green-600" />}
                            {log.action === 'update' && <Save className="w-4 h-4 text-blue-600" />}
                            {log.action === 'delete' && <AlertCircle className="w-4 h-4 text-red-600" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                log.action === 'create' ? 'bg-green-100 text-green-800' :
                                log.action === 'update' ? 'bg-blue-100 text-blue-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {log.action === 'create' ? 'Created' :
                                 log.action === 'update' ? 'Updated' :
                                 'Deleted'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(log.created_at).toLocaleString()}
                              </span>
                            </div>
                            {log.details && (
                              <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No activity logs found</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Print Receipt Modal */}
        {showPrintPrompt && lastCreatedId != null && (
          <Modal
            title="Print Receipt?"
            onClose={() => setShowPrintPrompt(false)}
          >
            <div className="p-6">
              <div className="text-center mb-6">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
                <p className="text-gray-700 text-lg">
                  Entry saved! Open PDF receipt for printing?
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button 
                  className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setShowPrintPrompt(false)}
                >
                  Not Now
                </button>
                <button
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-orange-400 to-red-500 text-white hover:from-orange-500 hover:to-red-600 transition-all duration-200 shadow-md flex items-center gap-2"
                  onClick={() => {
                    const q = token ? `?token=${encodeURIComponent(token)}` : '';
                    const url = `http://localhost:4000/api/annadhanam/${lastCreatedId}/receipt.pdf${q}`;
                    window.open(url, '_blank');
                    setShowPrintPrompt(false);
                  }}
                >
                  <Printer className="w-4 h-4" />
                  Yes, Open
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
