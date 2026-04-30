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
  Loader2,
  Search,
  Plus,
  ChevronDown,
  IndianRupee
} from 'lucide-react';

// Custom hook for Enter key - focus save button
const useEnterKeyNavigation = () => {
  const formRef = useRef<HTMLFormElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    const tag = t.tagName?.toLowerCase();
    if (!tag || ['button', 'textarea'].includes(tag)) return;
    e.preventDefault();
    const submitButton = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (submitButton) {
      submitButton.focus();
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
  const { token, user } = useAuth();
  const { language } = useLanguage();
  const { formRef, handleKeyDown } = useEnterKeyNavigation();

  // Dual language helper: t(english, tamil)
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<AnnadhanamFormData>({
    defaultValues: {
      time: (() => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      })()
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);
  const [logs, setLogs] = useState<AnnadhanamLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  // Master data states
  const [foodItems, setFoodItems] = useState<Array<{ id: number; name: string }>>([]);
  const [productNames, setProductNames] = useState<Array<{ id: number; name: string }>>([]);
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showFoodDropdown, setShowFoodDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [isAddingNewFood, setIsAddingNewFood] = useState(false);
  const [isAddingNewProduct, setIsAddingNewProduct] = useState(false);
  const [addingFoodName, setAddingFoodName] = useState<string | null>(null);
  const [addingProductName, setAddingProductName] = useState<string | null>(null);

  const foodInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);
  const foodDropdownRef = useRef<HTMLDivElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);

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
      const resp = await fetch('https://templeapi.agniplay.com/api/annadhanam/next-receipt', {
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
      const response = await fetch(`https://templeapi.agniplay.com/api/annadhanam/${id}/logs`, {
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
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    setValue('fromDate', today);
    setValue('toDate', today);
    setValue('time', time);
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
          const response = await fetch(`https://templeapi.agniplay.com/api/annadhanam/${id}`, {
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
            setFoodSearchQuery(food);
            setProductSearchQuery(productName);
            setLastCreatedId(Number(id));
          } else {
            throw new Error(result.error || 'Failed to load data');
          }
        } catch (error) {
          console.error('Error fetching annadhanam data:', error);
          toast({
            title: t('Error', 'பிழை'),
            description: t('Failed to load annadhanam data', 'அன்னதானத் தரவை ஏற்றவில்லை'),
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

  // Load master data
  useEffect(() => {
    const loadMasterData = async () => {
      if (!user?.templeId || !token) return;

      try {
        // Load food items
        const foodResponse = await fetch(
          `https://templeapi.agniplay.com/api/master/food-items/${user.templeId}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (foodResponse.ok) {
          const foodData = await foodResponse.json();
          setFoodItems(Array.isArray(foodData) ? foodData : []);
        }

        // Load product names
        const productResponse = await fetch(
          `https://templeapi.agniplay.com/api/master/product-names/${user.templeId}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (productResponse.ok) {
          const productData = await productResponse.json();
          setProductNames(Array.isArray(productData) ? productData : []);
        }
      } catch (error) {
        console.error('Error loading master data:', error);
      }
    };

    loadMasterData();
  }, [user?.templeId, token]);

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (foodDropdownRef.current && !foodDropdownRef.current.contains(event.target as Node)) {
        setShowFoodDropdown(false);
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">{t('Loading...', 'ஏற்றுகிறது...')}</p>
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

      const url = id ? `https://templeapi.agniplay.com/api/annadhanam/${id}` : 'https://templeapi.agniplay.com/api/annadhanam';
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
          description: t('Data saved successfully', 'தரவு வெற்றிகரமாக சேமிக்கப்பட்டது'),
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
            const now = new Date();
            const today = now.toISOString().slice(0, 10);
            const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

            reset({
              receiptNumber: '',
              name: '',
              mobileNumber: '',
              donationType: 'food',
              time: time,
              fromDate: today,
              toDate: today,
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
        title: t('Error', 'பிழை'),
        description: t('Failed to submit annadhanam form', 'அன்னதான படிவத்தை சமர்ப்பிக்கவில்லை'),
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

  // Search food items
  const searchFoodItems = async (query: string) => {
    if (!user?.templeId || !token) return;

    try {
      const response = await fetch(
        `https://templeapi.agniplay.com/api/master/food-items/${user.templeId}/search?q=${encodeURIComponent(query)}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (response.ok) {
        const result = await response.json();
        setFoodItems(result.data || []);
      }
    } catch (error) {
      console.error('Error searching food items:', error);
    }
  };

  // Search product names
  const searchProductNames = async (query: string) => {
    if (!user?.templeId || !token) return;

    try {
      const response = await fetch(
        `https://templeapi.agniplay.com/api/master/product-names/${user.templeId}/search?q=${encodeURIComponent(query)}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (response.ok) {
        const result = await response.json();
        setProductNames(result.data || []);
      }
    } catch (error) {
      console.error('Error searching product names:', error);
    }
  };

  // Add new food item to master
  const addNewFoodItem = async (name: string) => {
    if (!user?.templeId || !token || !name.trim()) return;

    setAddingFoodName(name);
    try {
      const response = await fetch('https://templeapi.agniplay.com/api/master/food-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: name.trim(), templeId: user.templeId })
      });

      if (response.ok) {
        const result = await response.json();
        setFoodItems(prev => [...prev, result.data]);
        setValue('food', name.trim(), { shouldValidate: true });
        setFoodSearchQuery(name.trim());
        setShowFoodDropdown(false);
        setIsAddingNewFood(false);
        toast({
          title: t('Success', 'வெற்றி'),
          description: t(`"${name}" added to master data`, `"${name}" முதன்மை தரவில் சேர்க்கப்பட்டது`),
          className: 'bg-green-50 border-green-200'
        });
      }
    } catch (error) {
      console.error('Error adding food item:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: t('Failed to add food item', 'உணவுப் பொருளைச் சேர்க்கவில்லை'),
        variant: 'destructive'
      });
    } finally {
      setAddingFoodName(null);
    }
  };

  // Add new product name to master
  const addNewProductName = async (name: string) => {
    if (!user?.templeId || !token || !name.trim()) return;

    setAddingProductName(name);
    try {
      const response = await fetch('https://templeapi.agniplay.com/api/master/product-names', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: name.trim(), templeId: user.templeId })
      });

      if (response.ok) {
        const result = await response.json();
        setProductNames(prev => [...prev, result.data]);
        setValue('productName', name.trim(), { shouldValidate: true });
        setProductSearchQuery(name.trim());
        setShowProductDropdown(false);
        setIsAddingNewProduct(false);
        toast({
          title: t('Success', 'வெற்றி'),
          description: t(`"${name}" added to master data`, `"${name}" முதன்மை தரவில் சேர்க்கப்பட்டது`),
          className: 'bg-green-50 border-green-200'
        });
      }
    } catch (error) {
      console.error('Error adding product name:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: t('Failed to add product name', 'பொருள் பெயரைச் சேர்க்கவில்லை'),
        variant: 'destructive'
      });
    } finally {
      setAddingProductName(null);
    }
  };

  const getDonationTypeIcon = () => {
    switch (donationType) {
      case 'food': return <Coffee className="w-5 h-5" />;
      case 'product': return <Package className="w-5 h-5" />;
      case 'money': return <DollarSign className="w-5 h-5" />;
      default: return null;
    }
  };

  return (
    <div className={pageContainerStyles.container}>
      <div className={cn(pageContainerStyles.content, "max-w-6xl")}>
        {/* Main Form Card */}
        <Card className={formFieldStyles.card.container}>
          <CardHeader className={theme.header.container}>
            <div className={theme.header.contentSpacing}>
              <CardTitle className={theme.header.main}>
                {t('Annadhanam Details', 'அன்னதான விவரங்கள்')}
              </CardTitle>

            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form ref={formRef} onSubmit={handleSubmit(onSubmit, (errors) => {
              console.log('Validation errors:', errors);
              toast({
                title: t('Validation Error', 'சரிபார்ப்பு பிழை'),
                description: t('Please fill in all required fields', 'தயவுசெய்து அனைத்து கட்டாய புலங்களையும் நிரப்பவும்'),
                variant: 'destructive'
              });
            })} onKeyDown={handleKeyDown}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Receipt Number */}
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="receiptNumber"
                    className={cn(theme.input.base, theme.input.size.md, "pl-10 bg-gray-50")}
                    readOnly
                    {...register('receiptNumber')}
                    placeholder={t('Receipt No.', 'ரசீது எண்.')}
                  />
                </div>

                {/* Time */}
                <div>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="time"
                      type="time"
                      className={cn(theme.input.base, theme.input.size.md, `pl-10 ${errors.time ? 'border-red-500' : ''}`, '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer')}
                      {...register('time', { required: t('Time is required', 'நேரம் கட்டாயம்') })}
                      onClick={(e) => (e.target as any).showPicker?.()}
                      placeholder={t('Time *', 'நேரம் *')}
                    />
                  </div>
                  {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time.message}</p>}
                </div>

                {/* Name */}
                <div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="name"
                      autoFocus
                      className={cn(theme.input.base, theme.input.size.md, `pl-10 ${errors.name ? 'border-red-500' : ''}`)}
                      {...register('name', { required: t('Name is required', 'பெயர் கட்டாயம்') })}
                      onChange={(e) => {
                        const val = e.target.value;
                        setValue('name', val ? val.replace(/\b\w/g, (char) => char.toUpperCase()) : val, { shouldValidate: true });
                      }}
                      placeholder={t('Name *', 'பெயர் *')}
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
                      className={cn(theme.input.base, theme.input.size.md, `pl-10 ${errors.mobileNumber ? 'border-red-500' : ''}`)}
                      {...register('mobileNumber', {
                        required: t('Mobile number is required', 'கைபேசி எண் கட்டாயம்'),
                        pattern: {
                          value: /^[0-9]{10}$/,
                          message: t('Please enter a valid 10-digit mobile number', 'தயவுசெய்து சரியான 10 இலக்க கைபேசி எண்ணை உள்ளிடவும்')
                        }
                      })}
                      placeholder={t('Mobile *', 'கைபேசி *')}
                    />
                  </div>
                  {errors.mobileNumber && <p className="text-red-500 text-xs mt-1">{errors.mobileNumber.message}</p>}
                </div>

                {/* Date */}
                <div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="fromDate"
                      type="date"
                      className={cn(theme.input.base, theme.input.size.md, `pl-10 ${errors.fromDate ? 'border-red-500' : ''}`, '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer')}
                      {...register('fromDate', { required: t('Date is required', 'தேதி கட்டாயம்') })}
                      placeholder={t('Date *', 'தேதி *')}
                    />
                  </div>
                  {errors.fromDate && <p className="text-red-500 text-xs mt-1">{errors.fromDate.message}</p>}
                </div>

                {/* Donation Type */}
                <div>
                  <div className="relative">
                    <select
                      id="donationType"
                      className={cn(theme.select.base, theme.select.size.md, `w-full ${errors.donationType ? 'border-red-500' : ''}`)}
                      {...register('donationType', { required: t('Donation type is required', 'நன்கொடை வகை கட்டாயம்') })}
                      defaultValue="food"
                    >
                      <option value="food">{t('Food Donation', 'உணவு நன்கொடை')}</option>
                      <option value="product">{t('Product Donation', 'பொருள் நன்கொடை')}</option>
                      <option value="money">{t('Money Donation', 'பண நன்கொடை')}</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {donationType === 'food' && <Coffee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500" />}
                    {donationType === 'product' && <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-500" />}
                    {donationType === 'money' && <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />}
                  </div>
                  {errors.donationType && <p className="text-red-500 text-xs mt-1">{errors.donationType.message}</p>}
                </div>

                {/* Dynamic Fields Based on Donation Type */}
                {watch('donationType') === 'food' && (
                  <>
                    <div className="relative" ref={foodDropdownRef}>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          ref={foodInputRef}
                          type="text"
                          className={cn(
                            theme.input.base,
                            theme.input.size.md,
                            "pl-10 pr-10 w-full",
                            errors.food ? 'border-red-500' : ''
                          )}
                          value={foodSearchQuery}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFoodSearchQuery(val);
                            setValue('food', val, { shouldValidate: true });
                            if (val.length > 0) {
                              searchFoodItems(val);
                              setShowFoodDropdown(true);
                            } else {
                              setShowFoodDropdown(false);
                            }
                          }}
                          onFocus={() => {
                            if (foodItems.length > 0 || foodSearchQuery.length > 0) {
                              setShowFoodDropdown(true);
                            }
                          }}
                          placeholder={t('Food Items *', 'உணவுப் பொருட்கள் *')}
                        />
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>

                      {/* Food Items Dropdown */}
                      {showFoodDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                          {foodItems.length > 0 ? (
                            <>
                              {foodItems.map((item) => (
                                <div
                                  key={item.id}
                                  className="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-700"
                                  onClick={() => {
                                    setValue('food', item.name, { shouldValidate: true });
                                    setFoodSearchQuery(item.name);
                                    setShowFoodDropdown(false);
                                  }}
                                >
                                  {item.name}
                                </div>
                              ))}
                              {foodSearchQuery && !foodItems.some(i => i.name?.toLowerCase() === foodSearchQuery.toLowerCase()) && (
                                <div
                                  className={`px-4 py-2 cursor-pointer text-sm border-t border-gray-100 flex items-center gap-2 ${addingFoodName === foodSearchQuery
                                    ? 'bg-green-100 text-green-800'
                                    : 'hover:bg-green-50 text-green-700'
                                    }`}
                                  onClick={() => !addingFoodName && addNewFoodItem(foodSearchQuery)}
                                >
                                  {addingFoodName === foodSearchQuery ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      {t(`Adding "${foodSearchQuery}"...`, `"${foodSearchQuery}" சேர்க்கப்படுகிறது...`)}
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-4 h-4" />
                                      {t(`Add "${foodSearchQuery}" to master`, `"${foodSearchQuery}" ஐ முதன்மை தரவில் சேர்க்க`)}
                                    </>
                                  )}
                                </div>
                              )}
                            </>
                          ) : foodSearchQuery ? (
                            <div
                              className="px-4 py-2 hover:bg-green-50 cursor-pointer text-sm text-green-700 flex items-center gap-2"
                              onClick={() => addNewFoodItem(foodSearchQuery)}
                            >
                              <Plus className="w-4 h-4" />
                              {t(`Add "${foodSearchQuery}" to master`, `"${foodSearchQuery}" ஐ முதன்மை தரவில் சேர்க்க`)}
                            </div>
                          ) : (
                            <div className="px-4 py-2 text-sm text-gray-500">
                              {t('Type to search or add new food item', 'தேட அல்லது புதிய உணவுப் பொருளைச் சேர்க்க தட்டச்சு செய்யவும்')}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Hidden input for form validation */}
                      <input
                        type="hidden"
                        {...register('food', { required: t('Food items is required', 'உணவுப் பொருட்கள் கட்டாயம்') })}
                      />
                      {errors.food && <p className="text-red-500 text-xs mt-1">{errors.food.message}</p>}
                    </div>
                    <div>
                      <Input
                        id="peoples"
                        type="number"
                        className={cn(theme.input.base, theme.input.size.md, `border ${errors.peoples ? 'border-red-500' : ''}`)}
                        {...register('peoples', {
                          required: t('People count is required', 'மக்கள் எண்ணிக்கை கட்டாயம்'),
                          min: { value: 1, message: t('Number must be at least 1', 'எண் குறைந்தது 1 ஆக இருக்க வேண்டும்') }
                        })}
                        placeholder={t('People Count *', 'மக்கள் எண்ணிக்கை *')}
                        min="1"
                      />
                      {errors.peoples && <p className="text-red-500 text-xs mt-1">{errors.peoples.message}</p>}
                    </div>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="remarks"
                        className={cn(theme.input.base, theme.input.size.md, "pl-10")}
                        {...register('remarks')} onChange={(e) => { const val = e.target.value; setValue('remarks', val ? val.replace(/\b\w/g, (char) => char.toUpperCase()) : val, { shouldValidate: true }); }}
                        placeholder={t('Remarks', 'குறிப்புகள்')}
                      />
                    </div>
                  </>
                )}

                {watch('donationType') === 'product' && (
                  <>
                    <div className="relative" ref={productDropdownRef}>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          ref={productInputRef}
                          type="text"
                          className={cn(
                            theme.input.base,
                            theme.input.size.md,
                            "pl-10 pr-10 w-full",
                            errors.productName ? 'border-red-500' : ''
                          )}
                          value={productSearchQuery}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProductSearchQuery(val);
                            setValue('productName', val, { shouldValidate: true });
                            if (val.length > 0) {
                              searchProductNames(val);
                              setShowProductDropdown(true);
                            } else {
                              setShowProductDropdown(false);
                            }
                          }}
                          onFocus={() => {
                            if (productNames.length > 0 || productSearchQuery.length > 0) {
                              setShowProductDropdown(true);
                            }
                          }}
                          placeholder={t('Product Name *', 'பொருள் பெயர் *')}
                        />
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>

                      {/* Product Names Dropdown */}
                      {showProductDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                          {productNames.length > 0 ? (
                            <>
                              {productNames.map((item) => (
                                <div
                                  key={item.id}
                                  className="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-700"
                                  onClick={() => {
                                    setValue('productName', item.name, { shouldValidate: true });
                                    setProductSearchQuery(item.name);
                                    setShowProductDropdown(false);
                                  }}
                                >
                                  {item.name}
                                </div>
                              ))}
                              {productSearchQuery && !productNames.some(i => i.name?.toLowerCase() === productSearchQuery.toLowerCase()) && (
                                <div
                                  className={`px-4 py-2 cursor-pointer text-sm border-t border-gray-100 flex items-center gap-2 ${addingProductName === productSearchQuery
                                    ? 'bg-green-100 text-green-800'
                                    : 'hover:bg-green-50 text-green-700'
                                    }`}
                                  onClick={() => !addingProductName && addNewProductName(productSearchQuery)}
                                >
                                  {addingProductName === productSearchQuery ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      {t(`Adding "${productSearchQuery}"...`, `"${productSearchQuery}" சேர்க்கப்படுகிறது...`)}
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-4 h-4" />
                                      {t(`Add "${productSearchQuery}" to master`, `"${productSearchQuery}" ஐ முதன்மை தரவில் சேர்க்க`)}
                                    </>
                                  )}
                                </div>
                              )}
                            </>
                          ) : productSearchQuery ? (
                            <div
                              className="px-4 py-2 hover:bg-green-50 cursor-pointer text-sm text-green-700 flex items-center gap-2"
                              onClick={() => addNewProductName(productSearchQuery)}
                            >
                              <Plus className="w-4 h-4" />
                              {t(`Add "${productSearchQuery}" to master`, `"${productSearchQuery}" ஐ முதன்மை தரவில் சேர்க்க`)}
                            </div>
                          ) : (
                            <div className="px-4 py-2 text-sm text-gray-500">
                              {t('Type to search or add new product', 'தேட அல்லது புதிய பொருளைச் சேர்க்க தட்டச்சு செய்யவும்')}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Hidden input for form validation */}
                      <input
                        type="hidden"
                        {...register('productName', { required: t('Product name is required', 'பொருள் பெயர் கட்டாயம்') })}
                      />
                      {errors.productName && <p className="text-red-500 text-xs mt-1">{errors.productName.message}</p>}
                    </div>
                    <div>
                      <Input
                        id="quantity"
                        type="number"
                        className={cn(theme.input.base, theme.input.size.md, `${errors.quantity ? 'border-red-500' : ''}`)}
                        {...register('quantity', { required: t('Quantity is required', 'அளவு கட்டாயம்'), min: { value: 0.001, message: t('Quantity must be greater than 0', 'அளவு 0 ஐ விட அதிகமாக இருக்க வேண்டும்') } })}
                        placeholder={t('Quantity *', 'அளவு *')}
                        min="0"
                        step="any"
                      />
                      {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
                    </div>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="remarks"
                        className={cn(theme.input.base, theme.input.size.md, "pl-10")}
                        {...register('remarks')} onChange={(e) => { const val = e.target.value; setValue('remarks', val ? val.replace(/\b\w/g, (char) => char.toUpperCase()) : val, { shouldValidate: true }); }}
                        placeholder={t('Remarks', 'குறிப்புகள்')}
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
                        className={cn(theme.input.base, theme.input.size.md, `${errors.amount ? 'border-red-500' : ''}`)}
                        {...register('amount', { required: t('Amount is required', 'தொகை கட்டாயம்'), min: { value: 1, message: t('Amount must be at least Rs1', 'தொகை குறைந்தது ₹1 ஆக இருக்க வேண்டும்') } })}
                        placeholder={t('Amount (Rs) *', 'தொகை (₹) *')}
                        min="1"
                      />
                      {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
                    </div>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="remarks"
                        className={cn(theme.input.base, theme.input.size.md, "pl-10")}
                        {...register('remarks')} onChange={(e) => { const val = e.target.value; setValue('remarks', val ? val.replace(/\b\w/g, (char) => char.toUpperCase()) : val, { shouldValidate: true }); }}
                        placeholder={t('Remarks', 'குறிப்புகள்')}
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
                        {t('Saving...', 'சேமிக்கிறது...')}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {id ? t('Update', 'புதுப்பி') : t('Save', 'சேமி')}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
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
                      setFoodSearchQuery('');
                      setProductSearchQuery('');
                      setShowFoodDropdown(false);
                      setShowProductDropdown(false);
                    }}
                    className="px-6 py-2 text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t('Clear', 'அழி')}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Activity Logs Section */}
        {showLogs && id && (
          <Card className="shadow-xl border-0 overflow-hidden animate-fadeIn">
            <CardHeader className={theme.card.header}>
              <div className={cn(theme.header.contentSpacing)}>
                <History className={theme.header.icon} />
                <CardTitle className={theme.header.secondary}>
                  {t('Activity Log', 'செயல்பாடு பதிவு')}
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
                          <div className={`p-2 rounded-lg ${log.action === 'create' ? 'bg-green-100' :
                            log.action === 'update' ? 'bg-blue-100' :
                              'bg-red-100'
                            }`}>
                            {log.action === 'create' && <CheckCircle className="w-4 h-4 text-green-600" />}
                            {log.action === 'update' && <Save className="w-4 h-4 text-blue-600" />}
                            {log.action === 'delete' && <AlertCircle className="w-4 h-4 text-red-600" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${log.action === 'create' ? 'bg-green-100 text-green-800' :
                                log.action === 'update' ? 'bg-blue-100 text-blue-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                {log.action === 'create' ? t('Created', 'உருவாக்கப்பட்டது') :
                                  log.action === 'update' ? t('Updated', 'புதுப்பிக்கப்பட்டது') :
                                    t('Deleted', 'நீக்கப்பட்டது')}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(log.created_at).toLocaleString(language === 'tamil' ? 'ta-IN' : 'en-US')}
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
                  <p className="text-gray-500">{t('No activity logs found', 'செயல்பாடு பதிவுகள் எதுவும் கிடைக்கவில்லை')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Direct Download Helper */}
        {(() => {
          const handleDownloadReceipt = async (annadhanamId: number) => {
            try {
              const response = await fetch(`https://templeapi.agniplay.com/api/annadhanam/${annadhanamId}/receipt.pdf`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (!response.ok) {
                throw new Error('Failed to fetch receipt');
              }

              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `receipt-${annadhanamId}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            } catch (error) {
              console.error("Error downloading receipt:", error);
              alert(t("Failed to download receipt. Please try again.", "ரசீதைப் பதிவிறக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
            }
          };

          (window as any).annadhanamHandleDownloadReceipt = handleDownloadReceipt;
          return null;
        })()}

        {/* Print Receipt Modal */}
        {showPrintPrompt && lastCreatedId != null && (
          <Modal
            title={t('Print Receipt?', 'ரசீதை அச்சிடவா?')}
            onClose={() => setShowPrintPrompt(false)}
          >
            <div className="p-6">
              <div className="text-center mb-6">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
                <p className="text-gray-700 text-lg">
                  {t('Entry saved! Open PDF receipt for printing?', 'பதிவு சேமிக்கப்பட்டது! அச்சிடுவதற்கு PDF ரசீதைத் திறக்கவா?')}
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setShowPrintPrompt(false)}
                >
                  {t('Not Now', 'இப்போது வேண்டாம்')}
                </button>
                <button
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-orange-400 to-red-500 text-white hover:from-orange-500 hover:to-red-600 transition-all duration-200 shadow-md flex items-center gap-2"
                  onClick={() => {
                    (window as any).annadhanamHandleDownloadReceipt(lastCreatedId);
                    setShowPrintPrompt(false);
                  }}
                >
                  <Printer className="w-4 h-4" />
                  {t('Yes, Open', 'ஆம், திற')}
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