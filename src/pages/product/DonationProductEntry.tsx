import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { donationService, DonationFormData } from '@/services/donationService';
import axios from 'axios';
import { getAuthToken } from '@/lib/auth';
import { DonationProductManager, DonationProduct } from '@/components/product/DonationProductManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const today = new Date().toISOString().slice(0, 10);
const initialState: DonationFormData = {
  registerNo: '',
  date: today,
  name: '',
  fatherName: '',
  address: '',
  village: '',
  phone: '',
  product: '',
  unit: '',
  reason: '',
};

interface ValidationErrors {
  name?: string;
  phone?: string;
  product?: string;
  unit?: string;
}

export default function DonationProductEntry() {
  const { token, user } = useAuth();
  const { language } = useLanguage();
  const [form, setForm] = useState<DonationFormData>(initialState);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [isError, setIsError] = useState<boolean>(false);
  const [products, setProducts] = useState<DonationProduct[]>([]);
  const [nextRegisterNo, setNextRegisterNo] = useState<string>('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Refs for navigation
  const dateRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const fatherNameRef = useRef<HTMLInputElement>(null);
  const villageRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLTextAreaElement>(null);
  const productRef = useRef<HTMLSelectElement>(null);
  const unitRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  // Navigation order
  const inputRefs = [
    dateRef,
    nameRef,
    phoneRef,
    fatherNameRef,
    villageRef,
    addressRef,
    productRef,
    unitRef,
    reasonRef
  ];

  const isEdit = false;

  // Translation helper
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  // Validation functions
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    // Required field validation
    if (!form.name.trim()) {
      newErrors.name = t('Name is required', 'பெயர் தேவை');
    }
    
    if (!form.phone.trim()) {
      newErrors.phone = t('Phone is required', 'கைபேசி தேவை');
    } else if (!/^[0-9]{10}$/.test(form.phone)) {
      newErrors.phone = t('Phone must be 10 digits', 'கைபேசி 10 இலக்கமாக இருக்க வேண்டும்');
    }
    
    if (!form.product.trim()) {
      newErrors.product = t('Product is required', 'பொருள் தேவை');
    }
    
    if (!form.unit.trim()) {
      newErrors.unit = t('Unit is required', 'அளவு தேவை');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateField = (fieldName: keyof ValidationErrors, value: string) => {
    const newErrors = { ...errors };
    
    switch (fieldName) {
      case 'name':
        if (!value.trim()) {
          newErrors.name = t('Name is required', 'பெயர் தேவை');
        } else {
          delete newErrors.name;
        }
        break;
      case 'phone':
        if (!value.trim()) {
          newErrors.phone = t('Phone is required', 'கைபேசி தேவை');
        } else if (!/^[0-9]{10}$/.test(value)) {
          newErrors.phone = t('Phone must be 10 digits', 'கைபேசி 10 இலக்கமாக இருக்க வேண்டும்');
        } else {
          delete newErrors.phone;
        }
        break;
      case 'product':
        if (!value.trim()) {
          newErrors.product = t('Product is required', 'பொருள் தேவை');
        } else {
          delete newErrors.product;
        }
        break;
      case 'unit':
        if (!value.trim()) {
          newErrors.unit = t('Unit is required', 'அளவு தேவை');
        } else {
          delete newErrors.unit;
        }
        break;
    }
    
    setErrors(newErrors);
  };

  // Handle input change with validation
  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    
    // Validate field if it has been touched
    if (touched[name]) {
      validateField(name as keyof ValidationErrors, value);
    }
  };

  // Handle field blur (mark as touched)
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name as keyof ValidationErrors, value);
  };

  // Handle Enter key navigation
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Find next focusable element
      let nextIndex = currentIndex + 1;
      while (nextIndex < inputRefs.length) {
        const nextRef = inputRefs[nextIndex];
        if (nextRef.current && !nextRef.current.disabled) {
          nextRef.current.focus();
          break;
        }
        nextIndex++;
      }
      
      // If reached end, focus on submit button or first field
      if (nextIndex >= inputRefs.length) {
        const submitButton = document.querySelector('[type="submit"]') as HTMLButtonElement;
        if (submitButton) {
          submitButton.focus();
        }
      }
    }
  };

  // Wrapper to match requested API name/signature
  const generateReceiptNo = async (_token: string) => {
    return await fetchNextRegisterNo();
  };

  const generateNextRegisterNo = () => {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const daysSince = Math.floor((Date.now() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${currentYear}-${String(daysSince).padStart(4, '0')}`;
  };

  // Centralized loader for next register number
  const fetchNextRegisterNo = async () => {
    try {
      const resp = await axios.get<any>('http://localhost:4000/api/donations/next-register-no', {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      const nextNo = resp.data?.nextRegisterNo || generateNextRegisterNo();
      return nextNo as string;
    } catch {
      return generateNextRegisterNo();
    }
  };

  useEffect(() => {
    const loadProducts = async () => {
      if (!user?.templeId) {
        console.error('Temple ID not found');
        setMessage(t('Temple ID not found. Please login again.', 'கோயில் ID கிடைக்கவில்லை. மீண்டும் உள்நுழையவும்'));
        setIsError(true);
        return;
      }

      try {
        const resp = await axios.get<{ data: DonationProduct[] }>(
          `http://localhost:4000/api/donation-products/${user.templeId}`,
          {
            headers: { Authorization: `Bearer ${getAuthToken()}` }
          }
        );
        const data = Array.isArray(resp.data) ? resp.data : resp.data.data || [];
        const validProducts = data.filter(p => p && p.id && p.label);
        setProducts(validProducts);
      } catch (error) { 
        console.error('Failed to load products:', error);
        setProducts([]);
        setMessage(t('Failed to load products', 'பொருட்களை ஏற்ற முடியவில்லை'));
        setIsError(true);
      }
    };
    
    const loadRegisterNo = async () => {
      const nextNo = await fetchNextRegisterNo();
      setNextRegisterNo(nextNo);
      setForm(prev => ({ ...prev, registerNo: nextNo }));
    };
    
    loadProducts();
    loadRegisterNo();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      setIsError(true);
      setMessage(t('Please fix the errors below', 'கீழே உள்ள பிழைகளை சரிசெய்யவும்'));
      return;
    }

    setSaving(true); 
    setMessage(undefined); 
    setIsError(false);
    
    try {
      await donationService.createDonation(token, form);
      const nextNo = await fetchNextRegisterNo();
      setNextRegisterNo(nextNo);
      setForm({ ...initialState, registerNo: nextNo });
      setErrors({});
      setTouched({});
      setMessage(t('Saved successfully','வெற்றிகரமாக சேமிக்கப்பட்டது'));
      
      // Focus on first input after successful save
      setTimeout(() => {
        nameRef.current?.focus();
      }, 100);
    } catch {
      setIsError(true);
      setMessage(t('Save failed','சேமிப்பில் தோல்வி'));
    } finally {
      setSaving(false);
    }
  };

  // Clear message after 2.5s and refresh receipt number for new entries
  useEffect(() => {
    if (message && !isError) {
      const timer = setTimeout(() => {
        setMessage(undefined);
        if (!isEdit) {
          generateReceiptNo(token)
            .then(receipt => setForm(prev => ({ ...prev, registerNo: receipt })))
            .catch(() => { /* ignore, initialState already applied */ });
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [message, isError, isEdit, token]);

  // Consistent field styling
  const fieldStyles = "text-lg py-3 px-4 h-12 border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-md w-full transition-all duration-200";
  const labelStyles = "block text-base font-medium mb-2 text-gray-700";
  const textareaStyles = "text-lg py-3 px-4 border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-md w-full transition-all duration-200 resize-none";

  // Error message component
  const ErrorMessage = ({ error }: { error?: string }) => {
    if (!error) return null;
    return (
      <p className="text-red-500 text-sm mt-1 flex items-center">
        <span className="mr-1">⚠</span>
        {error}
      </p>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 w-full">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="shadow-lg border-0 bg-white rounded-lg">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-6 px-6 rounded-t-lg">
            <CardTitle className="text-2xl font-bold text-center">
              {t('Donation Entry','பொருள் நன்கொடைக் பதிவு')}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Register Number and Product Manager */}
            <div className="flex items-center justify-between mb-6 bg-gray-50 p-4 rounded-lg">
              <div className="text-lg">
                <span className="font-semibold text-gray-600">{t('Register No','பதிவு எண்')}:</span>
                <span className="ml-2 text-gray-800 font-medium text-xl">{form.registerNo}</span>
              </div>
              {user?.templeId ? (
                <DonationProductManager 
                  products={products} 
                  setProducts={setProducts} 
                  templeId={user.templeId} 
                />
              ) : (
                <div className="text-red-500 text-sm">
                  {t('Temple ID not found. Please login again.', 'கோயில் ID கிடைக்கவில்லை. மீண்டும் உள்நுழையவும்')}
                </div>
              )}
            </div>

            {/* Message Display */}
            {message && (
              <div className={`mb-6 ${isError ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'} p-4 rounded-lg border flex items-center text-base`}>
                <span className={`mr-3 text-lg ${isError ? 'text-red-500' : 'text-green-500'}`}>
                  {isError ? '⚠' : '✓'}
                </span>
                {message}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-6">
              {/* Enhanced Grid Layout - All fields same size */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                
                {/* Date */}
                <div>
                  <Label className={labelStyles} htmlFor="date">
                    {t('Date','தேதி')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    ref={dateRef}
                    id="date"
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={onChange}
                    onKeyDown={(e) => handleKeyDown(e, 0)}
                    className={fieldStyles}
                  />
                </div>

                {/* Name */}
                <div className="md:col-span-2">
                  <Label className={labelStyles} htmlFor="name">
                    {t('Name','பெயர்')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    ref={nameRef}
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    onBlur={onBlur}
                    onKeyDown={(e) => handleKeyDown(e, 1)}
                    className={`${fieldStyles} ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                    placeholder={t('Enter name','பெயரை உள்ளிடவும்')}
                  />
                  <ErrorMessage error={errors.name} />
                </div>

                {/* Phone */}
                <div>
                  <Label className={labelStyles} htmlFor="phone">
                    {t('Phone','கைபேசி')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    ref={phoneRef}
                    id="phone"
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={onChange}
                    onBlur={onBlur}
                    onKeyDown={(e) => handleKeyDown(e, 2)}
                    inputMode="numeric"
                    maxLength={10}
                    onInput={(e) => {
                      const el = e.currentTarget as HTMLInputElement;
                      const cleaned = el.value.replace(/\D/g, '').slice(0, 10);
                      if (el.value !== cleaned) {
                        el.value = cleaned;
                        setForm(prev => ({ ...prev, phone: cleaned }));
                      }
                    }}
                    className={`${fieldStyles} ${errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                    placeholder={t('10 digits','10 இலக்கம்')}
                  />
                  <ErrorMessage error={errors.phone} />
                </div>

                {/* Father Name */}
                <div>
                  <Label className={labelStyles} htmlFor="fatherName">
                    {t('Father Name','தந்தை பெயர்')}
                  </Label>
                  <Input
                    ref={fatherNameRef}
                    id="fatherName"
                    name="fatherName"
                    value={form.fatherName}
                    onChange={onChange}
                    onKeyDown={(e) => handleKeyDown(e, 3)}
                    className={fieldStyles}
                    placeholder={t('Enter father name','தந்தை பெயரை உள்ளிடவும்')}
                  />
                </div>

                {/* Village */}
                <div>
                  <Label className={labelStyles} htmlFor="village">
                    {t('Village','ஊர்')}
                  </Label>
                  <Input
                    ref={villageRef}
                    id="village"
                    name="village"
                    value={form.village}
                    onChange={onChange}
                    onKeyDown={(e) => handleKeyDown(e, 4)}
                    className={fieldStyles}
                    placeholder={t('Enter village','ஊரை உள்ளிடவும்')}
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <Label className={labelStyles} htmlFor="address">
                    {t('Address','முகவரி')}
                  </Label>
                  <Textarea
                    ref={addressRef}
                    id="address"
                    name="address"
                    value={form.address}
                    onChange={onChange}
                    onKeyDown={(e) => handleKeyDown(e, 5)}
                    rows={3}
                    className={textareaStyles}
                    placeholder={t('Enter address','முகவரியை உள்ளிடவும்')}
                  />
                </div>

                {/* Product */}
                <div>
                  <Label className={labelStyles} htmlFor="product">
                    {t('Product','பொருள்')} <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <select
                      ref={productRef}
                      id="product"
                      name="product"
                      value={form.product}
                      onChange={(e) => {
                        const val = e.target.value;
                        const sel = products.find(p => p && (p.value === val || p.label === val));
                        setForm(prev => ({ ...prev, product: val, unit: sel?.unit || '' }));
                        if (touched.product) {
                          validateField('product', val);
                        }
                      }}
                      onBlur={onBlur}
                      onKeyDown={(e) => handleKeyDown(e, 6)}
                      className={`${fieldStyles} appearance-none pr-10 bg-white ${errors.product ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                    >
                      <option value="">{t('Select Product','பொருள் தேர்வு')}</option>
                      {products.filter(p => p && p.id && p.label).map(p => 
                        <option key={p.id} value={p.value || p.label}>{p.label}</option>
                      )}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <ErrorMessage error={errors.product} />
                </div>

                {/* Unit */}
                <div>
                  <Label className={labelStyles} htmlFor="unit">
                    {t('Unit','அளவு')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    ref={unitRef}
                    id="unit"
                    name="unit"
                    value={form.unit}
                    onChange={onChange}
                    onBlur={onBlur}
                    onKeyDown={(e) => handleKeyDown(e, 7)}
                    className={`${fieldStyles} ${errors.unit ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
                    placeholder={t('Enter unit','அளவை உள்ளிடவும்')}
                  />
                  <ErrorMessage error={errors.unit} />
                </div>

                {/* Reason - Full width */}
                <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
                  <Label className={labelStyles} htmlFor="reason">
                    {t('Reason','காரணம்')}
                  </Label>
                  <Textarea
                    ref={reasonRef}
                    id="reason"
                    name="reason"
                    value={form.reason}
                    onChange={onChange}
                    onKeyDown={(e) => handleKeyDown(e, 8)}
                    rows={3}
                    className={textareaStyles}
                    placeholder={t('Enter reason','காரணத்தை உள்ளிடவும்')}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 justify-between items-center pt-6 border-t border-gray-200">
                <div className="flex gap-3">
                  {/* Keyboard shortcut hint */}
                  <div className="text-sm text-gray-500 hidden md:flex items-center">
                    <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">Enter</kbd>
                    <span className="ml-2">{t('to navigate', 'என்று நகர்ந்து செல்ல')}</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="default"
                    className="px-6 py-2 text-sm border hover:bg-gray-50 rounded-md"
                    onClick={async () => {
                      const nextNo = await fetchNextRegisterNo();
                      setNextRegisterNo(nextNo);
                      setForm({ ...initialState, registerNo: nextNo });
                      setErrors({});
                      setTouched({});
                      setTimeout(() => dateRef.current?.focus(), 100);
                    }}
                    disabled={saving}
                  >
                    {t('Clear','அழி')}
                  </Button>
                  <Button 
                    type="submit" 
                    size="default"
                    className="px-6 py-2 text-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-md"
                    disabled={saving}
                  >
                    {saving ? t('Saving...','சேமிக்கிறது...') : t('Save','சேமி')}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
