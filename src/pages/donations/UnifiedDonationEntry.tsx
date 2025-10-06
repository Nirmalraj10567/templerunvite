import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { moneyDonationService, MoneyDonationFormData } from '@/services/moneyDonationService';
import { donationService, DonationFormData } from '@/services/donationService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Modal } from '@/components/ui/modal';
import { ledgerService } from '@/services/ledgerService';
import { journalService } from '@/services/journalService';
import { DonationProductManager, DonationProduct } from '@/components/product/DonationProductManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import axios from 'axios';
import { getAuthToken } from '@/lib/auth';

// Money Donation Types
const createMoneyDonationState = (): MoneyDonationFormData => ({
  registerNo: '',
  date: new Date().toISOString().slice(0,10),
  name: '',
  fatherName: '',
  address: '',
  village: '',
  phone: '',
  amount: '',
  reason: '',
  transferTo: 'INCOME A/C'
});

// Product Donation Types
const today = new Date().toISOString().slice(0, 10);
const createProductDonationState = (): DonationFormData => ({
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
});

interface ValidationErrors {
  name?: string;
  phone?: string;
  product?: string;
  unit?: string;
  amount?: string;
}

export default function UnifiedDonationEntry() {
  const { token, user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editIdParam = searchParams.get('editId');
  const editId = editIdParam ? Number(editIdParam) : null;
  const isEdit = typeof editId === 'number' && !isNaN(editId);

  // Tab state
  const [activeTab, setActiveTab] = useState<'money' | 'product'>('money');

  // Money donation state
  const [moneyForm, setMoneyForm] = useState<MoneyDonationFormData>(createMoneyDonationState());
  const [accounts, setAccounts] = useState<Array<{ id?: number; value: string; label: string }>>([]);

  // Product donation state
  const [productForm, setProductForm] = useState<DonationFormData>(createProductDonationState());
  const [products, setProducts] = useState<DonationProduct[]>([]);
  const [nextRegisterNo, setNextRegisterNo] = useState<string>('');
  const [availableUnits, setAvailableUnits] = useState<string[]>([]);
  const [showUnitDropdown, setShowUnitDropdown] = useState<boolean>(false);

  // Common state
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string|undefined>();
  const [isError, setIsError] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Refs
  const formRef = useRef<HTMLFormElement>(null);
  const moneyFormRef = useRef<HTMLFormElement>(null);
  const productFormRef = useRef<HTMLFormElement>(null);
  const unitInputRef = useRef<HTMLInputElement>(null);

  // Approval logs state
  interface ApprovalLog {
    id: number;
    action: string;
    performed_by?: number;
    performed_at: string;
    notes?: string;
    old_status?: string;
    new_status?: string;
    performed_by_name?: string;
  }
  const [approvalLogs, setApprovalLogs] = useState<ApprovalLog[]>([]);

  // Auto-hide success messages after 4 seconds
  const messageTimeoutRef = React.useRef<number | null>(null);
  useEffect(() => {
    if (!message) return;
    if (!isError) {
      if (messageTimeoutRef.current) window.clearTimeout(messageTimeoutRef.current);
      messageTimeoutRef.current = window.setTimeout(() => setMessage(undefined), 4000);
      return () => {
        if (messageTimeoutRef.current) {
          window.clearTimeout(messageTimeoutRef.current);
          messageTimeoutRef.current = null;
        }
      };
    }
  }, [message, isError]);

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        window.clearTimeout(messageTimeoutRef.current);
        messageTimeoutRef.current = null;
      }
    };
  }, []);

  // Click outside handler for unit dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (unitInputRef.current && !unitInputRef.current.contains(target)) {
        setShowUnitDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const t = (en: string, ta: string) => language === 'english' ? ta : en;

  // Helper function to show success messages in modal
  const showSuccessAlert = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
    setTimeout(() => {
      setShowSuccessModal(false);
      setSuccessMessage('');
    }, 4000);
  };

  // Function to refresh journal after money donation operations
  const refreshJournal = async () => {
    try {
      await fetch('https://tmsapi.xesstechlink.com/api/journal/sync-pooja', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (e) {
      console.error('Failed to sync journal logs:', e);
    }
  };

  // Money Donation Handlers
  const onMoneyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMoneyForm(prev => ({ ...prev, [name]: value }));
  };

  // Product Donation Handlers
  const onProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProductForm(prev => ({ ...prev, [name]: value }));
    
    if (name === 'product') {
      const selectedProduct = products.find(p => p && (p.value === value || p.label === value));
      setProductForm(prev => ({ ...prev, unit: selectedProduct?.unit || '' }));
    }
    
    if (name === 'unit') {
      // Update available units if user enters a new unit
      if (value && !availableUnits.includes(value)) {
        setAvailableUnits(prev => [...prev, value].sort());
      }
    }
    
    if (touched[name]) {
      validateField(name as keyof ValidationErrors, value);
    }
  };

  const onProductBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name as keyof ValidationErrors, value);
  };

  // Validation functions
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    if (activeTab === 'money') {
      if (!moneyForm.name.trim()) {
        newErrors.name = t('Name is required', 'பெயர் தேவை');
      }
      if (!moneyForm.phone.trim()) {
        newErrors.phone = t('Phone is required', 'கைபேசி தேவை');
      } else if (!/^[0-9]{10}$/.test(moneyForm.phone)) {
        newErrors.phone = t('Phone must be 10 digits', 'கைபேசி 10 இலக்கமாக இருக்க வேண்டும்');
      }
      if (!moneyForm.amount || isNaN(Number(moneyForm.amount)) || Number(moneyForm.amount) <= 0) {
        newErrors.amount = t('Enter a valid amount greater than 0', '0-ஐ விட அதிகமான செல்லுபடியான தொகையை உள்ளிடவும்');
      }
    } else {
      if (!productForm.name.trim()) {
        newErrors.name = t('Name is required', 'பெயர் தேவை');
      }
      if (!productForm.phone.trim()) {
        newErrors.phone = t('Phone is required', 'கைபேசி தேவை');
      } else if (!/^[0-9]{10}$/.test(productForm.phone)) {
        newErrors.phone = t('Phone must be 10 digits', 'கைபேசி 10 இலக்கமாக இருக்க வேண்டும்');
      }
      if (!productForm.product.trim()) {
        newErrors.product = t('Product is required', 'பொருள் தேவை');
      }
      if (!productForm.unit.trim()) {
        newErrors.unit = t('Unit is required', 'அளவு தேவை');
      }
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
      case 'amount':
        if (!value || isNaN(Number(value)) || Number(value) <= 0) {
          newErrors.amount = t('Enter a valid amount greater than 0', '0-ஐ விட அதிகமான செல்லுபடியான தொகையை உள்ளிடவும்');
        } else {
          delete newErrors.amount;
        }
        break;
    }
    
    setErrors(newErrors);
  };

  // Handle Enter key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      const currentForm = activeTab === 'money' ? moneyFormRef.current : productFormRef.current;
      if (!currentForm) return;
      
      const focusableElements = currentForm.querySelectorAll(
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

  // Load accounts for money donations
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        let names: string[] = [];
        try {
          names = await journalService.getAccounts();
        } catch {
          names = await ledgerService.getNames();
        }
        const mapped = (names || []).map((n: string, idx: number) => ({ id: idx + 1, value: n, label: n }));
        setAccounts(mapped);
      } catch (e) {
        console.error('Failed to load ledger names', e);
        setAccounts([]);
      }
    };
    loadAccounts();
  }, []);

  // Extract unique units from products
  const extractUnits = (products: DonationProduct[]) => {
    const units = products
      .filter(p => p && p.unit && p.unit.trim())
      .map(p => p.unit!.trim())
      .filter((unit, index, arr) => arr.indexOf(unit) === index) // Remove duplicates
      .sort();
    return units;
  };

  // Load products for product donations
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
          `https://tmsapi.xesstechlink.com/api/donation-products/${user.templeId}`,
          {
            headers: { Authorization: `Bearer ${getAuthToken()}` }
          }
        );
        const data = Array.isArray(resp.data) ? resp.data : resp.data.data || [];
        const validProducts = data.filter(p => p && p.id && p.label);
        setProducts(validProducts);
        
        // Extract and set available units
        const units = extractUnits(validProducts);
        setAvailableUnits(units);
      } catch (error) { 
        console.error('Failed to load products:', error);
        setProducts([]);
        setAvailableUnits([]);
        setMessage(t('Failed to load products', 'பொருட்களை ஏற்ற முடியவில்லை'));
        setIsError(true);
      }
    };
    
    const loadRegisterNo = async () => {
      try {
        const resp = await axios.get<any>('https://tmsapi.xesstechlink.com/api/donations/next-register-no', {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        });
        const nextNo = resp.data?.nextRegisterNo || generateNextRegisterNo();
        setNextRegisterNo(nextNo);
        setProductForm(prev => ({ ...prev, registerNo: nextNo }));
      } catch {
        const nextNo = generateNextRegisterNo();
        setNextRegisterNo(nextNo);
        setProductForm(prev => ({ ...prev, registerNo: nextNo }));
      }
    };
    
    loadProducts();
    loadRegisterNo();
  }, [user?.templeId]);

  // Compute next register number for money donations
  const computeNextRegisterNo = useCallback(async (): Promise<string | null> => {
    try {
      const dStr = moneyForm.date && moneyForm.date.length >= 4 ? moneyForm.date : new Date().toISOString().slice(0,10);
      const yyyy = Number(dStr.slice(0,4));
      const mm = Number(dStr.slice(5,7));
      if (!yyyy || isNaN(yyyy) || !mm || isNaN(mm)) return null;

      const fyStartYear = mm >= 4 ? yyyy : yyyy - 1;
      const fyStart = `${fyStartYear}-04-01`;
      const fyEnd = `${fyStartYear + 1}-03-31`;

      const resp = await moneyDonationService.list(token);
      const items = resp?.data || [];
      const sameFY = items.filter((it:any) => {
        const d = (it.date || '');
        return d >= fyStart && d <= fyEnd;
      });

      let maxSeq = 0;
      for (const it of sameFY) {
        const rn = String(it.register_no || '').trim();
        const m = rn.match(new RegExp(`^${fyStartYear}-([0-9]+)$`));
        if (m) {
          const n = parseInt(m[1], 10);
          if (!isNaN(n)) maxSeq = Math.max(maxSeq, n);
        }
      }
      const nextSeq = maxSeq > 0 ? maxSeq + 1 : sameFY.length + 1;
      return `${fyStartYear}-${String(nextSeq).padStart(4,'0')}`;
    } catch (e) {
      console.warn('Failed to compute register number', e);
      return null;
    }
  }, [moneyForm.date, token]);

  const generateNextRegisterNo = () => {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const daysSince = Math.floor((Date.now() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${currentYear}-${String(daysSince).padStart(4, '0')}`;
  };

  // Prefill register no for money donations
  useEffect(() => {
    if (activeTab === 'money' && !isEdit) {
      (async () => {
        const rn = await computeNextRegisterNo();
        if (rn) {
          setMoneyForm(prev => {
            const year = rn.slice(0,4);
            const prevYear = (prev.registerNo || '').slice(0,4);
            if (!prev.registerNo || prevYear !== year) return { ...prev, registerNo: rn };
            return prev;
          });
        }
      })();
    }
  }, [computeNextRegisterNo, isEdit, activeTab]);

  // Submit handlers
  const onMoneySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(undefined);

    try {
      if (!moneyForm.date) {
        setIsError(true);
        setMessage(t('Please select a date', 'தேதியைத் தேர்ந்தெடுக்கவும்'));
        return;
      }
      if (!moneyForm.amount || isNaN(Number(moneyForm.amount)) || Number(moneyForm.amount) <= 0) {
        setIsError(true);
        setMessage(t('Enter a valid amount greater than 0', '0-ஐ விட அதிகமான செல்லுபடியான தொகையை உள்ளிடவும்'));
        return;
      }

      if (isEdit && editId) {
        const updatePayload: any = { ...moneyForm, transfer_to_account: moneyForm.transferTo };
        await moneyDonationService.update(token, editId, updatePayload);
        setIsError(false);
        showSuccessAlert(t('Updated successfully', 'வெற்றிகரமாக புதுப்பிக்கப்பட்டது'));
        setLastCreatedId(editId);
        await refreshJournal();
        setTimeout(() => {
          navigate('/dashboard/donations/money-list');
        }, 300);
      } else {
        const freshRN = await computeNextRegisterNo();
        const payload = { ...moneyForm, registerNo: freshRN || moneyForm.registerNo, fromAccount: 'DONATION A/C', transferTo: moneyForm.transferTo || 'INCOME A/C' } as any;
        
        const resp = await moneyDonationService.create(token, payload);
        const newId = resp?.data?.id;
        const createdId = typeof newId === 'number' ? newId : null;
        setLastCreatedId(createdId);

        setMoneyForm(createMoneyDonationState());
        const newRegisterNo = await computeNextRegisterNo();
        if (newRegisterNo) {
          setMoneyForm(prev => ({ ...prev, registerNo: newRegisterNo }));
        }
        setIsError(false);
        showSuccessAlert(t('Saved successfully', 'வெற்றிகரமாக சேமிக்கப்பட்டது'));
        
        await refreshJournal();
        
        if (createdId != null) {
          setShowPrintPrompt(true);
        }
      }
    } catch (err) {
      console.error('Save failed:', err);
      setIsError(true);
      setMessage(isEdit ? t('Update failed', 'புதுப்பிப்பில் தோல்வி') : t('Save failed', 'சேமிப்பில் தோல்வி'));
    } finally {
      setSaving(false);
    }
  };

  const onProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setIsError(true);
      setMessage(t('Please fix the errors below', 'கீழே உள்ள பிழைகளை சரிசெய்யவும்'));
      return;
    }

    setSaving(true); 
    setMessage(undefined); 
    setIsError(false);
    
    try {
      await donationService.createDonation(token, productForm);
      const nextNo = await fetchNextRegisterNo();
      setNextRegisterNo(nextNo);
      setProductForm({ ...createProductDonationState(), registerNo: nextNo });
      setErrors({});
      setTouched({});
      showSuccessAlert(t('Saved successfully','வெற்றிகரமாக சேமிக்கப்பட்டது'));
    } catch {
      setIsError(true);
      setMessage(t('Save failed','சேமிப்பில் தோல்வி'));
    } finally {
      setSaving(false);
    }
  };

  const fetchNextRegisterNo = async () => {
    try {
      const resp = await axios.get<any>('https://tmsapi.xesstechlink.com/api/donations/next-register-no', {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      const nextNo = resp.data?.nextRegisterNo || generateNextRegisterNo();
      return nextNo as string;
    } catch {
      return generateNextRegisterNo();
    }
  };

  // Clear forms
  const clearMoneyForm = () => {
    if (isEdit) {
      if (editId && token) {
        moneyDonationService.getById(token, editId)
          .then(resp => {
            const d = resp.data;
            setMoneyForm({
              registerNo: d.register_no || '',
              date: d.date || new Date().toISOString().slice(0,10),
              name: d.name || '',
              fatherName: d.father_name || '',
              address: d.address || '',
              village: d.village || '',
              phone: d.phone || '',
              amount: String(d.amount ?? ''),
              reason: d.reason || '',
              transferTo: 'INCOME A/C',
            });
          })
          .catch(() => {});
      }
      return;
    }
    setMoneyForm(createMoneyDonationState());
    computeNextRegisterNo().then(newRegisterNo => {
      if (newRegisterNo) {
        setMoneyForm(prev => ({ ...prev, registerNo: newRegisterNo }));
      }
    });
  };

  const clearProductForm = () => {
    setProductForm(createProductDonationState());
    fetchNextRegisterNo().then(newRegisterNo => {
      if (newRegisterNo) {
        setProductForm(prev => ({ ...prev, registerNo: newRegisterNo }));
      }
    });
  };

  // Use centralized form styles
  const fieldStyles = "w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors";
  const labelStyles = "block text-sm font-semibold text-gray-700 mb-2";
  const textareaStyles = "w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors resize-none";

  // Error message component
  const ErrorMessage = ({ error }: { error?: string }) => {
    if (!error) return null;
    return (
      <p className={cn(formFieldStyles.error, formFieldStyles.errorWithIcon)}>
        <span className={formFieldStyles.errorIcon}>⚠</span>
        {error}
      </p>
    );
  };

  return (
    <div className={pageContainerStyles.container}>
      <div className={cn(pageContainerStyles.content, "max-w-6xl")}>
        <Card className={formFieldStyles.card.container}>
          <CardHeader className={cn(formFieldStyles.card.header, formFieldStyles.header.gradient)}>
            <CardTitle className={formFieldStyles.header.title}>
              {t('Donation Entry', 'நன்கொடை பதிவு')}
            </CardTitle>
          </CardHeader>
          
          <CardContent className={formFieldStyles.card.content}>
            {/* Tab Navigation */}
            <div className="mb-4">
              <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg border">
                <button
                  type="button"
                  onClick={() => setActiveTab('money')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all duration-200 ${
                    activeTab === 'money'
                      ? 'bg-white text-orange-600 shadow border border-orange-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  💰 {t('Money Donation', 'பண நன்கொடை')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('product')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all duration-200 ${
                    activeTab === 'product'
                      ? 'bg-white text-orange-600 shadow border border-orange-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  📦 {t('Product Donation', 'பொருள் நன்கொடை')}
                </button>
              </div>
            </div>

            {/* Message Display */}
            {message && (
              <div className="mb-6">
                <Alert variant={isError ? 'destructive' : 'default'}>
                  <AlertTitle>{isError ? t('Error', 'பிழை') : t('Success', 'வெற்றி')}</AlertTitle>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              </div>
            )}

            {/* Money Donation Form */}
            {activeTab === 'money' && (
              <form 
                ref={moneyFormRef} 
                onSubmit={onMoneySubmit} 
                onKeyDown={handleKeyDown}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Register No */}
                  <div>
                    <Label className={labelStyles}>{t('Register No', 'பதிவு எண்')}</Label>
                    <Input
                      className={`${fieldStyles} bg-gray-100`}
                      name="registerNo"
                      value={moneyForm.registerNo}
                      readOnly
                    />
                  </div>
                  
                  {/* Date */}
                  <div>
                    <Label className={labelStyles}>{t('Date', 'தேதி')} <span className={formFieldStyles.required}>*</span></Label>
                    <Input 
                      type="date" 
                      className={fieldStyles}
                      name="date" 
                      value={moneyForm.date} 
                      onChange={onMoneyChange} 
                    />
                  </div>
                  
                  {/* Name */}
                  <div>
                    <Label className={labelStyles}>{t('Name', 'பெயர்')} <span className={formFieldStyles.required}>*</span></Label>
                    <Input 
                      className={fieldStyles}
                      name="name" 
                      value={moneyForm.name} 
                      onChange={onMoneyChange} 
                      placeholder={t('Enter name', 'பெயரை உள்ளிடவும்')}
                    />
                  </div>
                    
                  {/* Phone */}
                  <div>
                    <Label className={labelStyles}>{t('Phone', 'கைபேசி எண்')}</Label>
                    <Input 
                      className={fieldStyles}
                      name="phone" 
                      value={moneyForm.phone} 
                      onChange={onMoneyChange} 
                      placeholder={t('Enter phone', 'கைபேசி எண்ணை உள்ளிடவும்')}
                      inputMode="numeric"
                      maxLength={10}
                      onInput={(e) => {
                        const el = e.currentTarget as HTMLInputElement;
                        const cleaned = el.value.replace(/\D/g, '').slice(0, 10);
                        if (el.value !== cleaned) {
                          el.value = cleaned;
                        }
                        setMoneyForm(prev => ({ ...prev, phone: cleaned }));
                      }}
                    />
                  </div>

                  {/* Father Name */}
                  <div>
                    <Label className={labelStyles}>{t('Father Name', 'தந்தை பெயர்')}</Label>
                    <Input 
                      className={fieldStyles}
                      name="fatherName" 
                      value={moneyForm.fatherName} 
                      onChange={onMoneyChange} 
                      placeholder={t('Enter father name', 'தந்தை பெயரை உள்ளிடவும்')}
                    />
                  </div>
                  
                  {/* Village */}
                  <div>
                    <Label className={labelStyles}>{t('Village', 'ஊர்')}</Label>
                    <Input 
                      className={fieldStyles}
                      name="village" 
                      value={moneyForm.village} 
                      onChange={onMoneyChange} 
                      placeholder={t('Enter village', 'ஊரை உள்ளிடவும்')}
                    />
                  </div>
                  
                  {/* Address - Full width */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <Label className={labelStyles}>{t('Address', 'முகவரி')}</Label>
                    <Input 
                      className={fieldStyles}
                      name="address" 
                      value={moneyForm.address} 
                      onChange={onMoneyChange} 
                      placeholder={t('Enter address', 'முகவரியை உள்ளிடவும்')}
                    />
                  </div>
                  
                  {/* Amount */}
                  <div>
                    <Label className={labelStyles}>{t('Amount', 'தொகை')} <span className={formFieldStyles.required}>*</span></Label>
                    <Input 
                      className={fieldStyles}
                      name="amount" 
                      value={moneyForm.amount} 
                      onChange={onMoneyChange} 
                      placeholder={t('Enter amount', 'தொகையை உள்ளிடவும்')}
                      type="number"
                      min="1"
                    />
                  </div>
                  
                  {/* Reason - Full width */}
                  <div className="md:col-span-2 lg:col-span-2">
                    <Label className={labelStyles}>{t('Reason', 'காரணம்')}</Label>
                    <Input 
                      className={fieldStyles}
                      name="reason" 
                      value={moneyForm.reason} 
                      onChange={onMoneyChange} 
                      placeholder={t('Enter reason', 'காரணத்தை உள்ளிடவும்')}
                    />
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex justify-end pt-6 border-t border-gray-200">
                  <Button 
                    disabled={saving} 
                    className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-md text-base transition-all duration-200"
                    type="submit"
                  >
                    {saving ? (isEdit ? t('Updating...', 'புதுப்பிக்கிறது...') : t('Saving...', 'சேமிக்கிறது...')) : (isEdit ? t('Update', 'புதுப்பிக்க') : t('Save', 'சேமிக்க'))}
                  </Button>
                </div>
              </form>
            )}

            {/* Product Donation Form */}
            {activeTab === 'product' && (
              <div>
                {/* Register Number and Product Manager */}
                <div className={formFieldStyles.registerDisplay.container}>
                  <div className="text-lg">
                    <span className={formFieldStyles.registerDisplay.label}>{t('Register No','பதிவு எண்')}:</span>
                    <span className={formFieldStyles.registerDisplay.value}>{productForm.registerNo}</span>
                  </div>
                  {user?.templeId ? (
                    <DonationProductManager 
                      products={products} 
                      setProducts={(newProducts) => {
                        setProducts(newProducts);
                        // Update available units when products change
                        const units = extractUnits(Array.isArray(newProducts) ? newProducts : []);
                        setAvailableUnits(units);
                      }} 
                      templeId={user.templeId} 
                    />
                  ) : (
                    <div className={cn(formFieldStyles.error, "text-sm")}>
                      {t('Temple ID not found. Please login again.', 'கோயில் ID கிடைக்கவில்லை. மீண்டும் உள்நுழையவும்')}
                    </div>
                  )}
                </div>

                <form onSubmit={onProductSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Date */}
                    <div>
                      <Label className={labelStyles} htmlFor="date">
                        {t('Date','தேதி')} <span className={formFieldStyles.required}>*</span>
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        name="date"
                        value={productForm.date}
                        onChange={onProductChange}
                        className={fieldStyles}
                      />
                    </div>

                    {/* Name */}
                    <div className="md:col-span-2">
                      <Label className={labelStyles} htmlFor="name">
                        {t('Name','பெயர்')} <span className={formFieldStyles.required}>*</span>
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={productForm.name}
                        onChange={onProductChange}
                        onBlur={onProductBlur}
                        className={cn(fieldStyles, errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : '')}
                        placeholder={t('Enter name','பெயரை உள்ளிடவும்')}
                      />
                      <ErrorMessage error={errors.name} />
                    </div>

                    {/* Phone */}
                    <div>
                      <Label className={labelStyles} htmlFor="phone">
                        {t('Phone','கைபேசி')} <span className={formFieldStyles.required}>*</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        name="phone"
                        value={productForm.phone}
                        onChange={onProductChange}
                        onBlur={onProductBlur}
                        inputMode="numeric"
                        maxLength={10}
                        onInput={(e) => {
                          const el = e.currentTarget as HTMLInputElement;
                          const cleaned = el.value.replace(/\D/g, '').slice(0, 10);
                          if (el.value !== cleaned) {
                            el.value = cleaned;
                            setProductForm(prev => ({ ...prev, phone: cleaned }));
                          }
                        }}
                        className={cn(fieldStyles, errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : '')}
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
                        id="fatherName"
                        name="fatherName"
                        value={productForm.fatherName}
                        onChange={onProductChange}
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
                        id="village"
                        name="village"
                        value={productForm.village}
                        onChange={onProductChange}
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
                        id="address"
                        name="address"
                        value={productForm.address}
                        onChange={onProductChange}
                        rows={2}
                        className={textareaStyles}
                        placeholder={t('Enter address','முகவரியை உள்ளிடவும்')}
                      />
                    </div>

                    {/* Product */}
                    <div>
                      <Label className={labelStyles} htmlFor="product">
                        {t('Product','பொருள்')} <span className={formFieldStyles.required}>*</span>
                      </Label>
                      <div className={formFieldStyles.selectDropdown.container}>
                        <select
                          id="product"
                          name="product"
                          value={productForm.product}
                          onChange={(e) => {
                            const val = e.target.value;
                            const sel = products.find(p => p && (p.value === val || p.label === val));
                            setProductForm(prev => ({ ...prev, product: val, unit: sel?.unit || '' }));
                            if (touched.product) {
                              validateField('product', val);
                            }
                          }}
                          onBlur={onProductBlur}
                          className={cn(formFieldStyles.select, "appearance-none pr-10 bg-white", errors.product ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : '')}
                        >
                          <option value="">{t('Select Product','பொருள் தேர்வு')}</option>
                          {products.filter(p => p && p.id && p.label).map(p => 
                            <option key={p.id} value={p.value || p.label}>{p.label}</option>
                          )}
                        </select>
                        <div className={formFieldStyles.selectDropdown.dropdown}>
                          <svg className={formFieldStyles.selectDropdown.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      <ErrorMessage error={errors.product} />
                    </div>

                    {/* Unit */}
                    <div className="relative">
                      <Label className={labelStyles} htmlFor="unit">
                        {t('Unit','அளவு')} <span className={formFieldStyles.required}>*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          ref={unitInputRef}
                          id="unit"
                          name="unit"
                          value={productForm.unit}
                          onChange={onProductChange}
                          onBlur={(e) => {
                            onProductBlur(e);
                            // Delay hiding dropdown to allow clicking on options
                            setTimeout(() => setShowUnitDropdown(false), 150);
                          }}
                          onFocus={() => setShowUnitDropdown(true)}
                          className={cn(fieldStyles, errors.unit ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : '')}
                          placeholder={t('Enter or select unit','அளவை உள்ளிடவும் அல்லது தேர்ந்தெடுக்கவும்')}
                          list="unit-options"
                        />
                        
                        {/* Unit Dropdown */}
                        {showUnitDropdown && availableUnits.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-auto">
                            {availableUnits.map((unit, index) => (
                              <div
                                key={index}
                                className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                onClick={() => {
                                  setProductForm(prev => ({ ...prev, unit }));
                                  setShowUnitDropdown(false);
                                }}
                              >
                                {unit}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <ErrorMessage error={errors.unit} />
                    </div>

                    {/* Reason - Full width */}
                    <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
                      <Label className={labelStyles} htmlFor="reason">
                        {t('Reason','காரணம்')}
                      </Label>
                      <Textarea
                      id="reason"
                      name="reason"
                      value={productForm.reason}
                      onChange={onProductChange}
                      rows={1}
                      className={cn(textareaStyles, 'py-1.5 min-h-[2.25rem]', 'resize-none')}
                      placeholder={t('Enter reason','காரணத்தை உள்ளிடவும்')}
                    />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end pt-6 border-t border-gray-200">
                    <Button
                      type="submit"
                      size="default"
                      className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-md text-base transition-all duration-200"
                      disabled={saving}
                    >
                      {saving ? t('Saving...','சேமிக்கிறது...') : t('Save','சேமி')}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Print Prompt Modal */}
        {showPrintPrompt && lastCreatedId != null && (
          <Modal
            title={t('Print Receipt', 'ரசீதை அச்சிடவா?')}
            onClose={() => setShowPrintPrompt(false)}
          >
            <div className={formFieldStyles.modal.container}>
              <p className={formFieldStyles.modal.content}>
                {t('Do you want to open the PDF receipt for printing?', 'PDF ரசீதை அச்சிட திறக்க விரும்புகிறீர்களா?')}
              </p>
              <div className={formFieldStyles.modal.actions}>
                <button 
                  className={formFieldStyles.modal.button.cancel} 
                  onClick={() => setShowPrintPrompt(false)}
                >
                  {t('No', 'இல்லை')}
                </button>
                <button
                  className={formFieldStyles.modal.button.confirm}
                  onClick={() => {
                    const url = moneyDonationService.receiptUrl(lastCreatedId!, token);
                    const iframe = document.createElement('iframe');
                    iframe.style.position = 'fixed';
                    iframe.style.right = '0';
                    iframe.style.bottom = '0';
                    iframe.style.width = '0';
                    iframe.style.height = '0';
                    iframe.style.border = '0';
                    iframe.src = url;
                    iframe.onload = () => {
                      try {
                        iframe.contentWindow?.focus();
                        iframe.contentWindow?.print();
                      } catch (e) {
                        window.open(url, '_blank');
                      } finally {
                        setTimeout(() => {
                          try { document.body.removeChild(iframe); } catch {}
                        }, 1000);
                      }
                    };
                    document.body.appendChild(iframe);
                    setShowPrintPrompt(false);
                  }} 
                >
                  {t('Yes, Print', 'ஆம், அச்சிடு')}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Success Alert Modal */}
        {showSuccessModal && (
          <Modal
            title={t('Success', 'வெற்றி')}
            onClose={() => setShowSuccessModal(false)}
          >
            <div className="text-center">
              <div className="text-green-600 text-4xl mb-4">✅</div>
              <p className="text-sm text-gray-700 mb-4">
                {successMessage}
              </p>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={() => setShowSuccessModal(false)}
              >
                {t('OK', 'சரி')}
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
