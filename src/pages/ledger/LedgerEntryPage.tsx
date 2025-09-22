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
import { CategoryManager } from '@/components/ledger/CategoryManager';
import { Pencil, Trash2 } from 'lucide-react';
import { getAuthToken } from '@/lib/auth';

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
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Get all focusable elements in the form
      const form = e.currentTarget.closest('form');
      if (!form) return;
      
      const focusableElements = Array.from(
        form.querySelectorAll<HTMLElement>(
          'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
        )
      );
      
      const currentIndex = focusableElements.indexOf(e.currentTarget);
      if (currentIndex === -1) return;
      
      // Find next focusable element
      let nextIndex = currentIndex + 1;
      while (nextIndex < focusableElements.length) {
        const nextElement = focusableElements[nextIndex];
        if (nextElement.offsetParent !== null) { // Check if element is visible
          nextElement.focus();
          // If it's a select or textarea, open it
          if (nextElement.tagName === 'SELECT' || nextElement.tagName === 'TEXTAREA') {
            nextElement.click();
          }
          break;
        }
        nextIndex++;
      }
    }
  };

  const t = (en: string, ta: string) => (language === 'tamil' ? en : ta);

  // Watch common fields
  const watchedValues = watch();
  const watchType = watch('type');

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
      setIsLoadingCategories(true);
      try {
        const resp1 = await axios.get<any>('/api/ledger/categories', {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        });
        const data1 = (resp1?.data && Array.isArray(resp1.data.data)) ? resp1.data.data : (Array.isArray(resp1?.data) ? resp1.data : []);

        let combined: any[] = data1;
        if (!combined || combined.length === 0) {
          try {
            const resp2 = await axios.get<any>('/api/ledger/categories-used', {
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
  }, []);

  // Journal API requires both from_account and to_account; map counterpart as CASH A/C depending on type

  const onSubmit = async (data: LedgerEntry) => {
    setIsSubmitting(true);
    try {
      // Validate minimal required fields: name -> from_account, to_account, amount
      if (!data.name) {
        throw new Error(t('Name is required', 'பெயர் தேவை'));
      }
      if (Number(data.amount) < 0) {
        throw new Error(t('Amount cannot be negative', 'தொகை மைனஸாக இருக்கக்கூடாது'));
      }
      const derivedFrom = data.name;
      const cashAccount = 'CASH A/C';
      const debitAccount = 'DEBIT A/C';
      // Mapping per requirement:
      // - Credit: to_account = CASH A/C
      // - Debit: to_account = DEBIT A/C
      // In both cases, from_account = entered name
      const fromAccount = derivedFrom;
      const toAccount = (data.type === 'credit') ? cashAccount : debitAccount;

      const entryData = {
        date: data.date,
        from_account: fromAccount,
        to_account: toAccount,
        amount: Number(data.amount),
        remarks: data.note,
        type: data.type,
      } as any;

      await ledgerService.createEntry(entryData);
      
      const newBalance = await ledgerService.getCurrentBalance();
      setCurrentBalance(newBalance);
      
      // Reset form after successful submission
      handleReset();
      
      toast({
        title: t('Success', 'வெற்றி'),
        description: t('Ledger entry saved successfully', 'பதிவேடு பதிவு வெற்றிகரமாக சேமிக்கப்பட்டது'),
      });
      
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
      const response = await axios.post<Category>('/api/ledger/categories/find-or-create', {
        value: cleanVal,
        label: searchValue
      }, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`
        }
      });
      
      setCategories(prev => [...prev, response.data]);
      setValue('under', response.data.value || cleanVal);
      
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
    try {
      await axios.delete(`/api/ledger/categories/${id}`, {
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

  const calculatedBalance = useMemo(() => {
    const amount = Number(watch('amount')) || 0;
    const type = watch('type');
    if (type === 'credit') {
      return currentBalance + amount;
    } else {
      return currentBalance - amount;
    }
  }, [currentBalance, watch('amount'), watch('type')]);

  const inputClass = "w-full p-2 border rounded";

  // Register input with keydown handler
  const registerWithKeyNav = (name: keyof LedgerEntry, options = {}) => ({
    ...register(name, options),
    onKeyDown: handleKeyDown
  });

  return (
    <div className="p-2 bg-gray-50">
      {/* Compact Header */}
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-base font-bold text-gray-800">
          {t('Ledger Entry', 'பதிவேடு பதிவு')}
        </h1>
        <div className="flex items-center gap-3 text-xs">
          <div className="text-gray-500">
            {t('Balance', 'இருப்பு')}: <span className="font-medium">₹{currentBalance?.toFixed(2) || '0.00'}</span>
          </div>
          <CategoryManager categories={categories} setCategories={setCategories} />
        </div>
      </div>

      {/* Single Compact Card */}
      <Card>
        <CardContent className="p-3">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {/* Top Row: Date, Actions, Status */}
            <div className="flex justify-between items-center pb-2 border-b">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-3 w-3 text-gray-400" />
                <Input
                  type="date"
                  {...register('date')}
                  className="w-32 text-xs h-7 p-1"
                />
              </div>

              <div className="flex items-center gap-2">
                {isDirty && (
                  <div className="flex items-center text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full mr-1"></div>
                    {t('Unsaved', 'சேமிக்கப்படவில்லை')}
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs py-1 px-2 h-6"
                >
                  {showAdvanced ? t('Basic', 'அடிப்படை') : t('More', 'மேலும்')}
                </Button>
              </div>
            </div>

            {/* Main Form - 4 columns layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              {/* Column 1: Name */}
              <div className="space-y-1">
                <Label className="text-xs font-medium">{t('Name', 'பெயர்')}*</Label>
                <Input
                  id="name"
                  className={inputClass}
                  {...registerWithKeyNav('name', { required: t('Name is required', 'பெயர் தேவை') })}
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              {/* Column 2: Category */}
              <div className="space-y-1">
                <Label className="text-xs font-medium">{t('Category', 'வகை')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      ref={categoryInputRef}
                      className={cn(
                        "w-full justify-between text-xs h-8",
                        !watch('under') && "text-muted-foreground"
                      )}
                    >
                      <span className="truncate">
                        {watch('under')
                          ? categories.find(
                              (category) => category.value === watch('under')
                            )?.label || watch('under')
                          : t('Select', 'தேர்ந்தெடு')}
                      </span>
                      <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0">
                    <Command>
                      <CommandInput 
                        placeholder={t('Search...', 'தேடு...')} 
                        className="text-xs"
                      />
                      <CommandEmpty>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-xs h-7"
                          onClick={() => {
                            const input = document.querySelector('[cmdk-input]') as HTMLInputElement;
                            if (input?.value) handleCreateCategory(input.value);
                          }}
                        >
                          <Plus className="mr-2 h-3 w-3" />
                          {t('Create new', 'புதியது உருவாக்கு')}
                        </Button>
                      </CommandEmpty>
                      <CommandGroup className="max-h-32 overflow-y-auto">
                        {categories.map((category) => (
                          <CommandItem
                            value={category.value}
                            key={category.value}
                            onSelect={() => setValue('under', category.value)}
                            className="flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center">
                              <Check
                                className={cn(
                                  "mr-2 h-3 w-3",
                                  watch('under') === category.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="truncate">{category.label}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Column 3: Type */}
              <div className="space-y-1">
                <Label className="text-xs font-medium">{t('Type', 'வகை')}*</Label>
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    type="button"
                    variant={watch('type') === 'credit' ? 'default' : 'outline'}
                    onClick={() => setValue('type', 'credit')}
                    className="h-8 text-xs"
                  >
                    {t('Credit', 'கடன்')}
                  </Button>
                  <Button
                    type="button"
                    variant={watch('type') === 'debit' ? 'default' : 'outline'}
                    onClick={() => setValue('type', 'debit')}
                    className="h-8 text-xs"
                  >
                    {t('Debit', 'பற்று')}
                  </Button>
                </div>
              </div>

              {/* Column 4: Amount */}
              <div className="space-y-1">
                <Label className="text-xs font-medium">{t('Amount', 'தொகை')}*</Label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₹</span>
                  <Input
                    type="number"
                    id="amount"
                    className={cn(inputClass, "pl-6 text-xs h-8")}
                    {...registerWithKeyNav('amount', { 
                      min: { 
                        value: 0, 
                        message: t('Amount cannot be negative', 'தொகை மைனஸாக இருக்கக்கூடாது') 
                      }
                    })}
                    placeholder="0.00"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                  />
                </div>
                {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
                
                {watch('amount') && (
                  <div className="text-xs text-gray-500">
                    {t('New', 'புதிய')}: <span className={cn("font-medium", calculatedBalance >= 0 ? "text-green-600" : "text-red-600")}>₹{calculatedBalance.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Advanced Fields - Collapsible */}
            {showAdvanced && (
              <div className="border-t pt-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('Phone', 'தொலைபேசி')}</Label>
                    <Input
                      type="tel"
                      id="phone"
                      className={inputClass}
                      {...registerWithKeyNav('phone')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('Mobile', 'கைபேசி')}</Label>
                    <Input
                      type="tel"
                      id="mobile"
                      className={inputClass}
                      {...registerWithKeyNav('mobile')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      id="email"
                      className={inputClass}
                      {...registerWithKeyNav('email')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('City', 'ஊர்')}</Label>
                    <Input
                      id="city"
                      className={inputClass}
                      {...registerWithKeyNav('city')}
                    />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-xs">{t('Address', 'முகவரி')}</Label>
                    <Input
                      id="address"
                      className={inputClass}
                      {...registerWithKeyNav('address')}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">{t('Notes', 'குறிப்பு')}</Label>
                  <Textarea
                    id="note"
                    className={cn(inputClass, "resize-none text-xs")}
                    {...registerWithKeyNav('note')}
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* Bottom Action Bar */}
            <div className="flex justify-between items-center pt-2 border-t">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(-1)}
                  disabled={isSubmitting}
                  className="text-xs h-7"
                >
                  <X className="h-3 w-3 mr-1" />
                  {t('Cancel', 'ரத்து')}
                </Button>
                
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={handleExportPdf}
                  className="text-xs h-7"
                >
                  <FileDown className="h-3 w-3 mr-1" />
                  {t('Export', 'ஏற்றுமதி')}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={!isDirty || isSubmitting}
                  className="text-xs h-7"
                >
                  {t('Clear', 'அழி')}
                </Button>

                <Button
                  onClick={handleSubmit(handleSaveAndNew)}
                  disabled={isSubmitting || !isDirty}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3 mr-1" />
                  )}
                  {t('Save & New', 'சேமித்து புதியது')}
                </Button>
                
                <Button 
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSubmitting || !isDirty}
                  size="sm"
                  className="text-xs h-7 bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      {t('Saving...', 'சேமிக்கிறது...')}
                    </>
                  ) : (
                    <>
                      <Save className="h-3 w-3 mr-1" />
                      {t('Save', 'சேமி')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
