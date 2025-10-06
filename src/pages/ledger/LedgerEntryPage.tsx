import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { useLanguage } from '@/lib/language';
import { Loader2, Calendar as CalendarIcon, FileDown, Save, X, Plus } from 'lucide-react';
import { ledgerService } from '@/services/ledgerService';
import axios from 'axios';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formFieldStyles, pageContainerStyles, formatINR, formatAmount } from '@/styles/formStyles';
import { CategoryManager } from '@/components/ledger/CategoryManager';
import { Modal } from '@/components/ui/modal';
import { Pencil, Trash2 } from 'lucide-react';
import { getAuthToken } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';

type LedgerEntry = {
  date: string;
  name: string;
  under: string;
  currentBalance: number;
  address: string;
  city: string;
  phone: string;
  mobile: string;
  email: string;
  note: string;
  type: 'credit' | 'debit';
  amount: number;
};

type Category = {
  id: number;
  value: string;
  label: string;
};

export default function LedgerEntryPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentBalance, setCurrentBalance] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryInputRef = useRef<HTMLButtonElement | null>(null);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  
  const templeId = user?.templeId;
  
  const { 
    register, 
    handleSubmit, 
    setValue, 
    watch, 
    reset,
    formState: { errors, isDirty } 
  } = useForm<LedgerEntry>({
    defaultValues: {
      type: 'credit',
      currentBalance: 0
    }
  });

  // Handle Enter key to move to next field
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

  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  // Watch common fields
  const watchedValues = watch();
  const watchType = watch('type');
  
  // Use centralized form styles
  const fieldStyles = cn(formFieldStyles.input, "text-base h-11 py-2.5");
  const labelStyles = formFieldStyles.label;
  
  // Button variants
  const buttonVariants = {
    primary: cn(
      formFieldStyles.button.primary,
      "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
    ),
    outline: cn(
      formFieldStyles.button.outline,
      "border-gray-300 hover:bg-gray-50"
    )
  };

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setValue('date', today);

    const fetchBalance = async () => {
      try {
        const balance = await ledgerService.getCurrentBalance();
        setCurrentBalance(balance);
      } catch (error) {
        console.error('Error fetching balance:', error);
        toast({
          title: t('Error', 'பிழை'),
          description: t('Failed to load current balance', 'தற்போதைய இருப்பை ஏற்ற முடியவில்லை'),
          variant: 'destructive',
        });
      }
    };

    const fetchCategories = async () => {
      // Wait until templeId is available, effect will re-run when it changes
      if (!templeId) {
        return;
      }

      setIsLoadingCategories(true);
      try {
        // Pass templeId as a query parameter
        const resp1 = await axios.get<any>(`https://tmsapi.xesstechlink.com/api/ledger/categories?templeId=${templeId}`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        });
        const data1 = (resp1?.data && Array.isArray(resp1.data.data)) ? resp1.data.data : (Array.isArray(resp1?.data) ? resp1.data : []);

        let combined: any[] = data1;
        if (!combined || combined.length === 0) {
          try {
            // Pass templeId as a query parameter
            const resp2 = await axios.get<any>(`https://tmsapi.xesstechlink.com/api/ledger/categories-used?templeId=${templeId}`, {
              headers: { Authorization: `Bearer ${getAuthToken()}` }
            });
            const data2: any[] = (resp2?.data && Array.isArray(resp2.data.data)) ? resp2.data.data : (Array.isArray(resp2?.data) ? resp2.data : []);
            combined = data2;
          } catch (e) {
            // ignore fallback failure
          }
        }

        const mappedData = (combined || []).map((item, index) => {
          if (typeof item === 'string') {
            return {
              id: index + 1,
              value: item,
              label: item
            };
          } else if (item && typeof item === 'object') {
            return {
              id: item.id || index + 1,
              value: item.value || item.label || item.category || '',
              label: item.label || item.value || item.category || ''
            };
          }
          return { id: index + 1, value: '', label: '' };
        });

        setCategories(mappedData);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast({
          title: t('Error', 'பிழை'),
          description: t('Failed to load categories', 'வகைகளை ஏற்ற முடியவில்லை'),
          variant: 'destructive',
        });
        setCategories([]);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchBalance();
    fetchCategories();
  }, [templeId]);

  // Submit to Ledger API so category (under) persists in ledger_entries

  const onSubmit = async (data: LedgerEntry) => {
    setIsSubmitting(true);
    try {
      // Validate required fields
      if (!data.name) {
        throw new Error(t('Name is required', 'பெயர் தேவை'));
      }
      if (Number.isNaN(Number(data.amount)) || Number(data.amount) < 0) {
        throw new Error(t('Amount cannot be negative', 'தொகை மைனஸாக இருக்கக்கூடாது'));
      }

      // Build payload for /api/ledger/entries which stores 'under'
      const payload = {
        date: data.date,
        name: data.name,
        under: data.under || null,
        type: data.type,
        amount: Number(data.amount),
        address: data.address || null,
        city: data.city || null,
        phone: data.phone || null,
        mobile: data.mobile || null,
        email: data.email || null,
        note: data.note || null,
        // Explicit templeId for clarity (backend also derives from JWT)
        templeId: templeId || undefined,
      } as const;

      await axios.post('https://tmsapi.xesstechlink.com/api/ledger/entries', payload, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });

      // Also create a corresponding journal entry so balance (computed from journal_entries) stays in sync
      try {
        const cashAccount = 'CASH A/C';
        const debitAccount = 'DEBIT A/C';
        const fromAccount = data.name;
        const toAccount = (data.type === 'credit') ? cashAccount : debitAccount;
        await ledgerService.createEntry({
          date: data.date,
          from_account: fromAccount,
          to_account: toAccount,
          amount: Number(data.amount),
          remarks: data.note,
          type: data.type,
        } as any);
      } catch (e) {
        // Do not block UI if journal sync fails; log for debugging
        console.warn('Journal sync failed (non-blocking):', e);
      }

      // Refresh balance (backend has /api/ledger/balance)
      const newBalance = await ledgerService.getCurrentBalance();
      setCurrentBalance(newBalance);

      // Reset form after successful submission
      handleReset();

      toast({
        title: t('Success', 'வெற்றி'),
        description: t('Ledger entry saved successfully', 'பதிவேடு பதிவு வெற்றிகரமாக சேமிக்கப்பட்டது'),
      });

      // Show success modal
      setShowSavedModal(true);
    } catch (error) {
      console.error('Error saving ledger entry:', error);
      let errorMessage = t('Failed to save ledger entry', 'பதிவேடு பதிவை சேமிக்க முடியவில்லை');
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: t('Error', 'பிழை'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async (searchValue: string) => {
    if (isLoadingCategories) return;
    if (!templeId) {
      toast({
        title: t('Error', 'பிழை'),
        description: t('Temple ID not available', 'கோவில் ஐடி கிடைக்கவில்லை'),
        variant: 'destructive',
      });
      return;
    }
    
    const cleanVal = searchValue.trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleanVal) return;
    
    const existingCategory = categories.find(c => c.value.toLowerCase() === cleanVal);
    if (existingCategory) {
      setSelectedCategory(existingCategory);
      setValue('under', existingCategory.value);
      setIsCategoryOpen(false);
      return;
    }
    try {
      setIsLoadingCategories(true);
      const response = await axios.post<Category>('https://tmsapi.xesstechlink.com/api/ledger/categories/find-or-create', {
        value: cleanVal,
        label: searchValue,
        templeId: templeId
      }, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`
        }
      });
      
      const created = (response?.data && (response.data as any).data)
        ? (response.data as any).data
        : response.data;
      const normalized: Category = {
        id: created?.id ?? Date.now(),
        value: created?.value ?? cleanVal,
        label: created?.label ?? searchValue
      };
      setCategories(prev => [...prev.filter(Boolean), normalized]);
      setValue('under', normalized.value || cleanVal);
      
      toast({
        title: t('Success', 'வெற்றி'),
        description: t('Category created', 'புதிய வகை உருவாக்கப்பட்டது'),
      });
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: t('Failed to create category', 'வகையை உருவாக்க முடியவில்லை'),
        variant: 'destructive',
      });
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleKeyDownOnCategory = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCategoryOpen) {
      e.preventDefault();
      setIsCategoryOpen(true);
    } else if (e.key === 'Escape') {
      setIsCategoryOpen(false);
      categoryInputRef.current?.focus();
    }
  };

  const handleSelectCategory = (category: Category) => {
    setSelectedCategory(category);
    setValue('under', category.value);
    setIsCategoryOpen(false);
    // Move focus back to the input after selection
    setTimeout(() => categoryInputRef.current?.focus(), 0);
  };

  const handleDeleteCategory = async (id: number) => {
    if (!templeId) {
      toast({
        title: t('Error', 'பிழை'),
        description: t('Temple ID not available', 'கோவில் ஐடி கிடைக்கவில்லை'),
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await axios.delete(`https://tmsapi.xesstechlink.com/api/ledger/categories/${id}?templeId=${templeId}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`
        }
      });
      setCategories(categories.filter(c => c.id !== id));
      toast({
        title: t('Success', 'வெற்றி'),
        description: t('Category deleted', 'வகை நீக்கப்பட்டது'),
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: t('Error', 'பிழை'),
        description: t('Failed to delete category', 'வகையை நீக்க முடியவில்லை'),
        variant: 'destructive',
      });
    }
  };

  const handleReset = () => {
    const today = new Date().toISOString().split('T')[0];
    reset({
      date: today,
      type: 'credit',
      currentBalance: 0,
      name: '',
      under: '',
      address: '',
      city: '',
      phone: '',
      mobile: '',
      email: '',
      note: '',
      amount: 0
    });
    setSelectedCategory(null);
    setIsCategoryOpen(false);
    // isDirty comes from react-hook-form; no manual reset needed
  };

  const handleSaveAndNew = async (data: LedgerEntry) => {
    await onSubmit(data);
    handleReset();
  };

  const handleExportPdf = () => {
    console.log('Exporting to PDF...');
  };

  // Use centralized formatting functions
  const displayAmount = formatAmount;

  const calculatedBalance = useMemo(() => {
    const amount = Number(watch('amount')) || 0;
    const type = watch('type');
    if (type === 'credit') {
      return currentBalance + amount;
    } else {
      return currentBalance - amount;
    }
  }, [currentBalance, watch('amount'), watch('type')]);


  return (
    <div className={pageContainerStyles.container}>
      <div className={pageContainerStyles.content}>
        <Card className={formFieldStyles.card.container}>
          <CardHeader className={cn("bg-gradient-to-r from-orange-500 to-orange-600 text-white py-6 px-6", formFieldStyles.card.header)}>
            <CardTitle className={cn(formFieldStyles.card.title, "text-2xl")}>
              {t('Ledger Entry', 'பதிவேடு பதிவு')}
            </CardTitle>
          </CardHeader>
          
          <CardContent className={formFieldStyles.card.content}>
            <div className="mb-6 flex justify-between items-center">
                <div className={formFieldStyles.ledgerForm.balanceText}>
                  {t('Balance', 'இருப்பு')}: <span className={formFieldStyles.ledgerForm.balanceAmount}>₹{formatINR(currentBalance)}</span>
                </div>
              <CategoryManager categories={categories} setCategories={setCategories} />
            </div>

            <form 
              ref={formRef} 
              onSubmit={handleSubmit(onSubmit)} 
              onKeyDown={handleKeyDown}
              className={formFieldStyles.form.container}
            >
              {/* Main Form Grid */}
              <div className={formFieldStyles.form.grid}>
                {/* Name */}
                <div>
                  <Label className={labelStyles}>
                    {t('Name', 'பெயர்')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    className={fieldStyles}
                    {...register('name', { required: t('Name is required', 'பெயர் தேவை') })}
                    placeholder={t('Enter name', 'பெயரை உள்ளிடவும்')}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                </div>

                {/* Category */}
                <div>
                  <Label className={labelStyles}>
                    {t('Category', 'வகை')}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        ref={categoryInputRef}
                        className={cn(
                          fieldStyles,
                          "justify-between",
                          !watch('under') && "text-gray-500"
                        )}
                      >
                        <span className="truncate">
                          {watch('under')
                            ? categories.find(
                                (category) => category.value === watch('under')
                              )?.label || watch('under')
                            : t('Select category', 'வகையைத் தேர்ந்தெடுக்கவும்')}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0">
                      <Command>
                        <CommandInput 
                          placeholder={t('Search...', 'தேடு...')} 
                          className="h-9"
                        />
                        <CommandEmpty>
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-9"
                            onClick={() => {
                              const input = document.querySelector('[cmdk-input]') as HTMLInputElement;
                              if (input?.value) handleCreateCategory(input.value);
                            }}
                          >
                            {t('Create new category', 'புதிய வகையை உருவாக்கவும்')}
                          </Button>
                        </CommandEmpty>
                        <CommandGroup className="max-h-48 overflow-y-auto">
                          {categories.filter(Boolean).map((category) => (
                            <CommandItem
                              value={category?.value ?? ''}
                              key={category?.value ?? String(category?.id ?? Math.random())}
                              onSelect={() => setValue('under', category?.value ?? '')}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center">
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    watch('under') === (category?.value ?? '') ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span className="truncate">{category?.label ?? category?.value ?? ''}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Type */}
                <div>
                  <Label className={labelStyles}>
                    {t('Type', 'வகை')} <span className="text-red-500">*</span>
                  </Label>
                  <div className={formFieldStyles.ledgerForm.grid}>
                    <Button
                      type="button"
                      variant={watch('type') === 'credit' ? 'default' : 'outline'}
                      onClick={() => setValue('type', 'credit')}
                      className={cn(
                        watch('type') === 'credit' ? buttonVariants.primary : buttonVariants.outline,
                        "w-full"
                      )}
                    >
                      {t('Credit', 'கடன்')}
                    </Button>
                    <Button
                      type="button"
                      variant={watch('type') === 'debit' ? 'default' : 'outline'}
                      onClick={() => setValue('type', 'debit')}
                      className={cn(
                        watch('type') === 'debit' ? buttonVariants.primary : buttonVariants.outline,
                        "w-full"
                      )}
                    >
                      {t('Debit', 'பற்று')}
                    </Button>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <Label className={labelStyles}>
                    {t('Amount', 'தொகை')} <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 flex items-center">
                      <span className="mr-1">₹</span>
                    </span>
                    <Input
                      type="number"
                      id="amount"
                      className={cn(buttonVariants.outline, "pl-9 pr-4 py-2")}
                      {...register('amount', { 
                        min: { 
                          value: 0, 
                          message: t('Amount cannot be negative', 'தொகை மைனஸாக இருக்கக்கூடாது') 
                        },
                        required: t('Amount is required', 'தொகை தேவை')
                      })}
                      placeholder="0.00"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                    />
                  </div>
                  {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>}
                  
                  {watch('amount') && (
                    <div className={cn(
                      formFieldStyles.ledgerForm.newBalance,
                      calculatedBalance >= 0 
                        ? formFieldStyles.ledgerForm.newBalancePositive 
                        : formFieldStyles.ledgerForm.newBalanceNegative
                    )}>
                      {t('New Balance', 'புதிய இருப்பு')}: <span className="font-semibold">₹{displayAmount(calculatedBalance, watch('type'))}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Fields */}
              <div className={formFieldStyles.ledgerForm.advancedSection}>
                <div className={formFieldStyles.ledgerForm.advancedHeader}>
                  <h3 className={formFieldStyles.ledgerForm.advancedTitle}>
                    {t('Additional Details', 'கூடுதல் விவரங்கள்')}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm border-gray-300 hover:bg-gray-50"
                  >
                    {showAdvanced ? t('Hide', 'மறை') : t('Show', 'காட்டு')}
                  </Button>
                </div>

                {showAdvanced && (
                  <div className={formFieldStyles.ledgerForm.advancedGrid}>
                    <div>
                      <Label className={labelStyles}>
                        {t('Phone', 'தொலைபேசி')}
                      </Label>
                      <Input
                        type="tel"
                        id="phone"
                        className={fieldStyles}
                        {...register('phone')}
                        placeholder={t('Enter phone', 'தொலைபேசி எண்ணை உள்ளிடவும்')}
                      />
                    </div>
                    <div>
                      <Label className={labelStyles}>
                        {t('Mobile', 'கைபேசி')}
                      </Label>
                      <Input
                        type="tel"
                        id="mobile"
                        className={fieldStyles}
                        {...register('mobile')}
                        placeholder={t('Enter mobile', 'கைபேசி எண்ணை உள்ளிடவும்')}
                      />
                    </div>
                    <div>
                      <Label className={labelStyles}>
                        Email
                      </Label>
                      <Input
                        type="email"
                        id="email"
                        className={fieldStyles}
                        {...register('email')}
                        placeholder="Enter email"
                      />
                    </div>
                    <div>
                      <Label className={labelStyles}>
                        {t('City', 'ஊர்')}
                      </Label>
                      <Input
                        id="city"
                        className={fieldStyles}
                        {...register('city')}
                        placeholder={t('Enter city', 'ஊரை உள்ளிடவும்')}
                      />
                    </div>
                    <div className="xl:col-span-2">
                      <Label className={labelStyles}>
                        {t('Address', 'முகவரி')}
                      </Label>
                      <Input
                        id="address"
                        className={fieldStyles}
                        {...register('address')}
                        placeholder={t('Enter address', 'முகவரியை உள்ளிடவும்')}
                      />
                    </div>
                    <div className="xl:col-span-6">
                      <Label className={labelStyles}>
                        {t('Notes', 'குறிப்பு')}
                      </Label>
                      <Textarea
                        id="note"
                        className={cn(fieldStyles, "min-h-[80px]")}
                        {...register('note')}
                        placeholder={t('Enter notes', 'குறிப்புகளை உள்ளிடவும்')}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end w-full">
                <div className={formFieldStyles.actions.buttonGroup}>
                <Button 
                  type="button"
                  size="default"
                  className={formFieldStyles.button.primary}
                  onClick={handleSubmit(handleSaveAndNew)}
                  disabled={isSubmitting || !isDirty}
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('Saving...', 'சேமிக்கிறது...')}
                    </span>
                  ) : (
                    t('Save', 'சேமிக்கவும்')
                  )}
                </Button>
                </div>
              </div>

              {showSavedModal && (
                <Modal
                  title={t('Saved Successfully', 'வெற்றிகரமாக சேமிக்கப்பட்டது')}
                  onClose={() => setShowSavedModal(false)}
                >
                  <div className="p-6">
                    <p className="mb-6 text-base text-gray-700">
                      {t('Ledger entry has been saved successfully.', 'பதிவேடு பதிவு வெற்றிகரமாக சேமிக்கப்பட்டது.')}
                    </p>
                    <div className="flex justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowSavedModal(false)}
                        className={cn(buttonVariants.outline, "px-5 py-2.5 text-base")}
                      >
                        {t('OK', 'சரி')}
                      </Button>
                    </div>
                  </div>
                </Modal>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}